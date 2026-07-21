'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';

const PROMPTS: Record<string, string> = {
  question: `你是「内在结构养育」顾问。请根据用户描述的情况，按以下结构给出专业建议：

【理解】用一两句话准确描述你理解的用户处境和感受
【分析】分析问题的关键所在和孩子/家长的心理需求
【建议】给出2-3个具体、可操作的建议，融入内在结构养育的理念
【收尾】用一句温暖的话结束

内在结构养育的核心原则：
1. 孩子的问题不是单纯"行为问题"，是身心结构在特定经历下的综合呈现
2. 从"改行为"转向"看结构"——先问"他在回避什么"
3. 理解孩子的身体/情绪信号，不要急于给方法
4. 先帮孩子识别和命名情感，才能进一步调节情感
5. 青春期是自我整合期——给空间，不是给答案
6. 孩子的"问题行为"可能是适应性的生存策略
7. 养育的目标不是让孩子完美，而是让孩子活出符合自己本性的真实生活
8. 给孩子校正性情感体验——"你提需求是被允许的"，比讲道理更重要
9. 镜映和生理满足同等重要——孩子需要被"看见"

禁止说教。禁止空洞的"你做得很好"。`,
  chat: `你是「内在结构养育」顾问。用户分享了一个困扰或心情，请给予理解和回应。融入内在结构养育的理念，温暖而专业。禁止说教。`,
};

function classify(text: string): "question" | "chat" {
  if (text.includes("？") || text.includes("怎么办") || text.includes("为什么")) return "question";
  return "chat";
}

async function callAI(text: string, parentRole?: string) {
  const intent = classify(text);
  let systemPrompt = PROMPTS[intent];

  // 添加用户身份信息到 prompt
  if (parentRole && intent === 'question') {
    const roleText = parentRole === 'father' ? '爸爸' : '妈妈';
    systemPrompt = `${systemPrompt}\n\n用户身份是${roleText}，请在回复中用这个称谓称呼用户。`;
  }

  const res = await fetch("/v2/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text, intent, systemPrompt }),
  });

  if (!res.ok) return "服务暂时不可用，请稍后再试。";

  const data = await res.json();
  return data.reply;
}

const SCENE_TAGS = [
  { value: 'emotion', label: '情绪', emoji: '😢' },
  { value: 'conflict', label: '冲突', emoji: '⚡' },
  { value: 'silent', label: '冷战', emoji: '😶' },
  { value: 'education', label: '教育', emoji: '📚' },
  { value: 'daily', label: '日常', emoji: '🏠' },
  { value: 'other', label: '其他', emoji: '💬' },
];

export default function QuestionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [sceneTag, setSceneTag] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setReply('');
    try {
      const result = await callAI(content.trim(), user?.parentRole);
      setReply(result);
      toast('提交成功', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast(msg || '提交失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* 顶部导航 */}
      <div className="sticky top-0 bg-white/90 backdrop-blur z-10 border-b border-gray-100">
        <div className="flex items-center gap-4 px-4 h-14">
          <h1 className="text-lg font-medium">💬 压力吐槽</h1>
        </div>
      </div>

      {/* 场景标签选择 */}
      <div className="px-4 py-4">
        <p className="text-sm text-gray-500 mb-3">发生了什么类型的困扰？</p>
        <div className="flex flex-wrap gap-2">
          {SCENE_TAGS.map(tag => (
            <button
              key={tag.value}
              onClick={() => setSceneTag(tag.value)}
              className={`px-4 py-2 rounded-full text-sm flex items-center gap-1.5 transition-colors ${
                sceneTag === tag.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              <span>{tag.emoji}</span>
              <span>{tag.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 压力吐槽回应 */}
      {reply && (
        <div className="mx-4 mb-4 bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-medium text-purple-600 mb-3">💬 压力吐槽回应</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{reply}</p>
        </div>
      )}

      {/* 输入区域 */}
      <div className="px-4 flex-1">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="说说最近让你感到压力的事..."
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-0 outline-none resize-none min-h-32"
            />
            <div className="flex justify-end items-center mt-3">
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="px-6 py-2 bg-purple-500 text-white rounded-full text-sm font-medium disabled:opacity-50"
              >
                {loading ? '提交中...' : '倾诉'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 提示 */}
      <div className="px-4 py-4">
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">💡 温馨提示</p>
          <p>把压力说出来，我们会一起看见那些被忽略的积极时刻。</p>
        </div>
      </div>
    </div>
  );
}
