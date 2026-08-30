'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

export default function ApplyStatusPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const shareCode = params.code as string;

  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
        <div className="text-gray-400">申请不存在</div>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/apply?ref=${data.shareCode}`
    : '';

  const hasInviteCode = !!data.inviteCode;

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
                  navigator.clipboard.writeText(shareUrl);
                  toast('链接已复制', 'success');
                }}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg text-sm"
              >
                复制
              </button>
            </div>
          </div>

          {/* 邀请码（如果有） */}
          {hasInviteCode && (
            <div className="mb-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-500 mb-2">🎉 恭喜！你的邀请码</p>
                <p className="text-3xl font-bold tracking-wider text-green-600 mb-2">
                  {data.inviteCode}
                </p>
                <p className="text-xs text-gray-400">
                  有效期至 {data.inviteExpiresAt ? new Date(data.inviteExpiresAt).toLocaleDateString() : '7天后'}
                </p>
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
