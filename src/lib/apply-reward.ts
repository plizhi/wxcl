import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// 生成邀请码
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

// 获取周期时间范围
export function getPeriodRange(period: 'week' | 'month'): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const dayOfWeek = now.getDay();

  if (period === 'week') {
    const lastMonday = new Date(year, month, date - dayOfWeek - 6);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(year, month, date - dayOfWeek);
    lastSunday.setHours(23, 59, 59, 999);

    return { start: lastMonday, end: lastSunday };
  } else {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    lastDay.setHours(23, 59, 59, 999);

    return { start: firstDay, end: lastDay };
  }
}

// 计算某个 Apply 的分享打开数（在指定周期内）
async function getOpensInPeriod(applyId: string, start: Date, end: Date): Promise<number> {
  return prisma.shareLog.count({
    where: {
      applyId,
      createdAt: { gte: start, lte: end },
    },
  });
}

// 计算某个 Apply 带来的新用户数（在指定周期内）
async function getNewUsersInPeriod(applyId: string, start: Date, end: Date): Promise<number> {
  return prisma.apply.count({
    where: {
      referrerId: applyId,
      activatedAt: { gte: start, lte: end },
    },
  });
}

// 激励规则
const REWARD_RULES = {
  week: {
    opens: [{ rank: 1, reward: 'invite_code', medal: true }],
    users: [{ rank: 1, reward: 'invite_code', medal: true }],
  },
  month: {
    opens: [
      { rank: 1, reward: 'invite_code', medal: false },
      { rank: 2, reward: 'invite_code', medal: false },
      { rank: 3, reward: 'invite_code', medal: false },
    ],
    users: [
      { rank: 1, reward: 'invite_code', medal: false },
      { rank: 2, reward: 'invite_code', medal: false },
      { rank: 3, reward: 'invite_code', medal: false },
    ],
  },
};

// 检查并发放激励
export async function checkAndGrantRewards(period: 'week' | 'month'): Promise<{
  opens: Array<{ rank: number; shareCode: string; rewardCode?: string }>;
  users: Array<{ rank: number; shareCode: string; rewardCode?: string }>;
}> {
  const { start, end } = getPeriodRange(period);

  // 获取所有 Apply
  const allApplies = await prisma.apply.findMany({
    select: { id: true, shareCode: true },
  });

  // 计算每个 Apply 的统计数据
  const statsPromises = allApplies.map(async (apply) => {
    const totalOpens = await getOpensInPeriod(apply.id, start, end);
    const newUsers = await getNewUsersInPeriod(apply.id, start, end);

    return {
      id: apply.id,
      shareCode: apply.shareCode,
      totalOpens,
      newUsers,
    };
  });

  const allStats = await Promise.all(statsPromises);

  // 按 opens 排序
  const opensRanking = [...allStats].sort((a, b) => b.totalOpens - a.totalOpens);
  // 按 users 排序
  const usersRanking = [...allStats].sort((a, b) => b.newUsers - a.newUsers);

  const result = {
    opens: [] as Array<{ rank: number; shareCode: string; rewardCode?: string }>,
    users: [] as Array<{ rank: number; shareCode: string; rewardCode?: string }>,
  };

  // 处理 opens 排行榜
  const opensRules = REWARD_RULES[period].opens;
  for (const rule of opensRules) {
    const topApply = opensRanking[rule.rank - 1];
    if (!topApply || topApply.totalOpens === 0) continue;

    // 检查是否已经发放过这个周期的这个类型的激励
    const existing = await prisma.applyReward.findUnique({
      where: {
        applyId_period_type: {
          applyId: topApply.id,
          period,
          type: 'opens',
        },
      },
    });

    if (!existing) {
      // 生成奖励邀请码
      const rewardCode = rule.reward === 'invite_code' ? generateInviteCode() : undefined;

      // 创建激励记录
      await prisma.applyReward.create({
        data: {
          applyId: topApply.id,
          period,
          type: 'opens',
          rank: rule.rank,
          rewardCode,
          medal: rule.medal,
        },
      });

      // 将邀请码发放给该 Apply（设置 inviteCode）
      await prisma.apply.update({
        where: { id: topApply.id },
        data: {
          inviteCode: rewardCode,
          inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天有效期
        },
      });

      result.opens.push({ rank: rule.rank, shareCode: topApply.shareCode, rewardCode });
    }
  }

  // 处理 users 排行榜
  const usersRules = REWARD_RULES[period].users;
  for (const rule of usersRules) {
    const topApply = usersRanking[rule.rank - 1];
    if (!topApply || topApply.newUsers === 0) continue;

    const existing = await prisma.applyReward.findUnique({
      where: {
        applyId_period_type: {
          applyId: topApply.id,
          period,
          type: 'users',
        },
      },
    });

    if (!existing) {
      const rewardCode = rule.reward === 'invite_code' ? generateInviteCode() : undefined;

      await prisma.applyReward.create({
        data: {
          applyId: topApply.id,
          period,
          type: 'users',
          rank: rule.rank,
          rewardCode,
          medal: rule.medal,
        },
      });

      await prisma.apply.update({
        where: { id: topApply.id },
        data: {
          inviteCode: rewardCode,
          inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      result.users.push({ rank: rule.rank, shareCode: topApply.shareCode, rewardCode });
    }
  }

  return result;
}
