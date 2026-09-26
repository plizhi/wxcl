'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { pointsApi, type PointsInfo, type PointTransaction } from '@/lib/api';

// 积分获取说明
const POINTS_RULES = [
  { action: '添加陪伴记录', points: 10, icon: '📝' },
  { action: '滋养时刻（手动/AI提取）', points: 5, icon: '🌱' },
  { action: '压力吐槽', points: 5, icon: '💬' },
  { action: '家长反思', points: 5, icon: '🤔' },
  { action: '生成全景报告', points: 10, icon: '📊' },
  { action: '分享被点击', points: 1, icon: '🔗' },
  { action: '邀请注册成功', points: 20, icon: '👥' },
  { action: '首次完善孩子画像', points: 20, icon: '👤' },
  { action: '首次添加孩子', points: 10, icon: '👶' },
];

// 积分兑换选项
const REDEEM_OPTIONS = [
  { type: 'oneMonth' as const, label: '1个月', points: 100 },
  { type: 'sixMonths' as const, label: '6个月', points: 500 },
  { type: 'twelveMonths' as const, label: '12个月', points: 800 },
];

export default function PointsPage() {
  const router = useRouter();
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null);
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedRedeem, setSelectedRedeem] = useState<typeof REDEEM_OPTIONS[0] | null>(null);
  const [redeemResult, setRedeemResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [pointsData, historyData] = await Promise.all([
        pointsApi.getPoints(),
        pointsApi.getHistory(50, 0),
      ]);
      setPointsInfo(pointsData);
      setHistory(historyData.transactions);
      setTotal(historyData.total);
    } catch (e) {
      console.error('加载积分数据失败', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem() {
    if (!selectedRedeem) return;
    try {
      setRedeeming(selectedRedeem.type);
      const result = await pointsApi.redeem(selectedRedeem.type);
      if (result.success) {
        setRedeemResult({
          success: true,
          message: `成功兑换${result.monthsAdded}个月时长！`,
        });
        setShowRedeemModal(false);
        loadData();
      } else {
        setRedeemResult({
          success: false,
          message: '兑换失败',
        });
      }
    } catch (e: any) {
      setRedeemResult({
        success: false,
        message: e.message || '兑换失败',
      });
    } finally {
      setRedeeming(null);
    }
  }

  function openRedeemModal(option: typeof REDEEM_OPTIONS[0]) {
    setSelectedRedeem(option);
    setShowRedeemModal(true);
    setRedeemResult(null);
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function getTransactionLabel(type: string) {
    if (type.startsWith('earn_')) {
      const action = type.replace('earn_', '');
      const rule = POINTS_RULES.find(r => r.action.includes(
        action === 'record' ? '陪伴记录' :
        action === 'nourishment' ? '滋养时刻' :
        action === 'vent' ? '压力吐槽' :
        action === 'reflection' ? '家长反思' :
        action === 'report' ? '全景报告' :
        action === 'share' ? '分享' :
        action === 'invite' ? '邀请' :
        action === 'firstProfile' ? '画像' :
        action === 'firstChild' ? '孩子' : action
      ));
      return rule ? rule.icon + ' ' + rule.action : type;
    }
    if (type === 'redeem') return '🎁 积分兑换';
    return type;
  }

  function getMonthProgress() {
    if (!pointsInfo) return 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTotal = pointsInfo.monthStats.reduce((sum, stat) => sum + (stat._sum?.amount || 0), 0);
    return Math.min(monthTotal / 100, 1); // 每月上限100积分
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-amber-500 text-white px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="text-2xl">←</button>
          <h1 className="text-xl font-semibold">我的积分</h1>
        </div>

        {/* 积分卡片 */}
        <div className="bg-white rounded-2xl p-6 text-gray-800 shadow-lg">
          <div className="text-sm text-gray-500 mb-1">当前积分</div>
          <div className="text-4xl font-bold text-amber-600 mb-2">{pointsInfo?.balance || 0}</div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">积分上限：{pointsInfo?.maxPoints || 10000}</span>
            {pointsInfo?.expireAt && (
              <span className="text-gray-500">
                时长至：{new Date(pointsInfo.expireAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* 本月进度 */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">本月获取</span>
              <span className="text-amber-600">{Math.round(getMonthProgress() * 100)}/100</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${getMonthProgress() * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 积分兑换 */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-semibold mb-3">兑换时长</h2>
        <div className="grid grid-cols-3 gap-3">
          {REDEEM_OPTIONS.map(option => (
            <button
              key={option.type}
              onClick={() => openRedeemModal(option)}
              disabled={!pointsInfo || pointsInfo.balance < option.points}
              className={`p-4 rounded-xl border-2 transition-all ${
                pointsInfo && pointsInfo.balance >= option.points
                  ? 'border-amber-200 bg-amber-50 hover:border-amber-400'
                  : 'border-gray-100 bg-gray-50 opacity-50'
              }`}
            >
              <div className="text-2xl mb-1">🎁</div>
              <div className="font-semibold text-gray-800">{option.label}</div>
              <div className="text-sm text-amber-600">{option.points}积分</div>
            </button>
          ))}
        </div>
      </div>

      {/* 积分规则 */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-semibold mb-3">积分获取规则</h2>
        <div className="bg-white rounded-xl divide-y divide-gray-100">
          {POINTS_RULES.map((rule, index) => (
            <div key={index} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{rule.icon}</span>
                <span className="text-gray-700">{rule.action}</span>
              </div>
              <span className="text-amber-600 font-semibold">+{rule.points}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 积分历史 */}
      <div className="px-4 py-4 pb-8">
        <h2 className="text-lg font-semibold mb-3">积分记录</h2>
        {history.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            暂无积分记录
          </div>
        ) : (
          <div className="bg-white rounded-xl divide-y divide-gray-100">
            {history.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="text-gray-800">{getTransactionLabel(tx.type)}</div>
                  <div className="text-sm text-gray-400">{formatDate(tx.createdAt)}</div>
                </div>
                <span className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 兑换确认弹窗 */}
      {showRedeemModal && selectedRedeem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-semibold mb-4 text-center">确认兑换</h3>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎁</div>
              <div className="text-2xl font-bold text-amber-600">{selectedRedeem.label}时长</div>
              <div className="text-gray-500 mt-1">消耗 {selectedRedeem.points} 积分</div>
            </div>

            {redeemResult && (
              <div className={`text-center mb-4 p-3 rounded-lg ${redeemResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {redeemResult.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRedeemModal(false);
                  setRedeemResult(null);
                }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold"
              >
                取消
              </button>
              <button
                onClick={handleRedeem}
                disabled={!!redeeming}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold disabled:opacity-50"
              >
                {redeeming ? '兑换中...' : '确认兑换'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
