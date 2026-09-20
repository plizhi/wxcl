import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, errors } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { callAI } from "@/lib/ai";
import { checkParentingContent, REFUSAL_MESSAGE } from "@/lib/content-filter";

const SYSTEM_PROMPTS = {
  daily: `你是「内在结构养育」陪伴顾问。分析今日记录，给出：1个亮点 + 1个机会。不用 JSON，用 Markdown。不超过100字。禁止说教。`,
  question: `你是「内在结构养育」顾问。先确认孩子年龄。再给建议。不超过150字。禁止说教。禁止空洞的"你做得很好"。`,
  reflect: `追问一个具体问题，引导反思。不要给答案。30字以内。`,
  chat: `你是「内在结构养育」顾问。简短回应。不超过100字。禁止说教。`,
};

function classify(text: string): "daily" | "question" | "chat" {
  if (text.includes("今天") || text.includes("记录") || text.includes("发生")) return "daily";
  if (text.includes("？") || text.includes("怎么办") || text.includes("为什么")) return "question";
  return "chat";
}

async function getUserFirstChildId(userId: string): Promise<string | null> {
  const child = await prisma.child.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return child?.id ?? null;
}

async function validateChildId(userId: string, childId: string): Promise<boolean> {
  const child = await prisma.child.findFirst({
    where: { id: childId, userId },
    select: { id: true },
  });
  return !!child;
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw errors.unauthorized();
  }

  const { message, childId, intent: intentOverride, systemPrompt } = await req.json();

  if (!message) {
    throw errors.badRequest("message is required");
  }

  // 非育儿内容直接婉拒
  const filterResult = checkParentingContent(message);
  if (!filterResult.isParentingRelated) {
    return NextResponse.json({
      code: 0,
      message: "success",
      data: { reply: REFUSAL_MESSAGE, intent: "chat", filtered: true },
    });
  }

  const intent = intentOverride || classify(message);
  const finalSystemPrompt =
    systemPrompt ||
    SYSTEM_PROMPTS[intent as keyof typeof SYSTEM_PROMPTS] ||
    SYSTEM_PROMPTS.chat;

  const aiResponse = await callAI({
    messages: [
      { role: "system", content: finalSystemPrompt },
      { role: "user", content: message },
    ],
    maxTokens: 500,
  });

  const reply = aiResponse.content || "没有收到回复";

  // 确定要使用的 childId
  let finalChildId: string | null = null;
  if (childId) {
    const isValid = await validateChildId(auth.userId, childId);
    if (isValid) {
      finalChildId = childId;
    }
  }
  if (!finalChildId) {
    finalChildId = await getUserFirstChildId(auth.userId);
  }

  // 保存记录
  if (finalChildId) {
    await prisma.record.create({
      data: {
        childId: finalChildId,
        content: message,
        reply,
        intent: intent as "daily" | "emergency" | "nourishment",
      },
    });
  }

  return NextResponse.json({ code: 0, message: "成功", data: { reply, intent } });
});
