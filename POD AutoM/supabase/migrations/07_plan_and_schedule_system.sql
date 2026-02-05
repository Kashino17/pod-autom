-- POD AutoM Plan & Schedule System
-- Migration: 07_plan_and_schedule_system.sql
-- Created: 2026-02-05
--
-- Changes:
-- 1. Add plan/schedule fields to pod_autom_settings
-- 2. Add monthly usage tracking
-- 3. Change from "every 2h" to "daily at user-chosen time"

-- =====================================================
-- SETTINGS - Add Plan & Schedule Fields
-- =====================================================

-- Plan type (free, starter, pro, enterprise)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pod_autom_settings' AND column_name = 'plan_type') THEN
        ALTER TABLE pod_autom_settings ADD COLUMN plan_type TEXT DEFAULT 'free';
    END IF;
END $$;

-- Monthly design limit based on plan
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pod_autom_settings' AND column_name = 'monthly_design_limit') THEN
        ALTER TABLE pod_autom_settings ADD COLUMN monthly_design_limit INTEGER DEFAULT 10;
    END IF;
END $$;

-- Daily generation time (HH:MM format, e.g. '09:00')
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pod_autom_settings' AND column_name = 'generation_time') THEN
        ALTER TABLE pod_autom_settings ADD COLUMN generation_time TEXT DEFAULT '09:00';
    END IF;
END $$;

-- User timezone for scheduling
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pod_autom_settings' AND column_name = 'generation_timezone') THEN
        ALTER TABLE pod_autom_settings ADD COLUMN generation_timezone TEXT DEFAULT 'Europe/Berlin';
    END IF;
END $$;

-- Billing cycle start (resets monthly counter)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pod_autom_settings' AND column_name = 'billing_cycle_start') THEN
        ALTER TABLE pod_autom_settings ADD COLUMN billing_cycle_start DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- Designs per batch (how many designs per scheduled run)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pod_autom_settings' AND column_name = 'designs_per_batch') THEN
        ALTER TABLE pod_autom_settings ADD COLUMN designs_per_batch INTEGER DEFAULT 5;
    END IF;
END $$;

-- Last generation run timestamp (to prevent double runs)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pod_autom_settings' AND column_name = 'last_generation_run') THEN
        ALTER TABLE pod_autom_settings ADD COLUMN last_generation_run TIMESTAMPTZ;
    END IF;
END $$;

-- =====================================================
-- MONTHLY USAGE TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_monthly_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_start DATE NOT NULL,  -- First day of the billing month
    designs_generated INTEGER DEFAULT 0,
    designs_failed INTEGER DEFAULT 0,
    manual_triggers INTEGER DEFAULT 0,
    scheduled_runs INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, month_start)
);

-- RLS for monthly usage
ALTER TABLE pod_autom_monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly usage" ON pod_autom_monthly_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update (for cron job)
CREATE POLICY "Service can manage monthly usage" ON pod_autom_monthly_usage
    FOR ALL WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month 
    ON pod_autom_monthly_usage(user_id, month_start);

-- =====================================================
-- GENERATION JOBS LOG - Track each generation run
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled', 'manual')),
    designs_requested INTEGER NOT NULL DEFAULT 1,
    designs_completed INTEGER DEFAULT 0,
    designs_failed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- RLS for generation jobs
ALTER TABLE pod_autom_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation jobs" ON pod_autom_generation_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage generation jobs" ON pod_autom_generation_jobs
    FOR ALL WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user 
    ON pod_autom_generation_jobs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status 
    ON pod_autom_generation_jobs(status);

-- =====================================================
-- PLAN DEFINITIONS (reference, not enforced in DB)
-- =====================================================

COMMENT ON COLUMN pod_autom_settings.plan_type IS 'Plan types: free (10/mo), starter (50/mo), pro (200/mo), enterprise (1000/mo)';
COMMENT ON COLUMN pod_autom_settings.generation_time IS 'Daily generation time in HH:MM format (24h), user timezone';
COMMENT ON COLUMN pod_autom_settings.generation_timezone IS 'IANA timezone for generation scheduling, e.g. Europe/Berlin, Asia/Dubai';
COMMENT ON COLUMN pod_autom_settings.designs_per_batch IS 'How many designs to generate per scheduled run';
COMMENT ON TABLE pod_autom_monthly_usage IS 'Monthly design generation usage tracking per user';
COMMENT ON TABLE pod_autom_generation_jobs IS 'Log of each generation run (scheduled or manual)';
