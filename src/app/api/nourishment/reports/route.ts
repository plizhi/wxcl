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

const transformReport = (r: any) => ({
  id: r.id, childId: r.child_id, periodType: r.period_type, periodStart: r.period_start,
  periodEnd: r.period_end, content: r.content, momentCount: r.moment_count, createdAt: r.created_at,
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

  const periodType = req.nextUrl.searchParams.get("periodType");

  try {
    let sql = `SELECT * FROM nourishment_reports WHERE child_id = $1`;
    const params: any[] = [childId];
    if (periodType) { sql += ` AND period_type = $2`; params.push(periodType); }
    sql += ` ORDER BY created_at DESC LIMIT 20`;

    const reports = await query(sql, params);
    return NextResponse.json({ reports: reports.map(transformReport) });
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
    let { childId, periodType } = await req.json();

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

    if (!periodType) return NextResponse.json({ error: "periodType is required" }, { status: 400 });

    // 本地日期格式化
    const fmtDate = (d: Date) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    let periodStart: string, periodEnd: string;

    switch (periodType) {
      case 'weekly':
        const weekAgo = new Date(now);
        weekAgo.setDate(date - 7);
        periodStart = fmtDate(weekAgo);
        periodEnd = fmtDate(now);
        break;
      case 'monthly':
        periodStart = fmtDate(new Date(year, month - 1, 1));
        periodEnd = fmtDate(new Date(year, month, 0));
        break;
      case 'quarterly':
        const quarterMonth = Math.floor(month / 3) * 3;
        periodStart = fmtDate(new Date(year, quarterMonth - 3, 1));
        periodEnd = fmtDate(new Date(year, quarterMonth, 0));
        break;
      case 'yearly':
        periodStart = fmtDate(new Date(year - 1, month, date));
        periodEnd = fmtDate(now);
        break;
      default:
        return NextResponse.json({ error: "invalid periodType" }, { status: 400 });
    }

    const moments = await query(
      `SELECT fact, feeling FROM nourishment_moments WHERE child_id = $1 AND DATE(created_at) >= $2 AND DATE(created_at) <= $3`,
      [childId, periodStart, periodEnd]
    );

    const reportContent = {
      periodSummary: `${periodStart} - ${periodEnd} 滋养回顾`,
      momentCount: moments.length,
      feelings: moments.map(m => m.feeling).filter(Boolean),
      facts: moments.map(m => m.fact),
      reflection: moments.length > 0
        ? `这个阶段你被孩子滋养了 ${moments.length} 次，这些温暖的时刻值得被记住。`
        : '还没有记录滋养时刻，去发现那些被孩子滋养的小确幸吧。',
    };

    // 检查是否已存在该 childId + periodType 的报告
    const existing = await query(
      `SELECT id FROM nourishment_reports WHERE child_id = $1 AND period_type = $2`,
      [childId, periodType]
    );

    let result;
    if (existing.length > 0) {
      // 更新已有报告
      result = await queryOne(
        `UPDATE nourishment_reports SET period_start = $3, period_end = $4, content = $5, moment_count = $6, created_at = NOW()
         WHERE id = $1 RETURNING *`,
        [existing[0].id, childId, periodStart, periodEnd, JSON.stringify(reportContent), moments.length]
      );
    } else {
      // 新建报告
      result = await queryOne(
        `INSERT INTO nourishment_reports (child_id, period_type, period_start, period_end, content, moment_count)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [childId, periodType, periodStart, periodEnd, JSON.stringify(reportContent), moments.length]
      );
    }

    return NextResponse.json({ report: transformReport(result) });
  } catch (err) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
