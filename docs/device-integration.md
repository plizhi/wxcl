# 设备接入（ESP32 语音记录器）后端说明

> 第 0 步：后端接口已跑通，固件尚未开始写。
> 本文只描述**已经实现的**和**明确还没做的**，不写计划中的假象。

## 1. 整体架构

```
┌────────────────────┐
│  ESP32 语音记录器   │   只做「输入输出」，不持有任何第三方密钥
│  - 按住说话录音    │
│  - 上传音频        │
│  - 播放返回的 mp3  │
└─────────┬──────────┘
          │ HTTPS + Bearer <deviceToken>
          ▼
┌─────────────────────────────────────────────────────────┐
│  wxcl 服务端  /api/device/*                             │
│                                                          │
│  ① 配对    POST /api/device/pairing-code  （用户 JWT）   │
│            POST /api/device/pair         （配对码）       │
│  ② 记录    POST /api/device/record       （设备令牌）     │
│            GET  /api/device/ping         （设备令牌）     │
│  ③ 管理    GET  /api/devices              （用户 JWT）    │
│            DELETE /api/devices/[id]      （用户 JWT）    │
└───────┬──────────────────────────────┬───────────────────┘
        │                              │
        ▼                              ▼
┌────────────────────┐      ┌──────────────────────────┐
│ MiniMax ASR        │      │ DeepSeek（陪伴顾问）      │
│ /v1/speech_to_text │      │ src/lib/ai.ts callAI()   │
│ 模型 asr-1.0       │      │ 提示词见 /api/chat        │
└────────────────────┘      └──────────────────────────┘
        │                              │
        └──────────────┬───────────────┘
                       ▼
              MiniMax TTS /v1/t2a_v2
              （speech-2.8-hd，female-shaonv）
                       │
                       ▼
              base64 mp3 随响应体返回给设备
```

要点：

- **API Key 不落硬件**。MiniMax 的 Key 只存在于服务端 `.env.local`，硬件只认识 wxcl 自己的 `deviceToken`。
- 语音合成结果**目前直接 base64 塞进 JSON 响应**（见第 6 节「尚未实现」）。

## 2. 配对流程时序

```
用户（手机 App / 网页）              设备（ESP32）              服务端
      │                                │                        │
      │ ① 登录态调 pairing-code        │                        │
      ├──────────────────────────────────────────────────────────►│
      │                                │        插入 DevicePairingCode
      │                                │        code=6位数字, 10分钟过期
      │◄──────────────────────────────────────────────────────────┤
      │ { code: { code: "123456",      │                        │
      │      expiresAt } }             │                        │
      │                                │                        │
      │   （用户在设备上输入 123456）   │                        │
      │                                │ ② POST /api/device/pair │
      │                                ├───────────────────────►│
      │                                │  { code, deviceKey,    │
      │                                │    name }              │
      │                                │        校验配对码：存在/未用/未过期
      │                                │        查 deviceKey 是否已被别人绑定
      │                                │        → 生成 deviceToken（明文只此一次）
      │                                │        → 库里只存 sha256(deviceToken)
      │                                │◄───────────────────────┤
      │                                │ { deviceId, deviceToken }
      │                                │                        │
      │                                │ ③ 存进 NVS              │
      │                                │                        │
      │                                │ ④ POST /api/device/record
      │                                │   Authorization: Bearer <deviceToken>
      │                                ├───────────────────────►│
      │                                │        sha256(token) 查库
      │                                │        校验 device.status==='active'
      │                                │        校验 token 未吊销/未过期
      │                                │        限流 60秒/5次
      │                                │        ASR → 过滤 → DeepSeek
      │                                │        落库 → 积分 → TTS
      │                                │◄───────────────────────┤
      │                                │ { recordId, text, reply, audioBase64 }
      │                                │                        │
      │                                │ ⑤ 解码 mp3，喇叭播放    │
```

配对码规则：

- 6 位数字，10 分钟过期，**一次性**（用过即 `usedAt` 标记）。
- 60 秒内同一用户最多保留 3 个有效配对码，超出的旧码被置为过期。
- 60 秒之前的旧配对码在生成新码时自动作废。
- `deviceKey` 已绑定**别的用户**时，配对直接返回 **409**，不会偷偷改绑。
- 注意：**吊销（`DELETE /api/devices/[id]`）不等于释放**。吊销后设备行仍在，`deviceKey` 仍归属原用户，
  别的账号来配对还是会拿到 409。目前**没有**「解绑并释放 deviceKey」的能力，
  设备要转手给另一个账号需要后端补这个能力（见第 6 节）。
  同一用户重新配对同一个 `deviceKey` 是允许的，会把设备重新置为 `active` 并签发新令牌。

## 3. 端点清单

### 3.1 POST `/api/device/pairing-code`

生成配对码。

| 项 | 值 |
|---|---|
| 鉴权 | 用户 JWT（`Authorization: Bearer <userToken>`，需未过期/未冻结） |
| 请求体 | 无 |
| 响应 | `{ code: 0, message: "成功", data: { code: { code: "123456", expiresAt: "2026-10-28T12:00:00.000Z" } } }` |

注意 `data.code.code` 是配对码本身，`data.code.expiresAt` 是过期时间。

### 3.2 POST `/api/device/pair`

用配对码换设备令牌。**不需要用户 JWT**，配对码本身就是凭证。

| 项 | 值 |
|---|---|
| 鉴权 | 无（配对码） |
| 请求体 | `{ code: string, deviceKey: string, name?: string }` |
| 约束 | `deviceKey` 必填且 ≤64 字符；`name` 可选，≤60 字符 |
| 成功响应 | `{ code: 0, message: "成功", data: { deviceId, deviceToken } }` |
| 失败 | 400 配对码无效/已用/已过期；409 该设备已绑定其他账号 |

`deviceToken` 明文**只在这一个响应里出现一次**，服务端只保存 sha256 摘要。

### 3.3 POST `/api/device/record`

设备上传录音，完成「识别 → 过滤 → 回复 → 落库 → 积分 → 播报」。

| 项 | 值 |
|---|---|
| 鉴权 | 设备令牌（`Authorization: Bearer <deviceToken>`） |
| 请求体 | `multipart/form-data` |
| 字段 | `audio`（必填，音频文件，≤5MB）、`childId`（可选）、`intent`（可选，默认 `daily`） |
| 限流 | 同一设备 60 秒内最多 5 次 |

成功响应：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "recordId": "…uuid…",
    "text": "识别出来的文字",
    "reply": "AI 的回复",
    "audioBase64": "…base64 mp3…"
  }
}
```

内容被过滤时（`checkParentingContent` 判定非育儿话题）：

```json
{ "code": 0, "message": "成功", "data": { "text": "…", "reply": "婉拒话术", "filtered": true } }
```

此时**不写数据库、不加积分**。

其它情况：

- `childId` 不属于该用户 → 忽略该字段，回落到该账号的第一个孩子。
- 该账号一个孩子都没有 → 400「该账号还没有孩子档案，请先在 App 中添加」。
- 语音识别为空 → 400「未识别到语音内容」。
- 语音合成失败 → **不影响主流程**，`audioBase64` 返回 `null`，服务端打 error 日志。

### 3.4 GET `/api/device/ping`

设备心跳，验证令牌是否还有效。

| 项 | 值 |
|---|---|
| 鉴权 | 设备令牌 |
| 响应 | `{ code: 0, message: "成功", data: { ok: true, deviceName, userId } }` |

### 3.5 GET `/api/devices`

列出当前用户的设备。

| 项 | 值 |
|---|---|
| 鉴权 | 用户 JWT |
| 响应 | `{ code: 0, message: "成功", data: { devices: [{ id, name, deviceKey, status, lastSeenAt, createdAt }] } }` |

不含任何令牌信息。

### 3.6 DELETE `/api/devices/[id]`

远程吊销设备。

| 项 | 值 |
|---|---|
| 鉴权 | 用户 JWT，只能删自己的设备 |
| 行为 | `Device.status` 置 `revoked`，该设备所有 `DeviceToken.revokedAt` 置当前时间 |
| 响应 | `{ code: 0, message: "成功", data: { id, status: "revoked" } }` |

设备下次带令牌调用会拿到 401「设备未授权」。

**吊销不是删除**：设备行还在，`deviceKey` 仍归属原用户，别的账号仍然无法配对这台设备（409）。
同一用户可以随时用新配对码把这台设备重新配回来（会重新置为 `active`）。

## 4. 设备侧要求

- **令牌存储**：`deviceToken` 存 ESP32 的 NVS（`nvs_flash`），**不要存 flash 文件系统**，也不要用明文常量。
  建议同时存一个「是否已配对」标志位。
- **请求格式**：`Authorization: Bearer <deviceToken>`，除 `/api/device/pair` 外所有设备接口都要带。
- **失败重试**：
  - 网络错误 / 5xx：指数退避重试 3 次（1s / 2s / 4s），只在**没有成功写入**时可安全重试。
  - 401：不要重试，说明令牌失效或被吊销，应提示用户重新配对。
  - 429：按响应里的等待时间退避，不要立即重放。
- **离线缓存录音**：网络不通时把录音存到本地（LittleFS 或 SPIFFS），队列缓存，恢复网络后按顺序补传；补传时带上原始录音时间。
- **超时建议**：
  - 连接超时 5s
  - 读超时 30s（ASR + DeepSeek + TTS 一条链路，实测通常 5～15s）
  - 整体硬超时 60s，超过就放弃本次并让用户重试
- **录音格式**：PCM 16kHz 单声道 16bit（见第 7 节）。
- **音频大小**：单次上传 ≤5MB，服务端会直接拒绝超限请求。16kHz 单声道下 5MB 约合 2.5 分钟，足够。

## 5. 安全边界

- **设备令牌只存摘要**：服务端数据库里存 `sha256(token)` 的 hex（64 字符），明文只在签发响应中出现一次。
  拿到数据库也换不出可用令牌。
- **配对码 10 分钟过期 + 一次性**，用完即废；60 秒内最多 3 个有效码。
- **可远程吊销**：`DELETE /api/devices/[id]` 让设备立即失效（设备置 revoked + 所有令牌作废）。
- **限流**：设备记录接口 60 秒 5 次；配对码接口 60 秒 3 个有效码。
- **音频 5MB 上限**：服务端先校验大小再调第三方，避免被超大文件打爆内存和 API 账单。
- **内容过滤**：识别出的文字先过 `checkParentingContent`，非育儿内容不落库、不加积分。
- **API Key 不落硬件**：MiniMax Key 只在服务端环境变量里。
- **换绑保护**：`deviceKey` 已属于别的用户时配对返回 409，不做静默改绑。
- **令牌有效期 365 天**（`DeviceToken.expiresAt`）。

## 6. 尚未实现的部分（不要当成已完成）

> 这一节是刻意写清楚的，避免后面的人以为这些已经有了。

| 事项 | 现状 | 生产需要怎么做 |
|---|---|---|
| **音频存储与清理** | **完全不落盘**。上传的音频只在内存里过一遍 ASR 就丢弃 | 需要留证/回放时要落对象存储，并定保留期与清理任务 |
| **TTS 音频传输方式** | 目前 base64 塞在 JSON 响应体里。base64 体积 +33%，一条回复几 KB～几十 KB | 改成对象存储 + 签名 URL（短时效），设备二次拉取；或改用二进制响应 |
| **限流实现** | **进程内内存 Map**（`src/app/api/device/record/route.ts`）。进程重启清空，多实例不共享 | 换 Redis / Upstash（项目里已有 `@upstash/ratelimit` 依赖和 `src/lib/rate-limit.ts` 可以参考） |
| **设备端 OTA** | 没有。固件升级只能靠人工插线/串口烧录 | 需要 OTA 通道（ArduinoOTA / HTTPS 差分升级）+ 版本号上报 |
| **批量设备管理后台** | 没有。只有单账号的 `GET /api/devices` 和 `DELETE /api/devices/[id]`，是给**用户自己**用的 | 运营后台需要：按用户查设备、全局吊销、异常设备统计、批量推送通知 |
| **前端配对界面** | 没有。配对码要靠直接调 API 拿 | App / 网页端要做「添加设备」页面：生成码 → 展示 → 等待设备连上 → 列表管理 |
| **多设备并发 / 语音打断** | 没有。设备只做单轮「说完→上传→播完」 | 需要考虑播放时用户再次按下怎么办 |
| **音频格式归一化** | 现在直接把设备给的字节丢给 MiniMax。设备若给 WAV/PCM 需要 MiniMax 侧支持 | 建议固件统一输出 MiniMax 接受得最好的格式（见第 7 节） |
| **设备指纹 / 防克隆** | `deviceKey` 由客户端自称，服务端不验证 | 生产要在服务端下发一次性引导密钥，或用安全芯片（ESP32-S3 的 eFuse）固化标识 |
| **解绑并释放 deviceKey** | **没有**。`DELETE /api/devices/[id]` 是吊销，设备行还在，`deviceKey` 永久归属原用户，别的账号配对永远 409 | 需要「彻底删除设备行（连带令牌）」或「释放 deviceKey」的能力，才能支持设备转手 / 换账号 |
| **多令牌并存** | 每次配对都会签发新令牌，旧令牌**不自动作废**（只有 DELETE 才全部作废） | 若要「一设备一令牌」，配对时先吊销该设备旧令牌 |
| **审计日志** | 没有专门的设备调用审计表 | 建议记录每次设备请求的时间、结果、耗时 |

## 7. 下一步：ESP32 固件要点

1. **配网**
   - BLE 配网（ESP-IDF 的 `wifi_prov_mgr`，或 Arduino 的 `WiFiProvManager`）优先；
   - 无 BLE 场景用 SoftAP：设备起一个热点，手机连上去把 WiFi 账号密码传下去。
2. **HTTPS**
   - 烧根证书（自己 CA 签的 server cert），校验证书链；
   - 不要用 `WiFiClientSecure` 的 `setInsecure()`（等于关掉校验）。
3. **录音格式**
   - **PCM 16kHz 单声道 16bit**（I2S 麦克风 + `esp_codec_dev` 的 PCM encoder 或 ADPCM）。
   - 建议先转成 ADPCM 或 MP3 再上传，减小体积；至少确认 MiniMax ASR 接受该容器格式。
4. **按键逻辑**
   - 按住说话 → 录音 → 松手 → 上传 → 收到 mp3 → 播放 → 播完回到待机。
   - 播放时要有「正在播放」的提示音/灯效，避免用户以为没反应。
5. **NVS 键位建议**
   - `deviceToken`、`deviceKey`、`paired`（0/1）。
   - `deviceKey` 出厂时由产线写入（可用 eFuse 或烧进 NVS 的一次性分区），不要让用户在 App 里填。
6. **联调顺序**
   - 先用 `scripts/device-simulator.py` 跑通服务端链路，再上硬件；
   - 固件第一版直接照着模拟器的三次请求写：pairing-code（App 侧）→ pair → record。

## 8. 联调工具

```bash
# 1. 生成一段测试语音（用 MiniMax TTS 合成）
MINIMAX_API_KEY=xxx python3 scripts/make-test-audio.py --out /tmp/test.mp3

# 2. 跑完整链路（模拟器 = 等价于 ESP32）
python3 scripts/device-simulator.py \
  --base-url http://localhost:3011 \
  --user-token <用户JWT> \
  --audio /tmp/test.mp3 \
  --save-audio /tmp/reply.mp3

# 3. 只测心跳
curl -H "Authorization: Bearer <deviceToken>" http://localhost:3011/api/device/ping
```

模拟器只用 Python 标准库（urllib / base64 / json / argparse），每步都会打印 `→ POST /path` 和 `← status`，方便追链路。
