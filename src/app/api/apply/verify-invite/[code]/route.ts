import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/response';
import { withErrorHandler } from '@/lib/api-error';

// POST - 使用邀请码激活账号
export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  const { phone } = await req.json();

  if (!phone || phone.length !== 11) {
    return apiError('请输入正确的手机号', 400);
  }

  // 查找邀请码对应的申请
  const apply = await prisma.apply.findFirst({
    where: {
      inviteCode: code.toUpperCase(),
    },
  });

  if (!apply) {
    return apiError('邀请码无效', 404);
  }

  // 检查邀请码是否过期
  if (apply.inviteExpiresAt && new Date(apply.inviteExpiresAt) < new Date()) {
    return apiError('邀请码已过期', 400);
  }

  // 检查邀请码是否已被使用
  if (apply.inviteUsedAt) {
    return apiError('邀请码已被使用', 400);
  }

  // 更新申请状态
  await prisma.apply.update({
    where: { id: apply.id },
    data: {
      inviteUsedAt: new Date(),
      status: 'activated',
    },
  });

  // 查找或创建对应的用户（关联到申请）
  let user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    // 创建新用户
    user = await prisma.user.create({
      data: {
        phone,
        nickname: '用户',
      },
    });
  }

  return apiSuccess({
    userId: user.id,
    applyId: apply.id,
  }, '激活成功');
});
