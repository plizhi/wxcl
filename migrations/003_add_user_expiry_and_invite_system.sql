-- 迁移脚本: 003_add_user_expiry_and_invite_system.sql
-- 描述: 用户时长机制 + 邀请码体系 + Schema 补充
-- 时间: 2026-09-20
-- 运行前请备份数据库！

BEGIN;

-- =============================================
-- 1. users 表新增字段（兼容旧版 PG）
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'expire_at') THEN
    ALTER TABLE users ADD COLUMN expire_at TIMESTAMP;
  END IF;
END
$$;
COMMENT ON COLUMN users.expire_at IS '用户到期时间，null表示无限制';

-- =============================================
-- 2. user_activities 表（用户行为记录）
-- =============================================
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  month VARCHAR(7) NOT NULL,
  count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_month ON user_activities(month);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_activities_unique') THEN
    CREATE UNIQUE INDEX idx_user_activities_unique ON user_activities(user_id, type, month);
  END IF;
END
$$;

-- =============================================
-- 3. applies 表（申请/邀请关系）
-- =============================================
CREATE TABLE IF NOT EXISTS applies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  share_code VARCHAR(8) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  referrer_id UUID,
  invite_code VARCHAR(8) UNIQUE,
  invite_used_at TIMESTAMP,
  invite_expires_at TIMESTAMP,
  user_id UUID UNIQUE,
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_applies_referrer ON applies(referrer_id);
CREATE INDEX IF NOT EXISTS idx_applies_user ON applies(user_id);

-- =============================================
-- 4. share_logs 表（分享打开记录）
-- =============================================
CREATE TABLE IF NOT EXISTS share_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apply_id UUID NOT NULL REFERENCES applies(id) ON DELETE CASCADE,
  visitor_ip VARCHAR(50),
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_share_logs_apply ON share_logs(apply_id);

-- =============================================
-- 5. apply_rewards 表（激励发放记录）
-- =============================================
CREATE TABLE IF NOT EXISTS apply_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apply_id UUID NOT NULL REFERENCES applies(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL,
  type VARCHAR(10) NOT NULL,
  rank INT NOT NULL,
  reward_code VARCHAR(8),
  medal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_apply_rewards_unique') THEN
    CREATE UNIQUE INDEX idx_apply_rewards_unique ON apply_rewards(apply_id, period, type);
  END IF;
END
$$;
CREATE INDEX IF NOT EXISTS idx_apply_rewards_apply ON apply_rewards(apply_id);

-- =============================================
-- 6. nourishment_moments 表新增 level 字段
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nourishment_moments' AND column_name = 'level') THEN
    ALTER TABLE nourishment_moments ADD COLUMN level VARCHAR(20);
  END IF;
END
$$;
COMMENT ON COLUMN nourishment_moments.level IS '滋养层次：彼此连接、彼此看见和懂得、彼此理解、彼此支持';

-- =============================================
-- 7. profile_opportunities 表（如果尚未创建）
-- =============================================
CREATE TABLE IF NOT EXISTS profile_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  dimension VARCHAR(50),
  element VARCHAR(50),
  description TEXT NOT NULL,
  suggestion TEXT,
  status VARCHAR(20) DEFAULT 'open',
  first_appeared_at TIMESTAMP DEFAULT NOW(),
  last_appeared_at TIMESTAMP DEFAULT NOW(),
  appearance_count INT DEFAULT 1,
  warning_level INT DEFAULT 0,
  source_record_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opportunities_child ON profile_opportunities(child_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON profile_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_warning ON profile_opportunities(warning_level);

-- =============================================
-- 8. parent_reflections 表（如果尚未创建）
-- =============================================
CREATE TABLE IF NOT EXISTS parent_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  related_record_id UUID,
  related_opportunity_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reflections_user ON parent_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_child ON parent_reflections(child_id);

COMMIT;
