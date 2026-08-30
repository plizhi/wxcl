import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { withErrorHandler, errors } from "@/lib/api-error";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw errors.unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const [reflections, total] = await prisma.$transaction([
    prisma.parentReflection.findMany({
      where: {
        userId: auth.userId,
        ...(childId ? { childId } : {}),
      },
      select: {
        id: true,
        childId: true,
        content: true,
        relatedRecordId: true,
        relatedOpportunityId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.parentReflection.count({
      where: { userId: auth.userId },
    }),
  ]);

  return NextResponse.json({
    code: 0,
    data: { reflections, total },
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw errors.unauthorized();
  }

  const { content, childId, relatedRecordId, relatedOpportunityId } = await req.json();

  if (!content || !content.trim()) {
    throw errors.badRequest("反思内容不能为空");
  }

  if (childId) {
    const child = await prisma.child.findFirst({
      where: { id: childId, userId: auth.userId },
      select: { id: true },
    });
    if (!child) {
      throw errors.forbidden("无权访问该孩子的数据");
    }
  }

  const reflection = await prisma.parentReflection.create({
    data: {
      userId: auth.userId,
      childId: childId || null,
      content: content.trim(),
      relatedRecordId: relatedRecordId || null,
      relatedOpportunityId: relatedOpportunityId || null,
    },
    select: { id: true },
  });

  return NextResponse.json({
    code: 0,
    data: { id: reflection.id },
    message: "反思已保存",
  });
});
