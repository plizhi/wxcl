/**
 * 简单内存限流器
 * 使用滑动窗口算法，在单实例环境下有效
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// 定期清理过期数据（每分钟清理一次）
const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const keysToDelete: string[] = [];
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > 120 * 1000) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => store.delete(key));
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // 剩余多少毫秒后重置窗口
}

/**
 * 检查是否允许请求
 * @param key 限流键（如 "send-code:13800138000" 或 "share:192.168.1.1"）
 * @param limit 窗口内最大请求数
 * @param windowMs 窗口大小（毫秒）
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // 新窗口
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count >= limit) {
    // 超限
    return {
      allowed: false,
      remaining: 0,
      resetIn: windowMs - (now - entry.windowStart),
    };
  }

  // 窗口内计数 +1
  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetIn: windowMs - (now - entry.windowStart),
  };
}

/**
 * 生成限流拒绝响应
 */
export function rateLimitResponse(resetIn: number) {
  const seconds = Math.ceil(resetIn / 1000);
  return new Response(
    JSON.stringify({
      code: 429,
      message: `请求过于频繁，请 ${seconds} 秒后重试`,
    }),
    {
      status: 429,
      headers: { "Content-Type": "application/json" },
    }
  );
}
