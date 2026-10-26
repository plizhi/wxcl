'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

// 统一账号密码：跨应用登录用的那一份凭据。
// 设一次密码，以后在别的应用也能用同一个账号登录。
export default function UnifiedAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/auth/credential', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        });
        const data = await res.json();
        if (data.code === 0) {
          setEligible(!!data.data.eligible);
          setPhoneMasked(data.data.phoneMasked);
        } else {
          toast(data.message || '查询失败', 'error');
        }
      } catch {
        toast('查询失败', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  async function handleApply() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/credential', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const data = await res.json();
      if (data.code === 0) {
        // 跳到认证中心设密码，设完再跳回本应用
        window.location.href = data.data.activation_url;
      } else {
        toast(data.message || '申请失败', 'error');
        setSubmitting(false);
      }
    } catch {
      toast('申请失败，请稍后再试', 'error');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-medium">统一账号密码</h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-medium text-gray-800 mb-2">一个账号，多个应用通用</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            设置后，您在望杏成林、荔学卷等其他产品里可以用同一个账号登录，不用再单独注册。
          </p>
          {phoneMasked && (
            <p className="text-sm text-gray-500 mt-3">
              当前手机号：<span className="text-gray-700">{phoneMasked}</span>
            </p>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-6 shadow-sm text-sm text-gray-400">加载中…</div>
        ) : eligible ? (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <button
              onClick={handleApply}
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium disabled:opacity-50"
            >
              {submitting ? '跳转中...' : '去设置统一密码'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              会跳转到认证中心设置密码，设置完成后自动返回
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-600 leading-relaxed">
              暂不能开通：需要先用绑定手机号的激活码登录一次，用来确认这个手机号确实属于您。
            </p>
            <p className="text-xs text-gray-400 mt-3">
              激活码可以向管理员领取；用激活码登录后，本页会自动开通。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
