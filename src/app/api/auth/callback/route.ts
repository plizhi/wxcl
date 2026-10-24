export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { exchangeCode, fetchUserInfo, bindOrCreateUser, verifyPortalToken, REDIRECT_URI } from '@/lib/auth-portal';

// GET /api/auth/callback
// 望杏成林账号 SSO 回调：校验 state → 换 token → 取 userinfo → 绑定/创建本地用户
// 本地会话用 Authorization header 传递（前端存 localStorage），
// 因此这里把 token 放进一次性 httpOnly cookie，由前端页换取后立即作废
export async function GET(request: NextRequest) {
  const url    = new URL(request.url);
  const code   = url.searchParams.get('code');
  const state  = url.searchParams.get('state');

  const cookieState = request.cookies.get('oauth_state')?.value;

  if (!code || !state || state !== cookieState) {
    return NextResponse.json({ error: 'invalid oauth state' }, { status: 400 });
  }

  try {
    // ① code 换 token
    const tokens = await exchangeCode(code);

    // ② 验签（纵深防御）
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

    // 反代后 request.url 的 origin 是内网地址（localhost:3011），
    // 跳转目标必须用对外域名
    const response = NextResponse.redirect(new URL('/sso/complete', REDIRECT_URI));

    response.cookies.set('wxcl_sso_token', localToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   120,
      path:     '/api/auth/portal/exchange',
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
