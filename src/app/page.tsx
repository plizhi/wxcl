'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#fffbf7]">
      {/* Hero Section - 主题图 + 场景开场 */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-[#fffbf7]" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-orange-200 rounded-full opacity-20 blur-3xl" />

        <div className={`relative z-10 text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* 主题图 */}
          <div className="mb-8">
            <div
              className="w-full max-w-2xl h-48 md:h-64 mx-auto rounded-2xl shadow-xl bg-cover bg-center"
              style={{ backgroundImage: 'url(/v2/media/apricot-forest-full.png)' }}
            />
          </div>

          {/* 主Slogan */}
          <h1 className="text-3xl md:text-5xl font-bold text-stone-800 mb-6 tracking-tight leading-tight">
            让我们一起在时光里，
            <br />
            <span className="text-amber-600">望杏成林</span>
          </h1>

          {/* 场景开场 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full text-amber-800 text-sm mb-6">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            内在结构养育
          </div>

          <p className="text-xl text-stone-600 mb-4 max-w-2xl mx-auto">
            孩子成绩下滑，沉默不语
          </p>

          <p className="text-lg text-amber-600 font-medium mb-8 max-w-xl mx-auto">
            你在焦虑什么？
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#discovery"
              className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full font-medium text-lg shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-105 transition-all"
            >
              看看内在结构养育发现了什么 →
            </a>
            <a
              href="#methodology"
              className="px-8 py-4 bg-white text-stone-700 rounded-full font-medium text-lg border border-stone-200 hover:border-amber-300 hover:text-amber-700 transition-all"
            >
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

      {/* 发现展示 Section */}
      <section id="discovery" className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">
              内在结构养育看到了什么？
            </h2>
            <p className="text-stone-500 text-lg">
              同一个场景，不同的看见
            </p>
          </div>

          {/* 案例展示 */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 md:p-12 mb-8">
            <div className="text-center mb-8">
              <span className="text-sm text-amber-600 font-medium">真实案例 · 脱敏处理</span>
              <h3 className="text-xl font-bold text-stone-800 mt-2">
                场景：孩子期末考试数学考砸了，沉默不语
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* 常规视角 */}
              <div className="bg-white rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 bg-red-400 rounded-full" />
                  <span className="text-sm font-medium text-red-600">常规看到的</span>
                </div>
                <ul className="space-y-3 text-stone-600">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">×</span>
                    <span>"孩子不努力"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">×</span>
                    <span>"态度有问题"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">×</span>
                    <span>"需要家长施压"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">×</span>
                    <span>"怎么就是不说原因"</span>
                  </li>
                </ul>
              </div>

              {/* 内在结构养育视角 */}
              <div className="bg-white rounded-2xl p-6 border-2 border-amber-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 bg-amber-500 rounded-full" />
                  <span className="text-sm font-medium text-amber-600">内在结构养育看到的</span>
                </div>
                <ul className="space-y-3 text-stone-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">→</span>
                    <span>她的"沉默"是在保护自己——害怕面对你的失望</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">→</span>
                    <span>"不知道"背后可能是缺乏表达情绪的词汇</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">→</span>
                    <span>她的沉默是适应策略，暂时封锁情感避免冲突</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-1">→</span>
                    <span>关键不在追问"为什么"，而在于先重建情感连接</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 核心发现 */}
            <div className="mt-8 text-center">
              <div className="inline-block bg-white rounded-xl px-6 py-4 shadow-sm">
                <p className="text-lg text-stone-700 italic">
                  "孩子的沉默不是对你关上了门，
                </p>
                <p className="text-lg text-amber-600 font-medium">
                  而是她还没找到钥匙——
                  <br />
                  而你放下焦虑的陪伴，就是那把钥匙的模具。"
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-stone-500">
            记录一件小事，内在结构养育会帮你看见行为背后的真相
          </p>
        </div>
      </section>

      {/* 方法论 Section */}
      <section id="methodology" className="py-24 px-6 bg-gradient-to-b from-[#fffbf7] to-amber-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">
              什么是内在结构养育？
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
            <div className="space-y-6 text-lg text-stone-600 leading-relaxed">
              <p>
                <span className="text-amber-600 font-medium">内在结构养育</span>，
                不关注孩子外在的行为表现（听话吗？成绩好吗？），而是看见孩子内在正在发展什么。
              </p>
              <p>
                它帮助你看见：孩子的
                <span className="text-stone-800 font-medium">心神状态</span>、
                <span className="text-stone-800 font-medium">心理结构</span>、
                <span className="text-stone-800 font-medium">能力倾向</span>——
                帮助你在亲子互动中，看见一个真实的人，而不是一个"需要被教育"的对象。
              </p>
              <div className="bg-amber-50 rounded-xl p-6 text-center">
                <p className="text-xl text-amber-800 font-medium">
                  记录不是目的，
                  <span className="text-amber-600">看见才是</span>。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 两个核心功能 */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">
              两个核心功能
            </h2>
            <p className="text-stone-500 text-lg">
              帮助你用内在结构养育的视角，看见孩子
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 陪伴&观察 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8">
              <div className="text-4xl mb-4">🌿</div>
              <h3 className="text-xl font-bold text-stone-800 mb-3">
                陪伴&观察
              </h3>
              <p className="text-stone-600 mb-4 leading-relaxed">
                记录和孩子在一起的时刻，用内在结构养育的眼光观察：
                <br />
                孩子的内在正在发展什么？
                <br />
                哪些方面可以继续支持？
              </p>
              <div className="text-sm text-stone-500">
                <p className="font-medium text-stone-700 mb-2">你会看到：</p>
                <ul className="space-y-1">
                  <li>• 孩子行为背后的心理机制</li>
                  <li>• 成长的方向（不是"问题"）</li>
                  <li>• 彼此滋养的关系</li>
                </ul>
              </div>
            </div>

            {/* 压力吐槽 */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-8">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-stone-800 mb-3">
                压力吐槽
              </h3>
              <p className="text-stone-600 mb-4 leading-relaxed">
                面对育儿困惑时倾诉，获得内在结构养育视角的发现：
                <br />
                不是给方法，不是安慰，
                <br />
                而是帮你重新理解正在发生什么。
              </p>
              <div className="text-sm text-stone-500">
                <p className="font-medium text-stone-700 mb-2">你会经历：</p>
                <ul className="space-y-1">
                  <li>• 被理解的感觉</li>
                  <li>• 认知重构（重新看见）</li>
                  <li>• 从焦虑到平静</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 滋养时刻（次要） */}
      <section className="py-16 px-6 bg-gradient-to-b from-amber-50 to-[#fffbf7]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-3xl mb-4">💧</div>
          <h3 className="text-xl font-bold text-stone-800 mb-3">
            滋养时刻
          </h3>
          <p className="text-stone-600 leading-relaxed">
            记录那些被孩子滋养到的瞬间，
            <br />
            让自己从消耗模式切换到滋养模式。
          </p>
          <p className="text-sm text-stone-400 mt-3">
            不是核心功能，但同样重要
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-amber-100 via-orange-50 to-[#fffbf7]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-6">
            你也来试试
          </h2>
          <p className="text-stone-500 text-lg mb-10">
            记录一件小事，
            <br />
            看看内在结构养育会帮你发现什么
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full font-medium text-lg shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-105 transition-all"
            >
              立即开始体验 →
            </Link>
          </div>
          <p className="text-sm text-stone-400 mt-6">
            望杏成林 · 内在结构养育陪伴
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-stone-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-stone-500 text-sm">
            望杏成林 · 2026
          </div>
          <div className="flex gap-6 text-sm text-stone-400">
            <a href="/login" className="hover:text-amber-600 transition-colors">登录</a>
            <a href="/register" className="hover:text-amber-600 transition-colors">注册</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
