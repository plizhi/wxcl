# 望杏成林 V2（开发环境）

> 详细文档请参考 `/home/pupeng/projects/wxcl-v2/CLAUDE.md`
>
> **跨应用账号体系（wxcl 侧）的现状与待办见文末「跨应用账号体系（2026-10-26）」一节**——涉及本项目的登录、激活码与账号层，改动前先读那一节。

---

## 代码工作流

**重要原则：先测试，再同步，最后部署**

```
1. 本地修改代码并 commit
2. 在开发环境部署测试（npm run dev 或 npm run build + npm run start）
3. 测试通过后，git push 同步到远程
4. 远程代码验证通过后，切换到生产环境部署
```

**为什么这样做：**
- 确保推送到远程的代码是经过验证的、可部署的
- 远程仓库的 dev-work 分支代表"已测试通过"的代码状态

---

## 对话呈现规范

**重要：确保用户的消息和我的回复都完整呈现在终端里**

- 收到用户消息后，在回复时先引用/复述用户的原话
- 不要只输出我的分析，要先展示"你说了什么"
- 格式示例：
  ```
  你：xxxxx
  我：xxxxx
  ```

**为什么这样做：**
- 确保对话完整呈现在终端，不遗漏用户的消息
- 用户能清楚看到自己发送的内容和我的回复

---

## 开发环境配置

| 项目 | 值 |
|------|-----|
| 端口 | 3011 |
| 访问 URL | https://wxcl.nzyy.ltd |
| 分支 | dev-work |
| 数据库 | PostgreSQL wxcl_dev |
| 测试账号 | 13800138000 |

---

## 开发操作

```bash
# 进入目录
cd /home/pupeng/projects/wxcl-v2-dev

# 安装依赖（如需要）
npm install

# 启动开发服务器
npm run dev

# PM2 生产模式部署（测试用）
npm run build
pm2 restart wxcl-v2-dev

# 推送代码
git push origin dev-work
```

---

## 注意事项

- **不要在生产环境目录** `/home/pupeng/projects/wxcl-v2` 进行开发
- 开发环境是 worktree 隔离，不影响生产
- 代码修改后 commit 并 push 到 dev-work 分支
- 生产部署需要切换到 wxcl-v2 目录执行部署流程

## 操作红线

**禁止在生产环境进行代码修改！**
- 所有代码开发必须在 `/home/pupeng/projects/wxcl-v2-dev` 进行
- 测试通过后，git push 到 dev-work 分支
- 再切换到生产环境 pull 并部署
- 违反此规则属于严重失误

## 当前进度

### 积分体系开发中（2026-09-26）

**已完成：**
- 数据库设计：User.points 字段、PointTransaction 表
- 积分服务：src/lib/points.ts
- 积分 API：/api/user/points、/api/user/points/history、/api/user/points/redeem
- 行为触发点：记录、滋养时刻、压力吐槽、家长反思、全景报告、分享点击、邀请注册、添加孩子、完善画像

**待完成：**
- 前端积分展示页面
- 积分兑换 UI
- 数据库更新：`npx prisma db push --accept-data-loss`（未执行）
- 生产部署

---

## 部署架构（2026-09-22）

### 服务端口映射

| 域名 | 端口 | PM2 进程 | 代码分支 |
|------|------|----------|----------|
| lzti.nzyy.ltd | 3010 | lzti-dev | dev-work |
| lzti.nzyy.cc | 3000 | lzti | master |
| wxcl.nzyy.ltd | 3011 | wxcl-v2-dev | dev-work |
| wxcl.nzyy.cc | 3006 | wxcl-v2 | master |
| nzyy.cc | 3009 | nzyy | master |

### Worktree 架构

```
wxcl-v2      → /home/pupeng/projects/wxcl-v2      → master 分支（生产）
wxcl-v2-dev  → /home/pupeng/projects/wxcl-v2-dev  → dev-work 分支（开发）
```

### PM2 部署配置

本机所有实例的启动配置**统一在 `/home/pupeng/projects/deploy/ecosystem.config.js`**，各项目仓库里不再放 ecosystem 文件。

```bash
cd /home/pupeng/projects/deploy
pm2 restart wxcl-v2-dev   # 重启单个实例（最常用）
pm2 save                  # 刷新 dump.pm2，重启机器后靠它恢复
```

新增应用或改端口，都改那个目录里的配置。

### error.tsx 兜底机制

已配置 `app/error.tsx`，捕获 Server Action 版本不一致错误，自动刷新页面。

---

## Turbopack 缓存问题处理

如果 `npm run dev` 出现 Turbopack 崩溃或编译异常（如 "Failed to restore task data"）：

**标准部署流程（开发环境）：**
1. `pkill -f "next-server"` 杀掉所有 next 进程
2. `rm -rf .next` 清理缓存
3. `npm run build` 构建
4. 服务器自动在 3011 端口启动

**注意：** dev 模式有 Turbopack 缓存问题，加载慢或卡住时用 build 模式测试。

---

## 生产部署注意事项

### 部署流程（生产环境）

```bash
cd /home/pupeng/projects/wxcl-v2

# 1. 合并 dev-work 到 master
git merge dev-work

# 2. 构建
npm run build

# 3. pm2 重启
pm2 reload wxcl-v2
pm2 save
```

### 常见问题

| 问题 | 原因 | 解决 |
|-----|------|------|
| 用户看不到更新 | nginx 缓存 | `sudo nginx -s reload` |
| pm2 restart 无效 | fork_mode 下进程不真正重启 | `pm2 delete` + `pm2 start` |
| JWT_SECRET 缺失 | .env.local 未配置 | 添加 `JWT_SECRET=<生成密钥>` |
| Turbopack 编译错误 | 缓存损坏 | `rm -rf .next` + 重启 dev |

---

## 技术重构路线图

> 优先级：阶段1 > 阶段2 > 阶段3 > 阶段4

### 阶段 1: AI 解析层重构（预计 0.5 天）✅ 完成

- **目标**：废弃正则模糊匹配，强制开启 DeepSeek JSON Mode
- **文件**：`src/lib/ai.ts`、`src/app/api/nourishment/extract/route.ts`、`src/app/api/daily-care/analyze/route.ts`
- **改动**：`callAI` 新增 `jsonMode` 选项；`parseAIResponse` 移除正则，直接 `JSON.parse`
- **改动点**：
  - `callAI` 新增 `jsonMode` 选项，开启时注入 `response_format: { type: "json_object" }`
  - `parseAIResponse` 移除正则匹配，直接 `JSON.parse`（JSON Mode 下 AI 必定返回合法 JSON）
  - 重试逻辑保留

### 阶段 2: 数据库 ORM 迁移（预计 3-5 天）✅ 完成

- **选型**：Prisma 5（`prisma@5.22.0`）
- **策略**：按模块渐进式替换 `src/lib/db.ts` 中的裸 SQL
- **已迁移文件**（17 个文件，100% 覆盖）：
  - `api/records/route.ts`
  - `api/children/route.ts`
  - `api/profiles/route.ts`、`api/profiles/events/route.ts`、`api/profiles/opportunities/route.ts`、`api/profiles/reflections/route.ts`、`api/profiles/versions/route.ts`
  - `api/daily-care/analyze/route.ts`、`api/daily-care/batch/route.ts`、`api/daily-care/comprehensive/route.ts`、`api/daily-care/records/route.ts`、`api/daily-care/report/[id]/route.ts`
  - `api/nourishment/route.ts`、`api/nourishment/extract/route.ts`、`api/nourishment/reports/route.ts`
  - `api/chat/route.ts`
- **Schema 发现**：`profile_opportunities`、`parent_reflections` 表补入 `prisma/schema.prisma`；`@@unique([childId, periodType])` 唯一约束
- **废弃**：`src/lib/db.ts` 已删除（阶段3完成）
- **实际迁移文件**：24 个（17 + 7 auth/user）

### 阶段 3: 统一错误处理 + 认证层（预计 1 天）✅ 完成

- **ApiError 类**：`src/lib/api-error.ts` 新建，包含 `handlePrismaError()` 自动转换 Prisma 错误码（如 P2002 → 409）
- **认证层**：`src/lib/auth.ts` 消除 `require` 改用 `import bcrypt from 'bcryptjs'`
- **db.ts 删除**：`src/lib/db.ts` 已删除，无任何引用残留
- **profile-extractor 升级**：AI 调用改用 `callAI({ jsonMode: true })`，修复 `any` 隐式类型

### 阶段 4: 补齐核心业务测试（预计 2 天）✅ 完成

- **工具**：Vitest
- **已覆盖**：
  - `src/lib/api-error.test.ts` — ApiError 类、错误工厂、Prisma 错误转换（13 个测试）
  - `src/lib/auth.test.ts` — 密码哈希、验证码生成、JWT 签权验证（14 个测试）
  - `src/lib/ai.test.ts` — JSON 解析边界情况（9 个测试）
  - `src/lib/prisma.test.ts` — 单例实例、模型完整性（4 个测试）
- **测试结果**：34 个测试全部通过

---

## 跨应用账号体系（2026-10-26）

> 详细方案见 `/home/pupeng/projects/lzti-dev/knowledge/跨应用账号体系方案.md`（〇之七查证事实 / 〇之八实测 / 〇之九 B3 落地）。
> auth 侧说明见 `/home/pupeng/projects/nzyy.cc/CLAUDE.md` 同名一节。

### 一句话现状

**管道全通，用户还登不了**——生产身份库 `AuthUser` **0 行**，生产 wxcl 归属已证明（`phone_verified_at` 非空）**0 个**，SSO 入口未渲染。

| 检查项 | 生产实况（2026-10-26 实测） |
|---|---|
| 生产 wxcl 用户 | 39 个（38 有手机号、12 有本地密码） |
| 归属已证明（`phone_verified_at` 非空） | **0 个** |
| 生产 auth 身份库 `AuthUser` | **0 行**（审计表 `AuthAuditLog` 也是 0 行） |
| 生产 wxcl 登录页 | `ssoEnabled: false` —— SSO 入口未渲染 |

### wxcl 侧已落地的代码（提交 `e5faa79`，dev-work 与 master 同）

- `src/lib/auth-portal.ts` 加 `requestRegistration`
- `src/lib/account-registration.ts` fire-and-forget 触发器
- `src/app/api/auth/login/route.ts` **两个触发点**：专属码激活后、密码登录时（存量补登）
- 专属码改为**一次性**（原来一年期有效且兑换后不置 `used`，旧码可随时重置别人密码）
- `users.phone_verified_at` 列：只有用专属码兑换过才写入，通用码注册不写
- `/api/auth/send-code` 改为**不落库不删数据**（原来会 `deleteMany` 清掉该手机号已发放的激活码，任何人可锁死已发码用户）

### 手机号可信度分两档（改代码前先想清楚，别退回去）

| 档 | 来源 | 能否作归属锚点 |
|---|---|---|
| 专属码 | admin 发放给特定人，绑定 phone | ✅ 能 |
| 通用码 | 家长群发，用户自填 | ❌ 不能 |

**登记只认 `activation_code` 一种证明**。通用码与 Apply 邀请码注册一律不登记——登记它等于承认「手机号即账号」，这是锚点劫持的入口。

### 唯一闸门（阻塞后面所有事）

**运营把 11 张专属码发给用户**，并告知「此码即用户初始密码」。

台账：`/home/pupeng/projects/ops/wxcl-activation-codes-2026-10-26.json`（**不入 git**，权限 600）。

链路：用户激活 → 自动登记 → 设统一密码 → 生产身份库才出现第一个账号。

**闸门没开之前不要开 SSO 入口**——否则会出现「点了登不进去」的半成品状态。

### 新发现的缺口：3 个真人号被漏掉

`18611149931`、`18601041357`、`18618309001`。

这 3 个有 wxcl 本地密码、能正常登录，但手机号归属没被证明过（`phone_verified_at` 为 NULL）→ 登记的 gate 不放行 → **拿不到统一密码，也进不了跨应用体系**。

11 张码覆盖的是「无密码、登不进去」的 11 人；要不要给这 3 个也发码是运营决策——发就全员覆盖，不发就是自愿让他们留在体系外。

> **本轮结论：建议一次发 14 张（11 + 3）**，否则这 3 个真人号会卡在门外。签发需朋大大授权。

### 剩余待办

| 事项 | 判据 |
|---|---|
| B4 开 SSO 入口 | 差 5 个带统一密码的真人号（现 0）。技术上还差本应用 4 个 env（`AUTH_BASE_URL`/`CLIENT_ID`/`REDIRECT_URI`/`JWT_ISSUER`）+ **重新 build**（登录页是服务端组件，env 在 build 时烘进产物） |
| lzti 接登记 hook | 等 lzti 有归属证明通道（专属码/短信） |
| lzti 侧统一密码入口 | 同上 |
| outbox 重试队列 | 等 hook 丢失率显现问题 |
| 周对账 | 规格要求「每周对账一次」，B3 只做了审计表和补登脚本，**周对账还没做** |
| 补登脚本生产验证 | auth 侧 `src/register-batch.js` 在生产没跑过（生产集合为 0），发码后再跑一次验证 |
| 生产 wxcl Intent 枚举 | 缺 `venting`（历史漂移，与账号体系无关，但将来 db push 会撞） |

### 踩过的坑（改代码前先看）

- **auth 的 dev 与 prod 实例共用同一代码目录** `/srv/nzyy-auth-dev`，改代码必须**双实例重启**（`deploy.sh auth` 已包含）。
- **改生产库前先备份**：`/home/pupeng/projects/backup/`。
- **fire-and-forget 的前提是常驻 Node 进程**：`next start` 下请求返回后 promise 继续跑；进程重启会丢这一次，靠登录时再次触发 + 补登脚本兜底。
- **`users.id` 是 uuid 列**：raw SQL 回写主体 ID 时要写 `id = ${u.id}::uuid`。
- **dry-run 必须真的不写**：第一版 dry-run 仍调用登记逻辑，新用户会被真登记进去。

### 已核实无需处理

- 备份 2026-10-26 03:17 八个库全 OK，还原校验通过。
- 生产那两张弱口令种子码（123456/654321）都已被消费（一次性码已作废），不是风险。
- 普通存量用户（有本地密码、归属未证明）登录 200、正常发 token，**不会**被登记进账号层——B3 改了登录路由，已实测过存量用户仍能正常登录。
