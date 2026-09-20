import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/response';
import { withErrorHandler } from '@/lib/api-error';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

// GET - 记录分享打开
export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ shareCode: string }> }) => {
  const { shareCode } = await params;
  const forwarded = req.headers.get('x-forwarded-for');
  const visitorIp = forwarded?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';

  // 限流：同一 IP 10次/分钟
  const limit = checkRateLimit(`share:${visitorIp}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return rateLimitResponse(limit.resetIn);
  }

  // 查找申请
  const apply = await prisma.apply.findUnique({
    where: { shareCode },
  });

  if (!apply) {
    return apiError('分享链接不存在', 404);
  }

  // 记录打开
  await prisma.shareLog.create({
    data: {
      applyId: apply.id,
      visitorIp,
    },
  });

  // 获取当前统计
  const shareLogs = await prisma.shareLog.count({
    where: { applyId: apply.id },
  });

  return apiSuccess({
    shareCode,
    totalOpens: shareLogs,
  });
});
