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

  const periodType = req.nextUrl.searchParams.get("periodType");

  try {
    const reports = await prisma.nourishmentReport.findMany({
      where: {
        childId,
        ...(periodType ? { periodType } : {}),
      },
      select: {
        id: true,
        childId: true,
        periodType: true,
        periodStart: true,
        periodEnd: true,
        content: true,
        momentCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ code: 0, message: "成功", data: { reports } });
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
    let { childId, periodType } = await req.json();

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

    if (!periodType) {
      return NextResponse.json({ code: 400, message: "periodType is required" }, { status: 400 });
    }

    // 计算日期区间
    const fmtDate = (d: Date) => d.toLocaleDateString("en-CA");
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    let periodStart: string, periodEnd: string;

    switch (periodType) {
      case "weekly":
        const weekAgo = new Date(now);
        weekAgo.setDate(date - 7);
        periodStart = fmtDate(weekAgo);
        periodEnd = fmtDate(now);
        break;
      case "monthly":
        periodStart = fmtDate(new Date(year, month - 1, 1));
        periodEnd = fmtDate(new Date(year, month, 0));
        break;
      case "quarterly":
        const quarterMonth = Math.floor(month / 3) * 3;
        periodStart = fmtDate(new Date(year, quarterMonth - 3, 1));
        periodEnd = fmtDate(new Date(year, quarterMonth, 0));
        break;
      case "yearly":
        periodStart = fmtDate(new Date(year - 1, month, date));
        periodEnd = fmtDate(now);
        break;
      default:
        return NextResponse.json({ code: 400, message: "invalid periodType" }, { status: 400 });
    }

    const moments = await prisma.nourishmentMoment.findMany({
      where: {
        childId,
        createdAt: {
          gte: new Date(periodStart),
          lte: new Date(periodEnd + "T23:59:59"),
        },
      },
      select: { fact: true, feeling: true },
    });

    const reportContent = {
      periodSummary: `${periodStart} - ${periodEnd} 滋养回顾`,
      momentCount: moments.length,
      feelings: moments.map((m) => m.feeling).filter(Boolean),
      facts: moments.map((m) => m.fact),
      reflection:
        moments.length > 0
          ? `这个阶段你被孩子滋养了 ${moments.length} 次，这些温暖的时刻值得被记住。`
          : "还没有记录滋养时刻，去发现那些被孩子滋养的小确幸吧。",
    };

    // upsert 报告
    const report = await prisma.nourishmentReport.upsert({
      where: { childId_periodType: { childId, periodType } },
      create: {
        childId,
        periodType,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        content: reportContent as object,
        momentCount: moments.length,
      },
      update: {
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        content: reportContent as object,
        momentCount: moments.length,
      },
      select: {
        id: true,
        childId: true,
        periodType: true,
        periodStart: true,
        periodEnd: true,
        content: true,
        momentCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ code: 0, message: "成功", data: { report } });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
