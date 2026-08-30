import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { callAI, parseAIResponse } from "@/lib/ai";
import { withErrorHandler, errors } from "@/lib/api-error";

const SYSTEM_PROMPT = `你是「内在结构养育」陪伴顾问。请分析以下陪伴记录，识别其中蕴含的滋养时刻。

【滋养时刻的本质】
滋养时刻是亲子彼此滋养的体现——孩子在某些时刻展现出五大心理营养要素，家长同时也被滋养。

五大心理营养要素：
1. 自主：孩子主动选择、表达
2. 实事求是：孩子真实地面对
3. 自我负责：孩子担当、负责任
4. 建设性：孩子展现希望、走出困境
5. 同情心：孩子理解他人、关心他人

滋养时刻的特征：
- 孩子展现了积极主动的行为
- 孩子表达了情感或关心
- 亲子之间有温暖美好的互动
- 孩子的话语或行为让家长感到温暖、感动、被需要

请从记录中提取滋养时刻，返回 JSON 数组格式：
{
  "extractions": [
    {
      "fact": "滋养事实描述（孩子做了什么）",
      "feeling": "那一刻你感到被滋养的是什么（温暖、被爱、被理解、感动、幸福、满足、安心、骄傲...）"
    }
  ]
}

如果记录中没有明显的滋养时刻，返回空的提取数组。
禁止捏造事实，只提取真实存在的内容。`;

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

  const { limit = 10, childId } = await req.json();

  let targetChildId = childId;
  if (!targetChildId) {
    targetChildId = await getUserFirstChildId(auth.userId);
    if (!targetChildId) {
      throw errors.badRequest("请先添加孩子");
    }
  }

  const isValid = await validateChildId(auth.userId, targetChildId);
  if (!isValid) {
    throw errors.forbidden("无权访问该孩子的数据");
  }

  // 获取最近的陪伴记录（未提取过的）
  const extractedRecordIds = await prisma.nourishmentMoment.findMany({
    where: {
      childId: targetChildId,
      source: "extracted",
    },
    select: { extractedFromRecordId: true },
  });
  const excludedIds = extractedRecordIds
    .map((r) => r.extractedFromRecordId)
    .filter((id): id is string => id !== null);

  const records = await prisma.record.findMany({
    where: {
      childId: targetChildId,
      intent: "daily",
      ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
    },
    select: { id: true, content: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (records.length === 0) {
    return { extractions: [], message: "没有新的记录需要提取" };
  }

  const extractions: { fact: string; feeling: string; recordId: string }[] = [];

  for (const record of records) {
    try {
      const aiResponse = await callAI({
        messages: [{ role: "user", content: `分析以下记录：\n\n${record.content}` }],
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 500,
        jsonMode: true,
      });

      const result = parseAIResponse<{ extractions?: { fact?: string; feeling?: string }[] }>(
        aiResponse.content
      );
      if (result?.extractions && Array.isArray(result.extractions)) {
        for (const item of result.extractions) {
          if (item.fact && item.fact.trim()) {
            extractions.push({
              fact: item.fact.trim(),
              feeling: (item.feeling || "温暖").trim(),
              recordId: record.id,
            });
          }
        }
      }
    } catch {
      // 解析失败，跳过
    }
  }

  // 批量保存提取的滋养时刻
  let savedCount = 0;
  for (const extraction of extractions) {
    try {
      await prisma.nourishmentMoment.create({
        data: {
          childId: targetChildId,
          fact: extraction.fact,
          feeling: extraction.feeling,
          source: "extracted",
          extractedFromRecordId: extraction.recordId,
        },
      });
      savedCount++;
    } catch {
      // 可能已存在，跳过
    }
  }

  return {
    extractions,
    savedCount,
    processedRecords: records.length,
  };
});
