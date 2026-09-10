import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from './auth';
import { TokenPayload } from './auth';

export interface AuthResult {
  userId: string;
  phone: string;
}

export function getAuthFromRequest(req: NextRequest): AuthResult | null {
  const authHeader = req.headers.get('authorization');
  const token = getTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  return {
    userId: payload.userId,
    phone: payload.phone,
  };
}

export function requireAuth(req: NextRequest): { userId: string; phone: string } | NextResponse {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
  }
  return auth;
}

/**
 * 检查账号是否已过期/冻结
 * 返回 403 响应的 NextResponse 如果已过期
 */
export async function checkNotExpired(req: NextRequest): Promise<AuthResult | NextResponse> {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
  }

  // 动态导入避免循环依赖
  const { isExpired } = await import('./user-expiry');

  if (await isExpired(auth.userId)) {
    return NextResponse.json({
      code: 403,
      message: '账号已冻结，请邀请1人解冻',
      expired: true,
    }, { status: 403 });
  }

  return auth;
}
