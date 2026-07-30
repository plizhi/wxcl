import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const childId = searchParams.get('childId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let sql = `
      SELECT id, child_id, content, related_record_id, related_opportunity_id, created_at
      FROM parent_reflections
      WHERE user_id = $1
    `;
    const params: any[] = [auth.userId];

    if (childId) {
      sql += ` AND child_id = $2`;
      params.push(childId);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const reflections = await query<{
      id: string;
      child_id: string;
      content: string;
      related_record_id: string;
      related_opportunity_id: string;
      created_at: string;
    }>(sql, params);

    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM parent_reflections WHERE user_id = $1`;
    const countParams = [auth.userId];
    if (childId) {
      countSql += ` AND child_id = $2`;
      countParams.push(childId);
    }
    const countResult = await queryOne<{ total: string }>(countSql, countParams);

    return NextResponse.json({
      code: 0,
      data: {
        reflections,
        total: parseInt(countResult?.total || '0', 10),
      },
    });
  } catch (err) {
    console.error("Failed to get reflections:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { content, childId, relatedRecordId, relatedOpportunityId } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ code: 400, message: "反思内容不能为空" }, { status: 400 });
    }

    // 验证 childId 如果提供的话
    if (childId) {
      const child = await queryOne<{ id: string }>(
        `SELECT id FROM children WHERE id = $1 AND user_id = $2`,
        [childId, auth.userId]
      );
      if (!child) {
        return NextResponse.json({ code: 403, message: "无权访问该孩子的数据" }, { status: 403 });
      }
    }

    const result = await queryOne<{ id: string }>(
      `INSERT INTO parent_reflections (user_id, child_id, content, related_record_id, related_opportunity_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [auth.userId, childId || null, content.trim(), relatedRecordId || null, relatedOpportunityId || null]
    );

    return NextResponse.json({
      code: 0,
      data: { id: result?.id },
      message: "反思已保存",
    });
  } catch (err) {
    console.error("Failed to save reflection:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
