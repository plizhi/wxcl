import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

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
export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  let childId = req.nextUrl.searchParams.get("childId");
  if (!childId) {
    childId = await getUserFirstChildId(auth.userId);
    if (!childId) {
      return NextResponse.json({ code: 400, message: "请先添加孩子" }, { status: 400 });
    }
  }

  const isValid = await validateChildId(auth.userId, childId);
  if (!isValid) {
    return NextResponse.json({ code: 403, message: "无权访问该孩子的数据" }, { status: 403 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  try {
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
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
