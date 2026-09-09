# 望杏成林 V2 - 开发进度记录

## 2026-09-09 邀请码体系与排行榜

### 核心设计：身份体系与邀请码机制

---

## 一、身份体系

### 预注册用户（分享者）
- **获得方式**：扫码 + 手机号注册
- **数据存储**：Apply 表
- **权益**：
  - ❌ 无法使用应用核心功能（陪伴记录、滋养时刻等）
  - ✅ 可以看到分享状态
  - ✅ 可以保存/分享海报
- **目标**：通过分享达成 10+3 条件

### 正式用户
- **获得方式**：邀请码激活
- **数据存储**：User 表（通过 Apply.userId 关联）
- **权益**：
  - ✅ 完整使用所有功能
  - ✅ 可以成为新的分享者

---

## 二、邀请码机制

### 邀请码的双重角色

| 场景 | 对谁 | 作用 |
|-----|------|-----|
| 注册时 | 新用户 | 注册凭证 |
| 激活时 | 预注册用户 | 功能激活码 |

### 10+3 条件
- 10：分享被打开次数
- 3：分享后新用户申请数（需达到10+打开）

### A 的路径（示例）
```
预注册用户（扫码注册）
    ↓
分享给10人打开 + 3人申请（每人需10+打开）
    ↓
获得邀请码（激活码）
    ↓
用邀请码激活 → 正式用户
    ↓
解锁完整功能
```

---

## 三、排行榜与激励体系

### 排行榜设计

**入口**：推广数据中心 `/apply/stats`

**周期**：周榜 + 月榜

**类型**：
1. 分享打开数排行榜
2. 新用户数排行榜（referrer 带来的激活用户数）

### 激励体系

| 榜单 | 周期 | 排名 | 激励 |
|-----|------|-----|------|
| 分享打开 Top1 | 周榜 | 1 | 1个邀请码 + 电子勋章 |
| 新用户 Top1 | 周榜 | 1 | 1个邀请码 + 电子勋章 |
| 分享打开 Top3 | 月榜 | 1-3 | 各1个邀请码 |
| 新用户 Top3 | 月榜 | 1-3 | 各1个邀请码 |

**说明**：
- 邀请码可送给朋友，朋友直接成为正式用户
- 电子勋章：荣誉激励（ApplyReward 表 medal 字段）

---

## 四、数据模型

### Apply 表扩展 ✅
```prisma
model Apply {
  id            String    @id
  phone         String    @unique
  shareCode     String    @unique
  status        String    // pending/invite_ready/activated
  referrerId    String?   // 推荐人 Apply.id
  inviteCode    String?   @unique  // 6位邀请码
  inviteUsedAt  DateTime?
  inviteExpiresAt DateTime?
  userId        String?   @unique  // 关联 User（激活后）
  activatedAt   DateTime? // 激活时间
  createdAt     DateTime
}
```

### ApplyReward 表 ✅（新增）
```prisma
model ApplyReward {
  id         String   @id
  applyId    String   // Apply.id
  period     String   // "week" | "month"
  type       String   // "opens" | "users"
  rank       Int
  rewardCode String?  // 发放的邀请码
  medal      Boolean  // 是否发放电子勋章
  createdAt  DateTime
}
```

---

## 五、API 实现

### 排行榜 API ✅
- `GET /api/apply/ranking?period=week|month&type=opens|users&phone=xxx`
- 返回：排行榜列表 + 当前用户排名 + 周期时间范围

### 激励发放 Cron API ✅
- `GET /api/cron/reward?type=week|month|both&secret=xxx`
- 每周一 00:05 和每月 1 日 00:05 触发
- 检查并发放激励（生成邀请码、记录 ApplyReward）

### 激活 API ✅
- `POST /api/apply/verify-invite/[code]`
- 验证邀请码有效性
- 创建/关联 User
- 创建/更新 Apply（status=activated, userId, activatedAt, referrerId）

---

## 六、数据库迁移

```bash
npx prisma db push
```

---

## 七、定时任务配置

```bash
# crontab -e 添加：
# 每周一 00:05 发放周榜激励
5 0 * * 1 curl -s "http://localhost:3008/api/cron/reward?type=week&secret=YOUR_SECRET"

# 每月 1 日 00:05 发放月榜激励
5 0 1 * * curl -s "http://localhost:3008/api/cron/reward?type=month&secret=YOUR_SECRET"
```

---

## 八、待实现功能

- [ ] 电子勋章展示（前端 UI）
- [ ] 邀请码过期提醒通知
- [ ] 推广数据中心数据导出
- [ ] 恶意刷量防护（IP 限流）

---

## 九、相关文件

### API 路由
- `/api/apply` - 申请相关
- `/api/apply/ranking` - 排行榜 API（新建）
- `/api/apply/stats` - 推广统计
- `/api/apply/verify-invite/[code]` - 邀请码激活
- `/api/cron/reward` - 激励发放（新建）

### 页面
- `/apply/[code]` - 分享状态页
- `/apply/stats` - 推广数据中心（已改造）

### 核心文件
- `prisma/schema.prisma` - Apply、ApplyReward 模型
- `src/lib/apply-reward.ts` - 激励发放逻辑（新建）
