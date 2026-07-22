'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { profileApi, ProfileData, Personality, GrowthGoals } from '@/lib/api';

const STEPS = [
  { id: 1, name: '基本信息', emoji: '👶' },
  { id: 2, name: '性格特质', emoji: '🌟' },
  { id: 3, name: '兴趣爱好', emoji: '🎨' },
  { id: 4, name: '优势强项', emoji: '💎' },
  { id: 5, name: '支持方向', emoji: '🤝' },
];

const PERSONALITY_TYPES = [
  { value: 'introvert', label: '内向型', desc: '安静、喜欢独处、深思熟虑' },
  { value: 'extrovert', label: '外向型', desc: '活泼、喜欢社交、善于表达' },
  { value: 'mixed', label: '混合型', desc: '在不同场景下表现不同' },
];

const INTEREST_OPTIONS = [
  '阅读', '运动', '音乐', '绘画', '舞蹈', '编程',
  '手工', '户外活动', '科学', '动物', '美食', '旅行',
];

const DEFAULT_CHILD_ID = '00000000-0000-0000-0000-000000000001';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 基础信息
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl' | ''>('');
  const [birthDate, setBirthDate] = useState('');

  // 性格特质
  const [personalityType, setPersonalityType] = useState<'introvert' | 'extrovert' | 'mixed' | ''>('');
  const [personalityDetails, setPersonalityDetails] = useState('');

  // 兴趣爱好
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');

  // 优势强项
  const [strengths, setStrengths] = useState<string[]>([]);
  const [customStrength, setCustomStrength] = useState('');

  // 支持方向
  const [supports, setSupports] = useState<string[]>([]);
  const [customSupport, setCustomSupport] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const { profile } = await profileApi.getProfile(DEFAULT_CHILD_ID);
      if (profile) {
        setName(profile.personality?.details?.[0] || '');
        setPersonalityType(profile.personality?.type || '');
        setInterests(profile.interests || []);
        setStrengths(profile.strengths || []);
        setSupports(profile.growthGoals?.supports || []);
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  }

  function addCustomItem(list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, custom: string, setCustom: (v: string) => void) {
    if (custom.trim() && !list.includes(custom.trim())) {
      setList([...list, custom.trim()]);
      setCustom('');
    }
  }

  async function handleNext() {
    if (step < 5) {
      setStep(step + 1);
    } else {
      await handleSave();
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const profileData: Partial<ProfileData> & { childId: string } = {
        childId: DEFAULT_CHILD_ID,
        personality: {
          type: personalityType as Personality['type'],
          details: personalityDetails ? [personalityDetails] : [],
        },
        interests,
        strengths,
        growthGoals: {
          enhancements: strengths,
          supports,
        },
      };

      await profileApi.saveProfile(profileData);
      toast('保存成功', 'success');
      router.push('/profile');
    } catch (e: any) {
      toast(e.message || '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-20">
      {/* 顶部导航 */}
      <div className="sticky top-0 bg-white/90 backdrop-blur z-10 border-b border-gray-100">
        <div className="flex items-center gap-4 px-4 h-14">
          <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="text-gray-600">
            {step > 1 ? '← 上一步' : '← 返回'}
          </button>
          <h1 className="text-lg font-medium">完善孩子画像</h1>
        </div>

        {/* 步骤指示器 */}
        <div className="flex justify-center py-3 bg-white">
          {STEPS.map(s => (
            <div key={s.id} className="flex items-center">
              <div className={`flex flex-col items-center ${step >= s.id ? 'text-amber-500' : 'text-gray-300'}`}>
                <span className="text-lg">{s.emoji}</span>
                <span className="text-xs">{s.name}</span>
              </div>
              {s.id < 5 && <div className={`w-8 h-0.5 mx-1 ${step > s.id ? 'bg-amber-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="px-4 py-6">
        {/* 步骤1: 基本信息 */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-lg font-medium mb-4">👶 基本信息</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">孩子的名字</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="请输入孩子姓名"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-0 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">性别</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setGender('boy')}
                      className={`flex-1 py-3 rounded-xl border-2 transition-colors ${
                        gender === 'boy' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200'
                      }`}
                    >
                      👦 男孩
                    </button>
                    <button
                      onClick={() => setGender('girl')}
                      className={`flex-1 py-3 rounded-xl border-2 transition-colors ${
                        gender === 'girl' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200'
                      }`}
                    >
                      👧 女孩
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">出生日期</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-0 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 步骤2: 性格特质 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-lg font-medium mb-4">🌟 性格特质</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">孩子的性格类型</label>
                  <div className="space-y-2">
                    {PERSONALITY_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setPersonalityType(t.value as 'introvert' | 'extrovert' | 'mixed')}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
                          personalityType === t.value ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="font-medium">{t.label}</div>
                        <div className="text-sm text-gray-500">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">具体描述（选填）</label>
                  <textarea
                    value={personalityDetails}
                    onChange={e => setPersonalityDetails(e.target.value)}
                    placeholder="用几句话描述孩子的性格特点..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-0 outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 步骤3: 兴趣爱好 */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-lg font-medium mb-4">🎨 兴趣爱好</h2>

              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-3">选择孩子感兴趣的活动（可多选）</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => toggleItem(interests, setInterests, opt)}
                      className={`px-4 py-2 rounded-full text-sm transition-colors ${
                        interests.includes(opt)
                          ? 'bg-amber-400 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">添加其他兴趣（选填）</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInterest}
                    onChange={e => setCustomInterest(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomItem(interests, setInterests, customInterest, setCustomInterest))}
                    placeholder="输入后按回车添加"
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-0 outline-none"
                  />
                  <button
                    onClick={() => addCustomItem(interests, setInterests, customInterest, setCustomInterest)}
                    className="px-4 py-2 bg-amber-400 text-white rounded-xl"
                  >
                    添加
                  </button>
                </div>
              </div>

              {interests.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">已选择：</p>
                  <div className="flex flex-wrap gap-2">
                    {interests.map(i => (
                      <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm flex items-center gap-1">
                        {i}
                        <button onClick={() => setInterests(interests.filter(x => x !== i))} className="ml-1">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 步骤4: 优势强项 */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-lg font-medium mb-4">💎 优势强项</h2>
              <p className="text-sm text-gray-500 mb-4">
                孩子有哪些做得好的地方？哪些特质让你感到骄傲？
              </p>

              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">添加优势（选填）</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customStrength}
                    onChange={e => setCustomStrength(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomItem(strengths, setStrengths, customStrength, setCustomStrength))}
                    placeholder="例如：善于表达、有耐心"
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-0 outline-none"
                  />
                  <button
                    onClick={() => addCustomItem(strengths, setStrengths, customStrength, setCustomStrength)}
                    className="px-4 py-2 bg-amber-400 text-white rounded-xl"
                  >
                    添加
                  </button>
                </div>
              </div>

              {strengths.length > 0 && (
                <div className="space-y-2">
                  {strengths.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
                      <span className="text-amber-500">✨</span>
                      <span className="flex-1 text-gray-700">{s}</span>
                      <button onClick={() => setStrengths(strengths.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              )}

              {strengths.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>还没有添加优势</p>
                  <p className="text-sm">可以在添加后让系统从记录中提取</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 步骤5: 支持方向 */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="text-lg font-medium mb-4">🤝 支持方向</h2>
              <p className="text-sm text-gray-500 mb-4">
                孩子有哪些方面需要家长支持？<br />
                <span className="text-amber-600">这是你主动认领的，系统不会直接定义"问题"</span>
              </p>

              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">添加支持方向（选填）</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSupport}
                    onChange={e => setCustomSupport(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomItem(supports, setSupports, customSupport, setCustomSupport))}
                    placeholder="例如：需要更多户外活动时间"
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-0 outline-none"
                  />
                  <button
                    onClick={() => addCustomItem(supports, setSupports, customSupport, setCustomSupport)}
                    className="px-4 py-2 bg-purple-400 text-white rounded-xl"
                  >
                    添加
                  </button>
                </div>
              </div>

              {supports.length > 0 && (
                <div className="space-y-2">
                  {supports.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl">
                      <span className="text-purple-500">💜</span>
                      <span className="flex-1 text-gray-700">{s}</span>
                      <button onClick={() => setSupports(supports.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              )}

              {supports.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>暂时没有想添加的支持方向</p>
                  <p className="text-sm">可以跳过，之后在记录中慢慢发现</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-4 shadow-lg">
        <button
          onClick={handleNext}
          disabled={saving}
          className="w-full py-3 rounded-2xl text-white font-medium text-base disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          {saving ? '保存中...' : step < 5 ? '下一步' : '完成'}
        </button>
      </div>
    </div>
  );
}
