import { prisma } from './prisma';
import { addMonths } from './user-expiry';

// ========== 常量 ==========

export const POINTS_EARN = {
  // 核心使用行为
  record: 10,          // 添加陪伴记录
  nourishment: 5,      // 滋养时刻（手动/AI提取）
  vent: 5,             // 压力吐槽
  reflection: 5,       // 家长反思
  report: 10,          // 生成全景报告

  // 推广行为
  share: 1,            // 分享被点击
  invite: 20,          // 邀请注册成功

  // 一次性奖励
  firstProfile: 20,    // 首次完善孩子画像
  firstChild: 10,      // 首次添加孩子
} as const;

export const POINTS_REDEEM = {
  oneMonth: { months: 1, points: 100 },
  sixMonths: { months: 6, points: 500 },
  twelveMonths: { months: 12, points: 800 },
} as const;

export const MAX_POINTS = 10000;  // 积分上限
export const MAX_EXPIRE_MONTHS = 24;  // 时长上限

export type EarnType = keyof typeof POINTS_EARN;
export type RedeemType = keyof typeof POINTS_REDEEM;

// ========== 积分获取 ==========

export interface EarnResult {
  success: boolean;
  points: number;
  newBalance: number;
  type: string;
}

/**
 * 记录积分获取
 */
export async function earnPoints(
  userId: string,
  type: EarnType,
  relatedId?: string,
  description?: string
): Promise<EarnResult> {
  const amount = POINTS_EARN[type];
  if (!amount) {
    return { success: false, points: 0, newBalance: 0, type };
  }

  // 获取用户当前积分
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });

  if (!user) {
    return { success: false, points: 0, newBalance: 0, type };
  }

  // 检查积分上限
  if (user.points >= MAX_POINTS) {
    return { success: false, points: 0, newBalance: user.points, type };
  }

  // 计算实际可获得的积分
  let actualAmount = amount;
  let newBalance = user.points + amount;

  if (newBalance > MAX_POINTS) {
    actualAmount = MAX_POINTS - user.points;
    newBalance = MAX_POINTS;
  }

  if (actualAmount <= 0) {
    return { success: false, points: 0, newBalance, type };
  }

  // 更新用户积分并记录流水
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { points: newBalance },
    }),
    prisma.pointTransaction.create({
      data: {
        userId,
        type: `earn_${type}`,
        amount: actualAmount,
        balance: newBalance,
        description: description || getEarnDescription(type),
        relatedId,
      },
    }),
  ]);

  return { success: true, points: actualAmount, newBalance, type };
}

/**
 * 获取积分描述
 */
function getEarnDescription(type: EarnType): string {
  const descriptions: Record<EarnType, string> = {
    record: '添加陪伴记录',
    nourishment: '添加滋养时刻',
    vent: '提交压力吐槽',
    reflection: '提交家长反思',
    report: '生成全景报告',
    share: '分享被点击',
    invite: '邀请注册成功',
    firstProfile: '首次完善孩子画像',
    firstChild: '首次添加孩子',
  };
  return descriptions[type] || type;
}

// ========== 积分兑换 ==========

export interface RedeemResult {
  success: boolean;
  pointsSpent: number;
  monthsAdded: number;
  newExpireAt: Date | null;
  error?: string;
}

/**
 * 兑换时长
 */
export async function redeemPoints(
  userId: string,
  redeemType: RedeemType
): Promise<RedeemResult> {
  const redeemConfig = POINTS_REDEEM[redeemType];
  if (!redeemConfig) {
    return { success: false, pointsSpent: 0, monthsAdded: 0, newExpireAt: null, error: '无效的兑换类型' };
  }

  const { months, points } = redeemConfig;

  // 获取用户
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true, expireAt: true },
  });

  if (!user) {
    return { success: false, pointsSpent: 0, monthsAdded: 0, newExpireAt: null, error: '用户不存在' };
  }

  // 检查积分是否足够
  if (user.points < points) {
    return { success: false, pointsSpent: 0, monthsAdded: 0, newExpireAt: null, error: '积分不足' };
  }

  // 计算新的到期时间
  const now = new Date();
  let currentExpireAt = user.expireAt;

  // 如果已过期或无时长，从现在开始算
  if (!currentExpireAt || currentExpireAt < now) {
    currentExpireAt = now;
  }

  // 计算新的到期时间
  const newExpireAt = addMonths(currentExpireAt, months);

  // 检查是否超过上限
  const maxExpireAt = addMonths(now, MAX_EXPIRE_MONTHS);
  let actualNewExpireAt = newExpireAt;
  if (newExpireAt > maxExpireAt) {
    actualNewExpireAt = maxExpireAt;
  }

  // 计算实际延长的月数
  const actualMonths = months;
  const newBalance = user.points - points;

  // 更新用户积分和时长
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        points: newBalance,
        expireAt: actualNewExpireAt,
      },
    }),
    prisma.pointTransaction.create({
      data: {
        userId,
        type: 'redeem',
        amount: -points,
        balance: newBalance,
        description: `兑换${months}个月时长`,
        relatedId: redeemType,
      },
    }),
  ]);

  return {
    success: true,
    pointsSpent: points,
    monthsAdded: actualMonths,
    newExpireAt: actualNewExpireAt,
  };
}

// ========== 查询接口 ==========

/**
 * 获取用户积分信息
 */
export async function getUserPoints(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      points: true,
      expireAt: true,
    },
  });

  if (!user) {
    return null;
  }

  // 获取本月积分获取统计
  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-09"
  const monthStats = await prisma.pointTransaction.groupBy({
    by: ['type'],
    where: {
      userId,
      type: { startsWith: 'earn_' },
      createdAt: {
        gte: new Date(`${currentMonth}-01`),
      },
    },
    _sum: { amount: true },
  });

  return {
    balance: user.points,
    maxPoints: MAX_POINTS,
    expireAt: user.expireAt,
    monthStats,
  };
}

/**
 * 获取积分流水
 */
export async function getPointHistory(
  userId: string,
  limit = 50,
  offset = 0
) {
  const transactions = await prisma.pointTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.pointTransaction.count({
    where: { userId },
  });

  return { transactions, total };
}

/**
 * 检查是否已领取过一次性奖励
 */
export async function hasEarnedOneTimeReward(
  userId: string,
  type: EarnType
): Promise<boolean> {
  const rewardType = `earn_${type}`;
  const existing = await prisma.pointTransaction.findFirst({
    where: { userId, type: rewardType },
  });
  return !!existing;
}

/**
 * 检查用户是否有孩子
 */
export async function hasChildren(userId: string): Promise<boolean> {
  const child = await prisma.child.findFirst({
    where: { userId },
  });
  return !!child;
}

/**
 * 检查孩子画像是否已完善
 */
export async function isProfileComplete(childId: string): Promise<boolean> {
  const profile = await prisma.childProfile.findUnique({
    where: { childId },
  });
  if (!profile) return false;

  // 检查是否有足够的字段填写
  const fields = [profile.personality, profile.interests, profile.strengths];
  return fields.every(f => f && Object.keys(f).length > 0);
}
