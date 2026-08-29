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

// 获取事件列表
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

  const eventType = req.nextUrl.searchParams.get("eventType") as "strength" | "challenge" | "milestone" | "interaction" | "growth" | null;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

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
});

// 添加事件
export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw errors.unauthorized();
  }

  const body = await req.json();
  let { childId, eventType, fact, interpretation, source = "manual" } = body;

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

  if (!eventType || !fact) {
    throw errors.badRequest("eventType and fact required");
  }

  const validTypes = ["strength", "challenge", "milestone", "interaction", "growth"];
  if (!validTypes.includes(eventType)) {
    throw errors.badRequest("invalid eventType");
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
});
