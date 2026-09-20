import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, errors } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  const token = getTokenFromHeader(authHeader);

  if (!token) {
    throw errors.unauthorized();
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw errors.unauthorized("token无效");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      phone: true,
      nickname: true,
      avatarUrl: true,
      parentRole: true,
      status: true,
      source: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw errors.notFound("用户不存在");
  }

  const childCount = await prisma.child.count({
    where: { userId: payload.userId },
  });

  return NextResponse.json({
    code: 0,
    data: {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      parentRole: user.parentRole,
      status: user.status,
      source: user.source,
      createdAt: user.createdAt,
      childCount,
    },
  });
});

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  const token = getTokenFromHeader(authHeader);

  if (!token) {
    throw errors.unauthorized();
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw errors.unauthorized("token无效");
  }

  const { nickname, avatarUrl, parentRole } = await request.json();

  const updateData: Record<string, unknown> = {};
  if (nickname !== undefined) updateData.nickname = nickname || null;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
  if (parentRole !== undefined) updateData.parentRole = parentRole || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ code: 0, message: "没有需要更新的字段" });
  }

  await prisma.user.update({
    where: { id: payload.userId },
    data: updateData,
  });

  return NextResponse.json({ code: 0, message: "更新成功" });
});
