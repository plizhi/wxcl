import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const SYSTEM_PROMPTS = {
  comprehensive: `你是「内在结构养育」陪伴顾问。请分析以下多天的陪伴记录，从专业框架给出综合解读：

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

请分析这些记录后给出：

1. 亮点（strengths）：孩子在记录中表现出的优势、特质或做得好的地方，1-3条（从六要素角度解读）
2. 机会窗口（opportunity_axis1, opportunity_axis2）：可以进一步支持或引导的方向，1-2条
3. 一句话建议（advice）：给家长的温暖提醒
4. 生长总结（growth_summary）：综合多天记录的整体总结

用 JSON 格式返回：
{
  "strengths": ["亮点1", "亮点2"],
  "opportunity_axis1": {"dimension": "维度", "description": "描述", "suggestion": "建议"},
  "opportunity_axis2": {"element": "要素", "description": "描述", "suggestion": "建议"},
  "advice": "一句话建议",
  "growth_summary": "综合陪伴总结"
}

禁止说教。禁止空洞的"你做得很好"。`,
};

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return "1"; // TODO: verify token and extract userId
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const userId = getUserId(req);

  try {
    let records;

    if (userId) {
      let sql = `
        SELECT r.id, r.content, r.reply, r.created_at
        FROM records r
        JOIN children c ON r.child_id = c.id
        WHERE c.user_id = $1 AND r.intent = 'daily'
      `;
      const params: any[] = [userId];

      if (startDate) {
        sql += ` AND DATE(r.created_at) >= $${params.length + 1}`;
        params.push(startDate);
      }
      if (endDate) {
        sql += ` AND DATE(r.created_at) <= $${params.length + 1}`;
        params.push(endDate);
      }

      sql += ` ORDER BY r.created_at DESC LIMIT 50`;

      records = await query(sql, params);
    } else {
      const defaultChildId = '00000000-0000-0000-0000-000000000001';
      let sql = `
        SELECT r.id, r.content, r.reply, r.created_at
        FROM records r
        WHERE r.child_id = $1 AND r.intent = 'daily'
      `;
      const params: any[] = [defaultChildId];

      if (startDate) {
        sql += ` AND DATE(r.created_at) >= $${params.length + 1}`;
        params.push(startDate);
      }
      if (endDate) {
        sql += ` AND DATE(r.created_at) <= $${params.length + 1}`;
        params.push(endDate);
      }

      sql += ` ORDER BY r.created_at DESC LIMIT 50`;

      records = await query(sql, params);
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "没有找到记录" }, { status: 400 });
    }

    // 构建记录摘要
    const recordSummaries = records.map((r: any, i: number) => {
      let replyObj = null;
      if (r.reply) {
        try {
          replyObj = JSON.parse(r.reply);
        } catch (e) {}
      }
      return `[记录${i + 1}](${new Date(r.created_at).toLocaleDateString('zh-CN')}): ${r.content}${replyObj?.growth_summary ? ` → 亮点: ${replyObj.growth_summary}` : ''}`;
    }).join('\n\n');

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
          { role: "system", content: SYSTEM_PROMPTS.comprehensive },
          { role: "user", content: `以下是最近一段时间的陪伴记录，请给出综合分析：\n\n${recordSummaries}` },
        ],
        max_tokens: 1500,
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
        report = { growth_summary: aiContent.substring(0, 200) };
      }
    } catch (parseErr) {
      report = { growth_summary: aiContent.substring(0, 200) };
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error("Comprehensive report error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
