import { NextRequest } from "next/server";
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

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "5");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

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

  return {
    code: 0,
    message: "成功",
    data: { moments, total, limit, offset },
  };
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw errors.unauthorized();
  }

  let { childId, fact, feeling, source = "manual", extractedFromRecordId } = await req.json();

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

  if (!fact) {
    throw errors.badRequest("fact is required");
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

  return { code: 0, message: "成功", data: { moment } };
});
