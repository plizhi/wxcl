'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChild } from '@/context/ChildContext';
import { useToast } from '@/components/ui/toast';
import { userApi } from '@/lib/api';

export default function AddChildPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const { refreshChildren, setCurrentChild } = useChild();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl' | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);

  // 未登录重定向（等待 AuthContext 加载完成）
  useEffect(() => {
    if (isLoading) return; // 还在加载中，等着
    if (!isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  async function handleSubmit() {
    if (!name.trim()) {
      toast('请输入孩子姓名', 'error');
      return;
    }
    if (!gender) {
      toast('请选择孩子性别', 'error');
      return;
    }

    setLoading(true);
    try {
      const child = await userApi.saveChild({
        name: name.trim(),
        gender,
        birthDate: birthDate || undefined,
      } as any);

      // 刷新孩子列表
      await refreshChildren();

      // 设置新添加的孩子为当前孩子
      if (child?.id) {
        setCurrentChild(child as any);
      }

      toast('添加成功', 'success');

      // 跳转到 onboarding，同时传递 childId
      router.push(`/onboarding?childId=${child.id}`);
    } catch (e: any) {
      toast(e.message || '添加失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    // 跳过直接进入首页
    router.replace('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
      {/* 顶部区域 */}
      <div className="bg-white px-4 pt-8 pb-4 shadow-sm">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">👶</div>
          <h1 className="text-xl font-medium text-gray-800">添加孩子</h1>
          <p className="text-sm text-gray-400 mt-1">记录孩子信息，开启陪伴之旅</p>
        </div>
      </div>

      {/* 表单区域 */}
      <div className="flex-1 px-4 py-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          {/* 姓名 */}
          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-2">孩子的名字</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入孩子姓名"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-0 outline-none"
            />
          </div>

          {/* 性别 */}
          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-2">孩子的性别</label>
            <div className="flex gap-4">
              <button
                onClick={() => setGender('boy')}
                className={`flex-1 py-4 rounded-xl border-2 transition-colors ${
                  gender === 'boy'
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-gray-200'
                }`}
              >
                <span className="text-2xl mr-2">👦</span>
                <span className="font-medium">男孩</span>
              </button>
              <button
                onClick={() => setGender('girl')}
                className={`flex-1 py-4 rounded-xl border-2 transition-colors ${
                  gender === 'girl'
                    ? 'border-pink-400 bg-pink-50 text-pink-700'
                    : 'border-gray-200'
                }`}
              >
                <span className="text-2xl mr-2">👧</span>
                <span className="font-medium">女孩</span>
              </button>
            </div>
          </div>

          {/* 出生日期 */}
          <div className="mb-6">
            <label className="block text-sm text-gray-600 mb-2">出生日期（选填）</label>
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-0 outline-none"
            />
          </div>
        </div>

        {/* 跳过按钮 */}
        <button
          onClick={handleSkip}
          className="w-full py-3 text-center text-gray-400 text-sm mt-4 hover:text-gray-600"
        >
          跳过，稍后补充
        </button>
      </div>

      {/* 底部按钮 */}
      <div className="px-4 py-6 bg-white shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !gender}
          className="w-full py-4 rounded-2xl text-white font-medium text-base disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          {loading ? '添加中...' : '添加并继续'}
        </button>
      </div>
    </div>
  );
}
