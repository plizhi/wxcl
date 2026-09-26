import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';
import { getPointHistory } from '@/lib/points';
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

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const history = await getPointHistory(payload.userId, limit, offset);

  return NextResponse.json({
    code: 0,
    data: history,
  });
});
