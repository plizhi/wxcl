#!/usr/bin/env python3
"""生成一段测试用的中文育儿场景语音（mp3）。

用 MiniMax TTS 合成，解 hex 写成 mp3 文件。这样没有真实录音也能测设备链路。

用法：
  MINIMAX_API_KEY=xxx python3 scripts/make-test-audio.py --out /tmp/test.mp3
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

BASE_URL = os.environ.get("MINIMAX_BASE_URL", "https://api.minimaxi.com")
DEFAULT_TEXT = "今天孩子自己把积木搭到十层，特别有成就感。"


def main():
    parser = argparse.ArgumentParser(description="生成测试音频")
    parser.add_argument("--out", default="/tmp/wxcl-test.mp3", help="输出 mp3 路径")
    parser.add_argument("--text", default=DEFAULT_TEXT, help="要合成的文本")
    parser.add_argument("--voice", default="female-shaonv", help="音色")
    parser.add_argument("--base-url", default=BASE_URL, help="MiniMax base url")
    args = parser.parse_args()

    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        print("错误：环境变量 MINIMAX_API_KEY 未设置", file=sys.stderr)
        return 1

    body = {
        "model": "speech-2.8-hd",
        "text": args.text,
        "stream": False,
        "voice_setting": {
            "voice_id": args.voice,
            "speed": 1,
            "vol": 1,
            "pitch": 0,
            "emotion": "happy",
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3",
            "channel": 1,
        },
        "subtitle_enable": False,
    }

    url = f"{args.base_url.rstrip('/')}/v1/t2a_v2"
    print(f"→ POST {url}", flush=True)
    req = urllib.request.Request(
        url,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            print(f"← {resp.status}", flush=True)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        print(f"← {e.code}\n{detail}", file=sys.stderr)
        return 1
    except urllib.error.URLError as e:
        print(f"请求失败：{e}", file=sys.stderr)
        return 1

    base_resp = payload.get("base_resp") or {}
    if base_resp.get("status_code") not in (None, 0):
        print(f"接口报错：{base_resp}", file=sys.stderr)
        return 1

    hex_audio = (payload.get("data") or {}).get("audio")
    if not hex_audio:
        print(f"未拿到音频：{json.dumps(payload, ensure_ascii=False)[:500]}", file=sys.stderr)
        return 1

    audio = bytes.fromhex(hex_audio)
    with open(args.out, "wb") as f:
        f.write(audio)

    print(f"已写入：{args.out}（{len(audio)} 字节）", flush=True)
    os.system(f'file "{args.out}"')
    return 0


if __name__ == "__main__":
    sys.exit(main())
