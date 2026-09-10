import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/response';
import { withErrorHandler } from '@/lib/api-error';
import { getAuthFromRequest } from '@/lib/auth-utils';
import { errors } from '@/lib/api-error';
import { recordActivity, type ActivityType } from '@/lib/user-expiry';

const VALID_TYPES: ActivityType[] = ['share', 'invite', 'feedback'];

// POST - 记录用户行为
export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    throw errors.unauthorized();
  }

  const { type } = await req.json();

  if (!type || !VALID_TYPES.includes(type)) {
    return apiError('无效的行为类型', 400);
  }

  const result = await recordActivity(auth.userId, type as ActivityType);

  return apiSuccess(result);
});
