import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SYSTEM_PROMPT = `你是「内在结构养育」顾问。用户会分享一段育儿困惑或亲子时刻。

「内在结构养育」关注孩子内在正在发展什么，而非外在表现。核心框架：
- 六要素：心神（内在觉知）、自我意向（"我是谁"定位）、本能情感愿望（底层情绪）、内化客体（内心重要他人形象）、妥协与防御机制、内心准则与价值
- 五在心理营养：自主、实事求是、自我负责、建设性、同情心

请从内在结构视角分析：
1. 此刻孩子的内在可能在经历什么（从六要素选1-2个）
2. 家长此刻的内在状态（从五在心理营养选1-2个）

要求：
- 不用 JSON，用自然语言
- 不超过 150 字
- 禁止说教、禁止给方法建议
- 语气温暖专业、不用抽象概念解释`;

export async function POST(req: NextRequest) {
  try {
    const { message, type } = await req.json();

    if (!message || message.trim().length < 10) {
      return NextResponse.json({ code: 400, message: "请输入更多内容，至少10个字" }, { status: 400 });
    }

    if (message.length > 500) {
      return NextResponse.json({ code: 400, message: "内容过长，请控制在500字以内" }, { status: 400 });
    }

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!response.ok) {
      logger.error("Trial API deepseek error:", { status: response.status });
      return NextResponse.json({ code: 500, message: "AI 服务异常" }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      code: 0,
      data: { reply }
    });
  } catch (err) {
    logger.error("Trial API error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
