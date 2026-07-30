import { NextResponse } from 'next/server';

export function apiSuccess<T>(data: T, message = '成功') {
  return NextResponse.json({ code: 0, message, data });
}

export function apiError(message: string, code = 400, status = 400) {
  return NextResponse.json({ code, message }, { status });
}

export function requireAuth(auth: { userId?: string } | null) {
  if (!auth || !auth.userId) {
    return apiError('未登录', 401, 401);
  }
  return null;
}
