#!/bin/bash
# 从旧版 parent_child 数据库迁移数据到 V2 wxcl 数据库

set -e

OLD_DB="parent_child"
NEW_DB="wxcl"
PGPASSWORD="wxcl123"

echo "=== 开始迁移旧版数据到 V2 ==="

# 1. 迁移用户（不含密码，因为加密方式不同）
echo "迁移用户..."
psql -h localhost -U postgres -d "$NEW_DB" << EOF
-- 迁移用户（如果不存在）
INSERT INTO users (id, phone, nickname, avatar_url, parent_role, last_login_at, created_at, updated_at)
SELECT
    gen_random_uuid(),
    phone,
    COALESCE(nickname, '用户'),
    avatar_url,
    parent_role,
    last_login_at,
    created_at,
    NOW()
FROM parent_child."user"
WHERE phone IS NOT NULL
ON CONFLICT (phone) DO NOTHING;
EOF

echo "用户迁移完成"

# 2. 迁移孩子信息
echo "迁移孩子信息..."
psql -h localhost -U postgres -d "$NEW_DB" << 'EOF'
-- 为每个旧用户创建孩子记录
INSERT INTO children (id, user_id, name, birth_date, gender, created_at, updated_at)
SELECT
    gen_random_uuid(),
    u.id,
    COALESCE(cp.name, '孩子'),
    COALESCE(cp.grade::date, CURRENT_DATE - INTERVAL '6 years'),
    cp.gender,
    NOW()
FROM parent_child."user" u
LEFT JOIN parent_child.child_profile cp ON u.id = cp.user_id
WHERE u.phone IS NOT NULL
ON CONFLICT DO NOTHING;
EOF

echo "孩子信息迁移完成"

# 3. 迁移陪伴记录
echo "迁移陪伴记录..."
psql -h localhost -U postgres -d "$NEW_DB" << 'EOF'
INSERT INTO records (id, child_id, content, reply, intent, created_at)
SELECT
    gen_random_uuid(),
    c.id,
    dcr.content,
    dcr.report::text,
    'daily',
    dcr.created_at
FROM parent_child.daily_care_record dcr
JOIN parent_child."user" u ON dcr.user_id = u.id
JOIN parent_child.child_profile cp ON u.id = cp.user_id
JOIN children c ON c.user_id = u.id
WHERE dcr.content IS NOT NULL
ON CONFLICT DO NOTHING;
EOF

echo "陪伴记录迁移完成"

# 4. 迁移问答/压力吐槽
echo "迁移问答..."
psql -h localhost -U postgres -d "$NEW_DB" << 'EOF'
INSERT INTO questions (id, child_id, content, answer, created_at)
SELECT
    gen_random_uuid(),
    c.id,
    q.content,
    COALESCE(q.ai_reply, q.human_reply),
    q.created_at
FROM parent_child.question q
JOIN parent_child."user" u ON q.user_id = u.id
JOIN parent_child.child_profile cp ON u.id = cp.user_id
JOIN children c ON c.user_id = u.id
WHERE q.content IS NOT NULL
ON CONFLICT DO NOTHING;
EOF

echo "=== 迁移完成 ==="
