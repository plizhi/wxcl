'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dailyCareApi, nourishmentApi } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const { user, fetchUserInfo } = useAuth();
  const [latestRecord, setLatestRecord] = useState<any>(null);
  const [latestNourishment, setLatestNourishment] = useState<any>(null);
  const [latestVenting, setLatestVenting] = useState<any>(null);

  useEffect(() => {
    fetchUserInfo();
    loadLatestData();
  }, [fetchUserInfo]);

  async function loadLatestData() {
    try {
      // 加载陪伴记录
      const recordsData = await dailyCareApi.getRecords(0, 1);
      if (recordsData.records && recordsData.records.length > 0) {
        setLatestRecord(recordsData.records[0]);
      }
    } catch (e) {
      console.error('加载数据失败', e);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="flex-1 p-4">
        {/* 头部 */}
        <div className="relative mb-6">
          <div
            className="h-40 rounded-2xl bg-cover bg-center bg-no-repeat flex items-end px-6 pb-4"
            style={{ backgroundImage: 'url(/media/apricot-forest-full.png)' }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="relative z-10 w-full">
              <p className="text-white/80 text-sm mb-1">让我们一起在时光里</p>
              <h2 className="text-2xl font-bold text-white tracking-wide">望杏成林</h2>
            </div>
          </div>
        </div>

        {/* 欢迎语 */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-1">
            {user?.nickname || '家长'}，你好
          </h3>
          <p className="text-sm text-gray-400">
            看见孩子，看见自己
          </p>
        </div>

        {/* 三份报告卡片 */}
        <div className="space-y-4">
          {/* 综合报告 */}
          <button
            onClick={() => router.push('/comprehensive-report')}
            className="w-full bg-white rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl">
                📊
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-1">综合报告</h4>
                <p className="text-sm text-gray-500">全景视角，看见成长轨迹</p>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </button>

          {/* 滋养报告 */}
          <button
            onClick={() => router.push('/nourishment')}
            className="w-full bg-white rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-2xl">
                💧
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-1">滋养报告</h4>
                <p className="text-sm text-gray-500">被孩子滋养的温暖时刻</p>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </button>

          {/* 压力报告 */}
          <button
            onClick={() => router.push('/questions')}
            className="w-full bg-white rounded-2xl p-5 shadow-sm text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-2xl">
                💬
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-1">压力报告</h4>
                <p className="text-sm text-gray-500">重新理解那些困惑时刻</p>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </button>
        </div>

        {/* 底部引导 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400 mb-4">
            记录今天，让陪伴被看见
          </p>
          <button
            onClick={() => router.push('/daily-care')}
            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-400 text-white rounded-full text-sm font-medium shadow-lg"
          >
            记录今天 →
          </button>
        </div>
      </div>
    </div>
  );
}
