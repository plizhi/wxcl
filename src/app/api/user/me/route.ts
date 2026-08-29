import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = getTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: "token无效" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatarUrl: true,
        parentRole: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 });
    }

    const childCount = await prisma.child.count({
      where: { userId: payload.userId },
    });

    return NextResponse.json({
      code: 0,
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        parentRole: user.parentRole,
        createdAt: user.createdAt,
        childCount,
      },
    });
  } catch (error) {
    console.error("user/me error:", error);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = getTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: "token无效" }, { status: 401 });
    }

    const { nickname, avatarUrl, parentRole } = await request.json();

    const updateData: Record<string, unknown> = {};
    if (nickname !== undefined) updateData.nickname = nickname || null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (parentRole !== undefined) updateData.parentRole = parentRole || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ code: 0, message: "没有需要更新的字段" });
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
    });

    return NextResponse.json({ code: 0, message: "更新成功" });
  } catch (error) {
    console.error("user/me PATCH error:", error);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
