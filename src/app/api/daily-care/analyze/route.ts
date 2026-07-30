import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { callAI, parseAIResponse } from "@/lib/ai";

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

  venting: `你是「内在结构养育」顾问。家长倾诉了一个困扰，请给予专业理解和回应。

【内在结构养育的核心原则】
1. 孩子的问题不是单纯"行为问题"，是身心结构在特定经历下的综合呈现
2. 从"改行为"转向"看结构"——先问"他在回避什么"
3. 理解孩子的身体/情绪信号，不要急于给方法
4. 先帮孩子识别和命名情感，才能进一步调节情感
5. 青春期是自我整合期——给空间，不是给答案
6. 孩子的"问题行为"可能是适应性的生存策略
7. 养育的目标不是让孩子完美，而是让孩子活出符合自己本性的真实生活
8. 给孩子校正性情感体验——"你提需求是被允许的"，比讲道理更重要
9. 镜映和生理满足同等重要——孩子需要被"看见"

请根据家长描述的情况，给出：

1. 理解（understanding）：用一两句话准确描述你理解的家长处境和感受
2. 分析（analysis）：分析问题的关键所在和家长/孩子的心理需求
3. 建议（suggestions）：给出2-3个具体、可操作的融入内在结构养育理念的建议
4. 亮点（strengths）：从描述中挖掘家长做得好的地方，1-2条（不是夸，是真实的肯定）
5. 一句话总结（summary）：温暖有力的一句话，给家长力量

用 JSON 格式返回：
{
  "understanding": "理解描述",
  "analysis": "分析描述",
  "suggestions": ["建议1", "建议2", "建议3"],
  "strengths": ["亮点1", "亮点2"],
  "summary": "一句话总结"
}

禁止说教。禁止空洞的"你做得很好"。禁止直接给答案。`,
};

// 获取用户的第一个孩子
async function getUserFirstChildId(userId: string): Promise<string | null> {
  try {
    const child = await queryOne<{ id: string }>(
      `SELECT id FROM children WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [userId]
    );
    return child?.id || null;
  } catch (err) {
    console.error("Failed to get user first child:", err);
    return null;
  }
}

// 验证 childId 是否属于用户
async function validateChildId(userId: string, childId: string): Promise<boolean> {
  try {
    const child = await queryOne<{ id: string }>(
      `SELECT id FROM children WHERE id = $1 AND user_id = $2`,
      [childId, userId]
    );
    return !!child;
  } catch (err) {
    return false;
  }
}

// 获取孩子的开放机会窗口
async function getOpenOpportunities(childId: string) {
  try {
    const opportunities = await query<{
      id: string;
      dimension: string;
      element: string;
      description: string;
      suggestion: string;
      appearance_count: number;
    }>(
      `SELECT id, dimension, element, description, suggestion, appearance_count
       FROM profile_opportunities
       WHERE child_id = $1 AND status = 'open'
       ORDER BY last_appeared_at DESC
       LIMIT 5`,
      [childId]
    );
    return opportunities;
  } catch (err) {
    console.error("Failed to get open opportunities:", err);
    return [];
  }
}

// 保存或更新机会窗口
async function saveOpportunities(
  childId: string,
  recordId: string,
  opportunityAxis1: { dimension?: string; description?: string; suggestion?: string } | null,
  opportunityAxis2: { element?: string; description?: string; suggestion?: string } | null
) {
  if (!opportunityAxis1 && !opportunityAxis2) return;

  const opportunities = [];

  if (opportunityAxis1?.dimension && opportunityAxis1?.description) {
    opportunities.push({
      dimension: opportunityAxis1.dimension,
      element: null,
      description: opportunityAxis1.description,
      suggestion: opportunityAxis1.suggestion || null,
    });
  }

  if (opportunityAxis2?.element && opportunityAxis2?.description) {
    opportunities.push({
      dimension: null,
      element: opportunityAxis2.element,
      description: opportunityAxis2.description,
      suggestion: opportunityAxis2.suggestion || null,
    });
  }

  for (const opp of opportunities) {
    try {
      // 检查是否存在相似的开放机会窗口
      const existing = await queryOne<{ id: string; appearance_count: number }>(
        `SELECT id, appearance_count FROM profile_opportunities
         WHERE child_id = $1 AND status = 'open'
         AND dimension = $2 AND description = $3
         ORDER BY created_at DESC LIMIT 1`,
        [childId, opp.dimension, opp.description]
      );

      if (existing) {
        // 更新已有窗口
        await query(
          `UPDATE profile_opportunities
           SET last_appeared_at = NOW(),
               appearance_count = appearance_count + 1,
               warning_level = CASE
                 WHEN appearance_count + 1 >= 5 THEN 2
                 WHEN appearance_count + 1 >= 3 THEN 1
                 ELSE 0
               END,
               source_record_id = $4,
               updated_at = NOW()
           WHERE id = $1`,
          [existing.id, recordId]
        );
      } else {
        // 创建新窗口
        await query(
          `INSERT INTO profile_opportunities
           (child_id, dimension, element, description, suggestion, source_record_id,
            first_appeared_at, last_appeared_at, appearance_count)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), 1)`,
          [childId, opp.dimension, opp.element, opp.description, opp.suggestion, recordId]
        );
      }
    } catch (err) {
      console.error("Failed to save opportunity:", err);
    }
  }
}

// 构建带历史上下文的 prompt
function buildPromptWithHistory(basePrompt: string, opportunities: { dimension?: string; element?: string; description: string; suggestion?: string; appearance_count: number }[]): string {
  if (!opportunities || opportunities.length === 0) return basePrompt;

  const historySection = `\n\n【历史关注方向】\n以下方向是之前报告中提到的，持续关注但尚未解决：\n` +
    opportunities.map((o, i) => {
      const type = o.dimension ? `维度: ${o.dimension}` : `要素: ${o.element}`;
      return `${i + 1}. ${type} - ${o.description} (出现 ${o.appearance_count} 次)${o.suggestion ? `\n   建议: ${o.suggestion}` : ''}`;
    }).join('\n') +
    `\n\n请在分析时适当呼应这些历史方向，询问家长是否有新的进展或变化。`;

  return basePrompt.replace('禁止说教。禁止空洞的"你做得很好"。', '禁止说教。禁止空洞的"你做得很好"。' + historySection);
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { content, childId: requestedChildId, intent = 'daily' } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ code: 400, message: "内容不能为空" }, { status: 400 });
    }

    // 限制内容长度
    const maxLength = 2000;
    if (content.length > maxLength) {
      return NextResponse.json({ code: 400, message: `内容不能超过${maxLength}字` }, { status: 400 });
    }

    let childId = requestedChildId;

    // 如果没有提供 childId，尝试获取用户的第一个孩子
    if (!childId) {
      childId = await getUserFirstChildId(auth.userId);
      if (!childId) {
        return NextResponse.json({ code: 400, message: "请先添加孩子" }, { status: 400 });
      }
    } else {
      // 验证 childId 属于该用户
      const isValid = await validateChildId(auth.userId, childId);
      if (!isValid) {
        return NextResponse.json({ code: 403, message: "无权访问该孩子的数据" }, { status: 403 });
      }
    }

    // 获取历史机会窗口（仅对 daily intent）
    let historyOpportunities: { dimension?: string; element?: string; description: string; suggestion?: string; appearance_count: number }[] = [];
    if (intent === 'daily' && childId) {
      historyOpportunities = await getOpenOpportunities(childId);
    }

    // 根据 intent 选择 prompt
    const basePrompt = SYSTEM_PROMPTS[intent] || SYSTEM_PROMPTS.analyze;
    const systemPrompt = buildPromptWithHistory(basePrompt, historyOpportunities);

    // 调用 AI
    const aiResponse = await callAI({
      messages: [{ role: 'user', content }],
      systemPrompt,
      maxTokens: 1000,
    });

    // 解析 AI 返回的 JSON
    let report = parseAIResponse(aiResponse.content);
    if (!report) {
      report = { growth_summary: aiResponse.content.substring(0, 100) };
    }

    // 保存记录到数据库
    let recordId;
    if (childId) {
      try {
        const result = await query(
          `INSERT INTO records (child_id, content, reply, intent, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id`,
          [childId, content, JSON.stringify(report), intent]
        );
        recordId = result[0]?.id;

        // 保存机会窗口（仅对 daily intent）
        if (intent === 'daily' && recordId) {
          await saveOpportunities(
            childId,
            recordId,
            report.opportunity_axis1 || null,
            report.opportunity_axis2 || null
          );
        }
      } catch (dbErr) {
        console.error("Failed to save record:", dbErr);
      }
    }

    return NextResponse.json({
      ...report,
      recordId,
      intent,
      touchPoint: "",
      thinkingShift: "",
      plannedAction: "",
      // 返回历史机会窗口供前端展示
      historyOpportunities: historyOpportunities.length > 0 ? historyOpportunities : undefined,
    });
  } catch (err) {
    console.error('Analyze error:', err);
    return NextResponse.json({ code: 500, message: "分析失败，请稍后重试" }, { status: 500 });
  }
}
