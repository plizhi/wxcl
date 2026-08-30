import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/response';
import { withErrorHandler } from '@/lib/api-error';

// GET - 获取个人推广数据
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return apiError('缺少手机号', 400);
  }

  // 查找申请记录
  const apply = await prisma.apply.findFirst({
    where: { phone },
    orderBy: { createdAt: 'desc' },
  });

  if (!apply) {
    return apiError('申请不存在', 404);
  }

  // 获取直接推荐的用户列表（贡献者）
  const contributors = await prisma.apply.findMany({
    where: { referrerId: apply.id },
    select: { id: true, shareCode: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const contributorList = await Promise.all(
    contributors.map(async (c) => {
      const opens = await prisma.shareLog.count({
        where: { applyId: c.id },
      });
      return {
        id: c.id,
        shareCode: c.shareCode,
        createdAt: c.createdAt,
        opens: opens,
        appliedAt: null,
      };
    })
  );

  // 计算自己带来的总打开数
  const totalOpens = await prisma.shareLog.count({
    where: { applyId: apply.id },
  });

  // 计算贡献的申请数（直接推荐的用户中，有多少人自己也有10+打开）
  const qualifiedContributors = contributorList.filter(c => c.opens >= 10).length;

  // 全局排行榜（只显示前20名，按带来的总打开数排序）
  const allApplies = await prisma.apply.findMany({
    select: { id: true, shareCode: true },
    orderBy: { createdAt: 'desc' },
  });

  const rankingWithStats = await Promise.all(
    allApplies.map(async (a) => {
      const totalOpens = await prisma.shareLog.count({
        where: { applyId: a.id },
      });
      const subApplies = await prisma.apply.findMany({
        where: { referrerId: a.id },
        select: { id: true },
      });
      let qualifiedCount = 0;
      for (const sub of subApplies) {
        const subOpens = await prisma.shareLog.count({
          where: { applyId: sub.id },
        });
        if (subOpens >= 10) {
          qualifiedCount++;
        }
      }
      return {
        id: a.id,
        shareCode: a.shareCode,
        totalOpens,
        qualifiedCount,
      };
    })
  );

  // 按 totalOpens 排序并取前20
  rankingWithStats.sort((a, b) => b.totalOpens - a.totalOpens);
  const rankingList = rankingWithStats.slice(0, 20).map((r, index) => ({
    rank: index + 1,
    id: r.id,
    shareCode: r.shareCode,
    totalOpens: r.totalOpens,
    qualifiedCount: r.qualifiedCount,
  }));

  // 查找自己在排行榜中的位置
  const myRanking = rankingList.findIndex(r => r.id === apply.id);

  return apiSuccess({
    myStats: {
      applyId: apply.id,
      shareCode: apply.shareCode,
      totalOpens: totalOpens,
      qualifiedContributors,
      contributorList,
    },
    ranking: rankingList,
    myRanking: myRanking >= 0 ? myRanking + 1 : null,
  });
});
