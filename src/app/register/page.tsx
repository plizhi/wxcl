'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [parentRole, setParentRole] = useState<'爸爸' | '妈妈' | ''>('');
  const [otherRole, setOtherRole] = useState('');
  const [showOtherDropdown, setShowOtherDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const otherRoles = ['爷爷', '奶奶', '外公', '外婆', '姥爷', '姥姥', '哥哥', '姐姐', '叔叔', '阿姨', '其他'];

  const handleRoleSelect = (role: string) => {
    if (role === '其他') {
      // 点击"其他"按钮只是展开/收起下拉菜单
      setShowOtherDropdown(!showOtherDropdown);
    } else {
      setParentRole(role as '爸爸' | '妈妈');
      setOtherRole(role);
      setShowOtherDropdown(false);
    }
  };

  const handleOtherSelect = (role: string) => {
    setOtherRole(role);
    setShowOtherDropdown(false);
  };

  const getDisplayRole = () => {
    if (parentRole && otherRole && !['爸爸', '妈妈'].includes(otherRole)) {
      return otherRole;
    }
    return parentRole || otherRole;
  };

  async function handleRegister() {
    if (!phone || phone.length !== 11) {
      toast('请输入正确的手机号', 'error');
      return;
    }
    if (!activationCode) {
      toast('请输入激活码', 'error');
      return;
    }
    if (!getDisplayRole()) {
      toast('请选择您的角色', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(phone, activationCode, undefined, getDisplayRole() || undefined);
      toast('注册成功', 'success');
      router.replace('/add-child');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('已被使用')) {
        toast('激活码已被使用', 'error');
      } else {
        toast(msg || '注册失败', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 to-purple-50">
      {/* 移动端Banner图 */}
      <div className="relative mb-6 rounded-b-2xl overflow-hidden">
        <div
          className="h-48 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/v2/media/apricot-forest-full.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 to-amber-600/30" />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white">
          <p className="text-sm text-white/80">让我们一起在时光里</p>
          <h1 className="text-2xl font-bold">望杏成林</h1>
        </div>
      </div>

      {/* 注册表单 */}
      <div className="flex-1 px-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">注册</h2>
          <p className="text-gray-500 mb-6">首次登录填写激活码即可注册</p>

          <div className="space-y-4">
            {/* 角色选择 */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">您的角色是？</label>
              <div className="flex gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('爸爸')}
                  className={`flex-1 py-3 rounded-xl text-base font-medium border-2 transition-all ${
                    parentRole === '爸爸'
                      ? 'border-purple-500 bg-purple-50 text-purple-600'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  👨 爸爸
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSelect('妈妈')}
                  className={`flex-1 py-3 rounded-xl text-base font-medium border-2 transition-all ${
                    parentRole === '妈妈'
                      ? 'border-purple-500 bg-purple-50 text-purple-600'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  👩 妈妈
                </button>
              </div>
              {/* 其他角色下拉 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('其他')}
                  className={`w-full py-3 rounded-xl text-base font-medium border-2 transition-all flex items-center justify-between px-4 ${
                    parentRole !== '爸爸' && parentRole !== '妈妈' && otherRole
                      ? 'border-purple-500 bg-purple-50 text-purple-600'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <span>{otherRole || '其他亲属'}</span>
                  <span>{showOtherDropdown ? '▲' : '▼'}</span>
                </button>
                {showOtherDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-y-auto max-h-48">
                    {otherRoles.map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleOtherSelect(role)}
                        className={`w-full py-2.5 px-4 text-left text-sm hover:bg-purple-50 transition-colors ${
                          otherRole === role && role === '其他' ? 'bg-purple-50 text-purple-600' : ''
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="请输入手机号"
                maxLength={11}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-4 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="激活码"
                maxLength={8}
                value={activationCode}
                onChange={e => setActivationCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-4 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full py-4 rounded-full text-base font-medium text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              {loading ? '注册中...' : '注册'}
            </button>

            <p className="text-center text-sm text-gray-400 mt-4">
              已有账号？<a href="/login" className="text-purple-600">直接登录</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
