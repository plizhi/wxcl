'use client';

import { useState, useEffect } from 'react';
import { useChild } from '@/context/ChildContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';

export default function QuestionsPage() {
  const { toast } = useToast();
  const { currentChildId } = useChild();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/daily-care/records?page=0&limit=20', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const data = await res.json();
      if (data.records) {
        // 过滤出压力吐槽类型的记录
        const ventingRecords = data.records.filter((r: any) => r.report?.intent === 'venting');
        setRecords(vettingRecords);
      }
    } catch (e) {
      console.error('加载历史失败', e);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadRecord(id: number) {
    try {
      const res = await fetch(`/api/daily-care/report/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      }
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
      const res = await fetch('/api/daily-care/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ content: content.trim(), intent: 'venting', childId: currentChildId, parentRole: user?.parentRole }),
      });

      const data = await res.json();
      if (data.understanding || data.summary || data.analysis) {
        setReport(data);
        setContent(''); // 清空输入框
        toast('记录成功', 'success');
      } else {
        toast('记录失败', 'error');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast(msg || '提交失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 bg-white/90 backdrop-blur z-10 border-b border-gray-100">
        <div className="flex items-center gap-4 px-4 h-14">
          <h1 className="text-lg font-medium">💬 压力吐槽</h1>
        </div>
      </div>

      {/* 历史记录 */}
      <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
        <h3 className="font-medium text-gray-800 mb-3">历史吐槽</h3>
        {loadingHistory ? (
          <p className="text-gray-400 text-sm">加载中...</p>
        ) : records.length === 0 ? (
          <p className="text-gray-400 text-sm">暂无记录</p>
        ) : (
          <div className="space-y-3">
            {records.map(record => (
              <button
                key={record.id}
                onClick={() => loadRecord(record.id)}
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

      {/* 结构化报告展示 */}
      {report && (
        <div className="mx-4 mb-4 space-y-4">
          {/* 理解 */}
          {report.understanding && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-medium text-purple-600 mb-3">💜 我理解你的处境</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.understanding}</p>
            </div>
          )}

          {/* 分析 */}
          {report.analysis && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-medium text-purple-600 mb-3">🔍 问题分析</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.analysis}</p>
            </div>
          )}

          {/* 建议 */}
          {report.suggestions && report.suggestions.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-medium text-purple-600 mb-3">💡 支持建议</h3>
              <ul className="space-y-2">
                {report.suggestions.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="text-purple-500 mt-0.5">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 一句话总结 */}
          {report.summary && (
            <div className="bg-purple-100 rounded-xl p-4 text-center">
              <p className="text-purple-800 italic">✨ {report.summary}</p>
            </div>
          )}

          {/* 亮点（如果有） */}
          {report.strengths && report.strengths.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-amber-600 mb-2">🌟 值得关注的亮点</h4>
              <ul className="text-xs text-gray-700 space-y-1">
                {report.strengths.map((s: string, i: number) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 输入区域 */}
      <div className="px-4 flex-1">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="说说最近让你感到压力的事..."
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-0 outline-none resize-none min-h-32"
            />
            <div className="flex justify-end items-center mt-3">
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="px-6 py-2 bg-purple-500 text-white rounded-full text-sm font-medium disabled:opacity-50"
              >
                {loading ? '倾诉中...' : '倾诉'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 提示 */}
      <div className="px-4 py-4">
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">💡 温馨提示</p>
          <p>把压力说出来，我们会一起看见那些被忽略的积极时刻。</p>
        </div>
      </div>
    </div>
  );
}
