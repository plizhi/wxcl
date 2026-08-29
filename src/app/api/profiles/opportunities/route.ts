import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  const status = searchParams.get("status") || "open";

  if (!childId) {
    return NextResponse.json({ code: 400, message: "缺少 childId" }, { status: 400 });
  }

  const child = await prisma.child.findFirst({
    where: { id: childId, userId: auth.userId },
    select: { id: true },
  });

  if (!child) {
    return NextResponse.json({ code: 403, message: "无权访问" }, { status: 403 });
  }

  const opportunities = await prisma.profileOpportunity.findMany({
    where: { childId, status },
    select: {
      id: true,
      dimension: true,
      element: true,
      description: true,
      suggestion: true,
      status: true,
      appearanceCount: true,
      warningLevel: true,
      firstAppearedAt: true,
      lastAppearedAt: true,
    },
    orderBy: [{ warningLevel: "desc" }, { lastAppearedAt: "desc" }],
  });

  return NextResponse.json({ code: 0, data: { opportunities } });
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { opportunityId, status } = await req.json();

    if (!opportunityId || !status) {
      return NextResponse.json({ code: 400, message: "缺少参数" }, { status: 400 });
    }

    // 验证机会窗口属于该用户的孩子
    const opp = await prisma.profileOpportunity.findFirst({
      where: {
        id: opportunityId,
        child: { userId: auth.userId },
      },
      select: { id: true },
    });

    if (!opp) {
      return NextResponse.json({ code: 403, message: "无权访问" }, { status: 403 });
    }

    await prisma.profileOpportunity.update({
      where: { id: opportunityId },
      data: { status },
    });

    return NextResponse.json({ code: 0, message: "更新成功" });
  } catch (err) {
    console.error("Failed to update opportunity:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
