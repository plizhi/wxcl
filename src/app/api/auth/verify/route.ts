import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import { withErrorHandler, errors } from "@/lib/api-error";
import { initializeNewUser } from "@/lib/user-expiry";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { phone, code } = await request.json();

  if (!code) {
    throw errors.badRequest("请输入激活码");
  }

  const limit = checkRateLimit(`verify:${phone || 'anon'}`, 10, 60 * 1000);
  if (!limit.allowed) {
    return rateLimitResponse(limit.resetIn);
  }

  const session = await prisma.authSession.findFirst({
    where: {
      code,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    throw errors.badRequest("激活码无效或已过期");
  }

  if (session.used) {
    throw errors.badRequest("激活码已被使用");
  }

  // 通用码（未绑定手机号）不绑定手机号就无法确认占用，
  // 放行等于「一个通用码登录任意手机号」，因此这里直接拒绝。
  if (!session.phone) {
    throw errors.badRequest("该激活码无法用于此手机号，请使用密码登录");
  }

  if (phone && session.phone !== phone) {
    throw errors.badRequest("激活码与手机号不匹配");
  }

  await prisma.authSession.update({
    where: { id: session.id },
    data: { used: true },
  });

  const userPhone = session.phone || phone || "";

  let user = await prisma.user.findUnique({
    where: { phone: userPhone },
    select: { id: true, expireAt: true },
  });

  let isNewUser = false;

  if (!user) {
    user = await prisma.user.create({
      data: { phone: userPhone, nickname: "用户" },
      select: { id: true, expireAt: true },
    });
    isNewUser = true;
  }

  // 新用户统一初始化6个月时长
  if (isNewUser || !user.expireAt) {
    await initializeNewUser(user.id);
  }

  const token = generateToken({ userId: user.id, phone: userPhone });

  return NextResponse.json({
    code: 0,
    message: "验证成功",
    data: { token, userId: user.id },
  });
});
