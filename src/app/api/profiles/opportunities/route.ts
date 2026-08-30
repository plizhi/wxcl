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
  const status = searchParams.get("status") || "open";

  if (!childId) {
    throw errors.badRequest("缺少 childId");
  }

  const child = await prisma.child.findFirst({
    where: { id: childId, userId: auth.userId },
    select: { id: true },
  });

  if (!child) {
    throw errors.forbidden("无权访问");
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
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw errors.unauthorized();
  }

  const { opportunityId, status } = await req.json();

  if (!opportunityId || !status) {
    throw errors.badRequest("缺少参数");
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
    throw errors.forbidden("无权访问");
  }

  await prisma.profileOpportunity.update({
    where: { id: opportunityId },
    data: { status },
  });

  return NextResponse.json({ code: 0, message: "更新成功" });
});
