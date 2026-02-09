-- =====================================================
-- POD AutoM Database Schema
-- Version: 1.0.0 (2026)
-- =====================================================

-- Beginne Transaktion fuer atomare Migration
BEGIN;

-- =====================================================
-- 1. EXTENSIONS (falls noch nicht aktiviert)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription Details
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('basis', 'premium', 'vip')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),

  -- Stripe Integration
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),

  -- Billing Cycle
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Trial (optional)
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id) -- Ein User kann nur eine aktive Subscription haben
);

-- Indexes
CREATE INDEX idx_pod_autom_subscriptions_user_id ON pod_autom_subscriptions(user_id);
CREATE INDEX idx_pod_autom_subscriptions_status ON pod_autom_subscriptions(status);
CREATE INDEX idx_pod_autom_subscriptions_stripe_customer ON pod_autom_subscriptions(stripe_customer_id);
CREATE INDEX idx_pod_autom_subscriptions_stripe_sub ON pod_autom_subscriptions(stripe_subscription_id);

-- =====================================================
-- 3. SHOPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Shop Details
  shop_domain VARCHAR(255) NOT NULL, -- z.B. "mystore.myshopify.com"
  shop_name VARCHAR(255), -- Shopify Shop Name
  internal_name VARCHAR(255), -- Benutzerdefinierter Name
  shop_email VARCHAR(255),
  shop_currency VARCHAR(3) DEFAULT 'EUR',
  shop_timezone VARCHAR(50) DEFAULT 'Europe/Berlin',

  -- Shopify OAuth
  access_token TEXT, -- Verschluesselt speichern!
  scopes TEXT, -- Granted Scopes
  shopify_shop_id VARCHAR(50), -- Shopify's interne Shop ID

  -- Connection Status
  connection_status VARCHAR(20) DEFAULT 'disconnected'
    CHECK (connection_status IN ('connected', 'disconnected', 'error', 'pending')),
  last_sync_at TIMESTAMPTZ,
  connection_error TEXT,

  -- Fulfillment (Printful/eigener Dienstleister)
  printful_api_key TEXT,
  fulfillment_provider VARCHAR(50) DEFAULT 'custom',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, shop_domain)
);

-- Indexes
CREATE INDEX idx_pod_autom_shops_user_id ON pod_autom_shops(user_id);
CREATE INDEX idx_pod_autom_shops_domain ON pod_autom_shops(shop_domain);
CREATE INDEX idx_pod_autom_shops_status ON pod_autom_shops(connection_status);

-- =====================================================
-- 4. SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES pod_autom_shops(id) ON DELETE CASCADE UNIQUE,

  -- Automation Settings
  enabled BOOLEAN DEFAULT TRUE,
  auto_publish BOOLEAN DEFAULT TRUE,
  auto_create_variants BOOLEAN DEFAULT TRUE,

  -- GPT Settings
  gpt_image_quality VARCHAR(10) DEFAULT 'HIGH'
    CHECK (gpt_image_quality IN ('LOW', 'MEDIUM', 'HIGH')),
  gpt_model VARCHAR(50) DEFAULT 'gpt-4o', -- Aktuelles Modell 2026

  -- Limits
  creation_limit INTEGER DEFAULT 20 CHECK (creation_limit >= 0 AND creation_limit <= 100),
  daily_creation_count INTEGER DEFAULT 0,
  last_creation_reset TIMESTAMPTZ DEFAULT NOW(),

  -- Pricing
  default_price DECIMAL(10,2) DEFAULT 29.99,
  price_multiplier DECIMAL(4,2) DEFAULT 1.00,
  compare_at_price_multiplier DECIMAL(4,2) DEFAULT 1.30, -- Fuer Streichpreise

  -- Product Settings
  default_product_type VARCHAR(100) DEFAULT 'T-Shirt',
  default_vendor VARCHAR(100) DEFAULT 'POD AutoM',
  default_tags TEXT[] DEFAULT '{}',
  default_collections TEXT[] DEFAULT '{}',

  -- Scheduling
  creation_schedule VARCHAR(50) DEFAULT 'daily', -- 'daily', 'weekly', 'custom'
  preferred_time TIME DEFAULT '06:00:00',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pod_autom_settings_shop_id ON pod_autom_settings(shop_id);
CREATE INDEX idx_pod_autom_settings_enabled ON pod_autom_settings(enabled);

-- =====================================================
-- 5. NICHES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_niches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID NOT NULL REFERENCES pod_autom_settings(id) ON DELETE CASCADE,

  -- Niche Details
  niche_name VARCHAR(255) NOT NULL,
  niche_slug VARCHAR(255), -- URL-freundlicher Name
  description TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0, -- Hoehere Prioritaet = mehr Produkte

  -- Performance Tracking
  total_products INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(settings_id, niche_name)
);

-- Indexes
CREATE INDEX idx_pod_autom_niches_settings_id ON pod_autom_niches(settings_id);
CREATE INDEX idx_pod_autom_niches_active ON pod_autom_niches(settings_id, is_active);
CREATE INDEX idx_pod_autom_niches_slug ON pod_autom_niches(niche_slug);

-- =====================================================
-- 6. PROMPTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id UUID NOT NULL REFERENCES pod_autom_settings(id) ON DELETE CASCADE,

  -- Prompt Details
  prompt_type VARCHAR(50) NOT NULL CHECK (prompt_type IN ('image', 'title', 'description')),
  prompt_name VARCHAR(255), -- Optionaler Name fuer den Prompt
  prompt_text TEXT NOT NULL,

  -- Variables (fuer dynamische Prompts)
  variables JSONB DEFAULT '{}', -- z.B. {"niche": true, "style": true}

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,

  -- Versioning (fuer A/B Tests)
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES pod_autom_prompts(id),

  -- Performance Tracking
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2), -- 0-100%

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pod_autom_prompts_settings_id ON pod_autom_prompts(settings_id);
CREATE INDEX idx_pod_autom_prompts_type ON pod_autom_prompts(settings_id, prompt_type);
CREATE INDEX idx_pod_autom_prompts_active ON pod_autom_prompts(settings_id, is_active);

-- =====================================================
-- 7. PRODUCTS TABLE (Fuer Tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES pod_autom_shops(id) ON DELETE CASCADE,
  niche_id UUID REFERENCES pod_autom_niches(id) ON DELETE SET NULL,

  -- Shopify Product Info
  shopify_product_id VARCHAR(50),
  shopify_handle VARCHAR(255),
  title VARCHAR(500),
  description TEXT,

  -- Generated Content
  generated_image_url TEXT,
  generated_title TEXT,
  generated_description TEXT,
  prompt_used TEXT,

  -- Pricing
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  cost_per_item DECIMAL(10,2),

  -- Status
  status VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'generated', 'published', 'failed', 'archived')),
  publish_status VARCHAR(20) DEFAULT 'draft'
    CHECK (publish_status IN ('draft', 'active', 'archived')),

  -- Phase Tracking (wie in ReBoss)
  phase VARCHAR(20) DEFAULT 'start_phase'
    CHECK (phase IN ('start_phase', 'post_phase', 'winner', 'loser', 'archived')),
  phase_start_date TIMESTAMPTZ,
  phase_end_date TIMESTAMPTZ,

  -- Performance
  total_views INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2),

  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(shop_id, shopify_product_id)
);

-- Indexes
CREATE INDEX idx_pod_autom_products_shop_id ON pod_autom_products(shop_id);
CREATE INDEX idx_pod_autom_products_niche_id ON pod_autom_products(niche_id);
CREATE INDEX idx_pod_autom_products_status ON pod_autom_products(shop_id, status);
CREATE INDEX idx_pod_autom_products_phase ON pod_autom_products(shop_id, phase);
CREATE INDEX idx_pod_autom_products_shopify ON pod_autom_products(shopify_product_id);
CREATE INDEX idx_pod_autom_products_created ON pod_autom_products(shop_id, created_at DESC);

-- =====================================================
-- 8. AD PLATFORMS TABLE (OAuth Credentials)
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_ad_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Platform Details
  platform VARCHAR(30) NOT NULL CHECK (platform IN ('pinterest', 'meta', 'google', 'tiktok')),
  platform_user_id VARCHAR(255), -- Platform-spezifische User ID
  platform_username VARCHAR(255),

  -- OAuth Tokens (verschluesselt speichern!)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Scopes & Permissions
  scopes TEXT[],

  -- Ad Account Info
  ad_account_id VARCHAR(255),
  ad_account_name VARCHAR(255),
  ad_account_currency VARCHAR(3),

  -- Status
  connection_status VARCHAR(20) DEFAULT 'disconnected'
    CHECK (connection_status IN ('connected', 'disconnected', 'error', 'expired')),
  last_sync_at TIMESTAMPTZ,
  connection_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, platform)
);

-- Indexes
CREATE INDEX idx_pod_autom_ad_platforms_user_id ON pod_autom_ad_platforms(user_id);
CREATE INDEX idx_pod_autom_ad_platforms_platform ON pod_autom_ad_platforms(user_id, platform);
CREATE INDEX idx_pod_autom_ad_platforms_status ON pod_autom_ad_platforms(connection_status);

-- =====================================================
-- 9. ACTIVITY LOG TABLE (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES pod_autom_shops(id) ON DELETE SET NULL,

  -- Activity Details
  action VARCHAR(100) NOT NULL, -- z.B. 'product.created', 'settings.updated'
  entity_type VARCHAR(50), -- z.B. 'product', 'niche', 'settings'
  entity_id UUID,

  -- Context
  details JSONB DEFAULT '{}', -- Zusaetzliche Details
  ip_address INET,
  user_agent TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'warning', 'error')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pod_autom_activity_user_id ON pod_autom_activity_log(user_id);
CREATE INDEX idx_pod_autom_activity_shop_id ON pod_autom_activity_log(shop_id);
CREATE INDEX idx_pod_autom_activity_action ON pod_autom_activity_log(action);
CREATE INDEX idx_pod_autom_activity_created ON pod_autom_activity_log(created_at DESC);

-- =====================================================
-- 10. CATALOG TABLE (Fulfillment-Produkte)
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Product Details
  product_type VARCHAR(100) NOT NULL,
  product_code VARCHAR(50) UNIQUE,
  display_name VARCHAR(255),
  description TEXT,

  -- Images
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  mockup_template_url TEXT,

  -- Variants
  sizes TEXT[] DEFAULT '{}', -- z.B. ['S', 'M', 'L', 'XL', 'XXL']
  colors JSONB DEFAULT '[]', -- z.B. [{"name": "Schwarz", "hex": "#000000", "available": true}]

  -- Specifications
  materials TEXT, -- z.B. "100% Baumwolle, 180g/m2"
  print_areas JSONB DEFAULT '{}', -- z.B. {"front": {"width": 30, "height": 40}, "back": {...}}
  weight_grams INTEGER,
  dimensions JSONB, -- z.B. {"S": {"chest": 48, "length": 70}}

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  shipping_prices JSONB DEFAULT '{}', -- z.B. {"DE": 4.90, "AT": 5.90, "CH": 8.90}
  bulk_pricing JSONB DEFAULT '{}', -- z.B. {"10": 0.95, "50": 0.90} (Multiplier)

  -- Production
  production_time_days INTEGER DEFAULT 3,
  supplier VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  stock_status VARCHAR(20) DEFAULT 'in_stock'
    CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock')),

  -- Sorting & Categorization
  category VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pod_autom_catalog_active ON pod_autom_catalog(is_active);
CREATE INDEX idx_pod_autom_catalog_sort ON pod_autom_catalog(sort_order);
CREATE INDEX idx_pod_autom_catalog_category ON pod_autom_catalog(category);
CREATE INDEX idx_pod_autom_catalog_featured ON pod_autom_catalog(is_featured) WHERE is_featured = true;

-- =====================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE pod_autom_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_ad_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_catalog ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- SUBSCRIPTIONS POLICIES
-- ---------------------------------------------------------
CREATE POLICY "Users can view own subscriptions"
  ON pod_autom_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON pod_autom_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON pod_autom_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service Role kann alles (fuer Stripe Webhooks)
CREATE POLICY "Service role full access to subscriptions"
  ON pod_autom_subscriptions
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------
-- SHOPS POLICIES
-- ---------------------------------------------------------
CREATE POLICY "Users can view own shops"
  ON pod_autom_shops FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shops"
  ON pod_autom_shops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shops"
  ON pod_autom_shops FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shops"
  ON pod_autom_shops FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to shops"
  ON pod_autom_shops
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------
-- SETTINGS POLICIES (via shop ownership)
-- ---------------------------------------------------------
CREATE POLICY "Users can view own settings"
  ON pod_autom_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_shops
      WHERE pod_autom_shops.id = pod_autom_settings.shop_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own settings"
  ON pod_autom_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pod_autom_shops
      WHERE pod_autom_shops.id = shop_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own settings"
  ON pod_autom_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_shops
      WHERE pod_autom_shops.id = pod_autom_settings.shop_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to settings"
  ON pod_autom_settings
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------
-- NICHES POLICIES (via settings -> shop ownership)
-- ---------------------------------------------------------
CREATE POLICY "Users can view own niches"
  ON pod_autom_niches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_settings
      JOIN pod_autom_shops ON pod_autom_shops.id = pod_autom_settings.shop_id
      WHERE pod_autom_settings.id = pod_autom_niches.settings_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own niches"
  ON pod_autom_niches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pod_autom_settings
      JOIN pod_autom_shops ON pod_autom_shops.id = pod_autom_settings.shop_id
      WHERE pod_autom_settings.id = settings_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own niches"
  ON pod_autom_niches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_settings
      JOIN pod_autom_shops ON pod_autom_shops.id = pod_autom_settings.shop_id
      WHERE pod_autom_settings.id = pod_autom_niches.settings_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own niches"
  ON pod_autom_niches FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_settings
      JOIN pod_autom_shops ON pod_autom_shops.id = pod_autom_settings.shop_id
      WHERE pod_autom_settings.id = pod_autom_niches.settings_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to niches"
  ON pod_autom_niches
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------
-- PROMPTS POLICIES (gleiche Struktur wie Niches)
-- ---------------------------------------------------------
CREATE POLICY "Users can view own prompts"
  ON pod_autom_prompts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_settings
      JOIN pod_autom_shops ON pod_autom_shops.id = pod_autom_settings.shop_id
      WHERE pod_autom_settings.id = pod_autom_prompts.settings_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own prompts"
  ON pod_autom_prompts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pod_autom_settings
      JOIN pod_autom_shops ON pod_autom_shops.id = pod_autom_settings.shop_id
      WHERE pod_autom_settings.id = settings_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own prompts"
  ON pod_autom_prompts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_settings
      JOIN pod_autom_shops ON pod_autom_shops.id = pod_autom_settings.shop_id
      WHERE pod_autom_settings.id = pod_autom_prompts.settings_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own prompts"
  ON pod_autom_prompts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_settings
      JOIN pod_autom_shops ON pod_autom_shops.id = pod_autom_settings.shop_id
      WHERE pod_autom_settings.id = pod_autom_prompts.settings_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to prompts"
  ON pod_autom_prompts
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------
-- PRODUCTS POLICIES (via shop ownership)
-- ---------------------------------------------------------
CREATE POLICY "Users can view own products"
  ON pod_autom_products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_shops
      WHERE pod_autom_shops.id = pod_autom_products.shop_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own products"
  ON pod_autom_products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pod_autom_shops
      WHERE pod_autom_shops.id = shop_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own products"
  ON pod_autom_products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_shops
      WHERE pod_autom_shops.id = pod_autom_products.shop_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to products"
  ON pod_autom_products
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------
-- AD PLATFORMS POLICIES
-- ---------------------------------------------------------
CREATE POLICY "Users can view own ad platforms"
  ON pod_autom_ad_platforms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad platforms"
  ON pod_autom_ad_platforms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ad platforms"
  ON pod_autom_ad_platforms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ad platforms"
  ON pod_autom_ad_platforms FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to ad platforms"
  ON pod_autom_ad_platforms
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------
-- ACTIVITY LOG POLICIES
-- ---------------------------------------------------------
CREATE POLICY "Users can view own activity"
  ON pod_autom_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert activity"
  ON pod_autom_activity_log FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() = user_id);

-- ---------------------------------------------------------
-- CATALOG POLICIES (Public readable)
-- ---------------------------------------------------------
CREATE POLICY "Catalog is publicly readable"
  ON pod_autom_catalog FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role full access to catalog"
  ON pod_autom_catalog
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 12. TRIGGER FUNCTIONS
-- =====================================================

-- updated_at Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Triggers for updated_at
CREATE TRIGGER update_pod_autom_subscriptions_updated_at
  BEFORE UPDATE ON pod_autom_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pod_autom_shops_updated_at
  BEFORE UPDATE ON pod_autom_shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pod_autom_settings_updated_at
  BEFORE UPDATE ON pod_autom_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pod_autom_niches_updated_at
  BEFORE UPDATE ON pod_autom_niches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pod_autom_prompts_updated_at
  BEFORE UPDATE ON pod_autom_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pod_autom_products_updated_at
  BEFORE UPDATE ON pod_autom_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pod_autom_ad_platforms_updated_at
  BEFORE UPDATE ON pod_autom_ad_platforms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pod_autom_catalog_updated_at
  BEFORE UPDATE ON pod_autom_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create Settings when Shop is created
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pod_autom_settings (shop_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_settings
  AFTER INSERT ON pod_autom_shops
  FOR EACH ROW EXECUTE FUNCTION create_default_settings();

-- Generate niche_slug from niche_name
CREATE OR REPLACE FUNCTION generate_niche_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.niche_slug = LOWER(REGEXP_REPLACE(NEW.niche_name, '[^a-zA-Z0-9]+', '-', 'g'));
  NEW.niche_slug = TRIM(BOTH '-' FROM NEW.niche_slug);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_niche_slug
  BEFORE INSERT OR UPDATE OF niche_name ON pod_autom_niches
  FOR EACH ROW EXECUTE FUNCTION generate_niche_slug();

-- Reset daily creation count
CREATE OR REPLACE FUNCTION reset_daily_creation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_creation_reset::date < CURRENT_DATE THEN
    NEW.daily_creation_count = 0;
    NEW.last_creation_reset = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_reset_daily_count
  BEFORE UPDATE ON pod_autom_settings
  FOR EACH ROW EXECUTE FUNCTION reset_daily_creation_count();

-- =====================================================
-- 13. SAMPLE CATALOG DATA
-- =====================================================

INSERT INTO pod_autom_catalog (
  product_type, product_code, display_name, description, sizes, colors,
  materials, base_price, shipping_prices, production_time_days,
  category, sort_order, is_featured
) VALUES
-- T-Shirts
(
  'T-Shirt Premium', 'TSH-PREM-001', 'Premium T-Shirt',
  'Hochwertiges Premium T-Shirt aus 100% Bio-Baumwolle. Perfekt fuer hochaufloesende Drucke.',
  ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  '[{"name": "Schwarz", "hex": "#000000", "available": true},
    {"name": "Weiss", "hex": "#FFFFFF", "available": true},
    {"name": "Navy", "hex": "#1e3a5f", "available": true},
    {"name": "Grau Meliert", "hex": "#6b7280", "available": true},
    {"name": "Burgund", "hex": "#800020", "available": true}]'::jsonb,
  '100% Bio-Baumwolle, 180g/m2, Rundhals',
  12.50, '{"DE": 4.90, "AT": 5.90, "CH": 8.90, "EU": 7.90, "US": 12.90}'::jsonb,
  3, 'Textilien', 1, true
),
-- Hoodies
(
  'Hoodie Classic', 'HOD-CLAS-001', 'Classic Hoodie',
  'Kuscheliger Hoodie mit Kaengurutasche. Ideal fuer kaeltere Tage.',
  ARRAY['S', 'M', 'L', 'XL', 'XXL'],
  '[{"name": "Schwarz", "hex": "#000000", "available": true},
    {"name": "Navy", "hex": "#1e3a5f", "available": true},
    {"name": "Grau Meliert", "hex": "#6b7280", "available": true},
    {"name": "Forest Green", "hex": "#228B22", "available": true}]'::jsonb,
  '80% Baumwolle, 20% Polyester, 300g/m2',
  24.90, '{"DE": 5.90, "AT": 6.90, "CH": 9.90, "EU": 8.90, "US": 14.90}'::jsonb,
  4, 'Textilien', 2, true
),
-- Pullover
(
  'Sweatshirt Basic', 'SWE-BASI-001', 'Basic Sweatshirt',
  'Klassischer Sweatshirt ohne Kapuze. Minimalistisch und vielseitig.',
  ARRAY['S', 'M', 'L', 'XL'],
  '[{"name": "Schwarz", "hex": "#000000", "available": true},
    {"name": "Weiss", "hex": "#FFFFFF", "available": true},
    {"name": "Grau", "hex": "#6b7280", "available": true}]'::jsonb,
  '80% Baumwolle, 20% Polyester, 280g/m2',
  19.90, '{"DE": 5.90, "AT": 6.90, "CH": 9.90, "EU": 8.90, "US": 14.90}'::jsonb,
  4, 'Textilien', 3, false
),
-- Caps
(
  'Snapback Cap', 'CAP-SNAP-001', 'Snapback Cap',
  'Trendige Snapback Cap mit verstellbarem Verschluss.',
  ARRAY['One Size'],
  '[{"name": "Schwarz", "hex": "#000000", "available": true},
    {"name": "Weiss", "hex": "#FFFFFF", "available": true},
    {"name": "Navy", "hex": "#1e3a5f", "available": true}]'::jsonb,
  'Baumwolle/Polyester Mix',
  8.90, '{"DE": 3.90, "AT": 4.90, "CH": 6.90, "EU": 5.90, "US": 8.90}'::jsonb,
  2, 'Accessoires', 4, false
),
-- Taschen
(
  'Stofftasche Bio', 'BAG-STOF-001', 'Bio Stofftasche',
  'Nachhaltige Stofftasche aus Bio-Baumwolle. Perfekt fuer den Alltag.',
  ARRAY['One Size'],
  '[{"name": "Natur", "hex": "#f5f5dc", "available": true},
    {"name": "Schwarz", "hex": "#000000", "available": true}]'::jsonb,
  '100% Bio-Baumwolle, 140g/m2',
  4.90, '{"DE": 2.90, "AT": 3.90, "CH": 5.90, "EU": 4.90, "US": 6.90}'::jsonb,
  2, 'Accessoires', 5, false
),
-- Poster
(
  'Poster Premium A3', 'POS-A3-001', 'Premium Poster A3',
  'Hochqualitatives Poster auf 200g/m2 Fotopapier. Brillante Farben.',
  ARRAY['A3 (29.7 x 42 cm)'],
  '[]'::jsonb,
  '200g/m2 Premium Fotopapier, matt',
  6.90, '{"DE": 4.90, "AT": 5.90, "CH": 8.90, "EU": 6.90, "US": 10.90}'::jsonb,
  2, 'Deko', 6, false
),
-- Poster A2
(
  'Poster Premium A2', 'POS-A2-001', 'Premium Poster A2',
  'Grossformatiges Poster auf Premium Fotopapier.',
  ARRAY['A2 (42 x 59.4 cm)'],
  '[]'::jsonb,
  '200g/m2 Premium Fotopapier, matt',
  9.90, '{"DE": 5.90, "AT": 6.90, "CH": 9.90, "EU": 7.90, "US": 12.90}'::jsonb,
  2, 'Deko', 7, false
),
-- Tassen
(
  'Keramik Tasse', 'MUG-CERA-001', 'Keramik Tasse 325ml',
  'Klassische Keramiktasse fuer den morgendlichen Kaffee.',
  ARRAY['325ml'],
  '[{"name": "Weiss", "hex": "#FFFFFF", "available": true}]'::jsonb,
  'Keramik, spuelmaschinenfest',
  7.90, '{"DE": 4.90, "AT": 5.90, "CH": 8.90, "EU": 6.90, "US": 10.90}'::jsonb,
  3, 'Accessoires', 8, false
);

-- Ende der Transaktion
COMMIT;
