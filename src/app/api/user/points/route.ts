import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';
import { getUserPoints } from '@/lib/points';
import { withErrorHandler } from '@/lib/api-error';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const token = getTokenFromHeader(req.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ code: 401, message: '无效的token' }, { status: 401 });
  }

  const pointsInfo = await getUserPoints(payload.userId);
  if (!pointsInfo) {
    return NextResponse.json({ code: 404, message: '用户不存在' }, { status: 404 });
  }

  return NextResponse.json({
    code: 0,
    data: pointsInfo,
  });
});
