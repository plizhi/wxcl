'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { nourishmentApi, NourishmentMoment, NourishmentReport } from '@/lib/api';

const DEFAULT_CHILD_ID = '00000000-0000-0000-0000-000000000001';
const PAGE_SIZE = 5;

const FEELING_OPTIONS = ['温暖', '被爱', '感动', '幸福', '满足', '骄傲'];
const PERIOD_TYPES = [
  { type: 'weekly', label: '本周滋养' },
  { type: 'monthly', label: '本月滋养' },
  { type: 'quarterly', label: '本季滋养' },
  { type: 'yearly', label: '年度滋养' },
];

export default function NourishmentPage() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const [moments, setMoments] = useState<NourishmentMoment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [reports, setReports] = useState<NourishmentReport[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [fact, setFact] = useState('');
  const [feeling, setFeeling] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMoments = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const data = await nourishmentApi.getMoments(DEFAULT_CHILD_ID, PAGE_SIZE, offset);
      if (offset === 0) {
        setMoments(data.moments || []);
      } else {
        setMoments(prev => [...prev, ...(data.moments || [])]);
      }
      setTotal(data.total || 0);
    } catch (e) {
      console.error('加载失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const data = await nourishmentApi.getReports(DEFAULT_CHILD_ID);
      setReports(data.reports || []);
    } catch (e) {
      console.error('加载报告失败', e);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) loadMoments();
  }, [isLoading, loadMoments]);

  async function handleAdd() {
    if (!fact.trim()) return;
    setSaving(true);
    try {
      const data = await nourishmentApi.addMoment({
        childId: DEFAULT_CHILD_ID,
        fact: fact.trim(),
        feeling: feeling.trim(),
        source: 'manual',
      });
      if (data.moment) {
        setMoments(prev => [data.moment, ...prev]);
        setTotal(prev => prev + 1);
        setFact('');
        setFeeling('');
        setShowAdd(false);
      }
    } catch (e) {
      console.error('保存失败', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateReport(periodType: string) {
    setGenerating(periodType);
    try {
      const data = await nourishmentApi.generateReport({ childId: DEFAULT_CHILD_ID, periodType });
      if (data.report) setReports(prev => [data.report, ...prev]);
    } catch (e) {
      console.error('生成报告失败', e);
    } finally {
      setGenerating(null);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-gray-400">加载中...</div></div>;
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
              <label className="block text-xs text-gray-500 mb-1">发生了什么？</label>
              <textarea
                value={fact}
                onChange={e => setFact(e.target.value)}
                placeholder="孩子做了什么让你感到滋养？"
                rows={3}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">那一刻的感受是？</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {FEELING_OPTIONS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFeeling(feeling ? `${feeling}、${f}` : f)}
                    className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs hover:bg-purple-100"
                  >
                    {f}
                  </button>
                ))}
              </div>
              <textarea
                value={feeling}
                onChange={e => setFeeling(e.target.value)}
                placeholder="写下你的感受..."
                rows={2}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAdd(false); setFact(''); setFeeling(''); }}
                className="flex-1 py-2 border border-gray-200 rounded-full text-gray-500 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={!fact.trim() || saving}
                className="flex-1 py-2 bg-purple-500 text-white rounded-full text-sm disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 滋养报告入口 */}
      <div className="mx-4 mb-4">
        <button
          onClick={() => { setShowReports(!showReports); if (!showReports) loadReports(); }}
          className="w-full bg-white rounded-2xl p-4 shadow-sm text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-medium">滋养报告</p>
                <p className="text-xs text-gray-400">本周、本月、本季、年度汇总</p>
              </div>
            </div>
            <span className="text-gray-400">{showReports ? '∧' : '∨'}</span>
          </div>
        </button>

        {showReports && (
          <div className="mt-2 bg-white rounded-2xl p-4 shadow-sm space-y-2">
            <p className="text-xs text-gray-500 mb-2">生成滋养报告</p>
            {PERIOD_TYPES.map(item => (
              <button
                key={item.type}
                onClick={() => handleGenerateReport(item.type)}
                disabled={generating !== null}
                className="w-full py-2 bg-purple-50 text-purple-700 rounded-xl text-sm hover:bg-purple-100 disabled:opacity-50"
              >
                {generating === item.type ? '生成中...' : item.label}
              </button>
            ))}

            {reports.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">历史报告</p>
                {reports.slice(0, 5).map(report => (
                  <div key={report.id} className="py-2 border-b border-gray-50 last:border-0">
                    <p className="text-sm font-medium text-gray-700">{report.content?.periodSummary}</p>
                    <p className="text-xs text-gray-400">{report.momentCount} 个滋养时刻</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 滋养时刻列表 */}
      <div className="px-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          滋养时刻 {total > 0 && <span className="text-gray-400">({total})</span>}
        </h3>
        {moments.length === 0 && !loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">还没有滋养时刻，添加第一条吧</div>
        ) : (
          <div className="space-y-3">
            {moments.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-700 mb-2">{item.fact}</p>
                {item.feeling && (
                  <p className="text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-2 inline-block">{item.feeling}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(item.createdAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                </p>
              </div>
            ))}
            {moments.length < total && (
              <button
                onClick={() => loadMoments(moments.length)}
                disabled={loading}
                className="w-full py-3 text-purple-600 text-sm disabled:opacity-50"
              >
                {loading ? '加载中...' : `加载更多 (${moments.length}/${total})`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
