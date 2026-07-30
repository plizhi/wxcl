const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

interface CallAIOptions {
  messages: { role: string; content: string }[];
  systemPrompt?: string;
  maxTokens?: number;
  retries?: number;
  model?: string;
}

interface AIResponse {
  content: string;
  raw?: any;
}

export async function callAI(options: CallAIOptions): Promise<AIResponse> {
  const {
    messages,
    systemPrompt,
    maxTokens = 1000,
    retries = 3,
    model = DEFAULT_MODEL,
  } = options;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('API Key 未配置');
  }

  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: allMessages,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return { content, raw: data };
    } catch (err) {
      lastError = err as Error;
      console.error(`AI 调用失败 (尝试 ${attempt + 1}/${retries}):`, err);

      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`AI 调用失败，已重试 ${retries} 次: ${lastError?.message}`);
}

export function parseAIResponse<T = any>(content: string): T | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return null;
  } catch {
    return null;
  }
}
