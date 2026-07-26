import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
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

// 获取版本历史
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
