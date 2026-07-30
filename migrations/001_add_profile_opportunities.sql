-- 迁移脚本: 001_add_profile_opportunities.sql
-- 描述: 添加机会窗口追踪表
-- 时间: 2026-07-30

BEGIN;

-- 画像机会窗口表
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

COMMIT;
