'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dailyCareApi, DailyCareReport, DailyCareRecord } from '@/lib/api';

function getGrowthEmoji(report: DailyCareReport | null): string {
  if (!report) return '🌱';
  const strengthCount = report.strengths?.length || 0;
  if (strengthCount >= 3) return '🌳';
  if (strengthCount >= 1) return '🌿';
  return '🌱';
}

function getGrowthText(report: DailyCareReport | null): string {
  if (!report) return '今天的陪伴还没被记录';
  if (report.growth_summary) return report.growth_summary;
  const strengthCount = report.strengths?.length || 0;
  if (strengthCount >= 3) return '今日陪伴状态良好，继续保持 ✨';
  if (strengthCount >= 1) return '今日在安静中陪伴 🌱';
  return '今日的陪伴在等待下一次';
}

export default function HomePage() {
  const router = useRouter();
  const { user, fetchUserInfo, logout } = useAuth();
  const [latestReport, setLatestReport] = useState<DailyCareReport | null>(null);
  const [latestRecordTime, setLatestRecordTime] = useState<string>('');

  const loadLatestReport = useCallback(async () => {
    try {
      const data = await dailyCareApi.getRecords(0, 1);
      const records = data.records as DailyCareRecord[];
      if (records && records.length > 0) {
        setLatestReport(records[0].report as DailyCareReport || null);
        setLatestRecordTime(records[0].createdAt);
      }
    } catch (e) {
      console.error('加载最近报告失败', e);
    }
  }, []);

  useEffect(() => {
    fetchUserInfo();
    loadLatestReport();
  }, [fetchUserInfo, loadLatestReport]);

  const growthEmoji = getGrowthEmoji(latestReport);
  const growthText = getGrowthText(latestReport);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* 切换到原版按钮 */}
      <div className="fixed top-4 right-4 z-50">
        <a
          href="https://wxcl.nzyy.cc/"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-white/80 backdrop-blur rounded-full shadow-sm text-stone-600 hover:text-stone-900 transition-colors"
        >
          ← 原版
        </a>
      </div>

      {/* 顶部空间留给导航 */}
      <div className="flex-1 p-4">
        {/* 银杏树主题头部 */}
        <div className="relative mb-8">
          <div
            className="h-48 rounded-2xl bg-cover bg-center bg-no-repeat flex items-end px-6 pb-5"
            style={{ backgroundImage: 'url(/v2/media/apricot-forest-full.png)' }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="relative z-10 w-full">
              <p className="text-white/80 text-sm mb-1">让我们一起在时光里</p>
              <h2 className="text-3xl font-bold text-white tracking-wide">望杏成林</h2>
            </div>
          </div>
        </div>

        {/* 欢迎语 */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-medium text-gray-800 mb-1">
            {user?.nickname || '家长'}
          </h3>
          <p className="text-sm text-gray-400">
            {user?.streakDays && user.streakDays > 0
              ? `这是你陪伴记录的第 ${user.streakDays} 天`
              : '记录今天，让陪伴被看见'}
          </p>
        </div>

        {/* 今日状态 */}
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm text-center">
          <div className="text-5xl mb-3">{growthEmoji}</div>
          <p className="text-gray-600 text-sm leading-relaxed">{growthText}</p>
          {latestReport && latestRecordTime && (
            <p className="text-xs text-gray-400 mt-2">
              {new Date(latestRecordTime).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* 记录今天 - 主按钮 */}
        <button
          onClick={() => router.push('/daily-care')}
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-5 shadow-lg bg-gradient-to-r from-amber-500 to-orange-400 text-white font-medium mb-4"
        >
          <span className="text-2xl">📝</span>
          <span className="text-lg">记录今天</span>
        </button>

        {/* 引导语 */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-400 leading-relaxed">
            今天和孩子发生了什么？<br />
            不需要完整，只要真实。
          </p>
        </div>

        {/* 分割线 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-300">有困惑？去压力吐槽</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* 引导去吐槽 */}
        <button
          onClick={() => router.push('/questions')}
          className="w-full flex items-center justify-center gap-2 py-3 border border-purple-200 rounded-xl text-purple-600 hover:bg-purple-50 transition-colors mb-6"
        >
          <span>💬</span>
          <span className="text-sm">压力吐槽 / 专业建议</span>
        </button>

        {/* 登出按钮 */}
        <div className="text-center mt-8">
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
