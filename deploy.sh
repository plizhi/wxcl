#!/bin/bash
set -e

echo "=== 望杏成林 V2 部署脚本 ==="
echo "开始时间: $(date)"

# 1. 安装依赖
echo "[1/5] 安装依赖..."
npm install

# 2. 类型检查
echo "[2/5] 类型检查..."
npx tsc --noEmit

# 3. 构建
echo "[3/5] 构建..."
npm run build

# 4. 确保 static 目录存在
echo "[4/5] 处理 static 目录..."
mkdir -p .next/static

# 5. 重启服务
echo "[5/5] 重启服务..."
pm2 restart wxcl-v2 || pm2 start npm --name "wxcl-v2" -- start

echo "=== 部署完成 ==="
echo "结束时间: $(date)"
