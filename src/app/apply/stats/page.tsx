'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';

type Period = 'week' | 'month';
type RankingType = 'opens' | 'users';

interface RankingItem {
  rank: number;
  shareCode: string;
  totalOpens: number;
  newUsers: number;
}

interface RankingResponse {
  period: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  ranking: RankingItem[];
  myStats: {
    rank: number;
    shareCode: string;
    totalOpens: number;
    newUsers: number;
  } | null;
}

interface PersonalStats {
  shareCode: string;
  status: string;
  inviteCode?: string;
  inviteExpiresAt?: string;
  stats: {
    totalOpens: number;
    qualifiedContributors: number;
    requiredOpens: number;
    requiredContributors: number;
  };
}

function StatsPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');
  const [type, setType] = useState<RankingType>('opens');
  const [data, setData] = useState<RankingResponse | null>(null);
  const [personalStats, setPersonalStats] = useState<PersonalStats | null>(null);
  const [expiryStatus, setExpiryStatus] = useState<{
    expired: boolean;
    remainingDays: number | null;
  } | null>(null);
  const [showPoster, setShowPoster] = useState(false);
  const [savingPoster, setSavingPoster] = useState(false);
  const [customMessage, setCustomMessage] = useState('记录陪伴，看见成长');
  const posterRef = useRef<HTMLDivElement>(null);

  async function fetchRanking(p: Period, t: RankingType, phone?: string) {
    try {
      const params = new URLSearchParams({ period: p, type: t });
      if (phone) params.append('phone', phone);
      const res = await fetch(`/api/apply/ranking?${params}`);
      const result = await res.json();

      if (result.code === 0) {
        setData(result.data);
      } else {
        toast(result.message || '获取数据失败', 'error');
      }
    } catch (e) {
      toast('网络异常', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPersonalStats(shareCode: string) {
    try {
      const res = await fetch(`/api/apply?shareCode=${shareCode}`);
      const result = await res.json();
      if (result.code === 0) {
        setPersonalStats(result.data);
      }
    } catch (e) {
      console.error('获取个人数据失败', e);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (user?.phone) {
        fetchRanking(period, type, user.phone);
      } else {
        fetchRanking(period, type);
        setLoading(false);
      }
    }
  }, [user, authLoading, period, type]);

  // 获取个人数据和时长状态
  useEffect(() => {
    if (!authLoading) {
      const shareCode = localStorage.getItem('shareCode');
      if (shareCode) {
        fetchPersonalStats(shareCode);
      }
    }
  }, [user, authLoading]);

  // 获取时长状态
  useEffect(() => {
    if (user?.phone) {
      fetch('/api/user/expiry')
        .then(res => res.json())
        .then(result => {
          if (result.code === 0) {
            setExpiryStatus({
              expired: result.data.expired,
              remainingDays: result.data.remainingDays,
            });
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const shareUrl = typeof window !== 'undefined' && personalStats
    ? `${window.location.origin}/apply?ref=${personalStats.shareCode}`
    : '';

  // 下载海报
  async function downloadPoster() {
    if (!posterRef.current) return;
    setSavingPoster(true);
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建画布');

      canvas.width = 600;
      canvas.height = 800;

      // 绘制背景渐变
      const gradient = ctx.createLinearGradient(0, 0, 600, 800);
      gradient.addColorStop(0, '#f3e8ff');
      gradient.addColorStop(1, '#fef3c7');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 800);

      // 绘制顶部装饰条
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(0, 0, 600, 8);

      // 绘制标题区域
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('望杏成林', 300, 100);

      ctx.fillStyle = '#6b7280';
      ctx.font = '16px sans-serif';
      ctx.fillText('内在结构养育 · 亲子陪伴观察', 300, 140);

      // 绘制用户自定义文案
      ctx.fillStyle = '#7c3aed';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(customMessage, 300, 195);

      // 绘制分隔线
      ctx.strokeStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(100, 260);
      ctx.lineTo(500, 260);
      ctx.stroke();

      // 绘制二维码
      try {
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = () => reject();
          qrImg.src = qrCodeUrl;
        });
        ctx.drawImage(qrImg, 200, 320, 200, 200);
      } catch {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(200, 320, 200, 200);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('二维码加载失败', 300, 420);
      }

      // 绘制提示
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('扫码开始你的亲子洞察', 300, 560);

      // 绘制邀请码
      if (personalStats?.inviteCode) {
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`我的邀请码：${personalStats.inviteCode}`, 300, 620);
      } else {
        ctx.fillStyle = '#d97706';
        ctx.font = '16px sans-serif';
        ctx.fillText('分享给朋友，一起成长', 300, 620);
      }

      // 绘制底部
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(0, 700, 600, 100);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText('内在结构养育 · 亲子陪伴观察', 300, 750);

      // 下载
      const link = document.createElement('a');
      link.download = `望杏林邀请_${personalStats?.shareCode || ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast('海报已保存', 'success');

      // 记录分享行为
      fetch('/api/user/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'share' }),
      }).then(res => res.json()).then(result => {
        if (result.code === 0 && result.data?.extended) {
          toast('恭喜！已延长1个月使用时长', 'success');
        }
      }).catch(() => {});
    } catch (e) {
      console.error('生成海报失败', e);
      toast('生成海报失败', 'error');
    } finally {
      setSavingPoster(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!user?.phone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50 px-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">推广数据中心</h2>
          <p className="text-gray-500 mb-6">请先登录后查看推广数据</p>
          <Link
            href="/login"
            className="block w-full py-3 bg-purple-600 text-white rounded-full text-center"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  const myShareCode = localStorage.getItem('shareCode');

  if (!personalStats && !myShareCode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50 px-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">推广数据中心</h2>
          <p className="text-gray-500 mb-6">你还没有分享数据</p>
          <Link
            href="/apply"
            className="block w-full py-3 bg-purple-600 text-white rounded-full text-center"
          >
            去申请
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-gray-600">
            ← 返回
          </button>
          <h1 className="text-lg font-bold text-gray-800">推广数据中心</h1>
          {expiryStatus && !expiryStatus.expired && expiryStatus.remainingDays !== null && expiryStatus.remainingDays <= 7 ? (
            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-600 rounded-full">
              剩余{expiryStatus.remainingDays}天
            </span>
          ) : expiryStatus?.expired ? (
            <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
              已冻结
            </span>
          ) : (
            <div className="w-12"></div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* 个人推广数据 */}
        {personalStats && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-gray-800 mb-4">我的推广数据</h2>

            {/* 进度条 */}
            <div className="bg-gradient-to-br from-amber-50 to-purple-50 rounded-xl p-4 mb-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">分享被打开</span>
                  <span className="text-lg font-bold text-purple-600">
                    {personalStats.stats.totalOpens} <span className="text-xs text-gray-400">/ {personalStats.stats.requiredOpens}</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (personalStats.stats.totalOpens / personalStats.stats.requiredOpens) * 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-gray-600">贡献的申请</span>
                  <span className="text-lg font-bold text-amber-600">
                    {personalStats.stats.qualifiedContributors} <span className="text-xs text-gray-400">/ {personalStats.stats.requiredContributors}</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (personalStats.stats.qualifiedContributors / personalStats.stats.requiredContributors) * 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                分享被10人打开 + 3人达标 = 获得邀请码
              </p>
            </div>

            {/* 分享链接 */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">你的专属分享链接</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(shareUrl);
                      toast('链接已复制', 'success');
                    } catch {
                      toast('复制失败', 'error');
                    }
                  }}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg text-sm"
                >
                  复制
                </button>
              </div>
            </div>

            {/* 邀请码 */}
            {personalStats.inviteCode ? (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center mb-4">
                <p className="text-sm text-gray-500 mb-1">🎉 恭喜！你的邀请码</p>
                <p className="text-2xl font-bold tracking-wider text-green-600">
                  {personalStats.inviteCode}
                </p>
                <p className="text-xs text-gray-400">
                  有效期至 {personalStats.inviteExpiresAt ? new Date(personalStats.inviteExpiresAt).toLocaleDateString() : '7天后'}
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-xl p-4 text-center mb-4">
                <p className="text-sm text-amber-600">
                  还差 {personalStats.stats.requiredOpens - personalStats.stats.totalOpens} 次打开，
                  {personalStats.stats.requiredContributors - personalStats.stats.qualifiedContributors} 个贡献者
                </p>
              </div>
            )}

            {/* 海报按钮 */}
            <button
              onClick={downloadPoster}
              disabled={savingPoster}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {savingPoster ? '生成中...' : '📥 保存海报到相册'}
            </button>
          </div>
        )}

        {/* 筛选器 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex gap-2 mb-4">
            <div className="flex bg-gray-100 rounded-full p-1 flex-1">
              <button
                onClick={() => setPeriod('week')}
                className={`flex-1 py-2 text-sm rounded-full transition-colors ${
                  period === 'week'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                周榜
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`flex-1 py-2 text-sm rounded-full transition-colors ${
                  period === 'month'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                月榜
              </button>
            </div>
            <div className="flex bg-gray-100 rounded-full p-1 flex-1">
              <button
                onClick={() => setType('opens')}
                className={`flex-1 py-2 text-sm rounded-full transition-colors ${
                  type === 'opens'
                    ? 'bg-amber-500 text-white font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                打开数
              </button>
              <button
                onClick={() => setType('users')}
                className={`flex-1 py-2 text-sm rounded-full transition-colors ${
                  type === 'users'
                    ? 'bg-amber-500 text-white font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                新用户
              </button>
            </div>
          </div>
          {data && (
            <p className="text-xs text-gray-400 text-center">
              {new Date(data.periodStart).toLocaleDateString('zh-CN')}
              {' ~ '}
              {new Date(data.periodEnd).toLocaleDateString('zh-CN')}
            </p>
          )}
        </div>

        {/* 我的排名 */}
        {data?.myStats && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 shadow-lg text-white">
            <p className="text-sm opacity-80 mb-1">
              {period === 'week' ? '本周' : '本月'}{type === 'opens' ? '打开数' : '新用户'}排名
            </p>
            <div className="flex items-end gap-4">
              <p className="text-5xl font-bold">
                {data.myStats.rank > 0 ? `第 ${data.myStats.rank} 名` : '未上榜'}
              </p>
              <div className="pb-2">
                <p className="text-2xl font-bold">
                  {type === 'opens' ? data.myStats.totalOpens : data.myStats.newUsers}
                </p>
                <p className="text-sm opacity-80">
                  {type === 'opens' ? '打开' : '新用户'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 排行榜 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {period === 'week' ? '本周' : '本月'}排行榜
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({type === 'opens' ? '按打开数' : '按新用户数'})
            </span>
          </h2>

          {data?.ranking.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {data?.ranking.map((item) => {
                const isMe = data.myStats && item.rank === data.myStats.rank &&
                  item.shareCode === data.myStats.shareCode;
                return (
                  <div
                    key={`${item.rank}-${item.shareCode}`}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                      isMe ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        item.rank === 1 ? 'bg-yellow-400 text-white' :
                        item.rank === 2 ? 'bg-gray-300 text-white' :
                        item.rank === 3 ? 'bg-amber-300 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {item.rank}
                      </span>
                      <span className={`text-sm ${isMe ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                        {item.shareCode.slice(-4)}
                        {isMe && <span className="ml-1 text-xs">(我)</span>}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-purple-600">
                        {type === 'opens' ? `${item.totalOpens} 打开` : `${item.newUsers} 用户`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 激励说明 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-800 mb-4">激励规则</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs font-bold flex-shrink-0">周</span>
              <p className="text-gray-600">
                <span className="font-medium text-purple-600">周榜 Top1</span>：1个邀请码 + 电子勋章
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">月</span>
              <p className="text-gray-600">
                <span className="font-medium text-purple-600">月榜 Top3</span>：各1个邀请码
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            统计周期：周榜为上周一至周日，月榜为上月1日至最后一日
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    }>
      <StatsPageContent />
    </Suspense>
  );
}
