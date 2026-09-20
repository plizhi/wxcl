import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, verifyPassword, hashPassword } from "@/lib/auth";
import { withErrorHandler, errors } from "@/lib/api-error";
import { initializeNewUser, unfreezeByInvite, recordActivity } from "@/lib/user-expiry";
import crypto from "crypto";

function generateShareCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { phone, password, activationCode, parentRole } = await request.json();

  if (!phone) {
    throw errors.badRequest("请输入手机号");
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, password: true, nickname: true },
  });

  if (!password) {
    if (!activationCode) {
      throw errors.badRequest("请输入邀请码或密码");
    }

    // 先尝试新的 Apply 邀请码机制
    const applyInvite = await prisma.apply.findFirst({
      where: {
        inviteCode: activationCode,
        inviteUsedAt: null,
      },
    });

    if (applyInvite && applyInvite.inviteExpiresAt && new Date(applyInvite.inviteExpiresAt) > new Date()) {
      // 使用新的 Apply 邀请码
      // 查找或创建用户
      let targetUserId: string;
      let isNewUser = false;
      if (user) {
        targetUserId = user.id;
      } else {
        const newUser = await prisma.user.create({
          data: { phone, nickname: "用户", parentRole: parentRole || null },
        });
        targetUserId = newUser.id;
        isNewUser = true;
      }

      // 标记邀请码已使用
      await prisma.apply.update({
        where: { id: applyInvite.id },
        data: { inviteUsedAt: new Date(), status: 'activated' },
      });

      // 创建/更新被邀请者的 Apply 记录
      let apply = await prisma.apply.findUnique({
        where: { phone },
      });

      if (!apply) {
        // 新创建 Apply（被邀请者注册）
        apply = await prisma.apply.create({
          data: {
            phone,
            shareCode: generateShareCode(),
            status: 'activated',
            userId: targetUserId,
            activatedAt: new Date(),
            referrerId: applyInvite.id, // 推荐人
          },
        });
      } else {
        // 更新已有 Apply
        apply = await prisma.apply.update({
          where: { id: apply.id },
          data: {
            status: 'activated',
            userId: targetUserId,
            activatedAt: new Date(),
            referrerId: applyInvite.id,
          },
        });
      }

      // 新用户初始化时长
      if (isNewUser) {
        await initializeNewUser(targetUserId);
      }

      // 给邀请者记录 invite 行为（好友成功注册）
      if (applyInvite.userId) {
        await unfreezeByInvite(applyInvite.userId);
        await recordActivity(applyInvite.userId, 'invite');
      }

      const token = generateToken({ userId: targetUserId, phone });
      return NextResponse.json({
        code: 0,
        message: "注册成功",
        data: { token, userId: targetUserId },
      });
    }

    // 回退到旧的 AuthSession 激活码机制
    const codeSession = await prisma.authSession.findFirst({
      where: {
        code: activationCode,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!codeSession) {
      throw errors.badRequest("邀请码无效或已过期");
    }

    if (!codeSession.phone) {
      if (user) {
        throw errors.badRequest("该邀请码已被使用，请使用密码登录");
      }

      await prisma.authSession.update({
        where: { id: codeSession.id },
        data: { used: true, phone },
      });

      const hashedCode = hashPassword(activationCode);
      const newUser = await prisma.user.create({
        data: { phone, nickname: "用户", parentRole: parentRole || null, password: hashedCode },
        select: { id: true },
      });

      // 创建 Apply 记录
      await prisma.apply.create({
        data: {
          phone,
          shareCode: generateShareCode(),
          status: 'activated',
          userId: newUser.id,
          activatedAt: new Date(),
        },
      });

      // 新用户初始化时长
      await initializeNewUser(newUser.id);

      const token = generateToken({ userId: newUser.id, phone });
      return NextResponse.json({
        code: 0,
        message: "注册成功",
        data: { token, userId: newUser.id },
      });
    } else {
      if (!user) {
        throw errors.notFound("用户不存在");
      }

      if (codeSession.phone !== phone) {
        throw errors.badRequest("邀请码无效");
      }

      const hashedCode = hashPassword(activationCode);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedCode },
      });

      const token = generateToken({ userId: user.id, phone });
      return NextResponse.json({
        code: 0,
        message: "密码已重置",
        data: { token, userId: user.id },
      });
    }
  }

  if (!user) {
    throw errors.notFound("用户不存在");
  }

  if (!user.password || !verifyPassword(password, user.password)) {
    throw errors.badRequest("手机号或密码错误");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = generateToken({ userId: user.id, phone });

  return NextResponse.json({
    code: 0,
    message: "登录成功",
    data: { token, userId: user.id },
  });
});
