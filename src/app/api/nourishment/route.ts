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

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "5");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  try {
    const [moments, total] = await prisma.$transaction([
      prisma.nourishmentMoment.findMany({
        where: { childId },
        select: {
          id: true,
          childId: true,
          fact: true,
          feeling: true,
          source: true,
          extractedFromRecordId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.nourishmentMoment.count({ where: { childId } }),
    ]);

    return NextResponse.json({
      code: 0,
      message: "成功",
      data: { moments, total, limit, offset },
    });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    let { childId, fact, feeling, source = "manual", extractedFromRecordId } = await req.json();

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

    if (!fact) {
      return NextResponse.json({ code: 400, message: "fact is required" }, { status: 400 });
    }

    const moment = await prisma.nourishmentMoment.create({
      data: {
        childId,
        fact,
        feeling,
        source: source as "manual" | "extracted" | "accompany" | "venting",
        extractedFromRecordId,
      },
      select: {
        id: true,
        childId: true,
        fact: true,
        feeling: true,
        source: true,
        extractedFromRecordId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ code: 0, message: "成功", data: { moment } });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
