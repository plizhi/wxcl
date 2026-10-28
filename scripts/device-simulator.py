#!/usr/bin/env python3
"""ESP32 语音记录器的 Python 模拟器。

在没有硬件的情况下跑通全链路：
  ① 拿到配对码（用户 JWT 调 /api/device/pairing-code，或直接命令行给 --code）
  ② 调 /api/device/pair 换设备令牌
  ③ 调 /api/device/record 上传录音
  ④ 打印识别文本、AI 回复、音频大小
  ⑤ 可选把播报音频存成 mp3

只用标准库：urllib + base64 + json + argparse。

用法：
  python3 scripts/device-simulator.py \
    --base-url http://localhost:3011 \
    --user-token <用户JWT> \
    --audio /path/to/voice.mp3 \
    [--code <配对码>] [--save-audio /tmp/reply.mp3]
"""

import argparse
import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
import uuid

DEFAULT_BASE_URL = "http://localhost:3011"
DEFAULT_DEVICE_KEY = "sim-" + uuid.uuid4().hex[:12]
DEFAULT_DEVICE_NAME = "Python 模拟器"


def log_request(method, path):
    print(f"→ {method} {path}", flush=True)


def log_response(status):
    print(f"← {status}", flush=True)


class HttpError(Exception):
    def __init__(self, status, body):
        super().__init__(f"HTTP {status}: {body}")
        self.status = status
        self.body = body


def http_json(method, url, payload=None, headers=None):
    """发一个 JSON 请求，返回解析后的 dict。"""
    log_request(method, url)
    data = None
    hdrs = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        hdrs["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            log_response(resp.status)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        log_response(e.code)
        raise HttpError(e.code, raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HttpError(200, raw)


def build_multipart(fields, file_field, filename, file_bytes):
    """手工拼 multipart/form-data（Python 标准库没有现成的）。"""
    boundary = "----wxclsim" + uuid.uuid4().hex
    out = bytearray()

    for key, value in fields.items():
        if value is None:
            continue
        out += f"--{boundary}\r\n".encode("utf-8")
        out += f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8")
        out += f"{value}\r\n".encode("utf-8")

    ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    out += f"--{boundary}\r\n".encode("utf-8")
    out += (
        f'Content-Disposition: form-data; name="{file_field}"; filename="{filename}"\r\n'
    ).encode("utf-8")
    out += f"Content-Type: {ctype}\r\n\r\n".encode("utf-8")
    out += file_bytes
    out += f"\r\n--{boundary}--\r\n".encode("utf-8")

    return bytes(out), f"multipart/form-data; boundary={boundary}"


def upload_record(url, audio_path, token, child_id=None, intent=None):
    log_request("POST", url)
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    fields = {"intent": intent or "daily"}
    if child_id:
        fields["childId"] = child_id

    body, content_type = build_multipart(
        fields, "audio", os.path.basename(audio_path), audio_bytes
    )

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": content_type,
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            raw = resp.read().decode("utf-8")
            log_response(resp.status)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        log_response(e.code)
        raise HttpError(e.code, raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HttpError(200, raw)


def main():
    parser = argparse.ArgumentParser(description="wxcl 设备接入模拟器")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="服务地址")
    parser.add_argument("--user-token", help="用户 JWT（不传 --code 时必填）")
    parser.add_argument("--code", help="已获取的配对码（给了就跳过 pairing-code 步骤）")
    parser.add_argument("--audio", required=True, help="要上传的音频文件")
    parser.add_argument("--device-key", default=DEFAULT_DEVICE_KEY, help="硬件出厂标识")
    parser.add_argument("--device-name", default=DEFAULT_DEVICE_NAME, help="设备名称")
    parser.add_argument("--child-id", help="指定孩子 id（不给则用账号第一个孩子）")
    parser.add_argument("--intent", default="daily", help="记录意图，默认 daily")
    parser.add_argument("--save-audio", help="把播报音频存到这个路径")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")

    if not args.code and not args.user_token:
        print("错误：不传 --code 时必须提供 --user-token", file=sys.stderr)
        return 1

    if not os.path.isfile(args.audio):
        print(f"错误：音频文件不存在：{args.audio}", file=sys.stderr)
        return 1

    # ① 配对码
    code = args.code
    if not code:
        try:
            res = http_json(
                "POST",
                f"{base}/api/device/pairing-code",
                headers={"Authorization": f"Bearer {args.user_token}"},
            )
        except HttpError as e:
            print(f"获取配对码失败：{e.body}", file=sys.stderr)
            return 1
        # 响应形如 { code: 0, data: { code: { code, expiresAt } } }
        code = (res.get("data") or {}).get("code", {}).get("code")
        if not code:
            print(f"获取配对码失败：{json.dumps(res, ensure_ascii=False)}", file=sys.stderr)
            return 1
    print(f"配对码：{code}", flush=True)

    # ② 换设备令牌
    try:
        res = http_json(
            "POST",
            f"{base}/api/device/pair",
            payload={
                "code": code,
                "deviceKey": args.device_key,
                "name": args.device_name,
            },
        )
    except HttpError as e:
        print(f"配对失败：{e.body}", file=sys.stderr)
        return 1

    data = res.get("data") or {}
    device_token = data.get("deviceToken")
    device_id = data.get("deviceId")
    if not device_token:
        print(f"配对失败：{json.dumps(res, ensure_ascii=False)}", file=sys.stderr)
        return 1
    print(f"deviceId：{device_id}", flush=True)
    print(f"deviceToken：{device_token[:8]}...（已截断显示）", flush=True)

    # ③ 上传录音
    try:
        res = upload_record(
            f"{base}/api/device/record",
            args.audio,
            device_token,
            child_id=args.child_id,
            intent=args.intent,
        )
    except HttpError as e:
        print(f"上传录音失败：{e.body}", file=sys.stderr)
        return 1

    data = res.get("data") or {}
    print("---", flush=True)
    print(f"识别文本：{data.get('text')}", flush=True)
    print(f"AI 回复：{data.get('reply')}", flush=True)
    if data.get("filtered"):
        print("（内容被过滤，未写入数据库）", flush=True)
    if data.get("recordId"):
        print(f"recordId：{data['recordId']}", flush=True)

    # ④ 存播报音频
    audio_b64 = data.get("audioBase64")
    if audio_b64:
        raw = base64.b64decode(audio_b64)
        print(f"播报音频大小：{len(raw)} 字节", flush=True)
        if args.save_audio:
            with open(args.save_audio, "wb") as f:
                f.write(raw)
            print(f"已保存：{args.save_audio}", flush=True)
            os.system(f'file "{args.save_audio}"')
    else:
        print("播报音频：无（语音合成失败或未返回）", flush=True)

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
