# 望杏成林 V2（开发环境）

> 详细文档请参考 `/home/pupeng/projects/wxcl-v2/CLAUDE.md`

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
| 端口 | 3008 |
| 访问 URL | http://wxcl.nzyy.ltd |
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
pm2 reload ecosystem.config.js --only wxcl-v2-dev

# 推送代码
git push origin dev-work
```

---

## 注意事项

- **不要在生产环境目录** `/home/pupeng/projects/wxcl-v2` 进行开发
- 开发环境是 worktree 隔离，不影响生产
- 代码修改后 commit 并 push 到 dev-work 分支
- 生产部署需要切换到 wxcl-v2 目录执行部署流程

---

## PM2 部署配置

ecosystem.config.js 使用 `next start -p 3008`，与生产环境完全一致。

### error.tsx 兜底机制

已配置 `app/error.tsx`，捕获 Server Action 版本不一致错误，自动刷新页面。

---

## Turbopack 缓存问题处理

如果 `npm run dev` 出现 Turbopack 崩溃或编译异常（如 "Failed to restore task data"）：

**标准部署流程（开发环境）：**
1. `pkill -f "next-server"` 杀掉所有 next 进程
2. `rm -rf .next` 清理缓存
3. `npm run build` 构建
4. 服务器自动在 3008 端口启动

**注意：** dev 模式有 Turbopack 缓存问题，加载慢或卡住时用 build 模式测试。

---

## 生产部署注意事项

### 部署流程（生产环境 wxcl-v2）

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
