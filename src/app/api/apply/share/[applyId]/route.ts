import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/response';
import { withErrorHandler } from '@/lib/api-error';

// GET - 获取用户的分享链接信息
export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ applyId: string }> }) => {
  const { applyId } = await params;

  const apply = await prisma.apply.findUnique({
    where: { id: applyId },
  });

  if (!apply) {
    return apiError('申请不存在', 404);
  }

  // 获取分享统计
  const shareLogs = await prisma.shareLog.count({
    where: { applyId: apply.id },
  });

  // 获取贡献的申请数
  const qualifiedContributors = await prisma.$queryRaw<{ id: string }[]>`
    SELECT a.id FROM applies a
    WHERE a.referrer_id = ${apply.id}
    AND (SELECT COUNT(*) FROM share_logs sl WHERE sl.apply_id = a.id) >= 10
  `;

  const qualifiedCount = qualifiedContributors.length;

  // 检查是否达标
  const inviteReady = shareLogs >= 10 && qualifiedCount >= 3;

  return apiSuccess({
    applyId: apply.id,
    shareCode: apply.shareCode,
    status: apply.status,
    inviteCode: apply.inviteCode,
    inviteExpiresAt: apply.inviteExpiresAt,
    stats: {
      totalOpens: shareLogs,
      qualifiedContributors: qualifiedCount,
      requiredOpens: 10,
      requiredContributors: 3,
    },
    inviteReady,
  });
});
