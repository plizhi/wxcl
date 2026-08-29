import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
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
  } catch (err) {
    logger.error("Failed to get reflections:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { content, childId, relatedRecordId, relatedOpportunityId } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ code: 400, message: "反思内容不能为空" }, { status: 400 });
    }

    if (childId) {
      const child = await prisma.child.findFirst({
        where: { id: childId, userId: auth.userId },
        select: { id: true },
      });
      if (!child) {
        return NextResponse.json({ code: 403, message: "无权访问该孩子的数据" }, { status: 403 });
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
  } catch (err) {
    logger.error("Failed to save reflection:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
