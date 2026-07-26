import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth-utils";

// GET /api/daily-care/records
export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const userId = auth.userId;

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "0");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = page * limit;

  try {
    let records;
    let total;

    if (userId) {
      // 获取用户的孩子的记录
      records = await query(
        `SELECT r.id, r.content, r.reply, r.created_at
         FROM records r
         JOIN children c ON r.child_id = c.id
         WHERE c.user_id = $1 AND r.intent = 'daily'
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      total = await query(
        `SELECT COUNT(*) as count
         FROM records r
         JOIN children c ON r.child_id = c.id
         WHERE c.user_id = $1 AND r.intent = 'daily'`,
        [userId]
      );
    } else {
      return NextResponse.json({ code: 400, message: "请先登录" }, { status: 400 });
    }

    return NextResponse.json({
      records: records.map((r: any) => {
        let report = null;
        if (r.reply) {
          try {
            report = JSON.parse(r.reply);
          } catch (e) {
            // 如果是 Markdown 或其他格式，直接作为字符串处理
            report = { growth_summary: r.reply };
          }
        }
        return {
          id: r.id,
          content: r.content,
          reply: r.reply,
          createdAt: r.created_at,
          report,
        };
      }),
      total: parseInt(total[0]?.count || "0"),
      page,
      limit,
    });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
