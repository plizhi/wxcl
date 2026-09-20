import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/response';
import { withErrorHandler } from '@/lib/api-error';
import { initializeNewUser, unfreezeByInvite, recordActivity } from '@/lib/user-expiry';
import crypto from 'crypto';

function generateShareCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// POST - 使用邀请码激活账号
export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  const { phone } = await req.json();

  if (!phone || phone.length !== 11) {
    return apiError('请输入正确的手机号', 400);
  }

  // 查找邀请码对应的申请（用于验证邀请码有效性）
  const inviterApply = await prisma.apply.findFirst({
    where: {
      inviteCode: code.toUpperCase(),
    },
  });

  if (!inviterApply) {
    return apiError('邀请码无效', 404);
  }

  // 检查邀请码是否过期
  if (inviterApply.inviteExpiresAt && new Date(inviterApply.inviteExpiresAt) < new Date()) {
    return apiError('邀请码已过期', 400);
  }

  // 检查邀请码是否已被使用
  if (inviterApply.inviteUsedAt) {
    return apiError('邀请码已被使用', 400);
  }

  // 标记邀请码已使用（更新邀请者的 Apply）
  await prisma.apply.update({
    where: { id: inviterApply.id },
    data: {
      inviteUsedAt: new Date(),
    },
  });

  // 查找或创建对应的用户
  let user = await prisma.user.findUnique({
    where: { phone },
  });
  let isNewUser = false;

  if (!user) {
    // 创建新用户
    user = await prisma.user.create({
      data: {
        phone,
        nickname: '用户',
      },
    });
    isNewUser = true;
  }

  // 查找或创建该用户的 Apply（用于记录激活状态）
  let apply = await prisma.apply.findUnique({
    where: { phone },
  });

  if (!apply) {
    // 创建新的 Apply（用户通过邀请码激活）
    apply = await prisma.apply.create({
      data: {
        phone,
        shareCode: generateShareCode(),
        status: 'activated',
        userId: user.id,
        activatedAt: new Date(),
        referrerId: inviterApply.id, // 推荐人
      },
    });
  } else {
    // 更新已有 Apply 的激活状态
    apply = await prisma.apply.update({
      where: { id: apply.id },
      data: {
        status: 'activated',
        userId: user.id,
        activatedAt: new Date(),
        referrerId: inviterApply.id,
      },
    });
  }

  // 新用户初始化时长
  if (isNewUser) {
    await initializeNewUser(user.id);
  }

  // 给邀请者记录 invite 行为
  if (inviterApply.userId) {
    await unfreezeByInvite(inviterApply.userId);
    await recordActivity(inviterApply.userId, 'invite');
  }

  return apiSuccess({
    userId: user.id,
    applyId: apply.id,
    nickname: user.nickname,
  }, '激活成功');
});
