'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function BindContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在跳转...');

  useEffect(() => {
    const phone = searchParams.get('phone');
    const from = searchParams.get('from');
    const token = searchParams.get('token');

    if (!phone || !from || !token || from !== 'nzyy') {
      setStatus('error');
      setMessage('参数错误');
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    async function doBind() {
      try {
        const res = await fetch('/api/bind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, from, token }),
        });
        const data = await res.json();

        if (data.code === 0 && data.data?.token) {
          loginWithToken(data.data.token);
          setStatus('success');
          setMessage('跳转成功...');
          setTimeout(() => router.push('/'), 1000);
        } else {
          setStatus('error');
          setMessage(data.message || '绑定失败');
          setTimeout(() => router.push('/'), 3000);
        }
      } catch {
        setStatus('error');
        setMessage('网络错误');
        setTimeout(() => router.push('/'), 3000);
      }
    }

    doBind();
  }, [searchParams, router, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
      <div className="bg-white rounded-2xl p-8 shadow-xl max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <p className="text-gray-600">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-600">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-gray-600">{message}</p>
            <p className="text-xs text-gray-400 mt-2">即将返回首页...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function BindPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-purple-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    }>
      <BindContent />
    </Suspense>
  );
}
