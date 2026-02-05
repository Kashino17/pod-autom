-- Campaign Optimization Job - Database Migrations
-- Run this in Supabase SQL Editor

-- ============================================
-- Table 1: pinterest_campaign_optimization_rules
-- Stores optimization rules per shop
-- ============================================

CREATE TABLE IF NOT EXISTS pinterest_campaign_optimization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,  -- Higher priority is checked first

  -- Conditions (JSON Array)
  -- Example: [
  --   {"metric": "spend", "operator": ">=", "value": 100, "time_range_days": 7, "logic": "AND"},
  --   {"metric": "checkouts", "operator": "<=", "value": 3, "time_range_days": 7, "logic": "OR"},
  --   {"metric": "roas", "operator": "<", "value": 2.0, "time_range_days": 7}
  -- ]
  conditions JSONB NOT NULL,

  -- Action
  action_type TEXT NOT NULL,  -- 'scale_up', 'scale_down', 'pause'
  action_value DECIMAL,       -- Amount or percent (e.g., 20)
  action_unit TEXT,           -- 'amount' (€) or 'percent' (%)

  -- Budget limits
  min_budget DECIMAL DEFAULT 5.00,    -- Minimum budget (Pinterest minimum)
  max_budget DECIMAL DEFAULT 1000.00, -- Maximum budget

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast shop queries
CREATE INDEX IF NOT EXISTS idx_optimization_rules_shop
ON pinterest_campaign_optimization_rules(shop_id);

-- Index for enabled rules
CREATE INDEX IF NOT EXISTS idx_optimization_rules_enabled
ON pinterest_campaign_optimization_rules(shop_id, is_enabled)
WHERE is_enabled = true;


-- ============================================
-- Table 2: pinterest_campaign_optimization_log
-- Logs all optimization actions taken
-- ============================================

CREATE TABLE IF NOT EXISTS pinterest_campaign_optimization_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id),
  campaign_id UUID REFERENCES pinterest_campaigns(id),
  rule_id UUID REFERENCES pinterest_campaign_optimization_rules(id),

  -- Before/After
  old_budget DECIMAL,
  new_budget DECIMAL,
  old_status TEXT,
  new_status TEXT,
  action_taken TEXT,  -- 'scaled_up', 'scaled_down', 'paused', 'skipped', 'failed'

  -- Metrics at the time of decision
  metrics_snapshot JSONB,  -- {"spend": 150, "checkouts": 2, "roas": 1.3}

  -- Test mode flag
  is_test_run BOOLEAN DEFAULT false,
  test_metrics JSONB,  -- If test mode: the manual test data used

  -- Error info (if failed)
  error_message TEXT,

  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by shop and date
CREATE INDEX IF NOT EXISTS idx_optimization_log_shop_date
ON pinterest_campaign_optimization_log(shop_id, executed_at DESC);

-- Index for test runs
CREATE INDEX IF NOT EXISTS idx_optimization_log_test_runs
ON pinterest_campaign_optimization_log(shop_id, is_test_run)
WHERE is_test_run = true;


-- ============================================
-- Table 3: pinterest_campaign_optimization_settings
-- Per-shop settings including test mode config
-- ============================================

CREATE TABLE IF NOT EXISTS pinterest_campaign_optimization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID UNIQUE REFERENCES shops(id) ON DELETE CASCADE,

  is_enabled BOOLEAN DEFAULT false,
  test_mode_enabled BOOLEAN DEFAULT false,
  test_campaign_id UUID REFERENCES pinterest_campaigns(id),

  -- Test data (manually entered)
  test_metrics JSONB,  -- {"spend": 150, "checkouts": 2, "roas": 1.3}

  -- Job schedule (optional, default is daily)
  run_frequency TEXT DEFAULT 'daily',  -- 'daily', 'twice_daily', 'hourly'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index on shop_id (already handled by UNIQUE constraint)


-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE pinterest_campaign_optimization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinterest_campaign_optimization_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinterest_campaign_optimization_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service key access (backend jobs)
CREATE POLICY "Service key can read optimization_rules"
ON pinterest_campaign_optimization_rules FOR SELECT
USING (true);

CREATE POLICY "Service key can insert optimization_rules"
ON pinterest_campaign_optimization_rules FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service key can update optimization_rules"
ON pinterest_campaign_optimization_rules FOR UPDATE
USING (true);

CREATE POLICY "Service key can delete optimization_rules"
ON pinterest_campaign_optimization_rules FOR DELETE
USING (true);

CREATE POLICY "Service key can read optimization_log"
ON pinterest_campaign_optimization_log FOR SELECT
USING (true);

CREATE POLICY "Service key can insert optimization_log"
ON pinterest_campaign_optimization_log FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service key can read optimization_settings"
ON pinterest_campaign_optimization_settings FOR SELECT
USING (true);

CREATE POLICY "Service key can insert optimization_settings"
ON pinterest_campaign_optimization_settings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service key can update optimization_settings"
ON pinterest_campaign_optimization_settings FOR UPDATE
USING (true);


-- ============================================
-- Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_optimization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_optimization_rules_updated_at
  BEFORE UPDATE ON pinterest_campaign_optimization_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_updated_at();

CREATE TRIGGER update_optimization_settings_updated_at
  BEFORE UPDATE ON pinterest_campaign_optimization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_optimization_updated_at();
