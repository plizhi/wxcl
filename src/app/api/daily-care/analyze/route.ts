import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

const SYSTEM_PROMPTS = {
  analyze: `你是「内在结构养育」陪伴顾问。分析今日记录，从以下专业框架给出解读：

【孩子内在结构六要素】
1. 心神：内在觉知与觉察核心，感知身心状态、觉察情绪波动
2. 自我意向：自我身份内核，"我是谁"的定位、自我期待、自我形象
3. 本能情感愿望：底层冲动与原始情绪，欲望、喜怒哀乐、本能需求
4. 内化客体：内心内化的重要他人形象，安全感与内在支撑
5. 妥协与防御机制：遇到压力时的心理应对方式（压抑、逃避、讨好、对抗等）
6. 内在准则与价值意义：内心是非标准、价值追求、责任感、道德标尺

【五大心理营养要素】
自主、实事求是、自我负责、建设性、同情心

【四大推力原则】
分离个体化、与现实相洽、撑起内在空间、双向沟通通道

【成全孩子的五个层面】
1. 永葆对世界对生命的热情和好奇心
2. 识风险，知进退
3. 面对困难与挑战时，激发内心的勇气和力量
4. 不辜负与生俱来的天赋、资源和经历，最大程度地实现自身价值
5. 享受其中

请分析今日记录后给出：

1. 亮点（strengths）：孩子在记录中表现出的优势、特质或做得好的地方，1-3条（从六要素角度解读）
2. 机会窗口（opportunity）：可以进一步支持或引导的方向，1-2条（融入五大营养要素）
3. 一句话建议（advice）：给家长的温暖提醒

用 JSON 格式返回：
{
  "strengths": ["亮点1", "亮点2"],
  "opportunity_axis1": {"dimension": "维度", "description": "描述", "suggestion": "建议"},
  "opportunity_axis2": {"element": "要素", "description": "描述", "suggestion": "建议"},
  "advice": "一句话建议",
  "growth_summary": "今日陪伴一句话总结"
}

禁止说教。禁止空洞的"你做得很好"。`,
};

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return "1"; // TODO: verify token and extract userId
}

// 获取或创建默认孩子记录
async function getOrCreateDefaultChild(userId: string | null): Promise<string | null> {
  try {
    // 如果 userId 无效，使用默认孩子的固定 UUID
    if (!userId) {
      // 返回或创建默认孩子（ID 硬编码）
      const defaultChildId = '00000000-0000-0000-0000-000000000001';
      const existing = await queryOne(
        `SELECT id FROM children WHERE id = $1`,
        [defaultChildId]
      );
      if (!existing) {
        await query(
          `INSERT INTO children (id, user_id, name, gender, birth_date)
           VALUES ($1, $1, '我的孩子', 'boy', '2015-01-01')`,
          [defaultChildId]
        );
      }
      return defaultChildId;
    }

    // 先尝试获取用户的第一个孩子
    const existingChild = await queryOne(
      `SELECT id FROM children WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (existingChild) {
      return existingChild.id;
    }

    // 如果没有孩子，创建一个默认的
    const newChild = await queryOne(
      `INSERT INTO children (user_id, name, gender, birth_date)
       VALUES ($1, '我的孩子', 'boy', '2015-01-01')
       RETURNING id`,
      [userId]
    );

    return newChild?.id || null;
  } catch (err) {
    console.error("Failed to get or create default child:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, recordDate, childId: requestedChildId } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const userId = getUserId(req);

    // 获取或创建默认孩子
    let childId = requestedChildId;
    if (!childId && userId) {
      childId = await getOrCreateDefaultChild(userId);
    }

    const deepseekApi = process.env.DEEPSEEK_API_KEY;
    if (!deepseekApi) {
      return NextResponse.json({ error: "服务未配置" }, { status: 500 });
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
          { role: "system", content: SYSTEM_PROMPTS.analyze },
          { role: "user", content: content },
        ],
        max_tokens: 1000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "";

    // 解析 AI 返回的 JSON
    let report;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0]);
      } else {
        report = { growth_summary: aiContent.substring(0, 100) };
      }
    } catch (parseErr) {
      report = { growth_summary: aiContent.substring(0, 100) };
    }

    // 保存记录到数据库
    let recordId;
    if (childId) {
      try {
        const result = await query(
          `INSERT INTO records (child_id, content, reply, intent, created_at)
           VALUES ($1, $2, $3, 'daily', NOW())
           RETURNING id`,
          [childId, content, JSON.stringify(report)]
        );
        recordId = result[0]?.id;
      } catch (dbErr) {
        console.error("Failed to save record:", dbErr);
      }
    }

    return NextResponse.json({
      ...report,
      recordId,
      touchPoint: "",
      thinkingShift: "",
      plannedAction: "",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
