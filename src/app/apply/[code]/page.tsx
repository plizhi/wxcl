'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

export default function ApplyStatusPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const shareCode = params.code as string;
  const posterRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [showPoster, setShowPoster] = useState(false);
  const [savingPoster, setSavingPoster] = useState(false);
  const [data, setData] = useState<{
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
  } | null>(null);

  const [customMessage, setCustomMessage] = useState('记录陪伴，看见成长');

  // 记录分享打开
  useEffect(() => {
    fetch(`/api/apply/status/${shareCode}`)
      .then(res => res.json())
      .then(() => {
        // 忽略结果，打开即记录
      })
      .catch(() => {
        // 忽略错误
      });
  }, [shareCode]);

  // 获取申请状态
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/apply?shareCode=${shareCode}`);
        const result = await res.json();

        if (result.code === 0) {
          setData(result.data);

          // 保存申请ID
          if (result.data.applyId) {
            localStorage.setItem('applyId', result.data.applyId);
            localStorage.setItem('shareCode', result.data.shareCode);
          }
        } else {
          toast(result.message || '获取状态失败', 'error');
        }
      } catch (e) {
        toast('网络异常', 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [shareCode, toast]);

  // 刷新状态
  async function refreshStatus() {
    setLoading(true);
    try {
      const res = await fetch(`/api/apply?shareCode=${shareCode}`);
      const result = await res.json();

      if (result.code === 0) {
        setData(result.data);
        if (result.data.status === 'invite_ready') {
          toast('恭喜！邀请码已生成', 'success');
        }
      }
    } catch (e) {
      toast('网络异常', 'error');
    } finally {
      setLoading(false);
    }
  }

  // 下载海报
  async function downloadPoster() {
    if (!posterRef.current) return;
    setSavingPoster(true);
    try {
      // 预加载海报中的图片
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
        // 如果二维码加载失败，画一个占位符
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
      if (hasInviteCode && data?.inviteCode) {
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`我的邀请码：${data.inviteCode}`, 300, 620);
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
      link.download = `望杏林邀请_${data?.shareCode || ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast('海报已保存', 'success');

      // 记录分享行为（静默失败）
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
        <div className="text-gray-400 mb-6">申请不存在</div>
        <a
          href="/"
          className="px-6 py-3 bg-purple-600 text-white rounded-full text-sm"
        >
          返回首页
        </a>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/apply?ref=${data.shareCode}`
    : '';

  const hasInviteCode = !!data.inviteCode;

  // 检查邀请码是否即将过期或已过期
  const getInviteExpiryStatus = () => {
    if (!data?.inviteExpiresAt) return null;
    const now = new Date();
    const expiresAt = new Date(data.inviteExpiresAt);
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'expired';
    if (diffDays <= 2) return 'expiring';
    return 'valid';
  };
  const inviteExpiryStatus = getInviteExpiryStatus();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 to-purple-50">
      {/* Banner */}
      <div className="relative mb-6 rounded-b-2xl overflow-hidden">
        <div
          className="h-40 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/media/apricot-forest-full.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 to-amber-600/30" />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white">
          <p className="text-sm text-white/80">让我们一起在时光里</p>
          <h1 className="text-2xl font-bold">望杏成林</h1>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 px-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">分享邀请</h2>
          <p className="text-gray-500 mb-6">分享给你的朋友，让他们也来体验望杏成林</p>

          {/* 进度 */}
          <div className="bg-gradient-to-br from-amber-50 to-purple-50 rounded-xl p-6 mb-6">
            <h3 className="text-sm text-gray-500 mb-4">当前进度</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">你的分享被打开</span>
                <span className="text-lg font-bold text-purple-600">
                  {data.stats.totalOpens} <span className="text-xs text-gray-400">/ {data.stats.requiredOpens}</span>
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (data.stats.totalOpens / data.stats.requiredOpens) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-600">贡献的申请数</span>
                <span className="text-lg font-bold text-amber-600">
                  {data.stats.qualifiedContributors} <span className="text-xs text-gray-400">/ {data.stats.requiredContributors}</span>
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (data.stats.qualifiedContributors / data.stats.requiredContributors) * 100)}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              分享被10人打开 + 3人发起申请 = 获得邀请码
            </p>
          </div>

          {/* 分享链接 */}
          <div className="mb-6">
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
                    toast('复制失败，请长按链接手动复制', 'error');
                  }
                }}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg text-sm"
              >
                复制
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              或长按上方输入框复制链接
            </p>
          </div>

          {/* 邀请码（如果有） */}
          {hasInviteCode && (
            <div className="mb-6">
              {inviteExpiryStatus === 'expired' ? (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 text-center border border-red-200">
                  <p className="text-sm text-red-600 mb-2">⚠️ 邀请码已过期</p>
                  <p className="text-3xl font-bold tracking-wider text-gray-400 mb-2">
                    {data.inviteCode}
                  </p>
                  <p className="text-xs text-gray-500">
                    继续分享获取新的邀请码
                  </p>
                </div>
              ) : inviteExpiryStatus === 'expiring' ? (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 text-center border border-amber-200">
                  <p className="text-sm text-amber-600 mb-2">⏰ 邀请码即将过期</p>
                  <p className="text-3xl font-bold tracking-wider text-amber-600 mb-2">
                    {data.inviteCode}
                  </p>
                  <p className="text-xs text-amber-500">
                    有效期至 {data.inviteExpiresAt ? new Date(data.inviteExpiresAt).toLocaleDateString() : '7天后'}，请尽快使用！
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">🎉 恭喜！你的邀请码</p>
                  <p className="text-3xl font-bold tracking-wider text-green-600 mb-2">
                    {data.inviteCode}
                  </p>
                  <p className="text-xs text-gray-400">
                    有效期至 {data.inviteExpiresAt ? new Date(data.inviteExpiresAt).toLocaleDateString() : '7天后'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 海报 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-gray-500">分享海报</p>
              <button
                onClick={() => setShowPoster(!showPoster)}
                className="text-sm text-purple-600"
              >
                {showPoster ? '收起' : '预览海报'}
              </button>
            </div>

            {/* 自定义文案输入 */}
            <div className="mb-3">
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value.slice(0, 20))}
                placeholder="输入你的推广文案（最多20字）"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">{customMessage.length}/20</p>
            </div>

            <button
              onClick={downloadPoster}
              disabled={savingPoster}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {savingPoster ? '生成中...' : '📥 保存海报到相册'}
            </button>
          </div>

          {/* 海报预览 */}
          {showPoster && (
            <div className="mb-6 p-4 bg-gray-100 rounded-xl">
              <p className="text-xs text-gray-500 mb-2 text-center">海报预览</p>
              <div className="flex justify-center">
                <div className="relative bg-white rounded-lg overflow-hidden shadow-lg" style={{ width: '300px', height: '400px' }}>
                  {/* 海报内容 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-amber-50 p-3 text-center">
                    <div className="absolute inset-0 opacity-10">
                      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(/media/apricot-forest-full.png)' }} />
                    </div>
                    <div className="relative h-full flex flex-col items-center justify-center">
                      <p className="text-xs text-gray-500 mb-1">内在结构养育 · 亲子陪伴观察</p>
                      <h2 className="text-sm font-bold text-gray-800 mb-2">望杏成林</h2>
                      {/* 自定义文案 */}
                      <p className="text-xs font-medium text-purple-700 mb-2">{customMessage}</p>
                      {/* 二维码 */}
                      <div className="mx-auto w-16 h-16 bg-white rounded-lg p-1 shadow-sm mb-2">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
                          alt="二维码"
                          className="w-full h-full"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mb-1">扫码开始你的亲子洞察</p>
                      {!hasInviteCode && (
                        <p className="text-xs text-amber-600">分享给朋友，一起成长</p>
                      )}
                      {hasInviteCode && (
                        <p className="text-xs text-green-600">邀请码：{data.inviteCode}</p>
                      )}
                    </div>
                    {/* 底部 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-purple-800 py-2 text-center">
                      <p className="text-white text-xs">内在结构养育 · 亲子陪伴观察</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 操作 */}
          <div className="space-y-3">
            <button
              onClick={refreshStatus}
              className="w-full py-3 text-center text-purple-600 text-sm"
            >
              刷新进度 ↻
            </button>

            {hasInviteCode && (
              <Link
                href={`/register?inviteCode=${data.inviteCode}`}
                className="block w-full py-3 text-center text-purple-600 text-sm"
              >
                使用邀请码注册 →
              </Link>
            )}

            <button
              onClick={() => router.push('/login')}
              className="block w-full py-3 text-center text-gray-400 text-sm"
            >
              已有账号？直接登录
            </button>

            <Link
              href="/apply/stats"
              className="block w-full py-3 text-center text-purple-600 text-sm"
            >
              推广数据中心 →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 px-6 text-center">
        <p className="text-gray-400 text-xs">望杏成林 · 2026</p>
      </div>
    </div>
  );
}
