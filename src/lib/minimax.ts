/**
 * MiniMax 语音能力封装（ASR / TTS）
 *
 * 服务端持有 API Key，硬件侧不接触任何第三方密钥。
 */

import { ApiError } from './api-error';

const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com';

function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new ApiError(500, 500, '语音服务未配置');
  }
  return key;
}

function isErrorPayload(payload: unknown): boolean {
  const p = payload as { base_resp?: { status_code?: number; status_msg?: string } };
  if (p?.base_resp && typeof p.base_resp.status_code === 'number' && p.base_resp.status_code !== 0) {
    return true;
  }
  return false;
}

/**
 * 语音识别：把音频转成文字
 */
export async function transcribe(audio: Buffer, filename: string): Promise<string> {
  const key = getApiKey();

  const form = new FormData();
  form.append('model', 'asr-1.0');
  form.append(
    'file',
    new Blob([new Uint8Array(audio)], { type: 'audio/mpeg' }),
    filename || 'audio.mp3'
  );

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/speech_to_text`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        language: 'zh',
      },
      body: form,
    });
  } catch (err) {
    console.error('[minimax] ASR 请求失败:', err);
    throw new ApiError(502, 502, '语音识别失败');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[minimax] ASR HTTP ${res.status}: ${text}`);
    throw new ApiError(502, 502, '语音识别失败');
  }

  let payload: { text?: string; base_resp?: { status_code?: number; status_msg?: string } };
  try {
    payload = (await res.json()) as typeof payload;
  } catch (err) {
    console.error('[minimax] ASR 响应解析失败:', err);
    throw new ApiError(502, 502, '语音识别失败');
  }

  if (isErrorPayload(payload)) {
    console.error('[minimax] ASR 业务错误:', payload.base_resp);
    throw new ApiError(502, 502, '语音识别失败');
  }

  return (payload.text || '').trim();
}

/**
 * 语音合成：把文字转成 mp3
 */
export async function speak(text: string): Promise<Buffer> {
  const key = getApiKey();
  const content = text.trim();
  if (!content) {
    throw new ApiError(400, 400, '待播报文本为空');
  }

  const body = {
    model: 'speech-2.8-hd',
    text: content,
    stream: false,
    voice_setting: {
      voice_id: 'female-shaonv',
      speed: 1,
      vol: 1,
      pitch: 0,
      emotion: 'happy',
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: 'mp3',
      channel: 1,
    },
    subtitle_enable: false,
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/t2a_v2`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[minimax] TTS 请求失败:', err);
    throw new ApiError(502, 502, '语音合成失败');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[minimax] TTS HTTP ${res.status}: ${text}`);
    throw new ApiError(502, 502, '语音合成失败');
  }

  let payload: {
    data?: { audio?: string; status?: number };
    base_resp?: { status_code?: number; status_msg?: string };
  };
  try {
    payload = (await res.json()) as typeof payload;
  } catch (err) {
    console.error('[minimax] TTS 响应解析失败:', err);
    throw new ApiError(502, 502, '语音合成失败');
  }

  if (isErrorPayload(payload)) {
    console.error('[minimax] TTS 业务错误:', payload.base_resp);
    throw new ApiError(502, 502, '语音合成失败');
  }

  const hex = payload.data?.audio;
  if (!hex) {
    console.error('[minimax] TTS 未返回音频');
    throw new ApiError(502, 502, '语音合成失败');
  }

  return Buffer.from(hex, 'hex');
}

/**
 * 语音合成并转成 base64（随响应体返回给设备）
 */
export async function speakToBase64(text: string): Promise<string> {
  const buffer = await speak(text);
  return buffer.toString('base64');
}
