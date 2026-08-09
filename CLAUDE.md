# 望杏成林 V2（开发环境）

> 详细文档请参考 `/home/pupeng/projects/wxcl-v2/CLAUDE.md`

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

# 构建生产版本
npm run build

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

## Turbopack 缓存问题处理

如果 `npm run dev` 出现 Turbopack 崩溃或编译异常（如 "Failed to restore task data"）：
1. 先 `pkill -f "next-server"` 杀掉所有 next 进程
2. 再 `rm -rf .next` 清理缓存
3. 最后 `npm run dev` 重启

如果需要测试生产效果，不要用 dev 模式（dev 模式使用 Turbopack 有缓存问题）。应该：
1. `npm run build` 构建
2. `npm run start` 启动生产服务器（默认 3000 端口，可通过 `-p 3008` 指定端口）

---

## 生产部署注意事项

### 部署流程（生产环境）

```bash
cd /home/pupeng/projects/wxcl-v2

# 1. 合并 dev-work 到 master
git merge dev-work

# 2. 构建
npm run build

# 3. 重启 nginx（重要！否则用户可能看到旧内容）
sudo nginx -s reload

# 4. pm2 重启（注意：pm2 restart 可能不生效，需用 delete 方式）
pm2 delete wxcl-v2 && pm2 start npm --name "wxcl-v2" -- start
```

### 常见问题

| 问题 | 原因 | 解决 |
|-----|------|------|
| 用户看不到更新 | nginx 缓存 | `sudo nginx -s reload` |
| pm2 restart 无效 | fork_mode 下进程不真正重启 | `pm2 delete` + `pm2 start` |
| JWT_SECRET 缺失 | .env.local 未配置 | 添加 `JWT_SECRET=<生成密钥>` |
| Turbopack 编译错误 | 缓存损坏 | `rm -rf .next` + 重启 dev |
