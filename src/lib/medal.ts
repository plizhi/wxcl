import { prisma } from '@/lib/prisma';
import type { Badge } from '@/lib/types';

export const MEDAL_TYPES = {
  WEEK_OPENS_CHAMPION: {
    code: 'week_opens',
    name: '周榜打开王',
    icon: '🏆',
    description: '周榜打开数第1名',
  },
  WEEK_USERS_CHAMPION: {
    code: 'week_users',
    name: '周榜邀请王',
    icon: '👑',
    description: '周榜新用户数第1名',
  },
} as const;

export type MedalType = typeof MEDAL_TYPES[keyof typeof MEDAL_TYPES];

/**
 * 获取用户的所有勋章
 */
export async function getUserMedals(userId: string): Promise<Badge[]> {
  console.log('[medal.ts] getUserMedals called with userId:', userId);
  try {
    // 查询该用户所有 ApplyReward 中 medal=true 的记录
    // 需要通过 Apply 表关联
    const rewards = await prisma.applyReward.findMany({
      where: {
        medal: true,
        apply: {
          userId: userId,
        },
      },
      include: {
        apply: {
          select: {
            id: true,
            shareCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rewards.map((reward) => {
      const medalInfo = reward.type === 'opens'
        ? MEDAL_TYPES.WEEK_OPENS_CHAMPION
        : MEDAL_TYPES.WEEK_USERS_CHAMPION;

      return {
        code: `${medalInfo.code}_${reward.apply.shareCode.slice(-4)}`,
        name: medalInfo.name,
        icon: medalInfo.icon,
        period: reward.period,
        rank: reward.rank,
        earnedAt: reward.createdAt.toISOString(),
      };
    });
  } catch (error) {
    console.error('[medal.ts] Error:', error);
    throw error;
  }
}
