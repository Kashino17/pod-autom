-- Winner Scaling Tables
-- Created: 2024-12-04
-- Description: Tables for automatic winner product scaling with AI-generated creatives

-- =====================================================
-- Table: winner_scaling_settings
-- Shop-level configuration for winner scaling
-- =====================================================
CREATE TABLE IF NOT EXISTS winner_scaling_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID UNIQUE REFERENCES shops(id) ON DELETE CASCADE,

  is_enabled BOOLEAN DEFAULT false,

  -- Winner-Kriterien (4-Bucket System)
  sales_threshold_3d INTEGER DEFAULT 5,   -- Min sales last 3 days
  sales_threshold_7d INTEGER DEFAULT 10,  -- Min sales last 7 days
  sales_threshold_10d INTEGER DEFAULT 15, -- Min sales last 10 days
  sales_threshold_14d INTEGER DEFAULT 20, -- Min sales last 14 days
  min_buckets_required INTEGER DEFAULT 3, -- How many buckets must pass (1-4)

  -- Campaign Limits
  max_campaigns_per_winner INTEGER DEFAULT 4,

  -- Creative Settings
  video_count INTEGER DEFAULT 2,          -- Number of videos with Veo 3.1
  image_count INTEGER DEFAULT 4,          -- Number of images with GPT-Image
  campaigns_per_video INTEGER DEFAULT 1,  -- Campaigns per video set
  campaigns_per_image INTEGER DEFAULT 2,  -- Campaigns per image set

  -- Link Settings (A/B Test)
  link_to_product BOOLEAN DEFAULT true,
  link_to_collection BOOLEAN DEFAULT true,  -- If both true = A/B Test

  -- Budget
  daily_budget_per_campaign DECIMAL DEFAULT 10.00,

  -- Platform Flags (for future expansion)
  pinterest_enabled BOOLEAN DEFAULT true,
  meta_enabled BOOLEAN DEFAULT false,     -- Placeholder
  google_enabled BOOLEAN DEFAULT false,   -- Placeholder

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table: winner_products
-- Identified winner products
-- =====================================================
CREATE TABLE IF NOT EXISTS winner_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  product_title TEXT,
  product_handle TEXT,
  collection_handle TEXT,
  shopify_image_url TEXT,

  -- Winner Status
  identified_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  -- Sales Snapshot at identification
  sales_3d INTEGER,
  sales_7d INTEGER,
  sales_10d INTEGER,
  sales_14d INTEGER,
  buckets_passed INTEGER,

  -- Original campaign (for targeting copy)
  original_campaign_id UUID REFERENCES pinterest_campaigns(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id, product_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_winner_products_shop ON winner_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_winner_products_active ON winner_products(shop_id, is_active);

-- =====================================================
-- Table: winner_campaigns
-- Created campaigns for winner products
-- =====================================================
CREATE TABLE IF NOT EXISTS winner_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  winner_product_id UUID REFERENCES winner_products(id) ON DELETE CASCADE,

  -- Pinterest Campaign Info
  pinterest_campaign_id TEXT NOT NULL,
  pinterest_ad_group_id TEXT,
  campaign_name TEXT NOT NULL,

  -- Creative Info
  creative_type TEXT NOT NULL CHECK (creative_type IN ('video', 'image')),
  creative_count INTEGER,       -- Number of pins in the campaign
  link_type TEXT NOT NULL CHECK (link_type IN ('product', 'collection')),

  -- Status
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED')),

  -- AI-generated asset URLs
  generated_assets JSONB,  -- [{url: "...", type: "video/image", pin_id: "..."}]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_winner_campaigns_winner ON winner_campaigns(winner_product_id);
CREATE INDEX IF NOT EXISTS idx_winner_campaigns_status ON winner_campaigns(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_winner_campaigns_pinterest ON winner_campaigns(pinterest_campaign_id);

-- =====================================================
-- Table: winner_scaling_log
-- History/Verlauf for all actions
-- =====================================================
CREATE TABLE IF NOT EXISTS winner_scaling_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  winner_product_id UUID REFERENCES winner_products(id) ON DELETE SET NULL,

  -- Action Type
  action_type TEXT NOT NULL CHECK (action_type IN (
    'job_started',
    'job_completed',
    'winner_identified',
    'campaign_created',
    'creative_generated',
    'api_limit_reached',
    'campaign_status_check',
    'error'
  )),

  -- Flexible Details per action type
  details JSONB,
  -- job_started: {shops_count: X}
  -- job_completed: {winners_processed: X, campaigns_created: Y}
  -- winner_identified: {product_title, buckets_passed, sales_14d}
  -- campaign_created: {campaign_name, creative_type, link_type, pinterest_campaign_id}
  -- creative_generated: {type, count, model, urls}
  -- api_limit_reached: {api: "veo"|"gpt-image", error}
  -- campaign_status_check: {active_count, needed_count}
  -- error: {error_message, stack_trace}

  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_winner_log_shop_date ON winner_scaling_log(shop_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_winner_log_action ON winner_scaling_log(action_type);

-- =====================================================
-- Enable Row Level Security
-- =====================================================
ALTER TABLE winner_scaling_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE winner_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE winner_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE winner_scaling_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies (allow all for service role)
-- =====================================================
CREATE POLICY "Allow all for service role" ON winner_scaling_settings FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON winner_products FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON winner_campaigns FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON winner_scaling_log FOR ALL USING (true);

-- =====================================================
-- Trigger for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_winner_scaling_settings_updated_at
  BEFORE UPDATE ON winner_scaling_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_winner_products_updated_at
  BEFORE UPDATE ON winner_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_winner_campaigns_updated_at
  BEFORE UPDATE ON winner_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
