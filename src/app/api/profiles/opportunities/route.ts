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
    const status = searchParams.get('status') || 'open';

    if (!childId) {
      return NextResponse.json({ code: 400, message: "缺少 childId" }, { status: 400 });
    }

    // 验证 childId 属于该用户
    const child = await queryOne<{ id: string }>(
      `SELECT id FROM children WHERE id = $1 AND user_id = $2`,
      [childId, auth.userId]
    );

    if (!child) {
      return NextResponse.json({ code: 403, message: "无权访问" }, { status: 403 });
    }

    const opportunities = await query<{
      id: string;
      dimension: string;
      element: string;
      description: string;
      suggestion: string;
      status: string;
      appearance_count: number;
      warning_level: number;
      first_appeared_at: string;
      last_appeared_at: string;
    }>(
      `SELECT id, dimension, element, description, suggestion, status,
              appearance_count, warning_level, first_appeared_at, last_appeared_at
       FROM profile_opportunities
       WHERE child_id = $1 AND status = $2
       ORDER BY warning_level DESC, last_appeared_at DESC`,
      [childId, status]
    );

    return NextResponse.json({ code: 0, data: { opportunities } });
  } catch (err) {
    console.error("Failed to get opportunities:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { opportunityId, status } = await req.json();

    if (!opportunityId || !status) {
      return NextResponse.json({ code: 400, message: "缺少参数" }, { status: 400 });
    }

    // 验证机会窗口属于该用户的孩子
    const opp = await queryOne<{ id: string; child_id: string }>(
      `SELECT po.id, po.child_id
       FROM profile_opportunities po
       JOIN children c ON c.id = po.child_id
       WHERE po.id = $1 AND c.user_id = $2`,
      [opportunityId, auth.userId]
    );

    if (!opp) {
      return NextResponse.json({ code: 403, message: "无权访问" }, { status: 403 });
    }

    await query(
      `UPDATE profile_opportunities SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, opportunityId]
    );

    return NextResponse.json({ code: 0, message: "更新成功" });
  } catch (err) {
    console.error("Failed to update opportunity:", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
