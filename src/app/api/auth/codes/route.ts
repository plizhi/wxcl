import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCode } from "@/lib/auth";
import { withErrorHandler, errors } from "@/lib/api-error";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function checkAdminSecret(request: NextRequest): boolean {
  const secret = request.headers.get("X-Admin-Secret");
  return secret === ADMIN_SECRET;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  if (!checkAdminSecret(request)) {
    throw errors.forbidden();
  }

  const { phone, count = 1 } = await request.json();

  if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
    throw errors.badRequest("请输入正确的手机号");
  }

  const actualCount = Math.min(Math.max(1, count), 100);
  const codes = [];

  for (let i = 0; i < actualCount; i++) {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await prisma.authSession.create({
      data: { phone: phone || "", code, expiresAt },
    });

    codes.push({
      phone: phone || "通用",
      code,
      expiresAt: expiresAt.toISOString(),
    });
  }

  return NextResponse.json({
    code: 0,
    message: `成功生成 ${actualCount} 个激活码`,
    data: { codes },
  });
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  if (!checkAdminSecret(request)) {
    throw errors.forbidden();
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");
  const limit = parseInt(searchParams.get("limit") || "50");

  const codes = await prisma.authSession.findMany({
    where: phone ? { phone } : {},
    select: {
      id: true,
      phone: true,
      code: true,
      expiresAt: true,
      used: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ code: 0, data: { codes } });
});
