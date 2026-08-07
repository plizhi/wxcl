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
