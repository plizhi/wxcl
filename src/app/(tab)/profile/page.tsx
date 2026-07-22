'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { userApi, profileApi, ProfileData } from '@/lib/api';

interface ChildInfo {
  id?: number;
  name: string;
  gender: string;
  grade?: string;
  personality?: string;
}

const DEFAULT_CHILD_ID = '00000000-0000-0000-0000-000000000001';

export default function ProfilePage() {
  const router = useRouter();
  const { user, fetchUserInfo, logout, isLoading } = useAuth();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildInfo | null>(null);
  const [form, setForm] = useState({
    name: '',
    gender: '',
    grade: '',
    personality: '',
  });

  useEffect(() => {
    fetchUserInfo();
    loadChildren();
    loadProfile();
  }, [fetchUserInfo]);

  async function loadChildren() {
    try {
      const res = await userApi.getChildren();
      setChildren(res || []);
    } catch (e) {
      console.error('加载失败', e);
    }
  }

  async function loadProfile() {
    try {
      const { profile: p } = await profileApi.getProfile(DEFAULT_CHILD_ID);
      setProfile(p);
    } catch (e) {
      console.error('加载画像失败', e);
    }
  }

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

  async function handleSave() {
    if (!form.gender) return;
    try {
      if (editingChild?.id) {
        await userApi.updateChild(editingChild.id, form);
      } else {
        await userApi.saveChild(form as any);
      }
      setShowAdd(false);
      loadChildren();
    } catch (e) {
      console.error('保存失败', e);
    }
  }

  // 判断画像是否完整
  const profileComplete = profile && (
    (profile.personality?.type && profile.personality.type !== '') ||
    (profile.interests && profile.interests.length > 0) ||
    (profile.strengths && profile.strengths.length > 0)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur z-10 border-b border-gray-100">
        <div className="flex items-center justify-center px-4 h-14">
          <h1 className="text-lg font-medium">👤 我的</h1>
        </div>
      </div>

      {/* 孩子画像卡片 */}
      <div className="mx-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-500">孩子画像</h2>
            <button
              onClick={() => router.push('/profile/setup')}
              className="text-xs text-amber-500"
            >
              {profileComplete ? '编辑' : '去完善'}
            </button>
          </div>

          {profile ? (
            <div className="p-4 space-y-4">
              {/* 性格 */}
              {profile.personality?.type && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">性格特质</div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                      {profile.personality.type === 'introvert' ? '内向型' :
                       profile.personality.type === 'extrovert' ? '外向型' : '混合型'}
                    </span>
                    {profile.personality.details?.map((d, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 兴趣爱好 */}
              {profile.interests && profile.interests.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">兴趣爱好</div>
                  <div className="flex gap-2 flex-wrap">
                    {profile.interests.map((interest, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">{interest}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 优势强项 */}
              {profile.strengths && profile.strengths.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">优势强项</div>
                  <div className="space-y-1">
                    {profile.strengths.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-amber-500">✨</span> {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 支持方向 */}
              {profile.growthGoals?.supports && profile.growthGoals.supports.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">支持方向</div>
                  <div className="space-y-1">
                    {profile.growthGoals.supports.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-purple-500">💜</span> {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!profileComplete && (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">还没有填写画像</p>
                  <button
                    onClick={() => router.push('/profile/setup')}
                    className="mt-2 text-amber-500 text-sm"
                  >
                    去完善 →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400 mb-4">还没有孩子画像</p>
              <button
                onClick={() => router.push('/profile/setup')}
                className="px-6 py-2 bg-amber-500 text-white rounded-full text-sm"
              >
                去创建
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 孩子信息卡片 */}
      <div className="mx-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-500">孩子信息</h2>
          </div>
          {children.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-400 mb-4">还没有添加孩子信息</p>
              <button onClick={openAdd} className="px-6 py-2 bg-purple-500 text-white rounded-full text-sm">
                + 添加孩子
              </button>
            </div>
          ) : (
            <>
              {children.map((child, idx) => (
                <div key={idx} className="p-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium">{child.name || '孩子'}</span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {child.gender === 'boy' ? '男孩' : child.gender === 'girl' ? '女孩' : ''}
                        {child.grade && ` · ${child.grade}`}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingChild(child);
                        setForm(child);
                        setShowAdd(true);
                      }}
                      className="text-xs text-purple-500 border border-purple-200 rounded-full px-2 py-0.5"
                    >
                      编辑
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-amber-50 rounded-lg text-xs text-amber-700">
                      📊 全景报告
                    </button>
                    <button className="flex-1 py-2 bg-purple-50 rounded-lg text-xs text-purple-700">
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
        <button className="w-full bg-white rounded-2xl p-4 shadow-sm text-left">
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
        <button className="w-full bg-gradient-to-r from-red-500 to-orange-400 rounded-2xl p-4 text-white text-left">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="font-medium">情绪急救</p>
              <p className="text-sm text-white/80">快要忍不住了？先停一下</p>
            </div>
          </div>
        </button>
      </div>

      {/* 服务条款 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        <button className="w-full flex items-center justify-between px-5 py-4">
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
    </div>
  );
}
