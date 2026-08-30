import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, verifyPassword, hashPassword } from "@/lib/auth";
import { withErrorHandler, errors } from "@/lib/api-error";

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
      if (user) {
        targetUserId = user.id;
      } else {
        const newUser = await prisma.user.create({
          data: { phone, nickname: "用户", parentRole: parentRole || null },
        });
        targetUserId = newUser.id;
      }

      // 标记邀请码已使用
      await prisma.apply.update({
        where: { id: applyInvite.id },
        data: { inviteUsedAt: new Date(), status: 'activated' },
      });

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
