import { prisma } from "./prisma";
import { callAI, parseAIResponse } from "./ai";

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
  eventType: "strength" | "challenge" | "milestone" | "interaction" | "growth";
  fact: string;
  interpretation?: string;
}

export async function extractEventsFromRecord(
  content: string,
  _childId: string
): Promise<ExtractedEvent[]> {
  try {
    const aiResponse = await callAI({
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: content },
      ],
      maxTokens: 1000,
      jsonMode: true,
    });

    const result = parseAIResponse<{ events?: ExtractedEvent[] }>(aiResponse.content);
    return result?.events || [];
  } catch (err) {
    console.error("Failed to extract events:", err);
    return [];
  }
}

export async function extractAndSaveEventsFromRecords(
  childId: string,
  limit: number = 10
): Promise<number> {
  try {
    const records = await prisma.record.findMany({
      where: { childId, intent: "daily" },
      select: { id: true, content: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    let savedCount = 0;

    for (const record of records) {
      const existing = await prisma.profileEvent.findFirst({
        where: {
          childId,
          source: "accompany",
          fact: record.content.substring(0, 200),
        },
        select: { id: true },
      });

      if (existing) continue;

      const events = await extractEventsFromRecord(record.content, childId);

      for (const event of events) {
        await prisma.profileEvent.create({
          data: {
            childId,
            eventType: event.eventType,
            fact: event.fact,
            interpretation: event.interpretation,
            source: "accompany",
          },
        });
        savedCount++;
      }
    }

    return savedCount;
  } catch (err) {
    console.error("Failed to extract and save events:", err);
    return 0;
  }
}

export async function extractAndSaveEventsFromQuestions(
  childId: string,
  limit: number = 10
): Promise<number> {
  try {
    const questions = await prisma.question.findMany({
      where: { childId },
      select: { id: true, content: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    let savedCount = 0;

    for (const q of questions) {
      const existing = await prisma.profileEvent.findFirst({
        where: {
          childId,
          source: "venting",
          fact: q.content.substring(0, 200),
        },
        select: { id: true },
      });

      if (existing) continue;

      const events = await extractEventsFromRecord(q.content, childId);

      for (const event of events) {
        await prisma.profileEvent.create({
          data: {
            childId,
            eventType: event.eventType,
            fact: event.fact,
            interpretation: event.interpretation,
            source: "venting",
          },
        });
        savedCount++;
      }
    }

    return savedCount;
  } catch (err) {
    console.error("Failed to extract events from questions:", err);
    return 0;
  }
}

interface AnalyzeProfileResult {
  personality: { type: string; details: string[] };
  strengths: string[];
  challenges: string[];
  coreNeeds: string[];
  growthGoals: { enhancements: string[]; supports: string[] };
}

export async function analyzeProfile(childId: string): Promise<AnalyzeProfileResult | null> {
  try {
    const events = await prisma.profileEvent.findMany({
      where: { childId },
      select: { eventType: true, fact: true, interpretation: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (events.length === 0) return null;

    const eventsText = events
      .map((e) => `[${e.eventType}] ${e.fact}${e.interpretation ? " - " + e.interpretation : ""}`)
      .join("\n");

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

    const aiResponse = await callAI({
      messages: [
        { role: "system", content: analyzePrompt },
        { role: "user", content: "请分析孩子的画像" },
      ],
      maxTokens: 1500,
      jsonMode: true,
    });

    return parseAIResponse<AnalyzeProfileResult>(aiResponse.content);
  } catch (err) {
    console.error("Failed to analyze profile:", err);
    return null;
  }
}
