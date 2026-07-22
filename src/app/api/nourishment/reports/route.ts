import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

const DEFAULT_CHILD_ID = '00000000-0000-0000-0000-000000000001';

const transformReport = (r: any) => ({
  id: r.id, childId: r.child_id, periodType: r.period_type, periodStart: r.period_start,
  periodEnd: r.period_end, content: r.content, momentCount: r.moment_count, createdAt: r.created_at,
});

export async function GET(req: NextRequest) {
  const childId = req.nextUrl.searchParams.get("childId") || DEFAULT_CHILD_ID;
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
  try {
    const { childId = DEFAULT_CHILD_ID, periodType } = await req.json();
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

    const result = await queryOne(
      `INSERT INTO nourishment_reports (child_id, period_type, period_start, period_end, content, moment_count)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [childId, periodType, periodStart, periodEnd, JSON.stringify(reportContent), moments.length]
    );

    return NextResponse.json({ report: transformReport(result) });
  } catch (err) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
