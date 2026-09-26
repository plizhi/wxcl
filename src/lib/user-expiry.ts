import { prisma } from '@/lib/prisma';

// ========== 常量 ==========

export const INITIAL_MONTHS = 6;      // 注册赠送
export const MAX_MONTHS = 24;        // 上限
export const OLD_USER_MONTHS = 24;   // 老用户补偿

export const REWARDS = {
  share: { target: 3, extendMonths: 1 },    // 每月分享3次 +1个月
  invite: { target: 1, extendMonths: 3 },    // 每月邀请1人 +3个月
  feedback: { target: 3, extendMonths: 1 }, // 每月反馈3次 +1个月
} as const;

export type ActivityType = keyof typeof REWARDS;

// ========== 工具函数 ==========

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// ========== 时长检查 ==========

export interface ExpiryStatus {
  expired: boolean;
  expireAt: string | null;
  remainingDays: number | null;
  isOldUser: boolean;
  isPending: boolean;
}

/**
 * 获取用户的时长状态
 */
export async function getExpiryStatus(userId: string): Promise<ExpiryStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expireAt: true, status: true },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // pending 用户特殊处理
  if (user.status === 'pending') {
    return {
      expired: true,
      expireAt: null,
      remainingDays: null,
      isOldUser: false,
      isPending: true,
    };
  }

  if (!user.expireAt) {
    // 无限制用户
    return {
      expired: false,
      expireAt: null,
      remainingDays: null,
      isOldUser: false,
      isPending: false,
    };
  }

  const now = new Date();
  const expired = user.expireAt < now;
  const remainingMs = user.expireAt.getTime() - now.getTime();
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  // isOldUser: 从未有过延长记录，且到期时间 > 24个月（说明是初始化给的）
  const firstActivity = await prisma.userActivity.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  const isOldUser = !firstActivity && user.expireAt > addMonths(now, MAX_MONTHS - 1);

  return {
    expired,
    expireAt: user.expireAt.toISOString(),
    remainingDays: Math.max(0, remainingDays),
    isOldUser,
    isPending: false,
  };
}

/**
 * 检查用户是否已过期（用于中间件）
 * pending 状态的用户始终视为过期
 */
export async function isExpired(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expireAt: true, status: true },
  });

  if (!user) {
    return false;
  }

  // pending 用户始终视为过期
  if (user.status === 'pending') {
    return true;
  }

  // 无限制用户未过期
  if (!user.expireAt) {
    return false;
  }

  return user.expireAt < new Date();
}

// ========== 行为记录 ==========

export interface ActivityResult {
  success: boolean;
  currentMonthCount: number;
  target: number;
  extended: boolean;
  extendMonths?: number;
}

/**
 * 记录用户行为
 */
export async function recordActivity(userId: string, type: ActivityType): Promise<ActivityResult> {
  const month = getCurrentMonth();
  const reward = REWARDS[type];

  // 查找或创建当月记录
  const existing = await prisma.userActivity.findUnique({
    where: {
      userId_type_month: { userId, type, month },
    },
  });

  let currentCount = existing?.count || 0;
  let extended = false;
  let extendMonths: number | undefined;

  if (!existing) {
    // 首次记录
    await prisma.userActivity.create({
      data: { userId, type, month, count: 1 },
    });
    currentCount = 1;
  } else {
    // 更新计数
    await prisma.userActivity.update({
      where: { id: existing.id },
      data: { count: { increment: 1 } },
    });
    currentCount++;
  }

  // 检查是否达标（首次达标时延长时长）
  if (currentCount === reward.target) {
    const result = await extendExpiry(userId, reward.extendMonths);
    extended = result.extended;
    extendMonths = result.extendMonths;
  }

  return {
    success: true,
    currentMonthCount: currentCount,
    target: reward.target,
    extended,
    extendMonths,
  };
}

// ========== 时长延长 ==========

export interface ExtendResult {
  extended: boolean;
  extendMonths: number;
  newExpireAt: Date | null;
}

export async function extendExpiry(userId: string, months: number): Promise<ExtendResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expireAt: true },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const now = new Date();
  let newExpireAt: Date;

  if (!user.expireAt) {
    // 无限制用户，不需要延长
    return { extended: false, extendMonths: 0, newExpireAt: null };
  }

  // 计算新的到期时间
  if (user.expireAt < now) {
    // 已过期，从现在起算
    newExpireAt = addMonths(now, months);
  } else {
    // 未过期，在当前基础上增加
    newExpireAt = addMonths(user.expireAt, months);
  }

  // 检查是否超过上限
  const maxExpireAt = addMonths(now, MAX_MONTHS);
  if (newExpireAt > maxExpireAt) {
    newExpireAt = maxExpireAt;
  }

  // 计算实际延长的月数
  const oldExpireAt = user.expireAt < now ? now : user.expireAt;
  const actualMonths = Math.ceil((newExpireAt.getTime() - oldExpireAt.getTime()) / (1000 * 60 * 60 * 24 * 30));

  // 更新数据库
  await prisma.user.update({
    where: { id: userId },
    data: { expireAt: newExpireAt },
  });

  return {
    extended: true,
    extendMonths: actualMonths,
    newExpireAt,
  };
}

/**
 * 解冻账号：inviter 邀请1人注册后，解冻 inviter 自己
 */
export async function unfreezeByInvite(inviterUserId: string) {
  // 检查 inviter 是否已过期
  const user = await prisma.user.findUnique({
    where: { id: inviterUserId },
    select: { expireAt: true },
  });

  if (!user) return 0;

  // 只有过期或无限制的用户才需要解冻
  const now = new Date();
  if (user.expireAt && user.expireAt > now) {
    // 未过期，不需要解冻
    return 0;
  }

  // 解冻 inviter，给6个月时长
  const newExpireAt = addMonths(now, INITIAL_MONTHS);

  await prisma.user.update({
    where: { id: inviterUserId },
    data: { expireAt: newExpireAt },
  });

  return 1;
}

// ========== 老用户初始化 ==========

export async function initializeOldUsers(): Promise<number> {
  // 找到所有没有过期时间且没有任何行为记录的用户
  const oldUsers = await prisma.user.findMany({
    where: {
      expireAt: null,
      activities: { none: {} },
    },
    select: { id: true },
  });

  const expireAt = addMonths(new Date(), OLD_USER_MONTHS);

  for (const user of oldUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { expireAt },
    });
  }

  return oldUsers.length;
}

// ========== 新用户注册 ==========

export async function initializeNewUser(userId: string): Promise<void> {
  const expireAt = addMonths(new Date(), INITIAL_MONTHS);

  await prisma.user.update({
    where: { id: userId },
    data: { expireAt },
  });
}
