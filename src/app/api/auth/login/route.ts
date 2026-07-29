import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { generateToken, verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { phone, password, activationCode, parentRole } = await request.json();

    if (!phone) {
      return NextResponse.json({ code: 400, message: '请输入手机号' }, { status: 400 });
    }

    // 查找用户
    let user = await queryOne<{
      id: string;
      password: string | null;
      nickname: string;
    }>('SELECT id, password, nickname FROM users WHERE phone = $1', [phone]);

    // 验证码登录模式
    if (!password) {
      if (!activationCode) {
        return NextResponse.json({ code: 400, message: '请输入激活码或密码' }, { status: 400 });
      }

      // 查找激活码（用户专属 OR 通用）
      const codeSession = await queryOne<{
        id: string;
        code: string;
        expires_at: Date;
        used: boolean;
      }>(
        `SELECT id, code, expires_at, used FROM auth_sessions
         WHERE code = $1 AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [activationCode]
      );

      if (!codeSession || codeSession.used) {
        return NextResponse.json({ code: 400, message: '激活码无效或已过期' }, { status: 400 });
      }

      // 标记激活码已使用
      await query('UPDATE auth_sessions SET used = TRUE WHERE id = $1', [codeSession.id]);

      // 查找或创建用户
      if (!user) {
        const result = await query<{ id: string }>(
          'INSERT INTO users (phone, nickname, parent_role) VALUES ($1, $2, $3) RETURNING id',
          [phone, '用户', parentRole || null]
        );
        user = { id: result[0].id, password: null, nickname: '用户' };
      }

      const token = generateToken({ userId: user.id, phone });
      return NextResponse.json({
        code: 0,
        message: '注册成功',
        data: { token, userId: user.id }
      });
    }

    // 密码登录模式
    if (!user) {
      return NextResponse.json({ code: 404, message: '用户不存在' }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json({ code: 400, message: '请使用验证码登录' }, { status: 400 });
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json({ code: 400, message: '手机号或密码错误' }, { status: 400 });
    }

    // 更新登录信息
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    const token = generateToken({ userId: user.id, phone });

    return NextResponse.json({
      code: 0,
      message: '登录成功',
      data: { token, userId: user.id }
    });
  } catch (error) {
    console.error('login error:', error);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
