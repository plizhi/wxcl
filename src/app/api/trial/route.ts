import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withErrorHandler, errors } from "@/lib/api-error";

const SYSTEM_PROMPT = `你是「内在结构养育」顾问。用户会分享一段育儿困惑或亲子时刻。

「内在结构养育」关注孩子内在正在发展什么，而非外在表现。

【核心框架】
六要素：
- 心神（内在觉知）
- 自我意向（"我是谁"定位）
- 本能情感愿望和情绪（底层情绪）
- 内化客体（内心重要他人形象）
- 妥协与防御机制
- 内心准则与价值

十大心神能力：
1. 安全感
2. 营养足
3. 主体感
4. 现实感
5. 主动
6. 真实客体之爱
7. 生产勤勉
8. 胜任力感
9. 心理韧性
10. 准则价值意义

五大心理营养：
- 自主
- 实事求是
- 自我负责
- 建设性
- 同情心

【分析要求】
请从内在结构视角分析，只看孩子，不看家长。用 Markdown 格式输出：

1. 内在结构六要素触动
   - 当前事件触动了六要素中的哪些部分
   - 描述内心触动的具体表现
   - 注意：心神是孩子内在的力量，是主动的，不要用"被点亮"等被动语态
   - 示例：心神展现出强大的觉知力量、自我意向强化、情绪冲动等本能被适度调控、父亲的内化客体稳固、防御机制平稳

2. 十大心神能力
   - **十项能力都必须完整呈现，不能遗漏任何一项**
   - **必须按顺序输出**：安全感 → 营养足 → 主体感 → 现实感 → 主动 → 真实客体之爱 → 生产勤勉 → 胜任力感 → 心理韧性 → 准则价值意义
   - 正向表现用 ↑
   - 负向表现用 ↓
   - 没有涉及用 -
   - 可以保留简短的变化说明，但不要加减分数

3. 五大心理营养
   - **五项营养都必须完整呈现，不能遗漏任何一项**
   - 用 ↑ 或 + 表示得到了哪些营养
   - 没有涉及的可以留空或用 - 表示

【输出格式示例】
## 内在结构六要素触动
- 心神：得到加强
- 自我意向：强化
- 本能情感愿望和情绪：情绪冲动未被激发
- 内化客体：父亲客体退缩
- 妥协与防御机制：未启动
- 内心准则与价值：内在价值意义加固

## 十大心神能力
| 能力 | 变化 |
|------|------|
| 安全感 | ↑ |
| 主体感 | ↑ |
| 现实感 | - |
| 生产勤勉 | ↓ |

## 五大心理营养
- 自主：↑
- 实事求是：↑
- 同情心：↑

【语气要求】
- 用 Markdown 格式输出，便于前端渲染
- 总字数控制在 350 字以内
- 禁止说教、禁止给方法建议
- 语气温暖专业，像一面镜子帮助家长看见孩子`;

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { message, childAge } = await req.json();

  if (!message || message.trim().length < 10) {
    throw errors.badRequest("请输入更多内容，至少10个字");
  }

  if (message.length > 500) {
    throw errors.badRequest("内容过长，请控制在500字以内");
  }

  const deepseekApi = process.env.DEEPSEEK_API_KEY;
  if (!deepseekApi) {
    throw errors.serverError("服务未配置");
  }

  const userContent = childAge
    ? `[孩子年龄：${childAge}]\n\n${message}`
    : message;

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
        { role: "user", content: userContent },
      ],
      max_tokens: 800,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw errors.serverError("AI 服务异常");
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "";

  return NextResponse.json({
    code: 0,
    data: { reply }
  });
});
