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
