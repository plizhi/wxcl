'use client';

import { useState } from 'react';
import Link from 'next/link';

const dailyCases = [
  {
    title: '折纸飞机', context: '妈妈 · 小明 8岁',
    story: '今天放学，小明一进门就举着一架折纸飞机冲过来："妈妈你看你看！这是我今天手工课学的，花了一整节课才折好！"他小心翼翼地捧着，像是捧着什么宝贝。"你能不能陪我到楼下试飞一下？"\n\n我放下手里的事，跟他下楼。秋天的傍晚，风刚刚好。他用力把飞机抛出去，飞机晃晃悠悠飞了几米，掉下来了。他跑过去捡起来，说"再来！"我们又试了一次、两次，三次。每次飞机飞出去，他就追着跑，笑着、叫着。最后一次，飞机飞得特别远，他追到草地那头才捡到，举着飞机朝我挥手，满脸都是成就感。\n\n他说："妈妈，明天还能再来吗？"',
    strengths: ['他花一整节课折一架飞机，不是在"浪费时间"——他是在练习"我把想法变成现实"的能力', '面对失败说"再来"，这不是固执，是面对挫折时的内在韧性', '他举着飞机朝你挥手时，他在分享的不只是飞机，是他"做到了"的骄傲'],
    opportunity1: { dimension: '孩子用一整节课认真折纸飞机，并在失败后坚持尝试——这种对事物的热情和好奇心值得被保护', description: '', suggestion: '' },
    opportunity2: { dimension: '孩子在多次试飞失败后仍说"再来"并在成功后体验到满满的成就感——让他在努力与结果中反复感受这份喜悦', description: '', suggestion: '' },
    advice: '享受孩子此刻的分享与快乐，用陪伴和鼓励延续他的探索热情。',
  },
  {
    title: '不吃青菜', context: '妈妈 · 小明 8岁',
    story: '晚饭时间，小明夹了一筷子青菜放进嘴里嚼了两下，眉头皱起来，把筷子放下了。"妈妈，青菜好难吃。"他小声说，然后就不肯再动那盘青菜了。\n\n我没有说他，也没有逼他吃。只是把话题岔开，聊了聊今天学校里的事。聊着聊着，我注意到他又悄悄拿起了筷子，自己夹了一点青菜放进嘴里，慢慢嚼着咽下去了。\n\n他没有说话，但我知道他是在用自己的方式尝试。',
    strengths: ['他说"青菜好难吃"而不是大哭大闹——这是他在用语言管理自己的体验', '他没有讨价还价，也没有赌气，而是在你的沉默中找到了"我可以自己决定"的空间'],
    opportunity1: { dimension: '孩子温和地说"青菜好难吃"而不是大哭大闹——他在用语言管理自己的体验', description: '', suggestion: '' },
    opportunity2: { dimension: '孩子被接纳后悄悄拿起筷子自己尝试——他在用自己的方式面对真实', description: '', suggestion: '' },
    advice: '今天你给了孩子一个安全的"试错空间"，他的悄悄尝试就是在回应你的信任。',
  },
  {
    title: '第一次运动', context: '爸爸 · 小华 14岁',
    story: '这个周末，小华突然从房间里出来，说："爸，我想去打篮球。"我愣了一下——这是他第一次主动提出要运动。以前周末他都是宅在房间里玩手机，怎么叫都不出来。\n\n我问他要不要我陪他去，他说不用，自己换好衣服就出门了。我透过窗户看着他骑上自行车的背影，心里有点意外，也有点欣慰。\n\n两个小时后他回来了，满头大汗，但脸上带着一种我从没见过的表情——像是完成了什么。他把篮球往地上一放，说："爸，下次我还要去。"',
    strengths: ['孩子主动提出去运动，展现了内在的自主性，他能够基于内在动机做出新的选择', '独自前往并完成任务，体现了自我负责的态度'],
    opportunity1: { dimension: '孩子宅家已久却主动提出要出门打篮球——这对新体验的热情和对世界的好奇心值得被保护', description: '', suggestion: '' },
    opportunity2: { dimension: '孩子独自前往并在运动中体验到"我能做到"的成就感——这种内心的力量感值得被延续', description: '', suggestion: '' },
    advice: '你的沉默比追问更有力量，就让这个小火苗自己燃烧吧。',
  }
];

const ventingCases = [
  {
    title: '孩子发脾气', context: '妈妈 · 小明 8岁',
    story: '今天发生了一件事让我很困惑。小明在搭积木，搭到一半不知道怎么了，突然就把积木一把推倒了，然后坐在地上哭。我问他怎么了，他也不说，就是哭。\n\n他哭了好一会儿才停下来，抽噎着跟我说："我搭不好，积木总是倒。"我说"那我们一起想想怎么才能搭稳"，他也不听，就是闹。\n\n我不知道他是怎么了——是积木的问题吗？还是他在学校遇到什么事了？我开始怀疑是不是我哪里做得不好。',
    understanding: '我能感受到你心里的困惑和自责——当孩子突然情绪爆发时，本能地想"是不是我哪里做得不好"，这种自我反思很珍贵。',
    analysis: '从内在结构养育的视角看，孩子"扔掉积木"不是"不听话"，而是在说"我搭不好，我感到挫败和无力"。这个年龄的孩子，大脑中负责情绪调节的部分还在发育，他无法像成人一样理性地处理失败——他需要的不是"怎么搭稳"的方法，而是"我允许你有挫败感"的接纳。',
    summary: '你此刻的温柔理解，不是溺爱，而是在帮他搭建内心力量的第一块积木——允许自己失败，本身就是一种能力。'
  },
  {
    title: '三年级焦虑', context: '妈妈 · 小明 8岁',
    story: '小明马上要上三年级了，听别的家长说三年级是个坎——课程会变难很多，孩子很容易跟不上。我现在每天都很焦虑，怕他开学后成绩下滑。\n\n但我又不知道该怎么帮他。提前补课？我怕给他太大压力。不补？我又怕真的跟不上，这种不确定感让我很煎熬。\n\n我也怕我的焦虑传给他，所以在他面前都尽量不表现出来。但我自己心里没底。',
    understanding: '我能感受到你心里的那根弦——绷着，怕孩子跟不上，又怕自己的焦虑传给他。',
    analysis: '从内在结构养育的视角看，你的焦虑不是"多余的情绪"，而是一位母亲本能地在感应"我的孩子正在经历什么"。问题是：你的焦点在"三年级"，而孩子真正需要的，是你有能力看见他此刻的内在结构正在发生什么。',
    summary: '你不需要替他扫清所有的路障——你只需要成为那面干净的镜子，让他看见："我有能力走稳。"'
  },
  {
    title: '文理分科', context: '妈妈 · 小婷 17岁',
    story: '小婷今年高二了，面临文理分科的选择。她说她想选文科，但我觉得文科不好就业，以后找工作难。我想让她选理科，以后出路广一点。\n\n她很抵触，说她就是喜欢文科，理科她学不动。我说她还小，不懂这些，她就说"你不懂我"。\n\n我知道她大了，有自己的想法，但我真的是为她好。我怕她选文科以后后悔，但又不敢逼她太紧，怕影响她复习心情。',
    understanding: '我能感受到你心里的那根弦——一边是想为她好，一边是怕她以后后悔。这种拉扯，是每一位爱孩子的父母都会有的。',
    analysis: '从内在结构养育的视角看，女儿说"你不懂我"，她不是在拒绝你，而是在说"我想被你看见真正的我"。高二正是青春期自我整合的关键期——她需要空间去确认"我喜欢什么""我适合什么"，而不是被告知"你应该选什么"。',
    summary: '你不需要替她选路。你只需要让她知道："我看见你了，你的选择是被尊重的。"——当她感到被看见，她才能真正为自己负责。'
  }
];

function DailyCard({ data }: { data: typeof dailyCases[0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="bg-white rounded-2xl border-2 border-green-500 p-4 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-lg"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="text-center mb-3">
        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-2">🌿 陪伴&观察</span>
        <div className="text-xs text-gray-500">{data.context}</div>
        <div className="font-bold text-gray-800">{data.title}</div>
      </div>
      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-3 line-clamp-4">
        {data.story}
      </div>
      <div className="text-center text-xs text-amber-600 md:hidden">{expanded ? '点击收起' : '点击查看内在结构养育的发现'}</div>
      <div className="hidden md:block text-center text-xs text-amber-600">悬停查看内在结构养育的发现</div>
      {(expanded || true) && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {data.strengths && (
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-green-600 font-medium mb-1">✨ 亮点发现</div>
              {data.strengths.map((s, i) => <div key={i} className="text-xs text-gray-700 mb-1">• {s}</div>)}
            </div>
          )}
          {data.opportunity1 && (
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-xs text-amber-600 mb-1">🌱 {data.opportunity1.dimension}</div>
              {data.opportunity1.description && (
                <div className="text-xs text-gray-700">{data.opportunity1.description}</div>
              )}
              {data.opportunity1.suggestion && (
                <div className="text-xs text-gray-600 mt-1">→ {data.opportunity1.suggestion}</div>
              )}
            </div>
          )}
          {data.opportunity2 && (
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-xs text-amber-600 mb-1">🌱 {data.opportunity2.dimension}</div>
              {data.opportunity2.description && (
                <div className="text-xs text-gray-700">{data.opportunity2.description}</div>
              )}
              {data.opportunity2.suggestion && (
                <div className="text-xs text-gray-600 mt-1">→ {data.opportunity2.suggestion}</div>
              )}
            </div>
          )}
          {data.advice && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-500 font-medium mb-1">💬 建议</div>
              <div className="text-sm text-gray-700 italic">{data.advice}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VentingCard({ data }: { data: typeof ventingCases[0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="bg-white rounded-2xl border-2 border-purple-500 p-4 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-lg"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="text-center mb-3">
        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full mb-2">💬 压力吐槽</span>
        <div className="text-xs text-gray-500">{data.context}</div>
        <div className="font-bold text-gray-800">{data.title}</div>
      </div>
      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-3 line-clamp-4">
        {data.story}
      </div>
      <div className="text-center text-xs text-amber-600 md:hidden">{expanded ? '点击收起' : '点击查看内在结构养育的发现'}</div>
      <div className="hidden md:block text-center text-xs text-amber-600">悬停查看内在结构养育的发现</div>
      {(expanded || true) && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {data.understanding && (
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-xs text-purple-600 font-medium mb-1">💜 理解</div>
              <div className="text-sm text-gray-700">{data.understanding}</div>
            </div>
          )}
          {data.analysis && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 font-medium mb-1">🔍 分析</div>
              <div className="text-sm text-gray-700">{data.analysis}</div>
            </div>
          )}
          {data.summary && (
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-xs text-amber-600 font-medium mb-1">✨ 总结</div>
              <div className="text-sm text-gray-700 italic">{data.summary}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
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
              style={{ backgroundImage: 'url(/v2/media/apricot-forest-full.png)' }} />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-stone-800 mb-6 tracking-tight leading-tight">
            让我们一起在时光里，<br /><span className="text-amber-600">望杏成林</span>
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full text-amber-800 text-sm mb-6">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />内在结构养育
          </div>
          <p className="text-xl text-stone-600 mb-4 max-w-2xl mx-auto">孩子成绩下滑，沉默不语</p>
          <p className="text-lg text-amber-600 font-medium mb-8 max-w-xl mx-auto">你在焦虑什么？</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#discovery"
              className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full font-medium text-lg shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-105 transition-all">
              看看内在结构养育发现了什么 →
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

      {/* 案例展示 Section */}
      <section id="discovery" className="py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-800 mb-2">真实用户在记录中发现</h2>
            <p className="text-stone-500 text-sm">悬停卡片查看内在结构养育的发现</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dailyCases.map((c, i) => (
              <DailyCard key={`d-${i}`} data={c} />
            ))}
            {ventingCases.map((c, i) => (
              <VentingCard key={`v-${i}`} data={c} />
            ))}
          </div>
        </div>
      </section>

      {/* 方法论 Section */}
      <section id="methodology" className="py-24 px-6 bg-gradient-to-b from-[#fffbf7] to-amber-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">什么是内在结构养育？</h2>
          </div>
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
            <div className="space-y-6 text-lg text-stone-600 leading-relaxed">
              <p>
                <span className="text-amber-600 font-medium">内在结构养育</span>，不关注孩子外在的行为表现（听话吗？成绩好吗？），而是看见孩子内在正在发展什么。
              </p>
              <p>
                它帮助你看见：孩子的<span className="text-stone-800 font-medium">心神状态</span>、<span className="text-stone-800 font-medium">心理结构</span>、<span className="text-stone-800 font-medium">能力倾向</span>——帮助你在亲子互动中，看见一个真实的人，而不是一个"需要被教育"的对象。
              </p>
              <div className="bg-amber-50 rounded-xl p-6 text-center">
                <p className="text-xl text-amber-800 font-medium">记录不是目的，<span className="text-amber-600">看见才是</span>。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 两个核心功能 */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">两个核心功能</h2>
            <p className="text-stone-500 text-lg">帮助你用内在结构养育的视角，看见孩子</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8">
              <div className="text-4xl mb-4">🌿</div>
              <h3 className="text-xl font-bold text-stone-800 mb-3">陪伴&观察</h3>
              <p className="text-stone-600 leading-relaxed">
                记录和孩子在一起的时刻，用内在结构养育的眼光观察：<br />孩子的内在正在发展什么？<br />哪些方面可以继续支持？
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-8">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-stone-800 mb-3">压力吐槽</h3>
              <p className="text-stone-600 leading-relaxed">
                面对育儿困惑时倾诉，获得内在结构养育视角的发现：<br />不是给方法，不是安慰，<br />而是帮你重新理解正在发生什么。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 滋养时刻 Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-amber-50 to-[#fffbf7]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-4">滋养时刻</h2>
            <p className="text-stone-500 text-lg">被孩子滋养到的瞬间，看见养育的双向力量</p>
          </div>
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm">
            <div className="space-y-4 text-lg text-stone-600 leading-relaxed">
              <p>
                养育不仅是付出，也是<span className="text-amber-600 font-medium">收获</span>。
              </p>
              <p>
                孩子的一个拥抱、一句暖心的话、一次主动的分享——都在滋养你。
              </p>
              <p>
                记录这些时刻，看见<span className="text-stone-800 font-medium">彼此滋养</span>的力量。
              </p>
            </div>
            <div className="mt-8 bg-amber-50 rounded-xl p-6 text-center">
              <p className="text-xl text-amber-800 font-medium">
                "孩子也在滋养你，你们彼此滋养。"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-amber-100 via-orange-50 to-[#fffbf7]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-6">你也来试试</h2>
          <p className="text-stone-500 text-lg mb-10">
            记录一件小事，<br />看看内在结构养育会帮你发现什么
          </p>
          <Link href="/login"
            className="inline-block px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full font-medium text-lg shadow-lg shadow-amber-200 hover:shadow-xl hover:scale-105 transition-all">
            立即开始体验 →
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 bg-stone-100">
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
