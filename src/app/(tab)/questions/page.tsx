'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { questionApi } from '@/lib/api';

const PROMPTS: Record<string, string> = {
  question: `你是「内在结构养育」顾问。先确认孩子年龄。再给建议。不超过150字。禁止说教。禁止空洞的"你做得很好"。`,
  chat: `你是「内在结构养育」顾问。简短回应。不超过100字。禁止说教。`,
};

function classify(text: string): "question" | "chat" {
  if (text.includes("？") || text.includes("怎么办") || text.includes("为什么")) return "question";
  return "chat";
}

async function callAI(text: string) {
  const intent = classify(text);
  const systemPrompt = PROMPTS[intent];

  const res = await fetch("/api/chat", {
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
      const result = await callAI(content.trim());
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
          <h1 className="text-lg font-medium">💧 望杏阁</h1>
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

      {/* 望杏阁回应 */}
      {reply && (
        <div className="mx-4 mb-4 bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-medium text-purple-600 mb-3">💧 望杏阁回应</h3>
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
              placeholder="进亭歇歇，和望杏说说..."
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-0 outline-none resize-none min-h-32"
            />
            <div className="flex justify-between items-center mt-3">
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="text-sm text-purple-600"
              >
                预约阁主 →
              </button>
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="px-6 py-2 bg-purple-500 text-white rounded-full text-sm font-medium disabled:opacity-50"
              >
                {loading ? '阁主回应中...' : '倾诉'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 提示 */}
      <div className="px-4 py-4">
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">💡 温馨提示</p>
          <p>记录一个关系需要被滋养的时刻，望杏会帮你一起看见。</p>
        </div>
      </div>
    </div>
  );
}
