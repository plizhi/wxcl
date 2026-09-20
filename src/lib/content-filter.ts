/**
 * 育儿内容过滤器
 * 检测用户输入是否与育儿/亲子相关
 * 非育儿内容直接婉拒，不调取 LLM
 */

const PARENTING_KEYWORDS = [
  // 家庭角色
  '孩子', '孩子', '宝宝', '小孩', '小朋友',
  '儿子', '女儿', '闺女', '小子', '娃',
  '爸爸', '妈妈', '父亲', '母亲', '家长',
  '亲子', '育儿', '教养',
  // 学校相关
  '学校', '班级', '班主任', '老师', '同学',
  '上学', '放学', '课间', '课堂',
  '作业', '考试', '成绩', '排名', '分数',
  '小学', '中学', '初中', '高中', '高中',
  '学习', '上课', '补课', '培训班',
  // 心理/发展相关
  '情绪', '脾气', '哭', '闹', '叛逆',
  '内向', '外向', '性格', '个性',
  '注意力', '多动', '自闭', '发育',
  '成长', '发展', '青春期', '叛逆期',
  '厌学', '拖延', '拖拉', '磨蹭',
  // 日常相关
  '陪伴', '互动', '沟通', '交流',
  '吃饭', '睡觉', '作息', '习惯',
  '教育', '管教', '表扬', '批评',
  // 特定问题
  '早恋', '网瘾', '手机', '游戏',
  '亲子关系', '依恋', '安全感',
];

const OFF_TOPIC_PATTERNS = [
  // 明显不是育儿的话题
  /^今天(天气|吃了|穿了)/,
  /(工作|上班|加班|辞职|同事|领导)/,
  /(股票|基金|投资|理财|买房|买车)/,
  /(政治|新闻|国际|战争)/,
  /(医学|手术|吃药|住院|体检)/,
  /(旅游|出行|机票|酒店|签证)/,
  /(明星|综艺|电视剧|电影|游戏)/,
  /(编程|代码|开发|软件|电脑)/,
  /(烹饪|做饭|炒菜|烘焙)/,
  /(健身|减肥|跑步|瑜伽)/,
];

export interface FilterResult {
  isParentingRelated: boolean;
  reason?: string;
}

/**
 * 检测内容是否与育儿/亲子相关
 * @param content 用户输入内容
 * @returns 是否相关及相关原因
 */
export function checkParentingContent(content: string): FilterResult {
  if (!content || content.trim().length === 0) {
    return { isParentingRelated: false, reason: '内容为空' };
  }

  const lowerContent = content.toLowerCase();

  // 1. 先检查明显不相关的模式（快速排除）
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(content)) {
      return { isParentingRelated: false, reason: '内容与育儿/亲子话题无关' };
    }
  }

  // 2. 检查是否包含育儿关键词
  let matchCount = 0;
  for (const keyword of PARENTING_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      matchCount++;
    }
  }

  // 至少匹配 1 个育儿关键词
  if (matchCount > 0) {
    return { isParentingRelated: true };
  }

  // 3. 短内容且无育儿关键词，大概率不相关
  if (content.length < 10) {
    return { isParentingRelated: false, reason: '内容过短，无法判断为育儿话题' };
  }

  return { isParentingRelated: false, reason: '内容与育儿/亲子话题无关' };
}

/**
 * 婉拒回复模板
 */
export const REFUSAL_MESSAGE = '抱歉，我专注于育儿和亲子陪伴相关的话题。您可以分享与孩子相处中的困惑或感受，我会尽力帮助您。';
