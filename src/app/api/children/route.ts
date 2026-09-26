import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkNotExpired } from "@/lib/auth-utils";
import { withErrorHandler, errors } from "@/lib/api-error";
import { earnPoints, hasChildren } from "@/lib/points";

// GET /api/children - 获取用户的孩子列表
export const GET = withErrorHandler(async (req: NextRequest) => {
  const authOrRes = await checkNotExpired(req);
  if (authOrRes instanceof NextResponse) {
    return authOrRes;
  }
  const auth = authOrRes;

  const children = await prisma.child.findMany({
    where: { userId: auth.userId },
    select: {
      id: true,
      name: true,
      gender: true,
      birthDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ code: 0, data: children });
});

// POST /api/children - 创建孩子档案
export const POST = withErrorHandler(async (req: NextRequest) => {
  const authOrRes = await checkNotExpired(req);
  if (authOrRes instanceof NextResponse) {
    return authOrRes;
  }
  const auth = authOrRes;

  const { name, gender, birthDate } = await req.json();

  if (!name || !gender || !birthDate) {
    throw errors.badRequest("name, gender and birthDate required");
  }

  // 首次添加孩子获得积分（需在创建之前检查）
  const alreadyHasChildren = await hasChildren(auth.userId);

  const child = await prisma.child.create({
    data: {
      userId: auth.userId,
      name,
      gender,
      birthDate: new Date(birthDate),
    },
    select: {
      id: true,
      name: true,
      gender: true,
      birthDate: true,
      createdAt: true,
    },
  });

  // 首次添加孩子获得积分
  if (!alreadyHasChildren) {
    await earnPoints(auth.userId, 'firstChild', child.id, '首次添加孩子');
  }

  return NextResponse.json({ code: 0, data: child });
});

// PUT /api/children - 更新孩子档案
export const PUT = withErrorHandler(async (req: NextRequest) => {
  const authOrRes = await checkNotExpired(req);
  if (authOrRes instanceof NextResponse) {
    return authOrRes;
  }
  const auth = authOrRes;

  const { id, name, gender, birthDate } = await req.json();

  if (!id) {
    throw errors.badRequest("id required");
  }

  // 先验证是否属于当前用户
  const existing = await prisma.child.findFirst({
    where: { id, userId: auth.userId },
    select: { id: true },
  });

  if (!existing) {
    throw errors.forbidden();
  }

  const child = await prisma.child.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(gender !== undefined && { gender }),
      ...(birthDate !== undefined && { birthDate: new Date(birthDate) }),
    },
    select: {
      id: true,
      name: true,
      gender: true,
      birthDate: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ code: 0, data: child });
});

// DELETE /api/children - 删除孩子档案
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const authOrRes = await checkNotExpired(req);
  if (authOrRes instanceof NextResponse) {
    return authOrRes;
  }
  const auth = authOrRes;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    throw errors.badRequest("id required");
  }

  // 先验证是否属于当前用户
  const existing = await prisma.child.findFirst({
    where: { id, userId: auth.userId },
    select: { id: true },
  });

  if (!existing) {
    throw errors.forbidden();
  }

  await prisma.child.delete({ where: { id } });
  return NextResponse.json({ code: 0 });
});
