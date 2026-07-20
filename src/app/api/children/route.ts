import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  // TODO: verify token and extract userId
  // For now, return mock userId
  return "1";
}

// GET /api/children - 获取用户的孩子列表
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const children = await query(
      `SELECT id, name, gender, grade, personality, main_concerns, change_goal, created_at
       FROM children
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return NextResponse.json({ code: 0, data: children });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "Database error" }, { status: 500 });
  }
}

// POST /api/children - 创建孩子档案
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, gender, grade, personality, mainConcerns, changeGoal } = await req.json();

    if (!name || !gender) {
      return NextResponse.json({ code: 400, message: "name and gender required" }, { status: 400 });
    }

    const child = await queryOne(
      `INSERT INTO children (user_id, name, gender, grade, personality, main_concerns, change_goal, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, name, gender, grade, personality, main_concerns, change_goal, created_at`,
      [userId, name, gender, grade || null, personality || null, JSON.stringify(mainConcerns || []), JSON.stringify(changeGoal || [])]
    );

    return NextResponse.json({ code: 0, data: child });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "Database error" }, { status: 500 });
  }
}

// PUT /api/children - 更新孩子档案
export async function PUT(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, name, gender, grade, personality, mainConcerns, changeGoal } = await req.json();

    if (!id) {
      return NextResponse.json({ code: 400, message: "id required" }, { status: 400 });
    }

    const child = await queryOne(
      `UPDATE children
       SET name = COALESCE($1, name),
           gender = COALESCE($2, gender),
           grade = COALESCE($3, grade),
           personality = COALESCE($4, personality),
           main_concerns = COALESCE($5, main_concerns),
           change_goal = COALESCE($6, change_goal)
       WHERE id = $7 AND user_id = $8
       RETURNING id, name, gender, grade, personality, main_concerns, change_goal, created_at`,
      [name, gender, grade, personality, mainConcerns ? JSON.stringify(mainConcerns) : null, changeGoal ? JSON.stringify(changeGoal) : null, id, userId]
    );

    return NextResponse.json({ code: 0, data: child });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "Database error" }, { status: 500 });
  }
}

// DELETE /api/children - 删除孩子档案
export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ code: 401, message: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ code: 400, message: "id required" }, { status: 400 });
  }

  try {
    await query("DELETE FROM children WHERE id = $1 AND user_id = $2", [id, userId]);
    return NextResponse.json({ code: 0 });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ code: 500, message: "Database error" }, { status: 500 });
  }
}
