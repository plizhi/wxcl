import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";
import { logger } from "@/lib/logger";

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
  const child = await queryOne(
    `SELECT id FROM children WHERE id = $1 AND user_id = $2`,
    [childId, auth.userId]
  );

  if (!child) {
    return NextResponse.json({ code: 403, message: "无权访问" }, { status: 403 });
  }

  try {
    const records = await query(
      `SELECT id, content, reply, intent, created_at
       FROM records
       WHERE child_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [childId]
    );
    return NextResponse.json({ code: 0, message: "成功", data: { records } });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
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
    const child = await queryOne(
      `SELECT id FROM children WHERE id = $1 AND user_id = $2`,
      [childId, auth.userId]
    );

    if (!child) {
      return NextResponse.json({ code: 403, message: "无权访问" }, { status: 403 });
    }

    const record = await queryOne(
      `INSERT INTO records (child_id, content, reply, intent)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [childId, content, reply, intent]
    );

    return NextResponse.json({ code: 0, message: "成功", data: { record } });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
