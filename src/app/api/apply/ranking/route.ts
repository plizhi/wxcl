import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/response';
import { withErrorHandler } from '@/lib/api-error';

// 获取周期时间范围
function getPeriodRange(period: 'week' | 'month'): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const dayOfWeek = now.getDay(); // 0 = 周日

  if (period === 'week') {
    // 上周一 00:00:00 到 上周日 23:59:59
    const lastMonday = new Date(year, month, date - dayOfWeek - 6);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(year, month, date - dayOfWeek);
    lastSunday.setHours(23, 59, 59, 999);

    return { start: lastMonday, end: lastSunday };
  } else {
    // 上月第一天 00:00:00 到 最后一天 23:59:59
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
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });
}

// 计算某个 Apply 带来的新用户数（在指定周期内，且已激活）
async function getNewUsersInPeriod(applyId: string, start: Date, end: Date): Promise<number> {
  // 直接推荐的用户中，在周期内激活的数量
  return prisma.apply.count({
    where: {
      referrerId: applyId,
      activatedAt: {
        gte: start,
        lte: end,
      },
    },
  });
}

// GET - 获取排行榜
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') as 'week' | 'month' || 'week';
  const type = searchParams.get('type') as 'opens' | 'users' || 'opens';
  const phone = searchParams.get('phone');

  // 获取周期时间范围
  const { start, end } = getPeriodRange(period);

  // 获取所有在周期内有数据的 Apply
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

  // 排序
  if (type === 'opens') {
    allStats.sort((a, b) => b.totalOpens - a.totalOpens);
  } else {
    allStats.sort((a, b) => b.newUsers - a.newUsers);
  }

  // 取前 20 名
  const rankingList = allStats.slice(0, 20).map((stat, index) => ({
    rank: index + 1,
    shareCode: stat.shareCode,
    totalOpens: stat.totalOpens,
    newUsers: stat.newUsers,
  }));

  // 如果提供了手机号，查找当前用户的排名
  let myStats = null;
  if (phone) {
    const myApply = await prisma.apply.findFirst({
      where: { phone },
    });

    if (myApply) {
      const myIndex = allStats.findIndex(s => s.id === myApply.id);
      if (myIndex >= 0) {
        myStats = {
          rank: myIndex + 1,
          shareCode: myApply.shareCode,
          totalOpens: allStats[myIndex].totalOpens,
          newUsers: allStats[myIndex].newUsers,
        };
      }
    }
  }

  return apiSuccess({
    period,
    type,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    ranking: rankingList,
    myStats,
  });
});
