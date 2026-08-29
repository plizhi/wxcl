import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";

// 辅助函数：获取用户第一个孩子
async function getUserFirstChildId(userId: string): Promise<string | null> {
  const child = await prisma.child.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return child?.id ?? null;
}

// 辅助函数：验证 childId 是否属于该用户
async function validateChildId(userId: string, childId: string): Promise<boolean> {
  const child = await prisma.child.findFirst({
    where: { id: childId, userId },
    select: { id: true },
  });
  return !!child;
}

// 获取画像
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

  try {
    const profile = await prisma.childProfile.findUnique({
      where: { childId },
      select: {
        id: true,
        childId: true,
        personality: true,
        interests: true,
        strengths: true,
        challenges: true,
        coreNeeds: true,
        growthGoals: true,
        aiAnalysis: true,
        parentWeight: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ code: 0, message: "成功", data: { profile } });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// 创建或更新画像（upsert）
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      childId: bodyChildId,
      personality,
      interests,
      strengths,
      challenges,
      coreNeeds,
      growthGoals,
      aiAnalysis,
      parentWeight = 0.5,
    } = body;

    let childId = bodyChildId;
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

    // upsert：不存在则创建，存在则按条件更新
    const result = await prisma.childProfile.upsert({
      where: { childId },
      create: {
        childId,
        personality,
        interests,
        strengths,
        challenges,
        coreNeeds,
        growthGoals,
        aiAnalysis,
        parentWeight,
      },
      update: {
        ...(personality !== undefined && { personality }),
        ...(interests !== undefined && { interests }),
        ...(strengths !== undefined && { strengths }),
        ...(challenges !== undefined && { challenges }),
        ...(coreNeeds !== undefined && { coreNeeds }),
        ...(growthGoals !== undefined && { growthGoals }),
        ...(aiAnalysis !== undefined && { aiAnalysis }),
        ...(parentWeight !== undefined && { parentWeight }),
      },
      select: {
        id: true,
        childId: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ code: 0, message: "成功", data: { profile: result } });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// 更新画像（带版本记录）
export async function PUT(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      childId: bodyChildId,
      personality,
      interests,
      strengths,
      challenges,
      coreNeeds,
      growthGoals,
      aiAnalysis,
      parentWeight,
      modifiedBy = "parent",
      reviewFlags,
    } = body;

    let childId = bodyChildId;
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

    // 获取当前版本号
    const currentVersion = await prisma.profileVersion.findFirst({
      where: { childId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const newVersion = (currentVersion?.version ?? 0) + 1;

    // 事务：记录版本快照 + 更新画像
    const result = await prisma.$transaction(async (tx) => {
      // 获取当前画像作为快照
      const currentProfile = await tx.childProfile.findUnique({
        where: { childId },
      });

      // 记录版本历史
      if (currentProfile) {
        await tx.profileVersion.create({
          data: {
            childId,
            version: newVersion,
            snapshot: currentProfile as unknown as object,
            modifiedBy: modifiedBy as "ai" | "parent",
            modifications: { personality, interests, strengths, challenges, coreNeeds, growthGoals },
            aiAnalysisAtTime: currentProfile.aiAnalysis as object | undefined,
            reviewFlags,
          },
        });
      }

      // 更新画像
      const updateData: Record<string, unknown> = {};
      if (personality !== undefined) updateData.personality = personality;
      if (interests !== undefined) updateData.interests = interests;
      if (strengths !== undefined) updateData.strengths = strengths;
      if (challenges !== undefined) updateData.challenges = challenges;
      if (coreNeeds !== undefined) updateData.coreNeeds = coreNeeds;
      if (growthGoals !== undefined) updateData.growthGoals = growthGoals;
      if (aiAnalysis !== undefined) updateData.aiAnalysis = aiAnalysis;
      if (parentWeight !== undefined) updateData.parentWeight = parentWeight;

      if (Object.keys(updateData).length === 0) {
        throw new Error("No fields to update");
      }

      const updated = await tx.childProfile.update({
        where: { childId },
        data: updateData,
        select: { id: true, childId: true, updatedAt: true },
      });

      return { profile: updated, version: newVersion };
    });

    return NextResponse.json({ code: 0, message: "成功", data: result });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
