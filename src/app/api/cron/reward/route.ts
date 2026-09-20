import { NextRequest, NextResponse } from 'next/server';
import { checkAndGrantRewards } from '@/lib/apply-reward';
import { apiSuccess, apiError } from '@/lib/response';

// cron API: 每周一 00:05 和每月 1 日 00:05 调用
// 触发激励发放
// GET /api/cron/reward?type=week|month
// 必须携带密钥验证: ?secret=xxx

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const type = searchParams.get('type') as 'week' | 'month' | 'both' || 'both';

  // 简单的密钥验证（生产环境应使用更安全的方式）
  if (secret !== process.env.CRON_SECRET) {
    return apiError('Unauthorized', 401);
  }

  const results = {
    week: null as { opens: any[]; users: any[] } | null,
    month: null as { opens: any[]; users: any[] } | null,
  };

  // 发放周榜激励
  if (type === 'week' || type === 'both') {
    results.week = await checkAndGrantRewards('week');
  }

  // 发放月榜激励
  if (type === 'month' || type === 'both') {
    results.month = await checkAndGrantRewards('month');
  }

  return apiSuccess(results, '激励发放完成');
});

// 错误处理包装
function withErrorHandler(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (err) {
      console.error('[cron/reward]', err);
      return apiError('Internal server error', 500);
    }
  };
}
