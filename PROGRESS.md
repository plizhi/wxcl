# 望杏成林 V2 - 开发进度记录

## 2026-09-10 用户时长机制完成

---

## 一、用户时长体系

### 设计规则

| 项目 | 说明 |
|-----|------|
| 新用户注册 | 获得 6 个月时长 |
| 时长上限 | 24 个月 |
| 老用户 | 一次性给 24 个月 |

### 延长规则

| 行为 | 目标 | 奖励 |
|-----|------|------|
| 分享海报下载 | 3次/月 | +1个月 |
| 邀请好友注册 | 1人/月 | +3个月 |
| 提交反馈 | 3次/月 | +1个月 |

### 冻结与解冻

| 状态 | 说明 |
|-----|------|
| 超时冻结 | 到期后账号冻结，无法使用核心功能 |
| 解冻方式 | 邀请1人注册即可解冻，获得6个月时长 |

---

## 二、数据模型

### User 表扩展
```prisma
model User {
  expireAt    DateTime?  // 到期时间，null 表示无限制
  status      String @default("active")  // pending=待激活, active=已激活
  source      String @default("organic")  // nzyy=从nzyy跳转, organic=直接访问
}
```

### UserActivity 表（新增）
```prisma
model UserActivity {
  id        String   @id
  userId    String
  type      String   // "share" | "invite" | "feedback"
  month     String   // "2026-09" 格式
  count     Int      @default(1)
}
```

---

## 三、API 实现

| API | 说明 |
|-----|------|
| `GET /api/user/expiry` | 获取时长状态（含 isPending） |
| `POST /api/user/activity` | 记录行为（share/invite/feedback） |
| `GET /api/cron/reward` | 激励发放（定时任务触发） |

---

## 四、前端入口

| 位置 | 内容 |
|-----|------|
| 首页 `/(tab)/home` | 时长状态提示 + 推广数据中心入口 |
| 推广数据中心 `/apply/stats` | 个人数据 + 排行榜 + 激励规则 |
| 我的页面 `/(tab)/profile` | 意见反馈入口 |

---

## 五、定时任务配置

```bash
# crontab -e 添加：
# 每周一 00:05 发放周榜激励
5 0 * * 1 curl -s "http://localhost:3008/api/cron/reward?type=week&secret=YOUR_SECRET"

# 每月 1 日 00:05 发放月榜激励
5 0 1 * * curl -s "http://localhost:3008/api/cron/reward?type=month&secret=YOUR_SECRET"
```

---

## 六、老用户迁移

```bash
npx tsx scripts/migrate-user-expiry.ts
```

---

## 七、邀请码体系

### 10+3 条件
- 10：分享被打开次数
- 3：分享后新用户申请数（需达到10+打开）

### 排行榜与激励

| 榜单 | 周期 | 排名 | 激励 |
|-----|------|-----|------|
| 分享打开 Top1 | 周榜 | 1 | 1个邀请码 + 电子勋章 |
| 新用户 Top1 | 周榜 | 1 | 1个邀请码 + 电子勋章 |
| 分享打开 Top3 | 月榜 | 1-3 | 各1个邀请码 |
| 新用户 Top3 | 月榜 | 1-3 | 各1个邀请码 |

---

## 八、已完成功能

- [x] 电子勋章展示（前端 UI）
- [x] 邀请码过期提醒通知
- [x] 恶意刷量防护（IP 限流）

---

## 九、新增功能（2026-09-20）

### 9.1 AI 育儿内容过滤
- 非育儿内容直接婉拒，不调 LLM
- 新增 `src/lib/content-filter.ts`

### 9.2 滋养时刻四层次
- 提示词改为：彼此连接 → 彼此看见和懂得 → 彼此理解 → 彼此支持
- 支持从 daily 和 venting 记录提取
- `NourishmentMoment.level` 字段

### 9.3 门户用户体系（pending）
- `users.status` = pending/active
- `users.source` = nzyy/organic
- nzyy 跳转用户自动创建为 pending
- pending 用户核心功能全部冻结

### 9.4 /bind 页面与 API
- `/api/bind` - 验证 nzyy token，创建 pending 用户
- `/bind` - nzyy 跳转入口页面
- 需配置 `NZYY_API_URL=https://nzyy.cc/api`

---

## 十、生产部署

### 数据库迁移
```bash
# 迁移 004（pending 用户体系）
psql $DATABASE_URL -f migrations/004_add_status_and_source.sql
```

### 环境变量
```env
NZYY_API_URL=https://nzyy.cc/api
```

---

## 十一、相关文件

### 核心逻辑
- `src/lib/user-expiry.ts` - 时长检查、延长、解冻逻辑
- `src/lib/apply-reward.ts` - 激励发放逻辑
- `src/lib/content-filter.ts` - 育儿内容过滤
- `src/lib/rate-limit.ts` - 限流器
- `src/lib/medal.ts` - 勋章服务

### API
- `/api/user/expiry` - 时长状态
- `/api/user/activity` - 行为记录
- `/api/apply/ranking` - 排行榜
- `/api/cron/reward` - 激励发放
- `/api/bind` - nzyy 跳转绑定
- `/api/medals` - 勋章

### 页面
- `/(tab)/home/page.tsx` - 首页（时长提示 + pending 提示）
- `/(tab)/profile/page.tsx` - 我的页面（意见反馈）
- `/apply/stats` - 推广数据中心
- `/apply/[code]` - 分享状态页（含过期提醒）
- `/bind` - nzyy 跳转入口

### 脚本
- `scripts/migrate-user-expiry.ts` - 老用户迁移

### 数据库迁移
- `migrations/003_add_user_expiry_and_invite_system.sql` - 时长+邀请码体系
- `migrations/004_add_status_and_source.sql` - pending 用户体系

---

## 十二、用户指南（2026-09-21）

### 文档位置
`docs/` 目录下

### 文本版
| 文件 | 内容 |
|-----|------|
| `01-新手入门.md` | 注册→添加孩子→记录第一条→看到什么 |
| `02-FAQ常见问题.md` | 10个最高频问题解答 |
| `03-进阶使用技巧.md` | 记录技巧、机会窗口、滋养时刻、综合报告 |

### 视频脚本版
| 文件 | 内容 |
|-----|------|
| `01-新手入门-视频脚本.md` | 旁白全文+分镜+AI生成提示词 |
| `02-FAQ常见问题-视频脚本.md` | 旁白全文+字幕对照+AI生成提示词 |
| `03-进阶使用技巧-视频脚本.md` | 旁白全文+字幕对照+AI生成提示词 |
