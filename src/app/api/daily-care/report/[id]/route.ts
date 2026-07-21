import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return "1"; // TODO: verify token and extract userId
}

// GET /api/daily-care/report/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const record = await queryOne(
      `SELECT r.id, r.content, r.reply, r.created_at
       FROM records r
       JOIN children c ON r.child_id = c.id
       WHERE r.id = $1 AND c.user_id = $2 AND r.intent = 'daily'`,
      [id, userId]
    );

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    let report = null;
    if (record.reply) {
      try {
        report = JSON.parse(record.reply);
      } catch (e) {
        report = { growth_summary: record.reply };
      }
    }

    return NextResponse.json({
      id: record.id,
      content: record.content,
      reply: record.reply,
      createdAt: record.created_at,
      report,
    });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
