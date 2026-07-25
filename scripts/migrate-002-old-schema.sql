-- migrate-002: 为旧版 Java 后端在 V2 数据库中创建所需表
-- 旧版和 V2 共享 V2 数据库，各自使用自己的表结构

-- 旧版用户表（注意表名是 "user" 需要加引号）
CREATE TABLE IF NOT EXISTS "user" (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    nickname VARCHAR(50) DEFAULT '用户',
    password VARCHAR(255),
    avatar_url VARCHAR(255),
    verification_code VARCHAR(10),
    code_expire_at TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    child_gender VARCHAR(10),
    child_grade VARCHAR(20),
    child_personality VARCHAR(20),
    main_concerns VARCHAR(500),
    change_goal VARCHAR(500),
    profile_completed BOOLEAN DEFAULT FALSE,
    parent_role VARCHAR(20)
);

-- 旧版孩子档案表
CREATE TABLE IF NOT EXISTS child_profile (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(50),
    gender VARCHAR(10),
    grade VARCHAR(20),
    personality VARCHAR(20),
    main_concerns VARCHAR(500),
    change_goal VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- 旧版日常记录表（陪伴记录）
CREATE TABLE IF NOT EXISTS daily_care_record (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    report JSONB,
    report_generated_at TIMESTAMP,
    record_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    touch_point TEXT,
    thinking_shift TEXT,
    planned_action TEXT,
    feedback_submitted_at TIMESTAMP,
    highlight_axis1 TEXT,
    highlight_axis2 TEXT
);

-- 旧版问答记录表
CREATE TABLE IF NOT EXISTS question (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(50),
    content TEXT NOT NULL,
    scene_tag VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'ai_replied',
    ai_reply TEXT,
    ai_reply_at TIMESTAMP,
    human_reply TEXT,
    human_reply_at TIMESTAMP,
    human_replier_id BIGINT,
    feedback VARCHAR(20),
    parent_id BIGINT,
    child_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- 旧版打卡表
CREATE TABLE IF NOT EXISTS checkin (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    checkin_date DATE NOT NULL,
    emotion VARCHAR(20),
    good_thing TEXT,
    task_completed INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 旧版目标表
CREATE TABLE IF NOT EXISTS goal (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    goal_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    related_dimension VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

-- 旧版周报表
CREATE TABLE IF NOT EXISTS weekly_report (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    week_start DATE NOT NULL,
    report JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 旧版消息收件箱表
CREATE TABLE IF NOT EXISTS inbox_message (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(100),
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 旧版徽章配置表
CREATE TABLE IF NOT EXISTS badge_config (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    condition_type VARCHAR(50),
    condition_value INTEGER,
    level INTEGER DEFAULT 1
);

-- 旧版用户徽章表
CREATE TABLE IF NOT EXISTS user_badge (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    badge_code VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100),
    earned_at TIMESTAMP DEFAULT NOW()
);

-- 旧版任务表
CREATE TABLE IF NOT EXISTS task (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    task_date DATE NOT NULL,
    task_type VARCHAR(20) NOT NULL,
    task_content TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 旧版任务模板表
CREATE TABLE IF NOT EXISTS task_template (
    id BIGSERIAL PRIMARY KEY,
    task_type VARCHAR(20) NOT NULL,
    task_content TEXT NOT NULL,
    phase_start INTEGER,
    phase_end INTEGER,
    weight INTEGER DEFAULT 1
);

-- 旧版激活码表
CREATE TABLE IF NOT EXISTS activation_code (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    bound_phone VARCHAR(20),
    used_at TIMESTAMP,
    expired_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 旧版短语/话术表
CREATE TABLE IF NOT EXISTS phrase (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 旧版管理员表
CREATE TABLE IF NOT EXISTS admin_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    role VARCHAR(20) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_phone ON "user"(phone);
CREATE INDEX IF NOT EXISTS idx_child_profile_user ON child_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_care_record_user ON daily_care_record(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_care_record_date ON daily_care_record(record_date);
CREATE INDEX IF NOT EXISTS idx_question_user ON question(user_id);
CREATE INDEX IF NOT EXISTS idx_question_created ON question(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_user ON checkin(user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_date ON checkin(checkin_date);
CREATE INDEX IF NOT EXISTS idx_goal_user ON goal(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_report_user ON weekly_report(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_message_user ON inbox_message(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_user ON user_badge(user_id);
CREATE INDEX IF NOT EXISTS idx_task_user ON task(user_id);
CREATE INDEX IF NOT EXISTS idx_task_date ON task(task_date);
