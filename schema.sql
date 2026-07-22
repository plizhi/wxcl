-- wxcl-v2 数据库初始化
-- 运行: psql $DATABASE_URL -f schema.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 孩子档案
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 陪伴记录（陪伴观察）
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply TEXT,
  intent VARCHAR(20) DEFAULT 'daily',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 问答记录
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  answer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 孩子画像
CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  personality JSONB,
  interests JSONB,
  strengths JSONB,
  challenges JSONB,
  core_needs JSONB,
  growth_goals JSONB,
  ai_analysis JSONB,
  parent_weight FLOAT DEFAULT 0.5,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(child_id)
);

-- 画像事件库
CREATE TABLE IF NOT EXISTS profile_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  event_type VARCHAR(20),
  fact TEXT NOT NULL,
  interpretation TEXT,
  source VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 画像版本历史
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

-- 索引
CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_records_child ON records(child_id);
CREATE INDEX IF NOT EXISTS idx_questions_child ON questions(child_id);
CREATE INDEX IF NOT EXISTS idx_records_created ON records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_events_child ON profile_events(child_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_type ON profile_events(event_type);
CREATE INDEX IF NOT EXISTS idx_profile_versions_child ON profile_versions(child_id);
