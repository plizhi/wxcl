import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/response';
import { withErrorHandler } from '@/lib/api-error';
import { getAuthFromRequest } from '@/lib/auth-utils';
import { errors } from '@/lib/api-error';
import { getExpiryStatus } from '@/lib/user-expiry';

// GET - 获取时长状态
export const GET = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw errors.unauthorized();
  }

  const status = await getExpiryStatus(auth.userId);

  return apiSuccess(status);
});
