'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dailyCareApi, DailyCareReport, DailyCareRecord } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function DailyCarePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DailyCareReport | null>(null);
  const [records, setRecords] = useState<DailyCareRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    try {
      const data = await dailyCareApi.getRecords(0, 5);
      setRecords(data.records || []);
    } catch (e) {
      console.error('加载记录失败', e);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setReport(null);
    try {
      const result = await dailyCareApi.analyze(content.trim());
      setReport(result);
      await loadRecords();
      toast('记录成功', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast(msg || '提交失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadRecordReport(id: number) {
    try {
      const result = await dailyCareApi.getReport(id);
      setReport(result);
      setShowHistory(false);
    } catch (e) {
      console.error('加载报告失败', e);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 bg-white/90 backdrop-blur z-10 border-b border-gray-100">
        <div className="flex items-center gap-4 px-4 h-14">
          <button onClick={() => router.back()} className="text-gray-600">
            ← 返回
          </button>
          <h1 className="text-lg font-medium">🌿 陪伴&观察</h1>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="ml-auto text-sm text-amber-600"
          >
            {showHistory ? '收起' : '历史'}
          </button>
        </div>
      </div>

      {/* 历史记录 */}
      {showHistory && (
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h3 className="font-medium text-gray-800 mb-3">最近记录</h3>
          {records.length === 0 ? (
            <p className="text-gray-400 text-sm">暂无记录</p>
          ) : (
            <div className="space-y-3">
              {records.map(record => (
                <button
                  key={record.id}
                  onClick={() => loadRecordReport(record.id)}
                  className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <p className="text-sm text-gray-600 line-clamp-2">{record.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 分析报告 */}
      {report && (
        <div className="mx-4 mt-4 bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-medium text-lg mb-4">🌿 {report.growth_summary || '今日陪伴'}</h3>

          {/* 亮点 */}
          {report.strengths && report.strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-amber-600 mb-2">✨ 今日亮点</h4>
              <div className="space-y-1">
                {report.strengths.map((s, i) => (
                  <p key={i} className="text-sm text-gray-700">{s}</p>
                ))}
              </div>
            </div>
          )}

          {/* 机会窗口 */}
          {(report.opportunity_axis1 || report.opportunity_axis2) && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-purple-600 mb-2">💡 机会窗口</h4>
              {report.opportunity_axis1 && (
                <p className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">{report.opportunity_axis1.dimension}:</span> {report.opportunity_axis1.suggestion}
                </p>
              )}
              {report.opportunity_axis2 && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{report.opportunity_axis2.element}:</span> {report.opportunity_axis2.suggestion}
                </p>
              )}
            </div>
          )}

          {/* 一句话建议 */}
          {report.advice && (
            <div className="bg-green-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-800 italic">{report.advice}</p>
            </div>
          )}

          {/* 追问 */}
          {report.reflection_prompt && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">{report.reflection_prompt}</p>
            </div>
          )}
        </div>
      )}

      {/* 输入区域 */}
      <div className="mx-4 mt-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">今天和孩子发生了什么？</p>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="不需要完整，只要真实..."
            maxLength={1000}
            className="w-full p-3 rounded-lg border border-gray-200 focus:border-amber-400 focus:ring-0 outline-none resize-none min-h-32"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-400">{content.length}/1000</span>
            <button
              onClick={handleSubmit}
              disabled={loading || !content.trim()}
              className="px-6 py-2 bg-amber-500 text-white rounded-full text-sm font-medium disabled:opacity-50"
            >
              {loading ? '分析中...' : '记录今日'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
