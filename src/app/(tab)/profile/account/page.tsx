'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import ContactAdmin from '@/components/ContactAdmin';

// 统一账号密码：跨应用登录用的那一份凭据。
// 设一次密码，以后在别的应用也能用同一个账号登录。
export default function UnifiedAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

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

  // 用激活码证明手机号归属。
  // 只写 phone_verified_at，不改密码——开通跨应用账号不该让人丢掉现有密码。
  async function handleVerifyCode() {
    if (!code.trim()) {
      toast('请输入激活码', 'error');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast('验证成功', 'success');
        setCode('');
        setEligible(true);
      } else {
        toast(data.message || '验证失败', 'error');
      }
    } catch {
      toast('验证失败，请稍后再试', 'error');
    } finally {
      setVerifying(false);
    }
  }

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
              需要先确认这个手机号确实属于您。输入管理员发给你的激活码即可开通。
            </p>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="请输入激活码"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-center tracking-widest focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleVerifyCode}
                disabled={verifying}
                className="px-5 py-3 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {verifying ? '验证中...' : '验证'}
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              激活码仅用于确认手机号归属，不会改变您的密码。
            </p>

            <ContactAdmin title="还没有激活码？" hint="扫码添加客服，领取您的专属激活码" />
          </div>
        )}
      </div>
    </div>
  );
}
