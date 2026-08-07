import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

// GET /api/children - 获取用户的孩子列表
export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const userId = auth.userId;

  try {
    const children = await query(
      `SELECT id, name, gender, birth_date, created_at
       FROM children
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return NextResponse.json({ code: 0, data: children });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// POST /api/children - 创建孩子档案
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }
  const userId = auth.userId;

  try {
    const { name, gender, birthDate } = await req.json();

    if (!name || !gender) {
      return NextResponse.json({ code: 400, message: "name and gender required" }, { status: 400 });
    }

    const child = await queryOne(
      `INSERT INTO children (user_id, name, gender, birth_date, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, name, gender, birth_date, created_at`,
      [userId, name, gender, birthDate || null]
    );

    return NextResponse.json({ code: 0, data: child });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// PUT /api/children - 更新孩子档案
export async function PUT(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }
  const userId = auth.userId;

  try {
    const { id, name, gender, birthDate } = await req.json();

    if (!id) {
      return NextResponse.json({ code: 400, message: "id required" }, { status: 400 });
    }

    const child = await queryOne(
      `UPDATE children
       SET name = COALESCE($1, name),
           gender = COALESCE($2, gender),
           birth_date = COALESCE($3, birth_date)
       WHERE id = $4 AND user_id = $5
       RETURNING id, name, gender, birth_date, created_at`,
      [name, gender, birthDate, id, userId]
    );

    return NextResponse.json({ code: 0, data: child });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// DELETE /api/children - 删除孩子档案
export async function DELETE(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }
  const userId = auth.userId;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ code: 400, message: "id required" }, { status: 400 });
  }

  try {
    await query("DELETE FROM children WHERE id = $1 AND user_id = $2", [id, userId]);
    return NextResponse.json({ code: 0 });
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
