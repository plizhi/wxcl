'use client';

import { useState, useEffect } from 'react';

export default function AdminCodesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secret, setSecret] = useState('');
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [count, setCount] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);
  const [error, setError] = useState('');

  function handleLogin() {
    if (!secret.trim()) {
      setError('请输入管理员密钥');
      return;
    }
    // 验证密钥
    localStorage.setItem('admin_secret', secret.trim());
    setIsAuthenticated(true);
    setError('');
  }

  function handleLogout() {
    localStorage.removeItem('admin_secret');
    setIsAuthenticated(false);
    setSecret('');
    setCodes([]);
  }

  function getHeaders(): HeadersInit {
    const savedSecret = localStorage.getItem('admin_secret') || secret;
    return {
      'Content-Type': 'application/json',
      'X-Admin-Secret': savedSecret
    };
  }

  async function fetchCodes() {
    setLoading(true);
    try {
      const resp = await fetch('/v2/api/auth/codes', {
        headers: getHeaders()
      });
      const data = await resp.json();
      if (data.code === 0) {
        setCodes(data.data.codes || []);
      } else if (data.code === 403) {
        setError('密钥无效');
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function generateCodes() {
    setLoading(true);
    try {
      const resp = await fetch('/v2/api/auth/codes', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ phone: phone || undefined, count: parseInt(count as any) || 1 })
      });
      const data = await resp.json();
      if (data.code === 0) {
        setGeneratedCodes(data.data.codes || []);
        fetchCodes();
      } else if (data.code === 403) {
        setError('密钥无效');
        setIsAuthenticated(false);
      } else {
        alert(data.message || '生成失败');
      }
    } catch (e) {
      console.error(e);
      alert('生成失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 检查是否已保存密钥
    const savedSecret = localStorage.getItem('admin_secret');
    if (savedSecret) {
      setSecret(savedSecret);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCodes();
    }
  }, [isAuthenticated]);

  // 未登录界面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">激活码管理</h1>
          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="请输入管理员密钥"
                className="w-full px-4 py-3 border rounded-lg text-center"
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              进入
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 已登录界面
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">激活码管理</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            退出登录
          </button>
        </div>

        {/* 生成新激活码 */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow">
          <h2 className="text-lg font-semibold mb-4">生成激活码</h2>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-600 mb-1">手机号（可选，留空为通用码）</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="可不填"
                className="px-4 py-2 border rounded-lg w-48"
                maxLength={11}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">数量</label>
              <input
                type="number"
                value={count}
                onChange={e => setCount(e.target.value)}
                min={1}
                max={100}
                className="px-4 py-2 border rounded-lg w-24"
              />
            </div>
            <button
              onClick={generateCodes}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? '生成中...' : '生成'}
            </button>
          </div>

          {generatedCodes.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 mb-2">生成成功！</p>
              <div className="space-y-1">
                {generatedCodes.map((c: any, i: number) => (
                  <div key={i} className="font-mono text-sm">
                    {c.phone} - {c.code}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 激活码列表 */}
        <div className="bg-white rounded-xl p-6 shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">激活码列表</h2>
            <button
              onClick={fetchCodes}
              disabled={loading}
              className="text-sm text-purple-600 hover:text-purple-800 disabled:opacity-50"
            >
              刷新
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">手机号</th>
                  <th className="text-left py-2 px-2">激活码</th>
                  <th className="text-left py-2 px-2">有效期</th>
                  <th className="text-left py-2 px-2">状态</th>
                  <th className="text-left py-2 px-2">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c: any) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2">{c.phone || '通用'}</td>
                    <td className="py-2 px-2 font-mono font-bold">{c.code}</td>
                    <td className="py-2 px-2">{new Date(c.expires_at).toLocaleDateString()}</td>
                    <td className="py-2 px-2">
                      {c.used ? (
                        <span className="text-green-600">已使用</span>
                      ) : new Date(c.expires_at) < new Date() ? (
                        <span className="text-red-600">已过期</span>
                      ) : (
                        <span className="text-blue-600">可用</span>
                      )}
                    </td>
                    <td className="py-2 px-2">{new Date(c.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {codes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      暂无激活码
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
