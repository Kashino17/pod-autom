-- =====================================================
-- POD AutoM Campaign Management Schema
-- Version: 1.0.0
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CAMPAIGNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES pod_autom_shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Campaign Identification
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Platform Info (Pinterest, Meta, etc.)
  platform VARCHAR(30) NOT NULL DEFAULT 'pinterest'
    CHECK (platform IN ('pinterest', 'meta', 'google', 'tiktok')),
  external_campaign_id VARCHAR(255), -- Platform-specific campaign ID
  external_ad_group_id VARCHAR(255), -- Pinterest ad group or Meta ad set
  ad_account_id VARCHAR(255),

  -- Status
  status VARCHAR(20) DEFAULT 'ACTIVE'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'ERROR')),
  sync_status VARCHAR(20) DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),

  -- Budget
  daily_budget DECIMAL(10,2) DEFAULT 10.00,
  lifetime_budget DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Targeting (JSONB for flexibility)
  targeting JSONB DEFAULT '{
    "countries": ["DE"],
    "age_min": 18,
    "age_max": 65,
    "genders": ["all"],
    "interests": [],
    "keywords": []
  }',

  -- Campaign Type
  campaign_type VARCHAR(30) DEFAULT 'standard'
    CHECK (campaign_type IN ('standard', 'winner_scaling', 'collection', 'product')),
  campaign_objective VARCHAR(50) DEFAULT 'CONVERSIONS', -- Pinterest objectives

  -- Performance Metrics (synced from platform)
  total_spend DECIMAL(12,2) DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  roas DECIMAL(6,2), -- Return on Ad Spend
  ctr DECIMAL(6,4), -- Click-through rate
  cpc DECIMAL(8,4), -- Cost per click

  -- Linked Content
  collection_id VARCHAR(255), -- Shopify collection ID if linked
  product_ids TEXT[], -- Array of product IDs

  -- Dates
  start_date DATE,
  end_date DATE,
  last_sync_at TIMESTAMPTZ,
  metrics_updated_at TIMESTAMPTZ,

  -- Error Tracking
  error_message TEXT,
  error_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pod_autom_campaigns_shop_id ON pod_autom_campaigns(shop_id);
CREATE INDEX idx_pod_autom_campaigns_user_id ON pod_autom_campaigns(user_id);
CREATE INDEX idx_pod_autom_campaigns_status ON pod_autom_campaigns(shop_id, status);
CREATE INDEX idx_pod_autom_campaigns_platform ON pod_autom_campaigns(shop_id, platform);
CREATE INDEX idx_pod_autom_campaigns_external ON pod_autom_campaigns(external_campaign_id);
CREATE INDEX idx_pod_autom_campaigns_type ON pod_autom_campaigns(shop_id, campaign_type);

-- =====================================================
-- 2. CAMPAIGN PINS TABLE (Ads within campaigns)
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_campaign_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES pod_autom_campaigns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES pod_autom_products(id) ON DELETE SET NULL,

  -- Pin/Ad Identification
  external_pin_id VARCHAR(255), -- Pinterest pin ID
  external_ad_id VARCHAR(255), -- Platform ad ID

  -- Content
  title VARCHAR(500),
  description TEXT,
  link_url TEXT,
  image_url TEXT,
  video_url TEXT,

  -- Creative Type
  creative_type VARCHAR(20) DEFAULT 'image'
    CHECK (creative_type IN ('image', 'video', 'carousel')),

  -- Status
  status VARCHAR(20) DEFAULT 'ACTIVE'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'REJECTED', 'ARCHIVED')),

  -- Performance
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pod_autom_campaign_pins_campaign ON pod_autom_campaign_pins(campaign_id);
CREATE INDEX idx_pod_autom_campaign_pins_product ON pod_autom_campaign_pins(product_id);
CREATE INDEX idx_pod_autom_campaign_pins_external ON pod_autom_campaign_pins(external_pin_id);

-- =====================================================
-- 3. CAMPAIGN SYNC LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_campaign_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES pod_autom_campaigns(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES pod_autom_shops(id) ON DELETE CASCADE,

  -- Sync Details
  sync_type VARCHAR(30) NOT NULL
    CHECK (sync_type IN ('create', 'update', 'metrics', 'status', 'delete')),
  sync_status VARCHAR(20) DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'success', 'failed')),

  -- Results
  pins_synced INTEGER DEFAULT 0,
  pins_failed INTEGER DEFAULT 0,
  metrics_before JSONB,
  metrics_after JSONB,

  -- Error Tracking
  error_message TEXT,
  error_details JSONB,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pod_autom_campaign_sync_campaign ON pod_autom_campaign_sync_log(campaign_id);
CREATE INDEX idx_pod_autom_campaign_sync_shop ON pod_autom_campaign_sync_log(shop_id);
CREATE INDEX idx_pod_autom_campaign_sync_status ON pod_autom_campaign_sync_log(sync_status);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

-- Campaigns RLS
ALTER TABLE pod_autom_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns" ON pod_autom_campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaigns" ON pod_autom_campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns" ON pod_autom_campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns" ON pod_autom_campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- Campaign Pins RLS
ALTER TABLE pod_autom_campaign_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign pins" ON pod_autom_campaign_pins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pod_autom_campaigns c
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own campaign pins" ON pod_autom_campaign_pins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pod_autom_campaigns c
      WHERE c.id = campaign_id AND c.user_id = auth.uid()
    )
  );

-- Sync Log RLS
ALTER TABLE pod_autom_campaign_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs" ON pod_autom_campaign_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pod_autom_shops s
      WHERE s.id = shop_id AND s.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Get campaign stats for a shop
CREATE OR REPLACE FUNCTION get_pod_autom_campaign_stats(p_shop_id UUID)
RETURNS TABLE (
  total_campaigns BIGINT,
  active_campaigns BIGINT,
  paused_campaigns BIGINT,
  total_spend DECIMAL,
  total_conversions BIGINT,
  avg_roas DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_campaigns,
    COUNT(*) FILTER (WHERE status = 'ACTIVE')::BIGINT as active_campaigns,
    COUNT(*) FILTER (WHERE status = 'PAUSED')::BIGINT as paused_campaigns,
    COALESCE(SUM(c.total_spend), 0)::DECIMAL as total_spend,
    COALESCE(SUM(c.total_conversions), 0)::BIGINT as total_conversions,
    COALESCE(AVG(c.roas) FILTER (WHERE c.roas > 0), 0)::DECIMAL as avg_roas
  FROM pod_autom_campaigns c
  WHERE c.shop_id = p_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
