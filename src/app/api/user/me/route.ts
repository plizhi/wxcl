import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: 'token无效' }, { status: 401 });
    }

    const user = await queryOne<{
      id: string;
      phone: string;
      nickname: string;
      avatar_url: string | null;
      parent_role: string | null;
      created_at: Date;
    }>(
      `SELECT id, phone, nickname, avatar_url, parent_role, created_at
       FROM users WHERE id = $1`,
      [payload.userId]
    );

    if (!user) {
      return NextResponse.json({ code: 404, message: '用户不存在' }, { status: 404 });
    }

    // 获取孩子数量
    const childrenResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM children WHERE user_id = $1',
      [payload.userId]
    );

    return NextResponse.json({
      code: 0,
      data: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        parentRole: user.parent_role,
        createdAt: user.created_at,
        childCount: parseInt(childrenResult?.count || '0')
      }
    });
  } catch (error) {
    console.error('user/me error:', error);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = getTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ code: 401, message: 'token无效' }, { status: 401 });
    }

    const body = await request.json();
    const { nickname, avatarUrl, parentRole } = body;

    // 构建动态更新查询，只更新提供的字段
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (nickname !== undefined) {
      updates.push(`nickname = $${paramIndex++}`);
      values.push(nickname || null);
    }
    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatarUrl || null);
    }
    if (parentRole !== undefined) {
      updates.push(`parent_role = $${paramIndex++}`);
      values.push(parentRole || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ code: 0, message: '没有需要更新的字段' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(payload.userId);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return NextResponse.json({ code: 0, message: '更新成功' });
  } catch (error) {
    console.error('user/me PATCH error:', error);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
