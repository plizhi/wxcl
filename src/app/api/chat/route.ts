import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

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
  const child = await queryOne<{ id: string }>(
    `SELECT id FROM children WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [userId]
  );
  return child?.id || null;
}

async function validateChildId(userId: string, childId: string): Promise<boolean> {
  const child = await queryOne<{ id: string }>(
    `SELECT id FROM children WHERE id = $1 AND user_id = $2`,
    [childId, userId]
  );
  return !!child;
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { message, childId, intent: intentOverride, systemPrompt } = await req.json();

    if (!message) {
      return NextResponse.json({ code: 400, message: "message is required" }, { status: 400 });
    }

    const intent = intentOverride || classify(message);
    const finalSystemPrompt = systemPrompt || SYSTEM_PROMPTS[intent as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.chat;

    const deepseekApi = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApi) {
      return NextResponse.json({ code: 500, message: "服务未配置" }, { status: 500 });
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApi}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ code: 500, message: "AI 服务异常" }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "没有收到回复";

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

    // 保存记录到数据库
    if (finalChildId) {
      try {
        await query(
          `INSERT INTO records (child_id, content, reply, intent) VALUES ($1, $2, $3, $4)`,
          [finalChildId, message, reply, intent]
        );
      } catch (dbErr) {
        logger.error("Failed to save record:", { error: String(dbErr) });
      }
    }

    return NextResponse.json({ code: 0, message: "成功", data: { reply, intent } });
  } catch (err) {
    logger.error("Chat API error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
