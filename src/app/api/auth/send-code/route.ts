import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateCode } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ code: 400, message: '请输入正确的手机号' }, { status: 400 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效期

    // 清理该手机号之前的验证码
    await query('DELETE FROM auth_sessions WHERE phone = $1', [phone]);

    // 存储新验证码
    await query(
      'INSERT INTO auth_sessions (phone, code, expires_at) VALUES ($1, $2, $3)',
      [phone, code, expiresAt]
    );

    // TODO: 实际发送短信，这里先打印
    console.log(`[验证码] ${phone}: ${code}`);

    return NextResponse.json({
      code: 0,
      message: '验证码已发送',
      data: { phone }
    });
  } catch (error) {
    console.error('send-code error:', error);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
