import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// POST /api/auth/portal/exchange
// 一次性兑换 SSO 回调写入的 token，取走即作废
export async function POST(request: NextRequest) {
  const token = request.cookies.get('wxcl_sso_token')?.value;

  if (!token) {
    return NextResponse.json(
      { code: 401, message: '没有待兑换的登录凭证' },
      { status: 401 }
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { code: 401, message: '登录凭证无效' },
      { status: 401 }
    );
  }

  // SSO 用户可能还没设密码、也还没有孩子，前端据此决定下一步
  const [user, childCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: payload.userId },
      select: { password: true, parentRole: true },
    }),
    prisma.child.count({ where: { userId: payload.userId } }),
  ]);

  if (!user) {
    return NextResponse.json(
      { code: 401, message: '账户不存在' },
      { status: 401 }
    );
  }

  const res = NextResponse.json({
    code: 0,
    message: '成功',
    data: {
      token,
      needsPassword: !user.password,
      needsRole: !user.parentRole,
      needsChild: childCount === 0,
    },
  });
  // 用空值 + 同样的 path 覆盖，浏览器才会真正丢掉这份 cookie
  res.cookies.set('wxcl_sso_token', '', {
    path: '/api/auth/portal/exchange',
    maxAge: 0,
  });
  return res;
}
