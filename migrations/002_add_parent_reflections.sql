-- 迁移脚本: 002_add_parent_reflections.sql
-- 描述: 添加家长反思记录表
-- 时间: 2026-07-30

BEGIN;

-- 家长反思表
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
