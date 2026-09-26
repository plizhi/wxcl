import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export const GET = async (req: NextRequest) => {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const rewards = await prisma.applyReward.findMany({
      where: {
        medal: true,
        apply: {
          userId: auth.userId,
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

    const medals = rewards.map((reward) => {
      const medalInfo = reward.type === 'opens'
        ? { code: 'week_opens', name: '周榜打开王', icon: '🏆' }
        : { code: 'week_users', name: '周榜邀请王', icon: '👑' };

      return {
        code: `${medalInfo.code}_${reward.apply.shareCode.slice(-4)}`,
        name: medalInfo.name,
        icon: medalInfo.icon,
        period: reward.period,
        rank: reward.rank,
        earnedAt: reward.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ code: 0, message: 'success', data: medals });
  } catch (e: any) {
    console.error('[medals] Error:', e);
    return NextResponse.json({ code: 500, message: e.message || '服务器错误' }, { status: 500 });
  }
};
