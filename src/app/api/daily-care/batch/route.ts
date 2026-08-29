import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { callAI, parseAIResponse } from "@/lib/ai";
import { logger } from "@/lib/logger";

const SYSTEM_PROMPT = `你是「内在结构养育」陪伴顾问。分析多天记录，给出综合解读。

【孩子内在结构六要素】
1. 心神：内在觉知与觉察核心
2. 自我意向："我是谁"的定位
3. 本能情感愿望：底层冲动与原始情绪
4. 内化客体：内心内化的重要他人形象
5. 妥协与防御机制：遇到压力时的心理应对方式
6. 内在准则与价值意义：内心是非标准

【五大心理营养要素】（五个并列的维度，缺一不可）
1. 自主：感觉到"我的选择是被允许的"
2. 实事求是：真实地面对现实
3. 自我负责：为自己负责
4. 建设性：走出困境、永葆希望
5. 同情心：看见他人、理解他人

请分析这些记录后给出：
1. 亮点（strengths）：孩子表现出的优势、特质或做得好的地方，1-3条
2. 机会窗口（opportunity_axis1, opportunity_axis2）：可以进一步支持的方向，1-2条（从五大心理营养要素中选择）
3. 一句话建议（advice）
4. 生长总结（growth_summary）

用 JSON 格式返回：
{
  "strengths": ["亮点1", "亮点2"],
  "opportunity_axis1": {"dimension": "心理营养要素", "description": "描述", "suggestion": "建议"},
  "opportunity_axis2": {"dimension": "心理营养要素", "description": "描述", "suggestion": "建议"},
  "advice": "一句话建议",
  "growth_summary": "综合陪伴总结"
}

禁止说教。禁止空洞的"你做得很好"。`;

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

// POST /api/daily-care/batch - 批量导入回忆记录
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { records, childId: requestedChildId } = await req.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ code: 400, message: "records is required and must be a non-empty array" }, { status: 400 });
    }

    let childId = requestedChildId;

    if (!childId) {
      childId = await getUserFirstChildId(auth.userId);
      if (!childId) {
        return NextResponse.json({ code: 400, message: "请先添加孩子" }, { status: 400 });
      }
    } else {
      const isValid = await validateChildId(auth.userId, childId);
      if (!isValid) {
        return NextResponse.json({ code: 403, message: "无权访问该孩子的数据" }, { status: 403 });
      }
    }

    // 批量插入记录
    for (const content of records) {
      try {
        await prisma.record.create({
          data: {
            childId,
            content,
            intent: "daily",
          },
        });
      } catch (err) {
        logger.error("Failed to save record:", { error: String(err) });
      }
    }

    // 构建记录摘要用于 AI 分析
    const recordSummaries = records.map((r: string, i: number) =>
      `[记录${i + 1}]: ${r}`
    ).join('\n\n');

    // 调用 AI 分析（使用 jsonMode）
    const aiResponse = await callAI({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `以下是家长的初始回忆记录：\n\n${recordSummaries}\n\n请给出综合分析。` },
      ],
      maxTokens: 1500,
      jsonMode: true,
    });

    let report;
    try {
      report = parseAIResponse(aiResponse.content);
    } catch {
      report = { growth_summary: aiResponse.content.substring(0, 200) };
    }

    return NextResponse.json({ code: 0, message: "成功", data: report });
  } catch (err) {
    logger.error("Batch import error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
