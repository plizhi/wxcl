'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const steps = [
  {
    title: '停下来',
    desc: '深呼吸 3 次，给自己一个缓冲',
    icon: '🧘',
    tip: '手放在胸口，感受呼吸',
  },
  {
    title: '离开现场',
    desc: '暂时离开，去阳台或洗手间',
    icon: '🚶',
    tip: '和孩子说："妈妈去冷静一下"',
  },
  {
    title: '默念咒语',
    desc: '"亲子关系比成绩重要"',
    icon: '🙏',
    tip: '默念 3 遍，情绪会慢慢平复',
  },
  {
    title: '回来只说一句话',
    desc: '"妈妈很爱你，只是刚才没控制好情绪"',
    icon: '💬',
    tip: '一句道歉，比长篇大论更有效',
  },
];

const longTerm = [
  { title: '记录情绪触发器', desc: '写下每次情绪失控的场景，找到规律', icon: '📝' },
  { title: '给自己设"冷静角"', desc: '在家中找一个让自己平静的角落', icon: '🪴' },
  { title: '每天一句正向表达', desc: '哪怕一句"今天你做得不错"，关系慢慢修复', icon: '✨' },
  { title: '允许自己做得不好', desc: '情绪管理是长期练习，接纳自己的不完美', icon: '🤗' },
];

export default function EmergencyPage() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const [showLongTerm, setShowLongTerm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur z-10 border-b border-gray-100">
        <div className="flex items-center gap-4 px-4 h-14">
          <button onClick={() => router.back()} className="text-gray-600 text-xl">←</button>
          <h1 className="text-lg font-medium">🔥 情绪急救</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔥</div>
          <h2 className="text-2xl font-semibold mb-2">快要忍不住了？</h2>
          <p className="text-sm text-gray-500">先停一下，你正在做一个重要选择</p>
        </div>

        {/* Immediate steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 flex items-start gap-4 shadow-sm">
              <div className="flex flex-col items-center gap-1">
                <div className="text-3xl">{step.icon}</div>
                <div className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {i + 1}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium text-base mb-1">{step.title}</div>
                <div className="text-sm text-gray-600 mb-1">{step.desc}</div>
                <div className="text-xs text-purple-500 bg-purple-50 rounded-full px-2 py-0.5 inline-block">
                  {step.tip}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Long term toggle */}
        <button
          onClick={() => setShowLongTerm(!showLongTerm)}
          className="w-full py-3 rounded-full border border-gray-200 text-gray-600 text-sm"
        >
          {showLongTerm ? '收起' : '长期建议'} → 情绪管理从平时做起
        </button>

        {/* Long term */}
        {showLongTerm && (
          <div className="space-y-3 mt-4">
            {longTerm.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                <div className="text-2xl">{item.icon}</div>
                <div>
                  <div className="font-medium text-sm mb-0.5">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="w-full mt-6 py-3 rounded-full bg-gray-100 text-gray-600 text-sm"
        >
          ← 返回
        </button>
      </div>
    </div>
  );
}
