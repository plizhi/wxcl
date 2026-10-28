import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, errors, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { requireDevice } from "@/lib/device-auth";
import { transcribe, speakToBase64 } from "@/lib/minimax";
import { callAI } from "@/lib/ai";
import { checkParentingContent, REFUSAL_MESSAGE } from "@/lib/content-filter";
import { earnPoints } from "@/lib/points";

/** 音频大小上限 5MB */
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

/** 限流窗口 60 秒 */
const RATE_WINDOW_MS = 60 * 1000;
/** 同一设备 60 秒内最多 5 次 */
const RATE_MAX = 5;

/**
 * 进程内限流：deviceId -> 时间戳数组（滑动窗口）。
 * 注意：这是单实例内存实现，进程重启即清空。
 * 生产多实例部署时必须换成 Redis（或 Upstash）实现。
 */
const rateBuckets = new Map<string, number[]>();

function allowRequest(deviceId: string): boolean {
  const now = Date.now();
  const hits = (rateBuckets.get(deviceId) || []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (hits.length >= RATE_MAX) {
    rateBuckets.set(deviceId, hits);
    return false;
  }
  hits.push(now);
  rateBuckets.set(deviceId, hits);
  return true;
}

/** 与 /api/chat 的 daily 提示词保持一致（此处固定用 daily 场景，不做 classify） */
const DAILY_SYSTEM_PROMPT =
  "你是「内在结构养育」陪伴顾问。分析今日记录，给出：1个亮点 + 1个机会。不用 JSON，用 Markdown。不超过100字。禁止说教。";

const VALID_INTENTS = ["daily", "emergency", "nourishment", "venting"] as const;
type RecordIntent = (typeof VALID_INTENTS)[number];

function normalizeIntent(value: unknown): RecordIntent {
  if (typeof value === "string" && (VALID_INTENTS as readonly string[]).includes(value)) {
    return value as RecordIntent;
  }
  return "daily";
}

async function getFirstChildId(userId: string): Promise<string | null> {
  const child = await prisma.child.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return child?.id ?? null;
}

/**
 * POST /api/device/record
 * 设备上传录音 → 语音识别 → 内容过滤 → AI 回复 → 落库 → 积分 → 语音播报
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const device = await requireDevice(req);

  if (!allowRequest(device.deviceId)) {
    throw new ApiError(429, 429, "请求过于频繁，请稍后再试");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw errors.badRequest("请求必须是 multipart/form-data");
  }

  const audio = form.get("audio");
  if (!audio || typeof audio === "string") {
    throw errors.badRequest("缺少音频文件（字段名 audio）");
  }
  const file = audio as File;
  if (file.size <= 0) {
    throw errors.badRequest("音频文件为空");
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw errors.badRequest("音频文件超过 5MB 上限");
  }

  const intent = normalizeIntent(form.get("intent"));

  // childId 可选；不属于该用户就忽略并回落到第一个孩子
  const rawChildId = form.get("childId");
  let childId: string | null = null;
  if (typeof rawChildId === "string" && rawChildId) {
    const owned = await prisma.child.findFirst({
      where: { id: rawChildId, userId: device.userId },
      select: { id: true },
    });
    if (owned) childId = owned.id;
  }
  if (!childId) {
    childId = await getFirstChildId(device.userId);
  }
  if (!childId) {
    throw errors.badRequest("该账号还没有孩子档案，请先在 App 中添加");
  }

  // 1. 语音识别
  const audioBuffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name || "audio.mp3";
  const text = await transcribe(audioBuffer, filename);
  if (!text) {
    throw errors.badRequest("未识别到语音内容");
  }

  // 2. 内容过滤：非育儿内容不落库，只回婉拒
  const filterResult = checkParentingContent(text);
  if (!filterResult.isParentingRelated) {
    return NextResponse.json({
      code: 0,
      message: "成功",
      data: { text, reply: REFUSAL_MESSAGE, filtered: true },
    });
  }

  // 3. AI 回复
  const aiResponse = await callAI({
    messages: [{ role: "user", content: text }],
    systemPrompt: DAILY_SYSTEM_PROMPT,
    maxTokens: 500,
  });
  const reply = aiResponse.content || "已记录";

  // 4. 落库
  const record = await prisma.record.create({
    data: {
      childId,
      content: text,
      reply,
      intent,
    },
    select: { id: true, createdAt: true },
  });

  // 5. 积分
  await earnPoints(device.userId, "record", record.id, "添加陪伴记录");

  // 6. 语音播报（TTS 失败不影响主流程）
  let audioBase64: string | null = null;
  try {
    audioBase64 = await speakToBase64(reply);
  } catch (err) {
    console.error("[device/record] 语音合成失败，返回空音频:", err);
    audioBase64 = null;
  }

  return NextResponse.json({
    code: 0,
    message: "成功",
    data: {
      recordId: record.id,
      text,
      reply,
      audioBase64,
    },
  });
});
