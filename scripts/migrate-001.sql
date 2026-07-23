-- 迁移脚本：为 wxcl-v2 添加缺失的表

-- 滋养时刻表
CREATE TABLE IF NOT EXISTS nourishment_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  feeling TEXT,
  source VARCHAR(20) DEFAULT 'manual',
  extracted_from_record_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 孩子画像表
CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID UNIQUE NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  personality JSONB,
  interests JSONB,
  strengths JSONB,
  challenges JSONB,
  core_needs JSONB,
  growth_goals JSONB,
  ai_analysis JSONB,
  parent_weight FLOAT DEFAULT 0.5,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 画像版本历史表
CREATE TABLE IF NOT EXISTS profile_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  modified_by VARCHAR(20),
  modifications JSONB,
  ai_analysis_at_time JSONB,
  review_flags JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 画像事件库表
CREATE TABLE IF NOT EXISTS profile_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  event_type VARCHAR(20),
  fact TEXT NOT NULL,
  interpretation TEXT,
  source VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_nourishment_moments_child ON nourishment_moments(child_id);
CREATE INDEX IF NOT EXISTS idx_nourishment_moments_created ON nourishment_moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_child_profiles_child ON child_profiles(child_id);
CREATE INDEX IF NOT EXISTS idx_profile_versions_child ON profile_versions(child_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_child ON profile_events(child_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_type ON profile_events(event_type);
