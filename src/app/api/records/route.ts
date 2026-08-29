import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

// GET /api/records?childId=xxx - 获取孩子的陪伴记录
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = getTokenFromHeader(authHeader);
  const auth = token ? verifyToken(token) : null;

  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const childId = req.nextUrl.searchParams.get("childId");

  if (!childId) {
    return NextResponse.json({ code: 400, message: "childId required" }, { status: 400 });
  }

  // 验证 childId 属于当前用户
  const child = await prisma.child.findFirst({
    where: { id: childId, userId: auth.userId },
    select: { id: true },
  });

  if (!child) {
    return NextResponse.json({ code: 403, message: "无权访问" }, { status: 403 });
  }

  try {
    const records = await prisma.record.findMany({
      where: { childId },
      select: {
        id: true,
        content: true,
        reply: true,
        intent: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ code: 0, message: "成功", data: { records } });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// POST /api/records - 创建陪伴记录
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = getTokenFromHeader(authHeader);
  const auth = token ? verifyToken(token) : null;

  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { childId, content, reply, intent = "daily" } = await req.json();

    if (!childId || !content) {
      return NextResponse.json({ code: 400, message: "childId and content required" }, { status: 400 });
    }

    // 验证 childId 属于当前用户
    const child = await prisma.child.findFirst({
      where: { id: childId, userId: auth.userId },
      select: { id: true },
    });

    if (!child) {
      return NextResponse.json({ code: 403, message: "无权访问" }, { status: 403 });
    }

    const record = await prisma.record.create({
      data: { childId, content, reply, intent },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ code: 0, message: "成功", data: { record } });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
