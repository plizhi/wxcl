import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";
import { withErrorHandler, errors } from "@/lib/api-error";
import { earnPoints } from "@/lib/points";

// GET /api/records?childId=xxx - 获取孩子的陪伴记录
export const GET = withErrorHandler(async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  const token = getTokenFromHeader(authHeader);
  const auth = token ? verifyToken(token) : null;

  if (!auth) {
    throw errors.unauthorized();
  }

  const childId = req.nextUrl.searchParams.get("childId");

  if (!childId) {
    throw errors.badRequest("childId required");
  }

  // 验证 childId 属于当前用户
  const child = await prisma.child.findFirst({
    where: { id: childId, userId: auth.userId },
    select: { id: true },
  });

  if (!child) {
    throw errors.forbidden();
  }

  const records = await prisma.record.findMany({
    where: { childId },
    select: {
      id: true,
      content: true,
      reply: true,
      intent: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ code: 0, message: "成功", data: { records } });
});

// POST /api/records - 创建陪伴记录
export const POST = withErrorHandler(async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  const token = getTokenFromHeader(authHeader);
  const auth = token ? verifyToken(token) : null;

  if (!auth) {
    throw errors.unauthorized();
  }

  const { childId, content, reply, intent = "daily" } = await req.json();

  if (!childId || !content) {
    throw errors.badRequest("childId and content required");
  }

  // 验证 childId 属于当前用户
  const child = await prisma.child.findFirst({
    where: { id: childId, userId: auth.userId },
    select: { id: true },
  });

  if (!child) {
    throw errors.forbidden();
  }

  const record = await prisma.record.create({
    data: { childId, content, reply, intent },
    select: { id: true, createdAt: true },
  });

  // 添加陪伴记录获得积分
  await earnPoints(auth.userId, 'record', record.id, '添加陪伴记录');

  return NextResponse.json({ code: 0, message: "成功", data: { record } });
});
