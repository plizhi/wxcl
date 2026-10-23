export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { exchangeCode, fetchUserInfo, bindOrCreateUser, verifyPortalToken } from '@/lib/auth-portal';

export async function GET(request: Request) {
  const url    = new URL(request.url);
  const code   = url.searchParams.get('code');
  const state  = url.searchParams.get('state');

  // 读取 oauth_state cookie
  const cookieState = request.headers
    .get('cookie')?.split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === 'oauth_state')?.[1];

  if (!code || !state || state !== cookieState) {
    return NextResponse.json({ error: 'invalid oauth state' }, { status: 400 });
  }

  try {
    // ① code 换 token
    const tokens = await exchangeCode(code);

    // ② 验签（可选纵深防御）
    await verifyPortalToken(tokens.access_token);

    // ③ 获取用户信息（phone 用于存量匹配）
    const userinfo = await fetchUserInfo(tokens.access_token);

    // ④ 绑定或创建本地用户
    const user = await bindOrCreateUser({
      portal_user_id: userinfo.portal_user_id,
      phone:   userinfo.phone,
      nickname: userinfo.nickname,
    });

    // ⑤ 签发本地会话
    const localToken = generateToken({ userId: user.id, phone: userinfo.phone ?? '' });

    const response = NextResponse.redirect(new URL('/', url.origin));

    response.cookies.set('wxcl_session', localToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   7 * 86400,
      path:     '/',
      sameSite: 'lax',
    });

    // 清除 state cookie
    response.cookies.delete('oauth_state');

    return response;
  } catch (err) {
    console.error('oauth callback error:', err);
    return NextResponse.json({ error: 'authentication failed' }, { status: 401 });
  }
}
