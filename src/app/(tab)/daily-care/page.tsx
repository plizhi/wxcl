'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChild } from '@/context/ChildContext';
import { useToast } from '@/components/ui/toast';

export default function DailyCarePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentChildId } = useChild();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showNourishGuide, setShowNourishGuide] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractions, setExtractions] = useState<any[]>([]);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionContent, setReflectionContent] = useState('');
  const [savingReflection, setSavingReflection] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    try {
      const res = await fetch('/v2/api/daily-care/records', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
      }
    } catch (e) {
      console.error('加载记录失败', e);
    }
  }

  async function checkNourishmentMoments() {
    if (!currentChildId) return;
    try {
      const res = await fetch(`/v2/api/nourishment?childId=${currentChildId}&limit=1`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const data = await res.json();
      // 如果滋养时刻 < 3 条，显示引导
      if (data.total !== undefined && data.total < 3) {
        setShowNourishGuide(true);
      }
    } catch (e) {
      console.error('检查滋养时刻失败', e);
    }
  }

  async function handleExtractNourishment() {
    setExtracting(true);
    try {
      const res = await fetch('/v2/api/nourishment/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ limit: 5, childId: currentChildId }),
      });
      const data = await res.json();
      if (data.extractions && data.extractions.length > 0) {
        setExtractions(data.extractions);
        toast(`提取到 ${data.extractions.length} 个温暖时刻`, 'success');
      } else {
        toast('本次记录没有提取到新的温暖时刻', 'info');
        setShowNourishGuide(false);
      }
    } catch (e) {
      console.error('提取失败', e);
      toast('提取失败', 'error');
    } finally {
      setExtracting(false);
    }
  }

  async function handleSaveReflection() {
    if (!reflectionContent.trim()) return;
    setSavingReflection(true);
    try {
      const res = await fetch('/v2/api/profiles/reflections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          content: reflectionContent.trim(),
          childId: currentChildId,
          relatedRecordId: report?.recordId,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast('反思已保存', 'success');
        setShowReflection(false);
        setReflectionContent('');
      } else {
        toast(data.message || '保存失败', 'error');
      }
    } catch (e) {
      console.error('保存反思失败', e);
      toast('保存失败', 'error');
    } finally {
      setSavingReflection(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setReport(null);
    try {
      const res = await fetch('/v2/api/daily-care/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ content: content.trim(), childId: currentChildId }),
      });

      const data = await res.json();
      if (data.growth_summary || data.strengths) {
        setReport(data);
        await loadRecords();
        toast('记录成功', 'success');
        // 检查是否需要引导
        checkNourishmentMoments();
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

  async function loadReport(id: number) {
    try {
      const res = await fetch(`/v2/api/daily-care/report/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setShowHistory(false);
      }
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
                  onClick={() => loadReport(record.id)}
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

      {/* 历史机会窗口提示 */}
      {report && report.historyOpportunities && report.historyOpportunities.length > 0 && (
        <div className="mx-4 mt-4 bg-blue-50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-blue-700 mb-2">🔔 持续关注</h4>
          <p className="text-xs text-blue-600 mb-2">这些方向最近出现多次：</p>
          <div className="space-y-2">
            {report.historyOpportunities.map((opp: any, i: number) => (
              <div key={i} className="bg-white rounded-lg p-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-purple-600">
                    {opp.dimension || opp.element}:
                  </span> {opp.description}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  已出现 {opp.appearance_count} 次
                  {opp.appearance_count >= 5 && ' ⚠️'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 分析报告 */}
      {report && (
        <div className="mx-4 mt-4 bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-medium text-lg mb-4">🌿 {report.growth_summary || '今日陪伴'}</h3>

          {/* 亮点 */}
          {report.strengths && report.strengths.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 mb-3">
              <h4 className="text-sm font-medium text-amber-700 mb-2">✨ 亮点</h4>
              <div className="space-y-1">
                {report.strengths.map((s: string, i: number) => (
                  <p key={i} className="text-sm text-gray-700">{s}</p>
                ))}
              </div>
            </div>
          )}

          {/* 机会窗口 */}
          {(report.opportunity_axis1 || report.opportunity_axis2) && (
            <div className="bg-purple-50 rounded-lg p-3 mb-3">
              <h4 className="text-sm font-medium text-purple-700 mb-2">🌱 机会</h4>
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
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-green-800 italic">{report.advice}</p>
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
            onChange={(e) => setContent(e.target.value)}
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

      {/* 家长反思入口 */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => setShowReflection(true)}
          className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <span>✍️</span>
          <span>今日家长反思（可选）</span>
        </button>
      </div>

      {/* 滋养时刻引导弹窗 */}
      {showNourishGuide && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-medium text-lg mb-3 text-center">💧 滋养时刻</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              检测到温暖的时刻，要不要保存下来？
            </p>

            {extractions.length > 0 ? (
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {extractions.map((ext, i) => (
                  <div key={i} className="bg-pink-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-pink-700">✨ {ext.fact}</p>
                    <p className="text-xs text-gray-500 mt-1">感受：{ext.feeling}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4 text-center">
                {extracting ? '正在提取温暖时刻...' : '点击下方按钮，从记录中提取温暖时刻'}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowNourishGuide(false); setExtractions([]); }}
                className="flex-1 py-2 text-gray-600 text-sm"
              >
                稍后
              </button>
              <button
                onClick={handleExtractNourishment}
                disabled={extracting}
                className="flex-1 py-2 bg-pink-500 text-white rounded-full text-sm disabled:opacity-50"
              >
                {extracting ? '提取中...' : '提取温暖时刻'}
              </button>
            </div>

            {extractions.length > 0 && (
              <button
                onClick={() => { setShowNourishGuide(false); setExtractions([]); router.push('/nourishment'); }}
                className="w-full mt-3 py-2 text-pink-600 text-sm"
              >
                查看全部滋养时刻 →
              </button>
            )}
          </div>
        </div>
      )}

      {/* 家长反思弹窗 */}
      {showReflection && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-medium text-lg mb-3 text-center">✍️ 今日反思</h3>
            <p className="text-sm text-gray-500 mb-4 text-center">
              记录你今天的感受和思考
            </p>
            <textarea
              value={reflectionContent}
              onChange={(e) => setReflectionContent(e.target.value)}
              placeholder="今天我观察到了什么？有什么新的理解？"
              rows={4}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-400"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowReflection(false); setReflectionContent(''); }}
                className="flex-1 py-2 text-gray-600 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSaveReflection}
                disabled={!reflectionContent.trim() || savingReflection}
                className="flex-1 py-2 bg-blue-500 text-white rounded-full text-sm disabled:opacity-50"
              >
                {savingReflection ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
