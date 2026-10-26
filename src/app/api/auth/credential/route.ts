import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, errors } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";
import { requestActivationCredential } from "@/lib/auth-portal";

export const runtime = 'nodejs';

// 统一账号密码（跨应用登录用的那一份凭据）。
// 手机号从会话里取，不接受前端传参 —— 否则就能替别人申请凭据。
// 只有手机号归属被「绑定手机号的专属激活码」证明过的用户才有资格。

async function requireUser(request: NextRequest) {
  const token = getTokenFromHeader(request.headers.get("authorization"));
  if (!token) {
    throw errors.unauthorized();
  }
  const payload = verifyToken(token);
  if (!payload) {
    throw errors.unauthorized("token无效");
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, phone: true, phoneVerifiedAt: true },
  });
  if (!user) {
    throw errors.notFound("用户不存在");
  }
  return user;
}

// GET：能不能申请
export const GET = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  return NextResponse.json({
    code: 0,
    message: '成功',
    data: {
      eligible: !!user.phoneVerifiedAt,
      phoneMasked: user.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : null,
    },
  });
});

// POST：申请凭据并返回认证中心的地址
export const POST = withErrorHandler(async (request: NextRequest) => {
  const user = await requireUser(request);

  if (!user.phone) {
    throw errors.badRequest("账户没有手机号");
  }
  if (!user.phoneVerifiedAt) {
    throw errors.forbidden("手机号尚未通过激活码验证，暂时不能设置统一密码");
  }

  let credential;
  try {
    credential = await requestActivationCredential(user.phone);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('429')) {
      throw errors.badRequest("操作过于频繁，请稍后再试");
    }
    if (message.includes('401')) {
      throw new Error("认证中心拒绝了凭据申请（client 配置不一致）");
    }
    throw err;
  }

  return NextResponse.json({
    code: 0,
    message: '成功',
    data: {
      activation_url: credential.activation_url,
      expires_at: credential.expires_at,
    },
  });
});
