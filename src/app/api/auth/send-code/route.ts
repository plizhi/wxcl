import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCode } from "@/lib/auth";
import { withErrorHandler, errors } from "@/lib/api-error";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { phone } = await request.json();

  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    throw errors.badRequest("请输入正确的手机号");
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.authSession.deleteMany({ where: { phone } });
  await prisma.authSession.create({
    data: { phone, code, expiresAt },
  });

  return NextResponse.json({
    code: 0,
    message: "验证码已发送",
    data: { phone },
  });
});
