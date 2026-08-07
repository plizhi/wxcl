'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';

export default function SetPasswordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [originalCode, setOriginalCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(true);

  useEffect(() => {
    async function fetchOriginalCode() {
      try {
        const res = await fetch('/api/auth/original-code', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        });
        const data = await res.json();
        if (data.code === 0) {
          setOriginalCode(data.data.code);
        }
      } catch (e) {
        console.error('获取激活码失败', e);
      } finally {
        setCodeLoading(false);
      }
    }
    fetchOriginalCode();
  }, []);

  async function handleSubmit() {
    if (!user) {
      toast('请先登录', 'error');
      return;
    }

    if (password.length < 6) {
      toast('密码至少6位', 'error');
      return;
    }

    if (password !== confirmPassword) {
      toast('两次密码不一致', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.code === 0) {
        toast('密码设置成功', 'success');
        router.back();
      } else {
        toast(data.message || '设置失败', 'error');
      }
    } catch (error) {
      toast('设置失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-medium">设置密码</h1>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          {/* 显示原始激活码 */}
          {!codeLoading && originalCode && (
            <div className="mb-6 p-4 bg-amber-50 rounded-xl">
              <p className="text-sm text-amber-800 mb-2">您的注册激活码是：</p>
              <p className="text-2xl font-bold text-amber-600 tracking-widest text-center">{originalCode}</p>
              <p className="text-xs text-amber-600 mt-2">激活码可用于登录，请勿泄露</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">设置新密码</label>
              <input
                type="password"
                placeholder="请输入密码（至少6位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">确认密码</label>
              <input
                type="password"
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium disabled:opacity-50"
            >
              {loading ? '设置中...' : '确认设置'}
            </button>

            <p className="text-center text-xs text-gray-400">
              设置密码后，您可以使用新密码或激活码登录
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
