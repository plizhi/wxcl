import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/response';
import { withErrorHandler } from '@/lib/api-error';
import crypto from 'crypto';

// 生成6位分享码
function generateShareCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// POST - 用户提交申请
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { phone, referrerShareCode } = await req.json();

  if (!phone || phone.length !== 11) {
    return apiError('请输入正确的手机号', 400);
  }

  // 检查是否已申请
  const existing = await prisma.apply.findUnique({
    where: { phone },
  });

  if (existing) {
    return apiSuccess({
      applyId: existing.id,
      shareCode: existing.shareCode,
      status: existing.status,
      inviteCode: existing.inviteCode,
      hasInviteCode: !!existing.inviteCode && new Date(existing.inviteExpiresAt!) > new Date(),
    }, '申请已存在');
  }

  // 查找推荐人
  let referrerId: string | undefined;
  if (referrerShareCode) {
    const referrer = await prisma.apply.findUnique({
      where: { shareCode: referrerShareCode },
    });
    if (referrer) {
      referrerId = referrer.id;
    }
  }

  // 创建申请
  const shareCode = generateShareCode();
  const apply = await prisma.apply.create({
    data: {
      phone,
      shareCode,
      referrerId,
      status: 'pending',
    },
  });

  return apiSuccess({
    applyId: apply.id,
    shareCode: apply.shareCode,
    status: apply.status,
  }, '申请成功');
});

// GET - 获取当前用户的申请状态（通过 shareCode 查询）
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const shareCode = searchParams.get('shareCode');

  if (!shareCode) {
    return apiError('缺少 shareCode', 400);
  }

  const apply = await prisma.apply.findUnique({
    where: { shareCode },
  });

  if (!apply) {
    return apiError('申请不存在', 404);
  }

  // 获取分享统计
  const shareLogs = await prisma.shareLog.count({
    where: { applyId: apply.id },
  });

  // 获取贡献的申请数（直接推荐且已申请的）
  const contributedApplies = await prisma.apply.count({
    where: {
      referrerId: apply.id,
      status: { not: 'pending' },
    },
  });

  // 获取贡献者中达到10人打开的数量
  const contributors = await prisma.apply.findMany({
    where: { referrerId: apply.id },
    select: { id: true },
  });

  let qualifiedCount = 0;
  for (const c of contributors) {
    const opens = await prisma.shareLog.count({
      where: { applyId: c.id },
    });
    if (opens >= 10) {
      qualifiedCount++;
    }
  }

  // 检查是否达标
  const inviteReady = shareLogs >= 10 && qualifiedCount >= 3;

  // 如果达标且还没有邀请码，生成邀请码
  if (inviteReady && !apply.inviteCode) {
    const inviteCode = generateShareCode().slice(0, 6);
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后过期

    await prisma.apply.update({
      where: { id: apply.id },
      data: {
        inviteCode,
        inviteExpiresAt,
        status: 'invite_ready',
      },
    });

    return apiSuccess({
      shareCode: apply.shareCode,
      status: 'invite_ready',
      inviteCode,
      inviteExpiresAt,
      stats: {
        totalOpens: shareLogs,
        contributedApplies: qualifiedCount,
        qualifiedCount,
        requiredOpens: 10,
        requiredContributors: 3,
      },
    });
  }

  return apiSuccess({
    shareCode: apply.shareCode,
    status: apply.status,
    inviteCode: apply.inviteCode,
    inviteExpiresAt: apply.inviteExpiresAt,
    stats: {
      totalOpens: shareLogs,
      contributedApplies: qualifiedCount,
      qualifiedCount,
      requiredOpens: 10,
      requiredContributors: 3,
    },
  });
});
