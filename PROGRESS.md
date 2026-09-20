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
|-----|------|-----|
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
| `GET /api/user/expiry` | 获取时长状态 |
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

## 八、待实现功能

- [ ] 电子勋章展示（前端 UI）
- [ ] 邀请码过期提醒通知
- [ ] 恶意刷量防护（IP 限流）

---

## 九、相关文件

### 核心逻辑
- `src/lib/user-expiry.ts` - 时长检查、延长、解冻逻辑
- `src/lib/apply-reward.ts` - 激励发放逻辑

### API
- `/api/user/expiry` - 时长状态
- `/api/user/activity` - 行为记录
- `/api/apply/ranking` - 排行榜
- `/api/cron/reward` - 激励发放

### 页面
- `/(tab)/home/page.tsx` - 首页（时长提示 + 推广入口）
- `/(tab)/profile/page.tsx` - 我的页面（意见反馈）
- `/apply/stats` - 推广数据中心
- `/apply/[code]` - 分享状态页

### 脚本
- `scripts/migrate-user-expiry.ts` - 老用户迁移
