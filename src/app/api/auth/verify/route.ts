import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    // 查找有效的验证码
    const session = await queryOne<{
      id: string;
      code: string;
      expires_at: Date;
      used: boolean;
    }>(
      `SELECT id, code, expires_at, used FROM auth_sessions
       WHERE phone = $1 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );

    if (!session) {
      return NextResponse.json({ code: 400, message: '验证码已过期，请重新获取' }, { status: 400 });
    }

    if (session.used) {
      return NextResponse.json({ code: 400, message: '验证码已被使用' }, { status: 400 });
    }

    if (session.code !== code) {
      return NextResponse.json({ code: 400, message: '验证码错误' }, { status: 400 });
    }

    // 标记验证码已使用
    await query('UPDATE auth_sessions SET used = TRUE WHERE id = $1', [session.id]);

    // 查找或创建用户
    let user = await queryOne<{ id: string }>('SELECT id FROM users WHERE phone = $1', [phone]);

    if (!user) {
      // 新用户，创建记录
      const result = await query<{ id: string }>(
        'INSERT INTO users (phone, nickname) VALUES ($1, $2) RETURNING id',
        [phone, '用户']
      );
      user = result[0];
    }

    // 生成 token
    const token = generateToken({ userId: user.id, phone });

    return NextResponse.json({
      code: 0,
      message: '验证成功',
      data: { token, userId: user.id }
    });
  } catch (error) {
    console.error('verify error:', error);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
