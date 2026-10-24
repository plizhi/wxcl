'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';

const OTHER_ROLES = ['爷爷', '奶奶', '外公', '外婆', '姥爷', '姥姥', '哥哥', '姐姐', '叔叔', '阿姨', '其他'];

// SSO 登录后的资料补全：选身份 + 设密码
// 手机号已由望杏成林账号验证过，这里不再重复采集
export default function SsoSetupPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [parentRole, setParentRole] = useState<string>(user?.parentRole || '');
  const [otherRole, setOtherRole] = useState<string>('');
  const [showOtherDropdown, setShowOtherDropdown] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getDisplayRole = () => {
    if (otherRole && !['爸爸', '妈妈'].includes(otherRole)) return otherRole;
    return parentRole || otherRole;
  };

  const handleRoleSelect = (role: string) => {
    if (role === '其他') {
      setShowOtherDropdown(true);
      return;
    }
    setParentRole(role);
    setOtherRole('');
    setShowOtherDropdown(false);
  };

  const handleOtherSelect = (role: string) => {
    setOtherRole(role);
    setParentRole('');
    setShowOtherDropdown(false);
  };

  const handleSubmit = async () => {
    if (!getDisplayRole()) {
      toast('请选择您的身份', 'error');
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
      const token = localStorage.getItem('token') || '';
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const pwRes = await fetch('/api/auth/password', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ password }),
      });
      const pwData = await pwRes.json();
      if (pwData.code !== 0) {
        toast(pwData.message || '密码设置失败', 'error');
        return;
      }

      await updateUser({ parentRole: getDisplayRole() });
      toast('设置成功', 'success');
      router.replace('/add-child');
    } catch (e) {
      toast(e instanceof Error ? e.message : '设置失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-purple-50 px-6 py-10">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">完善资料</h2>
        <p className="text-gray-500 mb-6">望杏成林账号已验证手机号，设置密码后可随时用密码登录</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {['爸爸', '妈妈'].map(role => (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleSelect(role)}
                className={`py-3 rounded-xl text-base font-medium border-2 transition-all ${
                  parentRole === role && !otherRole
                    ? 'border-purple-500 bg-purple-50 text-purple-600'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => handleRoleSelect('其他')}
              className={`w-full py-3 rounded-xl text-base font-medium border-2 transition-all flex items-center justify-between px-4 ${
                otherRole
                  ? 'border-purple-500 bg-purple-50 text-purple-600'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <span>{otherRole || '其他亲属'}</span>
              <span>{showOtherDropdown ? '▲' : '▼'}</span>
            </button>
            {showOtherDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-y-auto max-h-48">
                {OTHER_ROLES.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleOtherSelect(role)}
                    className={`w-full py-2.5 px-4 text-left text-sm hover:bg-purple-50 transition-colors ${
                      otherRole === role ? 'bg-purple-50 text-purple-600' : ''
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="password"
            placeholder="请输入密码（至少6位）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-4 border border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-500"
          />

          <input
            type="password"
            placeholder="请再次输入密码"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-4 border border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-500"
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-full text-base font-medium text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            {loading ? '提交中...' : '完成设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
