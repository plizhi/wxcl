import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/response';
import { withErrorHandler } from '@/lib/api-error';

// GET - 获取当前用户的申请状态
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const applyId = searchParams.get('applyId');

  if (!phone && !applyId) {
    return apiError('缺少参数', 400);
  }

  const apply = await prisma.apply.findFirst({
    where: phone ? { phone } : { id: applyId! },
    orderBy: { createdAt: 'desc' },
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
  const inviteReady = shareLogs >= 10 && qualifiedCount >= 3;

  // 检查是否需要更新状态
  if (inviteReady && !apply.inviteCode) {
    const inviteCode = apply.shareCode.slice(0, 6); // 使用分享码前6位作为邀请码
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.apply.update({
      where: { id: apply.id },
      data: {
        inviteCode,
        inviteExpiresAt,
        status: 'invite_ready',
      },
    });

    return apiSuccess({
      applyId: apply.id,
      shareCode: apply.shareCode,
      status: 'invite_ready',
      inviteCode,
      inviteExpiresAt,
      stats: {
        totalOpens: shareLogs,
        qualifiedContributors: qualifiedCount,
        requiredOpens: 10,
        requiredContributors: 3,
      },
    });
  }

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
  });
});
