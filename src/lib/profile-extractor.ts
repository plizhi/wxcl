import { query } from './db';
import { profileApi } from './api';

const DEFAULT_CHILD_ID = '00000000-0000-0000-0000-000000000001';

const EXTRACT_PROMPT = `你是「内在结构养育」分析师。请从以下记录中提取关键事件。

分析记录，识别以下类型的事件：
- strength: 孩子表现出的优势、特质或做得好的事情
- challenge: 孩子遇到的困难、挑战或需要支持的方面
- milestone: 重要的成长里程碑或突破时刻
- interaction: 值得记录的亲子互动
- growth: 明显的成长信号

请以 JSON 格式返回：
{
  "events": [
    {
      "eventType": "strength|challenge|milestone|interaction|growth",
      "fact": "客观描述发生了什么",
      "interpretation": "从内在结构养育角度的解读（可选）"
    }
  ]
}

只返回 JSON，不要有其他内容。记录如下：`;

export interface ExtractedEvent {
  eventType: 'strength' | 'challenge' | 'milestone' | 'interaction' | 'growth';
  fact: string;
  interpretation?: string;
}

export async function extractEventsFromRecord(
  content: string,
  childId: string = DEFAULT_CHILD_ID
): Promise<ExtractedEvent[]> {
  const deepseekApi = process.env.DEEPSEEK_API_KEY;
  if (!deepseekApi) {
    console.error('DeepSeek API not configured');
    return [];
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApi}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: EXTRACT_PROMPT },
          { role: "user", content: content },
        ],
        max_tokens: 1000,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error('DeepSeek API error:', await response.text());
      return [];
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    // 解析 JSON
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const result = JSON.parse(jsonMatch[0]);
    return result.events || [];
  } catch (err) {
    console.error('Failed to extract events:', err);
    return [];
  }
}

// 从陪伴记录中提取事件并保存
export async function extractAndSaveEventsFromRecords(
  childId: string = DEFAULT_CHILD_ID,
  limit: number = 10
): Promise<number> {
  try {
    // 获取最近的陪伴记录
    const records = await query(
      `SELECT id, content FROM records
       WHERE child_id = $1 AND intent = 'daily'
       ORDER BY created_at DESC LIMIT $2`,
      [childId, limit]
    );

    let savedCount = 0;

    for (const record of records) {
      // 检查是否已提取过
      const existing = await query(
        `SELECT id FROM profile_events
         WHERE child_id = $1 AND source = 'accompany' AND fact = $2`,
        [childId, record.content.substring(0, 200)]
      );

      if (existing.length > 0) continue;

      // 提取事件
      const events = await extractEventsFromRecord(record.content, childId);

      // 保存事件
      for (const event of events) {
        await profileApi.addEvent({
          childId,
          eventType: event.eventType,
          fact: event.fact,
          interpretation: event.interpretation,
          source: 'accompany',
        });
        savedCount++;
      }
    }

    return savedCount;
  } catch (err) {
    console.error('Failed to extract and save events:', err);
    return 0;
  }
}

// 从压力吐槽中提取事件
export async function extractAndSaveEventsFromQuestions(
  childId: string = DEFAULT_CHILD_ID,
  limit: number = 10
): Promise<number> {
  try {
    // 获取最近的压力吐槽
    const questions = await query(
      `SELECT id, content FROM questions
       WHERE child_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [childId, limit]
    );

    let savedCount = 0;

    for (const q of questions) {
      // 检查是否已提取过
      const existing = await query(
        `SELECT id FROM profile_events
         WHERE child_id = $1 AND source = 'venting' AND fact = $2`,
        [childId, q.content.substring(0, 200)]
      );

      if (existing.length > 0) continue;

      // 提取事件
      const events = await extractEventsFromRecord(q.content, childId);

      // 保存事件
      for (const event of events) {
        await profileApi.addEvent({
          childId,
          eventType: event.eventType,
          fact: event.fact,
          interpretation: event.interpretation,
          source: 'venting',
        });
        savedCount++;
      }
    }

    return savedCount;
  } catch (err) {
    console.error('Failed to extract events from questions:', err);
    return 0;
  }
}

// AI 分析画像
export async function analyzeProfile(
  childId: string = DEFAULT_CHILD_ID
): Promise<any> {
  const deepseekApi = process.env.DEEPSEEK_API_KEY;
  if (!deepseekApi) {
    console.error('DeepSeek API not configured');
    return null;
  }

  try {
    // 获取事件
    const events = await query(
      `SELECT event_type, fact, interpretation FROM profile_events
       WHERE child_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [childId]
    );

    if (events.length === 0) return null;

    const eventsText = events.map(e =>
      `[${e.event_type}] ${e.fact}${e.interpretation ? ' - ' + e.interpretation : ''}`
    ).join('\n');

    const analyzePrompt = `你是「内在结构养育」分析师。基于以下事件记录，分析孩子的画像：

【事件记录】
${eventsText}

请分析并返回 JSON 格式：
{
  "personality": {
    "type": "introvert|extrovert|mixed",
    "details": ["特点1", "特点2"]
  },
  "strengths": ["优势1", "优势2", "优势3"],
  "challenges": ["挑战1", "挑战2"],
  "coreNeeds": ["核心需求1", "核心需求2"],
  "growthGoals": {
    "enhancements": ["增强方向1"],
    "supports": ["支持方向1"]
  }
}

只返回 JSON。`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApi}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: analyzePrompt },
          { role: "user", content: "请分析孩子的画像" },
        ],
        max_tokens: 1500,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error('DeepSeek API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Failed to analyze profile:', err);
    return null;
  }
}
