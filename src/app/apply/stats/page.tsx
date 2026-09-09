'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';

type Period = 'week' | 'month';
type RankingType = 'opens' | 'users';

interface RankingItem {
  rank: number;
  shareCode: string;
  totalOpens: number;
  newUsers: number;
}

interface RankingResponse {
  period: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  ranking: RankingItem[];
  myStats: {
    rank: number;
    shareCode: string;
    totalOpens: number;
    newUsers: number;
  } | null;
}

function StatsPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');
  const [type, setType] = useState<RankingType>('opens');
  const [data, setData] = useState<RankingResponse | null>(null);

  async function fetchRanking(p: Period, t: RankingType, phone?: string) {
    try {
      const params = new URLSearchParams({ period: p, type: t });
      if (phone) params.append('phone', phone);
      const res = await fetch(`/api/apply/ranking?${params}`);
      const result = await res.json();

      if (result.code === 0) {
        setData(result.data);
      } else {
        toast(result.message || '获取数据失败', 'error');
      }
    } catch (e) {
      toast('网络异常', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (user?.phone) {
        fetchRanking(period, type, user.phone);
      } else {
        fetchRanking(period, type);
        setLoading(false);
      }
    }
  }, [user, authLoading, period, type]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!user?.phone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50 px-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">推广数据中心</h2>
          <p className="text-gray-500 mb-6">请先登录后查看推广数据</p>
          <Link
            href="/login"
            className="block w-full py-3 bg-purple-600 text-white rounded-full text-center"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  const shareCode = typeof window !== 'undefined' ? localStorage.getItem('shareCode') : null;

  if (!data && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50 px-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">推广数据中心</h2>
          {shareCode ? (
            <>
              <p className="text-gray-500 mb-2">你还没有分享数据</p>
              <p className="text-sm text-gray-400 mb-6">分享邀请链接，获得邀请码</p>
              <Link
                href={`/apply/${shareCode}`}
                className="block w-full py-3 bg-purple-600 text-white rounded-full text-center"
              >
                查看我的分享状态
              </Link>
            </>
          ) : (
            <>
              <p className="text-gray-500 mb-6">你还没有申请记录</p>
              <Link
                href="/apply"
                className="block w-full py-3 bg-purple-600 text-white rounded-full text-center"
              >
                去申请
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-gray-600">
            ← 返回
          </button>
          <h1 className="text-lg font-bold text-gray-800">推广数据中心</h1>
          <div className="w-12"></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* 筛选器 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex gap-2 mb-4">
            {/* 周期切换 */}
            <div className="flex bg-gray-100 rounded-full p-1 flex-1">
              <button
                onClick={() => setPeriod('week')}
                className={`flex-1 py-2 text-sm rounded-full transition-colors ${
                  period === 'week'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                周榜
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`flex-1 py-2 text-sm rounded-full transition-colors ${
                  period === 'month'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                月榜
              </button>
            </div>
            {/* 类型切换 */}
            <div className="flex bg-gray-100 rounded-full p-1 flex-1">
              <button
                onClick={() => setType('opens')}
                className={`flex-1 py-2 text-sm rounded-full transition-colors ${
                  type === 'opens'
                    ? 'bg-amber-500 text-white font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                打开数
              </button>
              <button
                onClick={() => setType('users')}
                className={`flex-1 py-2 text-sm rounded-full transition-colors ${
                  type === 'users'
                    ? 'bg-amber-500 text-white font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                新用户
              </button>
            </div>
          </div>

          {/* 周期说明 */}
          {data && (
            <p className="text-xs text-gray-400 text-center">
              {new Date(data.periodStart).toLocaleDateString('zh-CN')}
              {' ~ '}
              {new Date(data.periodEnd).toLocaleDateString('zh-CN')}
            </p>
          )}
        </div>

        {/* 我的排名 */}
        {data?.myStats && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 shadow-lg text-white">
            <p className="text-sm opacity-80 mb-1">
              {period === 'week' ? '本周' : '本月'}{type === 'opens' ? '打开数' : '新用户'}排名
            </p>
            <div className="flex items-end gap-4">
              <p className="text-5xl font-bold">
                {data.myStats.rank > 0 ? `第 ${data.myStats.rank} 名` : '未上榜'}
              </p>
              <div className="pb-2">
                <p className="text-2xl font-bold">
                  {type === 'opens' ? data.myStats.totalOpens : data.myStats.newUsers}
                </p>
                <p className="text-sm opacity-80">
                  {type === 'opens' ? '打开' : '新用户'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 排行榜 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {period === 'week' ? '本周' : '本月'}排行榜
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({type === 'opens' ? '按打开数' : '按新用户数'})
            </span>
          </h2>

          {data?.ranking.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {data?.ranking.map((item) => {
                const isMe = data.myStats && item.rank === data.myStats.rank &&
                  item.shareCode === data.myStats.shareCode;
                return (
                  <div
                    key={`${item.rank}-${item.shareCode}`}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                      isMe ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        item.rank === 1 ? 'bg-yellow-400 text-white' :
                        item.rank === 2 ? 'bg-gray-300 text-white' :
                        item.rank === 3 ? 'bg-amber-300 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {item.rank}
                      </span>
                      <span className={`text-sm ${isMe ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                        {item.shareCode.slice(-4)}
                        {isMe && <span className="ml-1 text-xs">(我)</span>}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-purple-600">
                        {type === 'opens' ? `${item.totalOpens} 打开` : `${item.newUsers} 用户`}
                      </p>
                      {type === 'opens' && item.newUsers > 0 && (
                        <p className="text-xs text-gray-400">{item.newUsers} 新用户</p>
                      )}
                      {type === 'users' && item.totalOpens > 0 && (
                        <p className="text-xs text-gray-400">{item.totalOpens} 打开</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 激励说明 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4">激励规则</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs font-bold flex-shrink-0">周</span>
              <div>
                <p className="text-gray-600">
                  <span className="font-medium text-purple-600">周榜 Top1</span>：1个邀请码 + 电子勋章
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">月</span>
              <div>
                <p className="text-gray-600">
                  <span className="font-medium text-purple-600">月榜 Top3</span>：各1个邀请码
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            统计周期：周榜为上周一至周日，月榜为上月1日至最后一日
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    }>
      <StatsPageContent />
    </Suspense>
  );
}
