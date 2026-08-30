'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

function ApplyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyData, setApplyData] = useState<{
    applyId: string;
    shareCode: string;
    status: string;
    inviteCode?: string;
    inviteExpiresAt?: string;
    hasInviteCode?: boolean;
  } | null>(null);

  // 如果 URL 中有 referrerShareCode，自动填充（但不需要用户看到）
  const referrerShareCode = searchParams.get('ref');

  useEffect(() => {
    // 检查是否已有申请记录
    const savedApplyId = localStorage.getItem('applyId');
    const savedShareCode = localStorage.getItem('shareCode');
    if (savedApplyId && savedShareCode) {
      // 跳转到状态页面
      router.replace(`/apply/${savedShareCode}`);
    }
  }, [router]);

  async function handleSubmit() {
    if (!phone || phone.length !== 11) {
      toast('请输入正确的手机号', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, referrerShareCode }),
      });
      const data = await res.json();

      if (data.code === 0) {
        // 保存申请信息
        localStorage.setItem('applyId', data.data.applyId);
        localStorage.setItem('shareCode', data.data.shareCode);
        localStorage.setItem('applyPhone', phone);
        setApplyData(data.data);

        // 跳转到状态页面
        router.push(`/apply/${data.data.shareCode}`);
      } else {
        toast(data.message || '申请失败', 'error');
      }
    } catch (e) {
      toast('网络异常', 'error');
    } finally {
      setLoading(false);
    }
  }

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

      {/* 申请表单 */}
      <div className="flex-1 px-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">申请体验</h2>
          <p className="text-gray-500 mb-6">填写手机号，开启你的望杏之旅</p>

          <div className="space-y-4">
            <div>
              <input
                type="tel"
                placeholder="请输入手机号"
                maxLength={11}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-4 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-full text-base font-medium text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              {loading ? '提交中...' : '提交申请'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            已有账号？<a href="/login" className="text-purple-600">直接登录</a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 px-6 text-center">
        <p className="text-gray-400 text-xs">望杏成林 · 2026</p>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    }>
      <ApplyPageContent />
    </Suspense>
  );
}
