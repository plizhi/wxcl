import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateCode } from '@/lib/auth';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function checkAdminSecret(request: NextRequest): boolean {
  const secret = request.headers.get('X-Admin-Secret');
  return secret === ADMIN_SECRET;
}

export async function POST(request: NextRequest) {
  if (!checkAdminSecret(request)) {
    return NextResponse.json({ code: 403, message: '无权限' }, { status: 403 });
  }

  try {
    const { phone, count = 1 } = await request.json();

    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ code: 400, message: '请输入正确的手机号' }, { status: 400 });
    }

    const codes = [];
    const actualCount = Math.min(Math.max(1, count), 100); // 限制1-100个

    for (let i = 0; i < actualCount; i++) {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1年有效期

      await query(
        'INSERT INTO auth_sessions (phone, code, expires_at) VALUES ($1, $2, $3)',
        [phone || '', code, expiresAt]
      );

      codes.push({
        phone: phone || '通用',
        code,
        expiresAt: expiresAt.toISOString()
      });
    }

    return NextResponse.json({
      code: 0,
      message: `成功生成 ${actualCount} 个激活码`,
      data: { codes }
    });
  } catch (error) {
    console.error('generate codes error:', error);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!checkAdminSecret(request)) {
    return NextResponse.json({ code: 403, message: '无权限' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const limit = parseInt(searchParams.get('limit') || '50');

    let sql = `
      SELECT id, phone, code, expires_at, used, created_at
      FROM auth_sessions
      WHERE 1=1
    `;
    const params: any[] = [];

    if (phone) {
      params.push(phone);
      sql += ` AND phone = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);

    return NextResponse.json({
      code: 0,
      data: { codes: result }
    });
  } catch (error) {
    console.error('list codes error:', error);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
