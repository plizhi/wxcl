'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// SSO 回调落地页：拿一次性 cookie 里的 token 换成正式登录态
export default function SsoCompletePage() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/portal/exchange', { method: 'POST' });
        const data = await res.json();
        if (data.code !== 0 || !data.data?.token) {
          throw new Error(data.message || '登录凭证已失效');
        }
        await loginWithToken(data.data.token);
        if (cancelled) return;

        // 补全资料：设密码 / 选角色 → 补孩子 → 进首页
        if (data.data.needsPassword || data.data.needsRole) {
          router.replace('/sso/setup');
        } else if (data.data.needsChild) {
          router.replace('/add-child');
        } else {
          router.replace('/home');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '登录失败';
        if (!cancelled) setError(msg);
      }
    })();

    return () => { cancelled = true; };
  }, [loginWithToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      {error ? (
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="px-6 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium"
          >
            返回登录
          </button>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">正在登录…</p>
      )}
    </div>
  );
}
