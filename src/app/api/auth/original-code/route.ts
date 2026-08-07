import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = getTokenFromHeader(authHeader);
  const auth = token ? verifyToken(token) : null;

  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    // 查找用户的原始激活码（从未被使用过，或者被当前用户使用过）
    const codeSession = await queryOne<{
      code: string;
    }>(
      `SELECT code FROM auth_sessions
       WHERE phone = $1 AND used = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [auth.phone]
    );

    if (!codeSession) {
      return NextResponse.json({ code: 404, message: '未找到激活码' }, { status: 404 });
    }

    return NextResponse.json({
      code: 0,
      data: { code: codeSession.code }
    });
  } catch (error) {
    console.error('get original code error:', error);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
