import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { callAI, parseAIResponse } from "@/lib/ai";

const SYSTEM_PROMPT = `你是「内在结构养育」陪伴顾问。请分析以下陪伴记录，识别其中蕴含的滋养时刻。

滋养时刻 = 事实 + 正向感受
- 事实：家长被孩子滋养到的事件（孩子的行为、言语、情感表达等）
- 感受：家长当时的正向情绪反应

滋养时刻的特征：
- 孩子展现了积极主动的行为
- 孩子表达了情感或关心
- 亲子之间有温暖美好的互动
- 孩子展现了成长或进步
- 孩子的话语或行为让家长感动、欣慰、温暖

请从记录中提取滋养时刻，返回 JSON 数组格式：
{
  "extractions": [
    {
      "fact": "滋养事实描述",
      "feeling": "家长的正向感受"
    }
  ]
}

如果记录中没有明显的滋养时刻，返回空的提取数组。
禁止捏造事实，只提取真实存在的内容。`;

async function getUserFirstChildId(userId: string): Promise<string | null> {
  const child = await query<{ id: string }>(
    `SELECT id FROM children WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [userId]
  );
  return child[0]?.id || null;
}

async function validateChildId(userId: string, childId: string): Promise<boolean> {
  const child = await query<{ id: string }>(
    `SELECT id FROM children WHERE id = $1 AND user_id = $2`,
    [childId, userId]
  );
  return child.length > 0;
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { limit = 10, childId } = await req.json();

    let targetChildId = childId;
    if (!targetChildId) {
      targetChildId = await getUserFirstChildId(auth.userId);
      if (!targetChildId) {
        return NextResponse.json({ code: 400, message: "请先添加孩子" }, { status: 400 });
      }
    }

    const isValid = await validateChildId(auth.userId, targetChildId);
    if (!isValid) {
      return NextResponse.json({ code: 403, message: "无权访问该孩子的数据" }, { status: 403 });
    }

    // 获取最近的陪伴记录（未提取过的）
    const records = await query(
      `SELECT r.id, r.content, r.created_at
       FROM records r
       WHERE r.child_id = $1 AND r.intent = 'daily'
       AND NOT EXISTS (
         SELECT 1 FROM nourishment_moments nm
         WHERE nm.extracted_from_record_id = r.id
           AND nm.source = 'extracted'
       )
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [targetChildId, limit]
    );

    if (records.length === 0) {
      return NextResponse.json({ extractions: [], message: "没有新的记录需要提取" });
    }

    const extractions: { fact: string; feeling: string; recordId: string }[] = [];

    for (const record of records) {
      try {
        const aiResponse = await callAI({
          messages: [{ role: 'user', content: `分析以下记录：\n\n${record.content}` }],
          systemPrompt: SYSTEM_PROMPT,
          maxTokens: 500,
        });

        const result = parseAIResponse<{ extractions?: { fact?: string; feeling?: string }[] }>(aiResponse.content);
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

    // 保存提取的滋养时刻
    let savedCount = 0;
    for (const extraction of extractions) {
      try {
        await queryOne(
          `INSERT INTO nourishment_moments (child_id, fact, feeling, source, extracted_from_record_id)
           VALUES ($1, $2, $3, 'extracted', $4) RETURNING id`,
          [targetChildId, extraction.fact, extraction.feeling, extraction.recordId]
        );
        savedCount++;
      } catch {
        // 可能已存在，跳过
      }
    }

    return NextResponse.json({
      extractions,
      savedCount,
      processedRecords: records.length,
    });
  } catch (err) {
    console.error('Extract error:', err);
    return NextResponse.json({ code: 500, message: "提取失败，请稍后重试" }, { status: 500 });
  }
}
