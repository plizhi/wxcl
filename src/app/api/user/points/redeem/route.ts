import { NextRequest, NextResponse } from 'next/server';
import { checkNotExpired } from '@/lib/auth-utils';
import { redeemPoints } from '@/lib/points';
import { withErrorHandler } from '@/lib/api-error';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const authOrRes = await checkNotExpired(req);
  if (authOrRes instanceof NextResponse) return authOrRes;
  const auth = authOrRes;

  const { redeemType } = await req.json();

  const result = await redeemPoints(auth.userId, redeemType);

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
