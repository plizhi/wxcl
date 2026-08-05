'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dailyCareApi, DailyCareReport } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

const MAX_RECORDS = 10;
const MAX_CHARS = 300;

interface RecordEntry {
  id: number;
  content: string;
}

function getHintText(count: number): string {
  if (count === 0) return '写下你印象最深的3-5个亲子时刻，不必在意文笔';
  if (count <= 3) return '很好，继续回想一下还有哪些？';
  if (count <= 7) return '这些故事很珍贵，再来几个？';
  return '差不多了，可以跳过直接看结果';
}

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { toast } = useToast();

  // 从 URL 参数获取 childId
  const [childId, setChildId] = useState<string | null>(null);

  const [records, setRecords] = useState<RecordEntry[]>([
    { id: 1, content: '' },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialReport, setInitialReport] = useState<DailyCareReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 解析 URL 参数获取 childId
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('childId');
    if (id) {
      setChildId(id);
    }
  }, []);

  // 未登录重定向
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  // 聚焦当前输入框
  useEffect(() => {
    if (!submitting && !showReport) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [currentIndex, submitting, showReport]);

  function updateRecord(id: number, content: string) {
    const truncated = content.length > MAX_CHARS ? content.slice(0, MAX_CHARS) : content;
    setRecords(prev =>
      prev.map(r => (r.id === id ? { ...r, content: truncated } : r))
    );
  }

  function addRecord() {
    if (records.length >= MAX_RECORDS) return;
    const newId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setRecords(prev => [...prev, { id: newId, content: '' }]);
    setCurrentIndex(records.length);
  }

  function deleteRecord(id: number) {
    if (records.length <= 1) return;
    setRecords(prev => {
      const filtered = prev.filter(r => r.id !== id);
      const deletedIndex = prev.findIndex(r => r.id === id);
      if (deletedIndex <= currentIndex && currentIndex > 0) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      } else if (deletedIndex === currentIndex && currentIndex >= filtered.length) {
        setCurrentIndex(filtered.length - 1);
      }
      return filtered;
    });
  }

  function handleSkip() {
    localStorage.setItem('onboarding_done', 'true');
    router.replace('/home');
  }

  async function handleSubmit() {
    const validRecords = records.filter(r => r.content.trim().length > 0);
    if (validRecords.length === 0) {
      toast('请至少填写一条记录', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await dailyCareApi.batchImport(
        validRecords.map(r => r.content),
        childId || undefined
      );
      localStorage.setItem('onboarding_done', 'true');

      if (result.error) {
        toast(result.error, 'error');
        setSubmitting(false);
        return;
      }

      setInitialReport(result);
      setShowReport(true);
    } catch (e: any) {
      toast(e.message || '生成失败，请重试', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    localStorage.setItem('onboarding_done', 'true');
    router.replace('/home');
  }

  const filledCount = records.filter(r => r.content.trim().length > 0).length;
  const hintText = getHintText(filledCount);

  // 初始画像展示
  if (showReport && initialReport) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
        {/* Header */}
        <div className="bg-white px-4 pt-6 pb-4 shadow-sm text-center">
          <div className="text-4xl mb-2">🌱</div>
          <h1 className="text-xl font-semibold text-gray-800">你的初始画像</h1>
          <p className="text-sm text-gray-400 mt-1">
            这是你给这片望杏林画的初始地图，之后每天记录都会让这幅地图更完整。
          </p>
        </div>

        {/* 报告内容 */}
        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <div className="space-y-4">
            {/* 整体概述 */}
            {initialReport.growth_summary && (
              <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
                <div className="text-3xl mb-2">🌱</div>
                <p className="text-sm text-gray-700 leading-relaxed">{initialReport.growth_summary}</p>
              </div>
            )}

            {/* 亮点 */}
            {initialReport.strengths && initialReport.strengths.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-5">
                <h3 className="text-sm font-medium text-amber-600 mb-2">💎 亮点发现</h3>
                <ul className="text-xs text-gray-700 space-y-1">
                  {initialReport.strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}

            {/* 机会窗口 */}
            {(initialReport.opportunity_axis1 || initialReport.opportunity_axis2) && (
              <div className="bg-purple-50 rounded-2xl p-5">
                <h3 className="text-sm font-medium text-purple-600 mb-2">🌱 机会窗口</h3>
                {initialReport.opportunity_axis1 && (
                  <div className="text-xs text-gray-700 mb-1">
                    <span className="font-medium">{initialReport.opportunity_axis1.dimension}：</span>
                    {initialReport.opportunity_axis1.description}
                  </div>
                )}
                {initialReport.opportunity_axis2 && (
                  <div className="text-xs text-gray-700">
                    <span className="font-medium">{initialReport.opportunity_axis2.element}：</span>
                    {initialReport.opportunity_axis2.description}
                  </div>
                )}
              </div>
            )}

            {/* 一句话 */}
            {initialReport.advice && (
              <div className="bg-green-100 rounded-2xl p-5 text-center">
                <p className="text-sm text-green-800 italic">💬 {initialReport.advice}</p>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-4 py-4 bg-white shadow-lg">
          <button
            onClick={handleDone}
            className="w-full py-3 rounded-2xl text-white font-medium text-base"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            开始记录 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
      {/* 顶部进度区域 */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm">
        <div className="text-center mb-3">
          <div className="text-3xl mb-2">🌿</div>
          <h1 className="text-lg font-medium text-gray-800">望杏成林</h1>
        </div>

        {/* 引导文案 */}
        <div className="px-2 mb-4">
          <p className="text-sm text-gray-600 leading-relaxed text-center">
            欢迎来到望杏成林。这里是你和孩子一起成长的那片望杏林。
            <br />
            第一次来，可以把你记得的、和孩子的一些互动时刻写下来。不用在意写得好不好，真实就好。
          </p>
        </div>

        {/* 进度条 */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">已添加</span>
            <span className="text-xs font-medium text-amber-600">{filledCount}/{MAX_RECORDS} 条</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-300"
              style={{ width: `${(filledCount / MAX_RECORDS) * 100}%` }}
            />
          </div>
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-center text-gray-400">{hintText}</p>
      </div>

      {/* 输入区域 */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {/* 单条输入框 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">第 {currentIndex + 1} 条</span>
            {records[currentIndex]?.content && (
              <button
                onClick={() => deleteRecord(records[currentIndex].id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                删除
              </button>
            )}
          </div>

          <textarea
            ref={currentIndex === 0 ? textareaRef : undefined}
            value={records[currentIndex]?.content || ''}
            onChange={(e) => updateRecord(records[currentIndex].id, e.target.value)}
            placeholder="写下你们的一个互动时刻..."
            rows={5}
            maxLength={MAX_CHARS}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
          />

          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-400">
              {records[currentIndex]?.content.length || 0}/{MAX_CHARS}
            </span>
            {records[currentIndex]?.content.length >= MAX_CHARS * 0.9 && (
              <span className="text-xs text-amber-500">快写满了</span>
            )}
          </div>
        </div>

        {/* 已填写的记录预览 */}
        {records.filter(r => r.content.trim().length > 0).length > 1 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">已添加的记录：</p>
            <div className="space-y-2">
              {records.map((r, idx) => {
                if (!r.content.trim()) return null;
                return (
                  <div
                    key={r.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`bg-white rounded-xl p-3 shadow-sm cursor-pointer transition-all ${
                      idx === currentIndex
                        ? 'ring-2 ring-amber-400'
                        : 'hover:bg-amber-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="text-xs text-amber-500 mr-2">#{idx + 1}</span>
                        <span className="text-xs text-gray-400">{r.content.length}字</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRecord(r.id);
                        }}
                        className="text-xs text-red-400 hover:text-red-600 ml-2"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{r.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 添加按钮 */}
        {records.length < MAX_RECORDS && (
          <button
            onClick={addRecord}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
          >
            + 继续添加
          </button>
        )}
      </div>

      {/* 底部操作区 */}
      <div className="bg-white px-4 py-4 shadow-lg">
        <button
          onClick={handleSkip}
          className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 mb-2"
        >
          跳过，直接开始
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || filledCount === 0}
          className="w-full py-3 rounded-2xl text-white font-medium text-base disabled:opacity-50 transition-all"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          {submitting ? (
            <span>🌿 望杏分析中...</span>
          ) : (
            <span>生成初始画像 {filledCount > 0 && `(${filledCount}条)`}</span>
          )}
        </button>
      </div>
    </div>
  );
}
