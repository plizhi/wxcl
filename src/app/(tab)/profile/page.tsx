'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChild } from '@/context/ChildContext';
import { userApi } from '@/lib/api';

interface ChildInfo {
  id: string;
  name: string;
  gender: string;
  grade?: string;
  personality?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, fetchUserInfo, logout, isLoading } = useAuth();
  const { currentChild, currentChildId, childrenList, setCurrentChild, refreshChildren } = useChild();
  const [showAdd, setShowAdd] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildInfo | null>(null);
  const [showUserEdit, setShowUserEdit] = useState(false);
  const [userForm, setUserForm] = useState({
    nickname: '',
    parentRole: '',
  });
  const [form, setForm] = useState({
    name: '',
    gender: '',
    grade: '',
    personality: '',
  });

  useEffect(() => {
    fetchUserInfo();
    refreshChildren();
  }, [fetchUserInfo, refreshChildren]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  function openAdd() {
    setEditingChild(null);
    setForm({ name: '', gender: '', grade: '', personality: '' });
    setShowAdd(true);
  }

  function openUserEdit() {
    setUserForm({
      nickname: user?.nickname || '',
      parentRole: user?.parentRole || '',
    });
    setShowUserEdit(true);
  }

  async function handleSaveUser() {
    try {
      await userApi.updateUser({
        nickname: userForm.nickname || undefined,
        parentRole: userForm.parentRole || undefined,
      } as any);
      await fetchUserInfo();
      setShowUserEdit(false);
    } catch (e) {
      console.error('保存失败', e);
    }
  }

  async function handleSave() {
    if (!form.gender) return;
    try {
      if (editingChild?.id) {
        await userApi.updateChild(editingChild.id, form as any);
      } else {
        await userApi.saveChild(form as any);
      }
      setShowAdd(false);
      refreshChildren();
    } catch (e) {
      console.error('保存失败', e);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur z-10 border-b border-gray-100">
        <div className="flex items-center justify-center px-4 h-14">
          <h1 className="text-lg font-medium">👤 我的</h1>
        </div>
      </div>

      {/* 孩子信息卡片 */}
      <div className="mx-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-500">孩子信息</h2>
          </div>
          {childrenList.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400 mb-4">还没有添加孩子信息</p>
              <button onClick={openAdd} className="px-6 py-2 bg-purple-500 text-white rounded-full text-sm">
                + 添加孩子
              </button>
            </div>
          ) : (
            <>
              {childrenList.map((child) => (
                <div
                  key={child.id}
                  className={`p-4 border-b border-gray-100 last:border-b-0 ${
                    child.id === currentChildId ? 'bg-amber-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {child.id === currentChildId && (
                          <span className="text-xs bg-amber-400 text-white rounded-full px-2 py-0.5">当前</span>
                        )}
                        <span className="font-medium">{child.name || '孩子'}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {child.gender === 'boy' ? '男孩' : child.gender === 'girl' ? '女孩' : ''}
                        {child.grade && ` · ${child.grade}`}
                      </div>
                    </div>
                    {child.id === currentChildId ? (
                      <button
                        onClick={() => router.push('/profile/setup')}
                        className="text-xs text-amber-500 border border-amber-200 rounded-full px-2 py-0.5"
                      >
                        完善画像
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentChild(child)}
                        className="text-xs text-purple-500 border border-purple-200 rounded-full px-2 py-0.5"
                      >
                        切换
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push('/comprehensive-report')}
                      className="flex-1 py-2 bg-amber-50 rounded-lg text-xs text-amber-700"
                    >
                      📊 全景报告
                    </button>
                    <button
                      onClick={() => router.push('/nourishment')}
                      className="flex-1 py-2 bg-purple-50 rounded-lg text-xs text-purple-700"
                    >
                      💧 滋养时刻
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={openAdd}
                className="w-full p-3 text-center text-sm text-purple-500 border-t border-gray-100"
              >
                + 添加孩子
              </button>
            </>
          )}
        </div>
      </div>

      {/* 滋养时刻入口 */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => router.push('/nourishment')}
          className="w-full bg-white rounded-2xl p-4 shadow-sm text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💧</span>
            <div className="flex-1">
              <p className="font-medium">我的滋养时刻</p>
              <p className="text-xs text-gray-400">记录被孩子滋养的时刻</p>
            </div>
            <span className="text-gray-400">→</span>
          </div>
        </button>
      </div>

      {/* 紧急入口 */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => router.push('/emergency')}
          className="w-full bg-gradient-to-r from-red-500 to-orange-400 rounded-2xl p-4 text-white text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="font-medium">情绪急救</p>
              <p className="text-sm text-white/80">快要忍不住了？先停一下</p>
            </div>
          </div>
        </button>
      </div>

      {/* 用户信息入口 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={openUserEdit}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">👤</span>
            <div className="text-left">
              <p className="text-gray-700">我的信息</p>
              <p className="text-xs text-gray-400">
                {user?.parentRole === '爸爸' ? '爸爸' : user?.parentRole === '妈妈' ? '妈妈' : '未设置角色'}
                {user?.nickname && ` · ${user.nickname}`}
              </p>
            </div>
          </div>
          <span className="text-gray-400">→</span>
        </button>
      </div>

      {/* 服务条款 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => router.push('/terms')} className="w-full flex items-center justify-between px-5 py-4">
          <span className="text-gray-700">服务条款</span>
          <span className="text-gray-400">→</span>
        </button>
      </div>

      {/* 登出 */}
      <div className="mx-4 mt-6">
        <button onClick={handleLogout} className="w-full py-3 text-center text-gray-400 hover:text-gray-600">
          退出登录
        </button>
      </div>

      <div className="text-center mt-8 text-xs text-gray-300">望杏成林 v2.0</div>

      {/* 添加/编辑孩子弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">{editingChild ? '编辑孩子信息' : '添加孩子'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">孩子的性别</label>
                <div className="flex gap-2">
                  {['男孩', '女孩'].map(g => (
                    <button
                      key={g}
                      onClick={() => setForm(f => ({ ...f, gender: g === '男孩' ? 'boy' : 'girl' }))}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 ${
                        form.gender === (g === '男孩' ? 'boy' : 'girl')
                          ? 'border-purple-500 bg-purple-50 text-purple-600'
                          : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">孩子的年级</label>
                <select
                  value={form.grade || ''}
                  onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                >
                  <option value="">请选择年级</option>
                  <option value="小学一年级">小学一年级</option>
                  <option value="小学二年级">小学二年级</option>
                  <option value="小学三年级">小学三年级</option>
                  <option value="小学四年级">小学四年级</option>
                  <option value="小学五年级">小学五年级</option>
                  <option value="小学六年级">小学六年级</option>
                  <option value="初一">初一</option>
                  <option value="初二">初二</option>
                  <option value="初三">初三</option>
                  <option value="高一">高一</option>
                  <option value="高二">高二</option>
                  <option value="高三">高三</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-full text-gray-500 text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.gender}
                  className="flex-1 py-3 bg-purple-500 text-white rounded-full text-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 用户信息编辑弹窗 */}
      {showUserEdit && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">编辑我的信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">您的角色</label>
                <div className="flex gap-2">
                  {['爸爸', '妈妈'].map(r => (
                    <button
                      key={r}
                      onClick={() => setUserForm(f => ({ ...f, parentRole: r }))}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 ${
                        userForm.parentRole === r
                          ? 'border-amber-500 bg-amber-50 text-amber-600'
                          : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">昵称（选填）</label>
                <input
                  type="text"
                  value={userForm.nickname}
                  onChange={e => setUserForm(f => ({ ...f, nickname: e.target.value }))}
                  placeholder="给自己起个昵称"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUserEdit(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-full text-gray-500 text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveUser}
                  className="flex-1 py-3 bg-amber-500 text-white rounded-full text-sm"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
