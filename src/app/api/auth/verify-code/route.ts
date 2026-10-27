import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";
import { withErrorHandler, errors } from "@/lib/api-error";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { triggerRegistration } from "@/lib/account-registration";

// 验证激活码：只证明「这个手机号属于当前登录的用户」，不动他的密码。
//
// 为什么要有这个接口：
// 统一密码入口卡 phone_verified_at，而那一列原先只有「用专属码登录」才会写。
// 已经能用密码登录的老用户，为了开通跨应用账号而丢掉现有密码说不过去，
// 所以单开一条只写归属的路。
//
// 安全边界与 login 的专属码分支完全一致（判定逻辑逐行照抄，不要另起炉灶）：
// 1. 码必须存在、未过期
// 2. 码必须绑定了手机号（通用码不证明归属——那是用户自填的）
// 3. 码绑定的手机号必须等于当前登录用户的手机号
// 4. 码必须未使用
// 唯一不同的副作用：只写 phone_verified_at，不写 password。

export const runtime = "nodejs";

const CODE_LENGTH = 8;

export const POST = withErrorHandler(async (request: NextRequest) => {
  const token = getTokenFromHeader(request.headers.get("authorization"));
  if (!token) throw errors.unauthorized();

  const payload = verifyToken(token);
  if (!payload) throw errors.unauthorized("token无效");

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, phone: true, phoneVerifiedAt: true, portalUserId: true },
  });
  if (!user) throw errors.notFound("用户不存在");
  if (!user.phone) throw errors.badRequest("账户没有手机号");

  // 参数先校验再限速：格式非法的请求不该消耗用户的额度。
  // （否则用户输错一次码就少一次机会，拖慢的是真人而不是攻击者。）
  const { code } = await request.json();
  if (typeof code !== "string" || code.trim().length !== CODE_LENGTH) {
    throw errors.badRequest("请输入正确的激活码");
  }
  const normalizedCode = code.trim().toUpperCase();

  // 限速：按用户 + 按 IP 双限。
  // 码空间 32^8，猜中概率极低，但这是唯一能试码的公开入口，仍要限。
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userLimit = checkRateLimit(`verify-code:user:${user.id}`, 5, 10 * 60 * 1000);
  if (!userLimit.allowed) return rateLimitResponse(userLimit.resetIn);
  const ipLimit = checkRateLimit(`verify-code:ip:${ip}`, 20, 10 * 60 * 1000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit.resetIn);

  // 判定逻辑与 login 的专属码分支逐行一致：
  // 只按 code 查（不按 phone 查），命中后再比对手机号。
  const codeSession = await prisma.authSession.findFirst({
    where: {
      code: normalizedCode,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!codeSession) {
    throw errors.badRequest("激活码无效或已过期");
  }
  // 通用码不绑定手机号，证明不了归属
  if (!codeSession.phone) {
    throw errors.badRequest("该激活码无法确认手机号归属，请联系管理员领取专属激活码");
  }
  if (codeSession.phone !== user.phone) {
    throw errors.badRequest("激活码与当前账号不匹配");
  }
  if (codeSession.used) {
    throw errors.badRequest("该激活码已被使用");
  }
  // 注：这里的错误信息是区分的（不匹配 / 已使用 / 无效），
  // 理论上会让攻击者据此区分码的状态。但码空间 32^8 ≈ 1.1e12，
  // 叠加「每用户 5 次/10 分钟」的限速后枚举不可行；
  // 而对真实用户来说，区分信息能告诉他该找管理员还是要检查输入。
  // 这是取舍，不是疏漏。

  // 只写归属，不动密码
  await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerifiedAt: user.phoneVerifiedAt ?? new Date() },
  });

  // 码作废：一张码只做一件事
  await prisma.authSession.update({
    where: { id: codeSession.id },
    data: { used: true },
  });

  // 归属刚被证明，顺带登记到账号层，让跨应用登录有落点
  triggerRegistration({
    id: user.id,
    phone: user.phone,
    phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(),
    portalUserId: user.portalUserId,
  });

  return NextResponse.json({
    code: 0,
    message: "验证成功",
    data: { verified: true },
  });
});
