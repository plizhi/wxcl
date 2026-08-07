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

    // 验证码登录模式（注册/忘记密码）
    if (!password) {
      if (!activationCode) {
        return NextResponse.json({ code: 400, message: '请输入激活码或密码' }, { status: 400 });
      }

      // 查找激活码
      const codeSession = await queryOne<{
        id: string;
        code: string;
        phone: string;
        expires_at: Date;
        used: boolean;
      }>(
        `SELECT id, code, phone, expires_at, used FROM auth_sessions
         WHERE code = $1 AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [activationCode]
      );

      if (!codeSession) {
        return NextResponse.json({ code: 400, message: '激活码无效或已过期' }, { status: 400 });
      }

      // 区分新激活码和老激活码：
      // - 新激活码（phone为空）：只能新用户注册
      // - 老激活码（phone已填充）：可用于忘记密码，但必须与手机号匹配
      if (!codeSession.phone) {
        // 新激活码：只能用于新用户注册
        if (user) {
          return NextResponse.json({ code: 400, message: '该激活码已被使用，请使用密码登录' }, { status: 400 });
        }

        // 标记激活码已使用，并记录手机号
        await query('UPDATE auth_sessions SET used = TRUE, phone = $2 WHERE id = $1', [codeSession.id, phone]);

        // 创建新用户，激活码存为密码
        const hashedCode = hashPassword(activationCode);
        const result = await query<{ id: string }>(
          'INSERT INTO users (phone, nickname, parent_role, password) VALUES ($1, $2, $3, $4) RETURNING id',
          [phone, '用户', parentRole || null, hashedCode]
        );
        user = { id: result[0].id, password: hashedCode, nickname: '用户' };

        const token = generateToken({ userId: user.id, phone });
        return NextResponse.json({
          code: 0,
          message: '注册成功',
          data: { token, userId: user.id }
        });
      } else {
        // 老激活码：用于忘记密码，必须手机号匹配
        if (!user) {
          return NextResponse.json({ code: 404, message: '用户不存在' }, { status: 404 });
        }

        if (codeSession.phone !== phone) {
          return NextResponse.json({ code: 400, message: '激活码无效' }, { status: 400 });
        }

        // 用激活码重置密码
        const hashedCode = hashPassword(activationCode);
        await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedCode, user.id]);

        const token = generateToken({ userId: user.id, phone });
        return NextResponse.json({
          code: 0,
          message: '密码已重置',
          data: { token, userId: user.id }
        });
      }
    }

    // 密码登录模式
    if (!user) {
      return NextResponse.json({ code: 404, message: '用户不存在' }, { status: 404 });
    }

    // 验证密码（无论是自定义密码还是原激活码，都通过 password 字段存储）
    if (!user.password || !verifyPassword(password, user.password)) {
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
