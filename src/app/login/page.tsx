'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!phone || phone.length !== 11) {
      toast('请输入正确的手机号', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(phone, undefined, password || undefined);
      toast('登录成功', 'success');
      router.replace('/');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('手机号或密码')) {
        toast('手机号或密码错误', 'error');
      } else {
        toast(msg || '登录失败', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 to-purple-50">
      {/* 移动端品牌标识 */}
      <div className="text-center pt-16 pb-8">
        <div
          className="h-40 mx-4 rounded-2xl bg-cover bg-center bg-no-repeat mb-4"
          style={{ backgroundImage: 'url(/media/apricot-forest-full.png)' }}
        />
        <p className="text-lg text-purple-700 mb-1">让我们一起在时光里</p>
        <h1 className="text-3xl font-bold text-purple-900">望杏成林</h1>
      </div>

      {/* 登录卡片 */}
      <div className="flex-1 px-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">欢迎回来</h2>
          <p className="text-gray-500 mb-6">请登录您的账号开始使用</p>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="请输入手机号"
                maxLength={11}
                className="w-full px-4 py-4 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:border-purple-500"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="请输入密码"
                maxLength={20}
                className="w-full px-4 py-4 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:border-purple-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-full text-base font-medium text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            没有账号？<a href="/register" className="text-purple-500 font-medium">立即注册 →</a>
          </p>
        </div>
      </div>

      {/* 切换到原版 */}
      <div className="text-center pb-8">
        <a
          href="https://wxcl.nzyy.cc/"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          体验原版 →
        </a>
      </div>
    </div>
  );
}
