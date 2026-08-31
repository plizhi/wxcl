'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';

interface Contributor {
  id: string;
  shareCode: string;
  createdAt: string;
  opens: number;
}

interface MyStats {
  applyId: string;
  shareCode: string;
  totalOpens: number;
  qualifiedContributors: number;
  contributorList: Contributor[];
}

interface RankingItem {
  rank: number;
  id: string;
  shareCode: string;
  totalOpens: number;
  qualifiedCount: number;
}

function StatsPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    myStats: MyStats;
    ranking: RankingItem[];
    myRanking: number | null;
  } | null>(null);

  async function fetchStats(phone: string) {
    try {
      const res = await fetch(`/api/apply/stats?phone=${phone}`);
      const result = await res.json();

      if (result.code === 0) {
        setStats(result.data);
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
    if (!authLoading && user?.phone) {
      fetchStats(user.phone);
    } else if (!authLoading && !user?.phone) {
      setLoading(false);
    }
  }, [user, authLoading]);

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

  if (!stats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50 px-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">推广数据中心</h2>
          <p className="text-gray-500 mb-6">你还没有申请记录</p>
          <Link
            href="/apply"
            className="block w-full py-3 bg-purple-600 text-white rounded-full text-center"
          >
            去申请
          </Link>
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
        {/* 我的数据 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4">我的推广数据</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.myStats.totalOpens}</p>
              <p className="text-xs text-gray-500 mt-1">分享被打开</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{stats.myStats.qualifiedContributors}</p>
              <p className="text-xs text-gray-500 mt-1">贡献的申请</p>
            </div>
          </div>

          {stats.myRanking && (
            <div className="bg-green-50 rounded-xl p-4 text-center mb-4">
              <p className="text-sm text-gray-500">你的排名</p>
              <p className="text-2xl font-bold text-green-600">第 {stats.myRanking} 名</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">我邀请的用户</h3>
            {stats.myStats.contributorList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">暂无邀请用户</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {stats.myStats.contributorList.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs text-purple-600">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-600">
                        用户 {c.shareCode.slice(-4)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-purple-600">{c.opens} 打开</p>
                      <p className="text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 排行榜 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4">推广排行榜</h2>

          <div className="space-y-2">
            {stats.ranking.map((item, i) => {
              const isMe = item.id === stats.myStats.applyId;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    isMe ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-400 text-white' :
                      i === 1 ? 'bg-gray-300 text-white' :
                      i === 2 ? 'bg-amber-300 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {i + 1}
                    </span>
                    <span className={`text-sm ${isMe ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                      用户 {item.shareCode.slice(-4)} {isMe ? '(我)' : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-purple-600">{item.totalOpens} 打开</p>
                    <p className="text-xs text-gray-400">{item.qualifiedCount} 贡献</p>
                  </div>
                </div>
              );
            })}
          </div>
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
