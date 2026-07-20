'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Nourishment {
  id: number;
  fact: string;
  feeling: string;
  createdAt: string;
}

export default function NourishmentPage() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const [nourishments, setNourishments] = useState<Nourishment[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [fact, setFact] = useState('');
  const [feeling, setFeeling] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  function handleAdd() {
    if (!fact.trim()) return;
    const newItem: Nourishment = {
      id: Date.now(),
      fact: fact.trim(),
      feeling: feeling.trim(),
      createdAt: new Date().toISOString(),
    };
    setNourishments(prev => [newItem, ...prev]);
    setFact('');
    setFeeling('');
    setShowAdd(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur z-10 border-b border-gray-100">
        <div className="flex items-center gap-4 px-4 h-14">
          <button onClick={() => router.back()} className="text-gray-600 text-xl">←</button>
          <h1 className="text-lg font-medium">💧 我的滋养时刻</h1>
        </div>
      </div>

      {/* 添加按钮 */}
      <div className="px-4 py-4">
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3 bg-purple-500 text-white rounded-full text-sm font-medium"
        >
          + 添加滋养时刻
        </button>
      </div>

      {/* 添加表单 */}
      {showAdd && (
        <div className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-medium text-gray-800 mb-3">添加滋养时刻</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">事实</label>
              <textarea
                value={fact}
                onChange={e => setFact(e.target.value)}
                placeholder="孩子做了什么让你感到滋养？"
                rows={3}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">感受</label>
              <textarea
                value={feeling}
                onChange={e => setFeeling(e.target.value)}
                placeholder="那一刻，你的感受是？"
                rows={2}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 border border-gray-200 rounded-full text-gray-500 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={!fact.trim()}
                className="flex-1 py-2 bg-purple-500 text-white rounded-full text-sm disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 滋养报告入口 */}
      <div className="mx-4 mb-4">
        <button className="w-full bg-white rounded-2xl p-4 shadow-sm text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-medium">滋养报告</p>
                <p className="text-xs text-gray-400">本周、本月、本季、年度汇总</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </div>
        </button>
      </div>

      {/* 滋养时刻列表 */}
      <div className="px-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">滋养时刻</h3>
        {nourishments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            还没有滋养时刻，添加第一条吧
          </div>
        ) : (
          <div className="space-y-3">
            {nourishments.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-700 mb-2">{item.fact}</p>
                {item.feeling && (
                  <p className="text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-2 inline-block">
                    {item.feeling}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
