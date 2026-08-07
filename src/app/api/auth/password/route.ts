import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTokenFromHeader, verifyToken, hashPassword } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = getTokenFromHeader(authHeader);
  const auth = token ? verifyToken(token) : null;

  if (!auth) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ code: 400, message: "密码至少6位" }, { status: 400 });
    }

    const hashedPassword = hashPassword(password);

    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, auth.userId]
    );

    return NextResponse.json({ code: 0, message: "密码设置成功" });
  } catch (error) {
    console.error('set password error:', error);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
