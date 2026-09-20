-- 迁移脚本: 004_add_status_and_source.sql
-- 描述: 用户状态和来源字段
-- 时间: 2026-09-20

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'source') THEN
    ALTER TABLE users ADD COLUMN source VARCHAR(20) DEFAULT 'organic';
  END IF;
END
$$;

COMMENT ON COLUMN users.status IS 'pending=待激活(从nzyy跳转), active=已激活';
COMMENT ON COLUMN users.source IS 'nzyy=从nzyy跳转, organic=直接访问';

COMMIT;
