export const metadata = {
  title: '服务条款',
  description: '望杏成林服务条款',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <a href="/profile" className="text-gray-600 hover:text-gray-800">← 返回</a>
          <h1 className="text-lg font-semibold text-stone-800 mt-2">服务条款</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">服务说明</h2>
          <p className="text-stone-600">
            望杏成林是一项基于「内在结构养育理论」的亲子陪伴记录与观察服务。
            我们提供陪伴记录的分析和建议，帮助家长更好地看见孩子、了解自己。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">使用规范</h2>
          <p className="text-stone-600">您同意：</p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li>使用我们的服务进行正当的亲子教育目的</li>
            <li>不会将服务用于任何非法或未经授权的目的</li>
            <li>不会尝试未经授权访问其他用户的账户或数据</li>
            <li>不会干扰或破坏服务的正常运行</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">免责声明</h2>
          <p className="text-stone-600">
            本服务提供的分析结果和建议仅供参考，不构成医学、心理或教育诊断。
            我们不对因使用本服务而产生的任何直接或间接损失负责。请家长结合实际情况
            和专业意见做出教育决策。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">联系我们</h2>
          <p className="text-stone-600">
            如对服务条款有任何疑问，请联系：
            <a href="mailto:support@nzyy.cc" className="text-amber-600 hover:underline">
              support@nzyy.cc
            </a>
          </p>
        </section>

        <p className="text-xs text-stone-400 mt-12 pb-20">
          最后更新日期：2026年8月
        </p>
      </main>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <div className="flex justify-around items-center h-14">
          <a href="/home" className="flex flex-col items-center justify-center w-16 h-full gap-0.5 text-gray-400">
            <span className="text-xl">🏠</span>
            <span className="text-xs">首页</span>
          </a>
          <a href="/daily-care" className="flex flex-col items-center justify-center w-16 h-full gap-0.5 text-gray-400">
            <span className="text-xl">🌿</span>
            <span className="text-xs">陪伴&观察</span>
          </a>
          <a href="/questions" className="flex flex-col items-center justify-center w-16 h-full gap-0.5 text-gray-400">
            <span className="text-xl">💬</span>
            <span className="text-xs">压力吐槽</span>
          </a>
          <a href="/profile" className="flex flex-col items-center justify-center w-16 h-full gap-0.5 text-purple-600">
            <span className="text-xl">👤</span>
            <span className="text-xs">我的</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
