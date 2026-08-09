'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      router.replace('/home');
    }
  }, [isLoggedIn, isLoading, router]);

  async function handleTry() {
    if (!message.trim()) {
      setError('请输入您的困惑或亲子时刻');
      return;
    }

    setError('');
    setLoading(true);
    setReply('');

    try {
      const res = await fetch('/api/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setReply(data.data.reply);
      } else {
        setError(data.message || '体验失败，请重试');
      }
    } catch (e) {
      setError('网络异常，请重试');
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffbf7]">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-[#fffbf7]" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-orange-200 rounded-full opacity-20 blur-3xl" />
        <div className="relative z-10 text-center">
          <div className="mb-8">
            <div className="w-full max-w-2xl h-48 md:h-64 mx-auto rounded-2xl shadow-xl bg-cover bg-center"
              style={{ backgroundImage: 'url(/media/apricot-forest-full.png)' }} />
          </div>
          {/* 新文案 Hero */}
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-base md:text-lg text-stone-600 mb-6 leading-relaxed">
              有人说，养育孩子最大的隐患，是耽误。
            </p>

            <p className="text-sm md:text-base text-stone-500 mb-8 leading-relaxed max-w-xl mx-auto">
              这句话戳中了许多父母内心最深的恐惧。<br />
              但"耽误"这个词，本身就预设了一条精准无误的路。
            </p>

            <p className="text-sm md:text-base text-stone-600 mb-8 leading-relaxed max-w-xl mx-auto">
              真正的隐患，或许不是他走得慢、走弯路，<br />
              而是我们因为害怕"耽误"，<br />
              把全部力气都用来修剪看得见的枝叶，甚至拔苗助长，<br />
              却忘了<span className="text-amber-600 font-medium">培土扎根</span>。
            </p>

            <p className="text-base md:text-lg text-stone-600 mb-6 leading-relaxed max-w-xl mx-auto">
              比起担心"耽误"，父母们更应关注孩子的<span className="text-amber-600 font-medium">内在结构</span>——<br />
              那才是他扎根于世、无惧风雨的底气。
            </p>

            <p className="text-sm md:text-base text-stone-500 mb-8 leading-relaxed max-w-xl mx-auto">
              那不是分数和才艺，而是他精神世界的根基：
            </p>
            <div className="text-sm md:text-base text-stone-600 mb-8 leading-relaxed max-w-xl mx-auto text-left inline-block">
              <p>被无条件爱着的确信</p>
              <p>明辨是非的价值观</p>
              <p>深扎于心的归属感</p>
              <p>以及自己想去探索的生命力</p>
            </div>

            <p className="text-sm md:text-base text-stone-600 mb-8 leading-relaxed max-w-xl mx-auto">
              一个内在结构坚实的孩子，就像根系深扎的树。<br />
              风雨会来，但他不会轻易倒下。<br />
              他自有生长节奏，一时的落后，耽误不了他最终参天。
            </p>

            <p className="text-sm md:text-base text-stone-600 mb-8 leading-relaxed max-w-xl mx-auto">
              真正的不耽误，不是为他遮挡本应经历的风雨，<br />
              而是帮他拥有<span className="text-amber-600 font-medium">穿越风雨的力量</span>。
            </p>

            <p className="text-sm md:text-base text-stone-500 mb-10 leading-relaxed max-w-xl mx-auto">
              这需要我们把目光从外界收回，<br />
              在那些看似无用的陪伴和对话里，<br />
              把信任与价值，一点点种进他心里。
            </p>

            <p className="text-base md:text-lg text-amber-600 font-medium mb-4">
              别让焦虑，占据了你用来爱他的此刻。
            </p>

            <p className="text-xl md:text-2xl text-stone-700 font-medium mb-10">
              让我们一起，在时光里，望杏成林。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#trial"
              className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full font-medium text-lg shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-105 transition-all">
              先体验一下 →
            </a>
            <a href="#methodology"
              className="px-8 py-4 bg-white text-stone-700 rounded-full font-medium text-lg border border-stone-200 hover:border-amber-300 hover:text-amber-700 transition-all">
              了解更多
            </a>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* 体验入口 Section */}
      <section id="trial" className="py-16 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">先体验一下</h2>
            <p className="text-stone-500 text-sm">输入一段育儿困惑，看看内在结构养育会如何理解</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 md:p-8">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="比如：孩子发脾气的时候，我不知道该怎么回应..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-amber-200 rounded-xl text-base resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-amber-600">{message.length}/500</span>
              <button
                onClick={handleTry}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? '分析中...' : '试试看'}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            {reply && (
              <div className="mt-6 p-5 bg-white rounded-xl border border-amber-100">
                <div className="text-xs text-amber-600 font-medium mb-2">💜 内在结构养育视角</div>
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">{reply}</p>
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <p className="text-stone-400 text-xs mb-3">注册后可解锁完整功能：记录、报告、持续陪伴</p>
            <Link href="/register"
              className="inline-block px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full font-medium text-sm">
              立即注册体验完整版 →
            </Link>
          </div>
        </div>
      </section>

      {/* 方法论 Section */}
      <section id="methodology" className="py-16 px-6 bg-gradient-to-b from-[#fffbf7] to-amber-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-800 mb-4">什么是内在结构养育？</h2>
          </div>
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="space-y-4 text-base text-stone-600 leading-relaxed">
              <p>
                <span className="text-amber-600 font-medium">内在结构养育</span>，不关注孩子外在的行为表现（听话吗？成绩好吗？），而是看见孩子内在正在发展什么。
              </p>
              <p>
                它帮助你看见：孩子的<span className="text-stone-800 font-medium">心神状态</span>、<span className="text-stone-800 font-medium">心理结构</span>、<span className="text-stone-800 font-medium">能力倾向</span>——帮助你在亲子互动中，看见一个真实的人，而不是一个"需要被教育"的对象。
              </p>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-stone-700 font-medium">记录不是目的，<span className="text-amber-600">看见才是</span>。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 两个核心功能 */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">两个核心功能</h2>
            <p className="text-stone-500 text-sm">帮助你用内在结构养育的视角，看见孩子</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
              <div className="text-3xl mb-3">🌿</div>
              <h3 className="text-lg font-bold text-stone-800 mb-2">陪伴&观察</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                记录和孩子在一起的时刻，用内在结构养育的眼光观察：孩子的内在正在发展什么？哪些方面可以继续支持？
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="text-lg font-bold text-stone-800 mb-2">压力吐槽</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                面对育儿困惑时倾诉，获得内在结构养育视角的发现：不是给方法，不是安慰，而是帮你重新理解正在发生什么。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-amber-100 via-orange-50 to-[#fffbf7]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-stone-800 mb-4">你也来试试</h2>
          <p className="text-stone-500 text-base mb-6">
            记录一件小事，<br />看看内在结构养育会帮你发现什么
          </p>
          <Link href="/register"
            className="inline-block px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full font-medium text-lg shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-105 transition-all">
            立即开始体验 →
          </Link>
        </div>
      </section>

      <footer className="py-6 px-6 bg-stone-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-stone-500 text-sm">望杏成林 · 2026</div>
          <div className="flex gap-6 text-sm text-stone-400">
            <a href="/login" className="hover:text-amber-600">登录</a>
            <a href="/register" className="hover:text-amber-600">注册</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
