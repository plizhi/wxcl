import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

// GET /api/records?childId=xxx - 获取孩子的陪伴记录
export async function GET(req: NextRequest) {
  const childId = req.nextUrl.searchParams.get("childId");

  if (!childId) {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
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
    return NextResponse.json({ records });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// POST /api/records - 创建陪伴记录
export async function POST(req: NextRequest) {
  try {
    const { childId, content, reply, intent = "daily" } = await req.json();

    if (!childId || !content) {
      return NextResponse.json({ error: "childId and content required" }, { status: 400 });
    }

    const record = await queryOne(
      `INSERT INTO records (child_id, content, reply, intent)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [childId, content, reply, intent]
    );

    return NextResponse.json({ record });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
