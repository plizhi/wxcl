import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken, hashPassword } from "@/lib/auth";
import { withErrorHandler, errors } from "@/lib/api-error";

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  const token = getTokenFromHeader(authHeader);
  const auth = token ? verifyToken(token) : null;

  if (!auth) {
    throw errors.unauthorized();
  }

  const { password } = await request.json();

  if (!password || password.length < 6) {
    throw errors.badRequest("密码至少6位");
  }

  const hashedPassword = hashPassword(password);

  await prisma.user.update({
    where: { id: auth.userId },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ code: 0, message: "密码设置成功" });
});
