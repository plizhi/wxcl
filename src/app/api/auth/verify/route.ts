import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!code) {
      return NextResponse.json({ code: 400, message: '请输入激活码' }, { status: 400 });
    }

    // 查找有效的激活码
    // 支持：绑定手机的激活码（按手机号+激活码匹配）或 通用激活码（仅按激活码匹配）
    const session = await queryOne<{
      id: string;
      phone: string;
      code: string;
      expires_at: Date;
      used: boolean;
    }>(
      `SELECT id, phone, code, expires_at, used FROM auth_sessions
       WHERE code = $1 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [code]
    );

    if (!session) {
      return NextResponse.json({ code: 400, message: '激活码无效或已过期' }, { status: 400 });
    }

    if (session.used) {
      return NextResponse.json({ code: 400, message: '激活码已被使用' }, { status: 400 });
    }

    // 如果激活码绑定了手机号，验证手机号是否匹配
    if (session.phone && phone && session.phone !== phone) {
      return NextResponse.json({ code: 400, message: '激活码与手机号不匹配' }, { status: 400 });
    }

    // 标记激活码已使用
    await query('UPDATE auth_sessions SET used = TRUE WHERE id = $1', [session.id]);

    // 确定用户手机号（优先使用激活码绑定的手机号，如果没有则用用户输入的）
    const userPhone = session.phone || phone || '';

    // 查找或创建用户
    let user = await queryOne<{ id: string }>('SELECT id FROM users WHERE phone = $1', [userPhone]);

    if (!user) {
      // 新用户，创建记录
      const result = await query<{ id: string }>(
        'INSERT INTO users (phone, nickname) VALUES ($1, $2) RETURNING id',
        [userPhone, '用户']
      );
      user = result[0];
    }

    // 生成 token
    const token = generateToken({ userId: user.id, phone: userPhone });

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
