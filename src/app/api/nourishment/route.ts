import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

const DEFAULT_CHILD_ID = '00000000-0000-0000-0000-000000000001';

const transform = (r: any) => ({
  id: r.id, childId: r.child_id, fact: r.fact, feeling: r.feeling,
  source: r.source, extractedFromRecordId: r.extracted_from_record_id, createdAt: r.created_at,
});

export async function GET(req: NextRequest) {
  const childId = req.nextUrl.searchParams.get("childId") || DEFAULT_CHILD_ID;
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
  try {
    const { childId = DEFAULT_CHILD_ID, fact, feeling, source = 'manual', extractedFromRecordId } = await req.json();
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
