import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth-utils";

// GET /api/children - 获取用户的孩子列表
export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const children = await prisma.child.findMany({
      where: { userId: auth.userId },
      select: {
        id: true,
        name: true,
        gender: true,
        birthDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ code: 0, data: children });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// POST /api/children - 创建孩子档案
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { name, gender, birthDate } = await req.json();

    if (!name || !gender || !birthDate) {
      return NextResponse.json({ code: 400, message: "name, gender and birthDate required" }, { status: 400 });
    }

    const child = await prisma.child.create({
      data: {
        userId: auth.userId,
        name,
        gender,
        birthDate: new Date(birthDate),
      },
      select: {
        id: true,
        name: true,
        gender: true,
        birthDate: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ code: 0, data: child });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// PUT /api/children - 更新孩子档案
export async function PUT(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { id, name, gender, birthDate } = await req.json();

    if (!id) {
      return NextResponse.json({ code: 400, message: "id required" }, { status: 400 });
    }

    // 先验证是否属于当前用户
    const existing = await prisma.child.findFirst({
      where: { id, userId: auth.userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ code: 403, message: "无权访问" }, { status: 403 });
    }

    const child = await prisma.child.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(gender !== undefined && { gender }),
        ...(birthDate !== undefined && { birthDate: new Date(birthDate) }),
      },
      select: {
        id: true,
        name: true,
        gender: true,
        birthDate: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ code: 0, data: child });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// DELETE /api/children - 删除孩子档案
export async function DELETE(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ code: 400, message: "id required" }, { status: 400 });
  }

  try {
    // 先验证是否属于当前用户
    const existing = await prisma.child.findFirst({
      where: { id, userId: auth.userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ code: 403, message: "无权访问" }, { status: 403 });
    }

    await prisma.child.delete({ where: { id } });
    return NextResponse.json({ code: 0 });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
