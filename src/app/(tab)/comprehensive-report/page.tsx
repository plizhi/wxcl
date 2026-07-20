'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dailyCareApi, DailyCareReport, DailyCareRecord } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

type TimeRange = '7days' | '30days' | 'all';

export default function ComprehensiveReportPage() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const { toast } = useToast();

  const [records, setRecords] = useState<DailyCareRecord[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [report, setReport] = useState<DailyCareReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      loadRecords();
    }
  }, [isLoading]);

  async function loadRecords() {
    try {
      const data = await dailyCareApi.getRecords(0, 1000);
      setRecords(data.records || []);
    } catch (e) {
      console.error('加载记录失败', e);
    }
  }

  function getDateRange() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (timeRange === 'all') return { startDate: undefined, endDate: todayStr };

    const days = timeRange === '7days' ? 7 : 30;
    const start = new Date(today);
    start.setDate(today.getDate() - days);
    const startStr = start.toISOString().split('T')[0];

    return { startDate: startStr, endDate: todayStr };
  }

  function getFilteredRecordCount() {
    const { startDate, endDate } = getDateRange();
    return records.filter((r) => {
      const created = new Date(r.createdAt).toISOString().split('T')[0];
      if (startDate && created < startDate) return false;
      if (endDate && created > endDate) return false;
      return true;
    }).length;
  }

  async function handleGenerate() {
    const filteredCount = getFilteredRecordCount();
    if (filteredCount < 3) {
      toast('全景报告需要至少3条记录', 'error');
      return;
    }

    setLoading(true);
    setReport(null);

    const { startDate, endDate } = getDateRange();

    try {
      const result = await dailyCareApi.getComprehensive(undefined, startDate, endDate);
      if (result.error) {
        toast(result.error, 'error');
      } else {
        setReport(result);
      }
    } catch (e: any) {
      toast(e.message || '生成失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  }

  const filteredCount = getFilteredRecordCount();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur z-10 border-b border-gray-100">
        <div className="flex items-center gap-4 px-4 h-14">
          <button onClick={() => router.back()} className="text-gray-600 text-xl">←</button>
          <h1 className="text-lg font-medium">📊 全景报告</h1>
        </div>
      </div>

      {/* 时间范围选择 */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3">选择时间范围</p>
          <div className="flex gap-2">
            {([
              { key: '7days', label: '最近7天' },
              { key: '30days', label: '最近30天' },
              { key: 'all', label: '全部' },
            ] as { key: TimeRange; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                  timeRange === key
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={timeRange === key ? { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' } : {}}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 记录数量提示 */}
          <div className="mt-3 text-center">
            <span className={`text-sm ${filteredCount >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
              已选择 {filteredCount} 条记录
              {filteredCount < 3 && <span className="text-red-400">（最少3条）</span>}
            </span>
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={loading || filteredCount < 3}
            className="w-full mt-3 py-2.5 rounded-full text-white text-sm font-medium disabled:opacity-40 transition-all"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {loading ? '🌿 分析中...' : '📊 生成全景报告'}
          </button>
        </div>
      </div>

      {/* 加载动画 */}
      {loading && (
        <div className="px-4">
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-4xl mb-3 animate-bounce">🌿</div>
            <p className="text-gray-500 text-sm">望杏分析中，请稍候...</p>
          </div>
        </div>
      )}

      {/* 报告展示 */}
      {!loading && report && (
        <div className="px-4 py-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">📊</div>
              <h2 className="text-lg font-medium">全景报告</h2>
              <p className="text-xs text-gray-400 mt-1">
                这是你 {filteredCount} 天的望杏林综合画像
              </p>
            </div>

            {/* 生长总结 */}
            {report.growth_summary && (
              <div className="text-center p-3 bg-green-50 rounded-xl mb-4">
                <p className="text-sm text-green-800">{report.growth_summary}</p>
              </div>
            )}

            {/* 亮点 */}
            {report.strengths && report.strengths.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 rounded-xl">
                <h3 className="text-sm font-medium text-amber-600 mb-2">💎 综合亮点</h3>
                <ul className="text-xs text-gray-700 space-y-1">
                  {report.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}

            {/* 机会窗口 */}
            {(report.opportunity_axis1 || report.opportunity_axis2) && (
              <div className="mb-4 p-3 bg-purple-50 rounded-xl">
                <h3 className="text-sm font-medium text-purple-600 mb-2">🌱 综合机会窗口</h3>
                {report.opportunity_axis1 && (
                  <div className="text-xs text-gray-700 mb-1">
                    <span className="font-medium">{report.opportunity_axis1.dimension}：</span>
                    {report.opportunity_axis1.suggestion}
                  </div>
                )}
                {report.opportunity_axis2 && (
                  <div className="text-xs text-gray-700">
                    <span className="font-medium">{report.opportunity_axis2.element}：</span>
                    {report.opportunity_axis2.suggestion}
                  </div>
                )}
              </div>
            )}

            {/* 一句话建议 */}
            {report.advice && (
              <div className="text-center p-3 bg-green-100 rounded-xl mb-3">
                <p className="text-sm text-green-800 italic">💬 {report.advice}</p>
              </div>
            )}
          </div>

          {/* 返回按钮 */}
          <button
            onClick={() => router.push('/')}
            className="w-full mt-4 py-2.5 rounded-full text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            ← 返回首页
          </button>
        </div>
      )}

      {/* 引导 */}
      {!loading && !report && (
        <div className="px-4 py-2">
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs text-green-700 leading-relaxed">
              💡 全景报告综合多天的记录，能帮你看到更长周期的模式和趋势。记录越多，洞察越丰富。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
