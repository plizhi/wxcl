import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth-utils";

async function getUserFirstChildId(userId: string): Promise<string | null> {
  const child = await query<{ id: string }>(
    `SELECT id FROM children WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [userId]
  );
  return child[0]?.id || null;
}

async function validateChildId(userId: string, childId: string): Promise<boolean> {
  const child = await query<{ id: string }>(
    `SELECT id FROM children WHERE id = $1 AND user_id = $2`,
    [childId, userId]
  );
  return child.length > 0;
}

const transform = (r: any) => ({
  id: r.id, childId: r.child_id, fact: r.fact, feeling: r.feeling,
  source: r.source, extractedFromRecordId: r.extracted_from_record_id, createdAt: r.created_at,
});

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

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "5");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  try {
    const moments = await query(
      `SELECT * FROM nourishment_moments WHERE child_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [childId, limit, offset]
    );
    const { count } = await queryOne(`SELECT COUNT(*) as count FROM nourishment_moments WHERE child_id = $1`, [childId]) || {};
    return NextResponse.json({ moments: moments.map(transform), total: parseInt(count || "0"), limit, offset });
  } catch (err) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    let { childId, fact, feeling, source = 'manual', extractedFromRecordId } = await req.json();

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

    if (!fact) return NextResponse.json({ error: "fact is required" }, { status: 400 });

    const result = await queryOne(
      `INSERT INTO nourishment_moments (child_id, fact, feeling, source, extracted_from_record_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [childId, fact, feeling, source, extractedFromRecordId]
    );
    return NextResponse.json({ moment: transform(result) });
  } catch (err) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
