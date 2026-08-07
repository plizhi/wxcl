import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

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

// 获取事件列表
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

  const eventType = req.nextUrl.searchParams.get("eventType");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  try {
    let sql = `SELECT id, child_id, event_type, fact, interpretation, source, created_at
               FROM profile_events
               WHERE child_id = $1`;
    const params: any[] = [childId];

    if (eventType) {
      sql += ` AND event_type = $2`;
      params.push(eventType);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const events = await query(sql, params);

    return NextResponse.json({ code: 0, message: "成功", data: {
      events: events.map(e => ({
        id: e.id,
        childId: e.child_id,
        eventType: e.event_type,
        fact: e.fact,
        interpretation: e.interpretation,
        source: e.source,
        createdAt: e.created_at,
      }))
    }});
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

// 添加事件
export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    let { childId, eventType, fact, interpretation, source = 'manual' } = body;

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

    if (!eventType || !fact) {
      return NextResponse.json({ code: 400, message: "eventType and fact required" }, { status: 400 });
    }

    const validTypes = ['strength', 'challenge', 'milestone', 'interaction', 'growth'];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json({ code: 400, message: "invalid eventType" }, { status: 400 });
    }

    const result = await queryOne(
      `INSERT INTO profile_events (child_id, event_type, fact, interpretation, source)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, child_id, event_type, fact, interpretation, source, created_at`,
      [childId, eventType, fact, interpretation, source]
    );

    return NextResponse.json({ code: 0, message: "成功", data: {
      event: {
        id: result.id,
        childId: result.child_id,
        eventType: result.event_type,
        fact: result.fact,
        interpretation: result.interpretation,
        source: result.source,
        createdAt: result.created_at,
      }
    }});
  } catch (err) {
    logger.error("DB error:", { error: String(err) });
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
