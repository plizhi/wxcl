-- wxcl-v2 数据库初始化
-- 运行: psql $DATABASE_URL -f schema.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE,
  nickname VARCHAR(50) DEFAULT '用户',
  avatar_url VARCHAR(255),
  password VARCHAR(255),
  parent_role VARCHAR(20),
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 认证会话表（用于验证码登录）
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
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

-- 滋养时刻
CREATE TABLE IF NOT EXISTS nourishment_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  feeling TEXT,
  source VARCHAR(20) DEFAULT 'manual',
  extracted_from_record_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 滋养报告
CREATE TABLE IF NOT EXISTS nourishment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  period_type VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB,
  moment_count INT DEFAULT 0,
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

-- 陪伴记录详情表（包含 AI 分析结果）
CREATE TABLE IF NOT EXISTS daily_care_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply TEXT,
  strengths JSONB,
  opportunity_axis1 JSONB,
  opportunity_axis2 JSONB,
  advice TEXT,
  growth_summary TEXT,
  intent VARCHAR(20) DEFAULT 'daily',
  touch_point VARCHAR(50),
  thinking_shift VARCHAR(50),
  planned_action TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_records_child ON records(child_id);
CREATE INDEX IF NOT EXISTS idx_questions_child ON questions(child_id);
CREATE INDEX IF NOT EXISTS idx_records_created ON records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_phone ON auth_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_nourishment_moments_child ON nourishment_moments(child_id);
CREATE INDEX IF NOT EXISTS idx_nourishment_moments_created ON nourishment_moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nourishment_reports_child ON nourishment_reports(child_id);
CREATE INDEX IF NOT EXISTS idx_nourishment_reports_period ON nourishment_reports(period_type);
CREATE INDEX IF NOT EXISTS idx_child_profiles_child ON child_profiles(child_id);
CREATE INDEX IF NOT EXISTS idx_profile_versions_child ON profile_versions(child_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_child ON profile_events(child_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_type ON profile_events(event_type);
CREATE INDEX IF NOT EXISTS idx_daily_care_record_child ON daily_care_record(child_id);
