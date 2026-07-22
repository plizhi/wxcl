import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const DEFAULT_CHILD_ID = '00000000-0000-0000-0000-000000000001';

// 获取版本历史
export async function GET(req: NextRequest) {
  const childId = req.nextUrl.searchParams.get("childId") || DEFAULT_CHILD_ID;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  try {
    const versions = await query(
      `SELECT id, child_id, version, snapshot, modified_by, modifications, ai_analysis_at_time, review_flags, created_at
       FROM profile_versions
       WHERE child_id = $1
       ORDER BY version DESC
       LIMIT $2 OFFSET $3`,
      [childId, limit, offset]
    );

    return NextResponse.json({
      versions: versions.map(v => ({
        id: v.id,
        childId: v.child_id,
        version: v.version,
        snapshot: v.snapshot,
        modifiedBy: v.modified_by,
        modifications: v.modifications,
        aiAnalysisAtTime: v.ai_analysis_at_time,
        reviewFlags: v.review_flags,
        createdAt: v.created_at,
      }))
    });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
