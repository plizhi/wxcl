# P1-2：压力吐槽 Prompt 升级方案

> 创建时间：2026-07-29
> 状态：待评审
> 优先级：P1（体验增强，应该做）

---

## 一、问题分析

### 现状
- 压力吐槽的 prompt 过于简单：
  ```
  你是「内在结构养育」顾问。先确认孩子年龄。再给建议。不超过150字。禁止说教。
  ```
- 返回内容只有简单的文字，没有结构化分析
- 与陪伴记录的专业框架相比，差距较大

### 目标
- 压力吐槽使用与陪伴记录同等专业级别的 prompt 框架
- 返回结构化内容：理解 + 分析 + 建议 + 总结
- 保持独立入口、独立流程

---

## 二、方案设计

### 2.1 升级后的 prompt

```typescript
const VENTING_PROMPT = `你是「内在结构养育」顾问。家长倾诉了一个困扰，请给予专业理解和回应。

【内在结构养育的核心原则】
1. 孩子的问题不是单纯"行为问题"，是身心结构在特定经历下的综合呈现
2. 从"改行为"转向"看结构"——先问"他在回避什么"
3. 理解孩子的身体/情绪信号，不要急于给方法
4. 先帮孩子识别和命名情感，才能进一步调节情感
5. 青春期是自我整合期——给空间，不是给答案
6. 孩子的"问题行为"可能是适应性的生存策略
7. 养育的目标不是让孩子完美，而是让孩子活出符合自己本性的真实生活
8. 给孩子校正性情感体验——"你提需求是被允许的"，比讲道理更重要
9. 镜映和生理满足同等重要——孩子需要被"看见"

请根据家长描述的情况，给出：

1. 理解（understanding）：用一两句话准确描述你理解的家长处境和感受
2. 分析（analysis）：分析问题的关键所在和家长/孩子的心理需求
3. 建议（suggestions）：给出2-3个具体、可操作的融入内在结构养育理念的建议
4. 亮点（strengths）：从描述中挖掘家长做得好的地方，1-2条（不是夸，是真实的肯定）
5. 一句话总结（summary）：温暖有力的一句话，给家长力量

用 JSON 格式返回：
{
  "understanding": "理解描述",
  "analysis": "分析描述",
  "suggestions": ["建议1", "建议2", "建议3"],
  "strengths": ["亮点1", "亮点2"],
  "summary": "一句话总结"
}

禁止说教。禁止空洞的"你做得很好"。禁止直接给答案。`;
```

---

## 三、返回结构对比

### 升级前
```json
{
  "reply": "简单的一段话..."
}
```

### 升级后
```json
{
  "understanding": "我能感受到你现在的无力感，面对孩子的这种情况...",
  "analysis": "从描述来看，孩子可能是在通过这种方式寻求关注...",
  "suggestions": [
    "试着在孩子平静的时候，先问问他'今天在学校怎么样'，而不是直接问问题行为",
    "当孩子表达需求时，即使你不认同，也先说'我听到了'",
    "可以试着回忆一下，孩子最近有没有哪次做得好的时候，当时发生了什么"
  ],
  "strengths": [
    "你能意识到这个问题并寻求帮助，这说明你很在意孩子的成长",
    "你愿意反思自己的做法，这本身就是很好的开始"
  ],
  "summary": "孩子需要的是被看见，而不是被改变"
}
```

---

## 四、前端展示改造

### 4.1 压力吐槽回复展示

```
┌─────────────────────────────────────────────────────────────┐
│  💬 压力吐槽回应                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  【理解】                                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 我能感受到你现在的无力感。面对孩子发脾气时...        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  【分析】                                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 孩子可能是在通过这种方式寻求关注...                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  【建议】                                                  │
│  • 试着在孩子平静时先问"今天怎么样"...                   │
│  • 当孩子表达需求时，先说"我听到了"...                   │
│  • 回忆一下孩子最近做得好的时候...                        │
│                                                             │
│  【亮点】                                                  │
│  ✨ 你能意识到这个问题并寻求帮助，说明你很在意...        │
│  ✨ 你愿意反思自己的做法，这本身就是很好的开始            │
│                                                             │
│  ─────────────────────────────────────────────────────   │
│                                                             │
│  💬 "孩子需要的是被看见，而不是被改变"                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、API 改造

### 5.1 改造位置

文件：`src/app/api/daily-care/analyze/route.ts`

### 5.2 代码改动

```typescript
// 现有的 SYSTEM_PROMPTS 中更新 venting prompt

const SYSTEM_PROMPTS = {
  // ... analyze (陪伴记录 prompt) 保持不变 ...

  venting: `你是「内在结构养育」顾问。家长倾诉了一个困扰，请给予专业理解和回应。

【内在结构养育的核心原则】
1. 孩子的问题不是单纯"行为问题"，是身心结构在特定经历下的综合呈现
2. 从"改行为"转向"看结构"——先问"他在回避什么"
3. 理解孩子的身体/情绪信号，不要急于给方法
4. 先帮孩子识别和命名情感，才能进一步调节情感
5. 青春期是自我整合期——给空间，不是给答案
6. 孩子的"问题行为"可能是适应性的生存策略
7. 养育的目标不是让孩子完美，而是让孩子活出符合自己本性的真实生活
8. 给孩子校正性情感体验——"你提需求是被允许的"，比讲道理更重要
9. 镜映和生理满足同等重要——孩子需要被"看见"

请根据家长描述的情况，给出：

1. 理解（understanding）：用一两句话准确描述你理解的家长处境和感受
2. 分析（analysis）：分析问题的关键所在和家长/孩子的心理需求
3. 建议（suggestions）：给出2-3个具体、可操作的融入内在结构养育理念的建议
4. 亮点（strengths）：从描述中挖掘家长做得好的地方，1-2条
5. 一句话总结（summary）：温暖有力的一句话，给家长力量

用 JSON 格式返回：
{
  "understanding": "理解描述",
  "analysis": "分析描述",
  "suggestions": ["建议1", "建议2", "建议3"],
  "strengths": ["亮点1", "亮点2"],
  "summary": "一句话总结"
}

禁止说教。禁止空洞的"你做得很好"。禁止直接给答案。`,
};
```

---

## 六、前端页面改造

### 6.1 改造位置

文件：`src/app/(tab)/daily-care/page.tsx`（压力吐槽 Tab）

### 6.2 展示组件改造

```tsx
// 压力吐槽回复展示
{report && (
  <div className="mx-4 mt-4 bg-white rounded-xl p-5 shadow-sm">
    <h3 className="font-medium text-lg mb-4">💬 压力吐槽回应</h3>

    {/* 理解 */}
    {report.understanding && (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-purple-600 mb-2">理解</h4>
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-sm text-gray-700">{report.understanding}</p>
        </div>
      </div>
    )}

    {/* 分析 */}
    {report.analysis && (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-purple-600 mb-2">分析</h4>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-700">{report.analysis}</p>
        </div>
      </div>
    )}

    {/* 建议 */}
    {report.suggestions && report.suggestions.length > 0 && (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-purple-600 mb-2">建议</h4>
        <ul className="space-y-2">
          {report.suggestions.map((s: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-purple-500">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* 亮点 */}
    {report.strengths && report.strengths.length > 0 && (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-amber-600 mb-2">✨ 亮点</h4>
        <ul className="space-y-1">
          {report.strengths.map((s: string, i: number) => (
            <li key={i} className="text-sm text-gray-700">✨ {s}</li>
          ))}
        </ul>
      </div>
    )}

    {/* 一句话总结 */}
    {report.summary && (
      <div className="bg-green-50 rounded-lg p-3 text-center">
        <p className="text-sm text-green-800 italic">💬 {report.summary}</p>
      </div>
    )}
  </div>
)}
```

---

## 七、效果预期

| 指标 | 升级前 | 升级后 |
|------|--------|--------|
| prompt专业度 | 简单 | 与陪伴记录同等 |
| 返回结构 | 纯文字 | 结构化5项 |
| 用户感知 | 泛泛而谈 | 有深度被理解 |
| 建议质量 | 空洞 | 具体可操作 |

---

## 八、待办事项

- [ ] 更新 `analyze/route.ts` 中的 venting prompt
- [ ] 确认 API 返回结构与前端展示匹配
- [ ] 测试压力吐槽功能
- [ ] 验证 JSON 解析正确性

---

## 九、相关文件

- API 文件：`src/app/api/daily-care/analyze/route.ts`（改造）
- 前端页面：`src/app/(tab)/daily-care/page.tsx`（展示改造）
