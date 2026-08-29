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

// 获取事件列表
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

  const eventType = req.nextUrl.searchParams.get("eventType") as "strength" | "challenge" | "milestone" | "interaction" | "growth" | null;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  try {
    const events = await prisma.profileEvent.findMany({
      where: {
        childId,
        ...(eventType ? { eventType } : {}),
      },
      select: {
        id: true,
        childId: true,
        eventType: true,
        fact: true,
        interpretation: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    return NextResponse.json({ code: 0, message: "成功", data: { events } });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// 添加事件
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    let { childId, eventType, fact, interpretation, source = "manual" } = body;

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

    if (!eventType || !fact) {
      return NextResponse.json({ code: 400, message: "eventType and fact required" }, { status: 400 });
    }

    const validTypes = ["strength", "challenge", "milestone", "interaction", "growth"];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json({ code: 400, message: "invalid eventType" }, { status: 400 });
    }

    const event = await prisma.profileEvent.create({
      data: {
        childId,
        eventType: eventType as "strength" | "challenge" | "milestone" | "interaction" | "growth",
        fact,
        interpretation,
        source: source as "manual" | "accompany" | "venting",
      },
      select: {
        id: true,
        childId: true,
        eventType: true,
        fact: true,
        interpretation: true,
        source: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ code: 0, message: "成功", data: { event } });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
