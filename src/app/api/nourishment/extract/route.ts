import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

const DEFAULT_CHILD_ID = '00000000-0000-0000-0000-000000000001';

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

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return "1";
}

async function getOrCreateDefaultChild(userId: string | null): Promise<string | null> {
  if (!userId) return DEFAULT_CHILD_ID;

  try {
    const existingChild = await queryOne(
      `SELECT id FROM children WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (existingChild) return existingChild.id;

    const newChild = await queryOne(
      `INSERT INTO children (user_id, name, gender, birth_date)
       VALUES ($1, '我的孩子', 'boy', '2015-01-01') RETURNING id`,
      [userId]
    );
    return newChild?.id || DEFAULT_CHILD_ID;
  } catch {
    return DEFAULT_CHILD_ID;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { limit = 10 } = await req.json();
    const userId = getUserId(req);
    const childId = await getOrCreateDefaultChild(userId);

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
      [childId, limit]
    );

    if (records.length === 0) {
      return NextResponse.json({ extractions: [], message: "没有新的记录需要提取" });
    }

    const deepseekApi = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApi) {
      return NextResponse.json({ error: "服务未配置" }, { status: 500 });
    }

    const extractions: { fact: string; feeling: string; recordId: string }[] = [];

    for (const record of records) {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekApi}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `分析以下记录：\n\n${record.content}` },
          ],
          max_tokens: 500,
          stream: false,
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content || "";

      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.extractions && Array.isArray(result.extractions)) {
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
          [childId, extraction.fact, extraction.feeling, extraction.recordId]
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
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
