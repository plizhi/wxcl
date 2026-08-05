'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChild } from '@/context/ChildContext';
import { dailyCareApi, DailyCareReport, DailyCareRecord } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import html2canvas from 'html2canvas';

type TimeRange = '7days' | '30days' | 'all';

interface PeriodStats {
  recordCount: number;
  strengths: string[];
  opportunities: string[];
  avgRecordLength: number;
}

interface WeeklyComparison {
  thisWeek: PeriodStats;
  lastWeek: PeriodStats;
  trend: 'up' | 'down' | 'stable';
  recordCountChange: number;
}

interface ActionSuggestion {
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface Milestone {
  type: 'first_record' | 'count_10' | 'count_50' | 'count_100' | 'streak_7' | 'streak_30' | 'consistent';
  title: string;
  description: string;
  achievedAt?: string;
  icon: string;
}

export default function ComprehensiveReportPage() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const { toast } = useToast();
  const { currentChildId } = useChild();
  const reportRef = useRef<HTMLDivElement>(null);

  const [records, setRecords] = useState<DailyCareRecord[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [report, setReport] = useState<DailyCareReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [weeklyComparison, setWeeklyComparison] = useState<WeeklyComparison | null>(null);
  const [actionSuggestions, setActionSuggestions] = useState<ActionSuggestion[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      loadRecords();
    }
  }, [isLoading]);

  async function loadRecords() {
    try {
      const data = await dailyCareApi.getRecords(0, 1000);
      setRecords(data.records || []);
      analyzeMilestones(data.records || []);
    } catch (e) {
      console.error('加载记录失败', e);
    }
  }

  function analyzeMilestones(recordList: DailyCareRecord[]) {
    const milestones: Milestone[] = [];
    const sortedRecords = [...recordList].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (sortedRecords.length > 0) {
      milestones.push({
        type: 'first_record',
        title: '初次记录',
        description: '开始了望杏林之旅',
        achievedAt: sortedRecords[0].createdAt,
        icon: '🌱',
      });
    }

    if (sortedRecords.length >= 10) {
      milestones.push({
        type: 'count_10',
        title: '10条记录',
        description: '已记录10条陪伴时刻',
        icon: '🌿',
      });
    }

    if (sortedRecords.length >= 50) {
      milestones.push({
        type: 'count_50',
        title: '50条记录',
        description: '已记录50条陪伴时刻',
        icon: '🌳',
      });
    }

    // 计算连续记录天数
    if (sortedRecords.length >= 7) {
      const dates = sortedRecords.map(r => new Date(r.createdAt).toISOString().split('T')[0]);
      const uniqueDates = [...new Set(dates)].sort();
      let maxStreak = 1;
      let currentStreak = 1;

      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }

      if (maxStreak >= 7) {
        milestones.push({
          type: 'streak_7',
          title: '连续7天',
          description: `最高连续记录${maxStreak}天`,
          icon: '🔥',
        });
      }

      if (maxStreak >= 30) {
        milestones.push({
          type: 'streak_30',
          title: '连续30天',
          description: `最高连续记录${maxStreak}天`,
          icon: '⚡',
        });
      }
    }

    // 稳定性里程碑：每周都有记录
    if (sortedRecords.length >= 14) {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const recentRecords = sortedRecords.filter(
        r => new Date(r.createdAt) >= twoWeeksAgo
      );
      if (recentRecords.length >= 7) {
        milestones.push({
          type: 'consistent',
          title: '稳定记录',
          description: '近两周保持良好记录习惯',
          icon: '✨',
        });
      }
    }

    setMilestones(milestones);
  }

  function getWeekStart(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
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

  function getFilteredRecords() {
    const { startDate, endDate } = getDateRange();
    return records.filter((r) => {
      const created = new Date(r.createdAt).toISOString().split('T')[0];
      if (startDate && created < startDate) return false;
      if (endDate && created > endDate) return false;
      return true;
    });
  }

  function getFilteredRecordCount() {
    return getFilteredRecords().length;
  }

  function analyzeWeeklyComparison(currentRecords: DailyCareRecord[]): WeeklyComparison {
    const today = new Date();
    const thisWeekStart = getWeekStart(today);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    // 单次遍历，同时分类记录和提取数据
    let thisWeekCount = 0;
    let lastWeekCount = 0;
    const thisWeekStrengths: string[] = [];
    const thisWeekOpportunities: string[] = [];
    const lastWeekStrengths: string[] = [];
    const lastWeekOpportunities: string[] = [];
    let thisWeekTotalLength = 0;
    let lastWeekTotalLength = 0;

    currentRecords.forEach(r => {
      const d = new Date(r.createdAt);
      const isThisWeek = d >= thisWeekStart;
      const isLastWeek = d >= lastWeekStart && d < thisWeekStart;

      if (isThisWeek) {
        thisWeekCount++;
        thisWeekTotalLength += r.content?.length || 0;
        if (r.report?.strengths) thisWeekStrengths.push(...r.report.strengths);
        if (r.report?.opportunity_axis1?.suggestion) thisWeekOpportunities.push(r.report.opportunity_axis1.suggestion);
      } else if (isLastWeek) {
        lastWeekCount++;
        lastWeekTotalLength += r.content?.length || 0;
        if (r.report?.strengths) lastWeekStrengths.push(...r.report.strengths);
        if (r.report?.opportunity_axis2?.suggestion) lastWeekOpportunities.push(r.report.opportunity_axis2.suggestion);
      }
    });

    const recordCountChange = thisWeekCount - lastWeekCount;
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recordCountChange > 0) trend = 'up';
    else if (recordCountChange < 0) trend = 'down';

    const comparison: WeeklyComparison = {
      thisWeek: {
        recordCount: thisWeekCount,
        strengths: [...new Set(thisWeekStrengths)],
        opportunities: [...new Set(thisWeekOpportunities)],
        avgRecordLength: thisWeekCount > 0 ? Math.round(thisWeekTotalLength / thisWeekCount) : 0,
      },
      lastWeek: {
        recordCount: lastWeekCount,
        strengths: [...new Set(lastWeekStrengths)],
        opportunities: [...new Set(lastWeekOpportunities)],
        avgRecordLength: lastWeekCount > 0 ? Math.round(lastWeekTotalLength / lastWeekCount) : 0,
      },
      trend,
      recordCountChange,
    };

    setWeeklyComparison(comparison);
    return comparison;
  }

  function generateActionSuggestions(currentRecords: DailyCareRecord[], weeklyComparison: WeeklyComparison | null) {
    const suggestions: ActionSuggestion[] = [];
    const recentRecords = currentRecords.slice(0, 10);

    // 单次遍历收集所有数据
    const allStrengths: string[] = [];
    const allOpportunities: string[] = [];
    const allAdvices: string[] = [];

    recentRecords.forEach(r => {
      if (r.report?.strengths) allStrengths.push(...r.report.strengths);
      if (r.report?.opportunity_axis1?.suggestion) {
        allOpportunities.push(r.report.opportunity_axis1.suggestion);
      }
      if (r.report?.advice) allAdvices.push(r.report.advice);
    });

    const uniqueOpportunities = [...new Set(allOpportunities)];
    const uniqueStrengths = [...new Set(allStrengths)];
    const uniqueAdvices = [...new Set(allAdvices)];

    // 基于机会窗口生成行动建议
    if (uniqueOpportunities.length > 0) {
      uniqueOpportunities.slice(0, 2).forEach((opp, i) => {
        suggestions.push({
          action: `关注${i === 0 ? '第一' : '第二'}个成长方向`,
          reason: opp,
          priority: i === 0 ? 'high' : 'medium',
        });
      });
    }

    // 基于亮点生成保持建议
    if (uniqueStrengths.length > 0) {
      suggestions.push({
        action: '继续保持亮点',
        reason: `孩子表现良好的方面：${uniqueStrengths[0]}`,
        priority: 'medium',
      });
    }

    // 基于建议生成具体行动
    if (uniqueAdvices.length > 0) {
      suggestions.push({
        action: '落实建议',
        reason: uniqueAdvices[0],
        priority: 'high',
      });
    }

    // 基于趋势给出建议
    if (weeklyComparison?.trend === 'down') {
      suggestions.push({
        action: '增加记录频率',
        reason: '本周记录比上周少，可以更频繁地记录陪伴时刻',
        priority: 'high',
      });
    } else if (recentRecords.length >= 5) {
      suggestions.push({
        action: '深化记录内容',
        reason: '可以尝试记录更详细的事件和感受',
        priority: 'low',
      });
    }

    setActionSuggestions(suggestions.slice(0, 4));
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
      const result = await dailyCareApi.getComprehensive(currentChildId ?? undefined, startDate, endDate);
      if (result.error) {
        toast(result.error, 'error');
      } else {
        setReport(result);

        // 分析周对比
        const comparison = analyzeWeeklyComparison(getFilteredRecords());

        // 生成行动建议
        generateActionSuggestions(getFilteredRecords(), comparison);
      }
    } catch (e: any) {
      toast(e.message || '生成失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!reportRef.current) return;

    setSharing(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `望杏林全景报告_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast('海报已保存', 'success');
    } catch (e) {
      console.error('生成分享图片失败', e);
      toast('生成分享图片失败', 'error');
    } finally {
      setSharing(false);
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
        <div className="px-4 py-4 space-y-4">
          {/* 可分享海报区域 */}
          <div ref={reportRef} className="bg-white rounded-2xl p-5 shadow-sm">
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
                  {report.strengths.map((s: string, i: number) => <li key={i}>• {s}</li>)}
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

            {/* 周对比 */}
            {weeklyComparison && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl">
                <h3 className="text-sm font-medium text-blue-600 mb-2">📈 本周 vs 上周</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{weeklyComparison.thisWeek.recordCount}</div>
                    <div className="text-xs text-gray-500">本周记录</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-400">{weeklyComparison.lastWeek.recordCount}</div>
                    <div className="text-xs text-gray-500">上周记录</div>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    weeklyComparison.trend === 'up' ? 'bg-green-100 text-green-600' :
                    weeklyComparison.trend === 'down' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {weeklyComparison.trend === 'up' ? '📈 进步' :
                     weeklyComparison.trend === 'down' ? '📉 减少' : '➡️ 持平'}
                    {weeklyComparison.recordCountChange !== 0 && (
                      <span className="ml-1">
                        {weeklyComparison.recordCountChange > 0 ? '+' : ''}{weeklyComparison.recordCountChange}条
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* 本周行动建议 */}
            {actionSuggestions.length > 0 && (
              <div className="mb-4 p-3 bg-orange-50 rounded-xl">
                <h3 className="text-sm font-medium text-orange-600 mb-2">🎯 本周行动建议</h3>
                <div className="space-y-2">
                  {actionSuggestions.map((suggestion, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          suggestion.priority === 'high' ? 'bg-red-500' :
                          suggestion.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></span>
                        <span className="font-medium text-gray-700">{suggestion.action}</span>
                      </div>
                      <p className="text-gray-500 mt-0.5 ml-4">{suggestion.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 记录里程碑 */}
            {milestones.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-xl">
                <h3 className="text-sm font-medium text-yellow-600 mb-2">🏆 记录里程碑</h3>
                <div className="flex flex-wrap gap-2">
                  {milestones.map((milestone, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-full"
                      title={milestone.description}
                    >
                      <span>{milestone.icon}</span>
                      <span className="text-xs font-medium text-gray-700">{milestone.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 海报底部 */}
            <div className="text-center mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">望杏林 · 内在结构养育陪伴</p>
            </div>
          </div>

          {/* 分享按钮 */}
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full py-2.5 rounded-full text-white text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 disabled:opacity-40"
          >
            {sharing ? '📱 生成中...' : '📤 保存海报'}
          </button>

          {/* 返回按钮 */}
          <button
            onClick={() => router.push('/home')}
            className="w-full py-2.5 rounded-full text-white text-sm font-medium"
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
