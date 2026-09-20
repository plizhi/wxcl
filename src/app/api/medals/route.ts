import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api-error';
import { getAuthFromRequest } from '@/lib/auth-utils';
import { errors } from '@/lib/api-error';
import { getUserMedals } from '@/lib/medal';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw errors.unauthorized();
  }

  const medals = await getUserMedals(auth.userId);

  return NextResponse.json({
    code: 0,
    message: 'success',
    data: medals,
  });
});
