import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { withErrorHandler, errors } from "@/lib/api-error";

async function getUserFirstChildId(userId: string): Promise<string | null> {
  const child = await prisma.child.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return child?.id ?? null;
}

async function validateChildId(userId: string, childId: string): Promise<boolean> {
  const child = await prisma.child.findFirst({
    where: { id: childId, userId },
    select: { id: true },
  });
  return !!child;
}

// 获取版本历史
export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw errors.unauthorized();
  }

  let childId = req.nextUrl.searchParams.get("childId");
  if (!childId) {
    childId = await getUserFirstChildId(auth.userId);
    if (!childId) {
      throw errors.badRequest("请先添加孩子");
    }
  }

  const isValid = await validateChildId(auth.userId, childId);
  if (!isValid) {
    throw errors.forbidden("无权访问该孩子的数据");
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  const versions = await prisma.profileVersion.findMany({
    where: { childId },
    select: {
      id: true,
      childId: true,
      version: true,
      snapshot: true,
      modifiedBy: true,
      modifications: true,
      aiAnalysisAtTime: true,
      reviewFlags: true,
      createdAt: true,
    },
    orderBy: { version: "desc" },
    skip: offset,
    take: limit,
  });

  return NextResponse.json({ code: 0, message: "成功", data: { versions } });
});
