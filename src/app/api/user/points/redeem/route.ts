import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';
import { redeemPoints } from '@/lib/points';
import { withErrorHandler } from '@/lib/api-error';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const token = getTokenFromHeader(req.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ code: 401, message: '无效的token' }, { status: 401 });
  }

  const { redeemType } = await req.json();

  const result = await redeemPoints(payload.userId, redeemType);

  if (!result.success) {
    return NextResponse.json({
      code: 400,
      message: result.error || '兑换失败',
    }, { status: 400 });
  }

  return NextResponse.json({
    code: 0,
    data: {
      success: true,
      pointsSpent: result.pointsSpent,
      monthsAdded: result.monthsAdded,
      newExpireAt: result.newExpireAt,
    },
  });
});
