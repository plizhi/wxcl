# wxcl-v2 部署指南

## 准备工作

### 1. 准备目录
```bash
# 在服务器上创建目录
mkdir -p /home/pupeng/wxcl-v2
```

### 2. 复制构建产物
将本地的 `.next/` 和以下文件复制到服务器的 `/home/pupeng/wxcl-v2/`：
- `.next/` 整个目录
- `package.json`
- `.env.local`（重命名为 `.env`）
- `node_modules/`（或服务器上 `npm install`）

### 3. 安装依赖
```bash
cd /home/pupeng/wxcl-v2
npm install
```

### 4. 数据库初始化
确保 PostgreSQL 中的 wxcl 数据库已创建：
```bash
sudo -u postgres psql -c "CREATE DATABASE wxcl;"
psql $DATABASE_URL -f schema.sql
```

---

## 启动服务

```bash
cd /home/pupeng/wxcl-v2
PORT=3006 npm start &
```

---

## Nginx 配置

在 `/etc/nginx/sites-enabled/` 中找到 `wxcl.nzyy.cc` 的配置，在 `location /api/` 之前添加：

```nginx
location /v2 {
    proxy_pass http://127.0.0.1:3006;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /v2/api/ {
    proxy_pass http://127.0.0.1:3006;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

然后重载 nginx：
```bash
sudo nginx -t && sudo nginx -s reload
```

---

## 验证

- 原版：`https://wxcl.nzyy.cc/`
- 新版：`https://wxcl.nzyy.cc/v2`
- 切换按钮：原版右上角"体验新版 →"，新版右上角"← 切换原版"
