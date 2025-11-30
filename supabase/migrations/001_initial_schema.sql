-- =====================================================
-- ReBoss NextGen - Supabase Database Schema
-- Version: 1.0.0
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER PROFILES
-- =====================================================

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. SHOPS (Core Entity)
-- =====================================================

CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  internal_name TEXT NOT NULL,
  shop_domain TEXT NOT NULL,

  -- Shopify Access Token (encrypted separately or via Vault)
  access_token TEXT, -- Will be encrypted in production

  -- Status
  is_active BOOLEAN DEFAULT true,
  connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'syncing', 'error')),
  last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, shop_domain)
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own shops" ON public.shops
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_shops_user_id ON public.shops(user_id);

-- =====================================================
-- 3. SHOP RULES (Automation Configuration)
-- =====================================================

CREATE TABLE public.shop_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  -- Initial Phase (Start-Phase)
  min_sales_day7_delete INTEGER DEFAULT 0,
  min_sales_day7_replace INTEGER DEFAULT 1,

  -- Post Phase (Nach-Phase)
  avg3_ok INTEGER DEFAULT 2,
  avg7_ok INTEGER DEFAULT 3,
  avg10_ok INTEGER DEFAULT 5,
  avg14_ok INTEGER DEFAULT 7,
  min_ok_buckets INTEGER DEFAULT 2,

  -- Phase Timeline
  start_phase_days INTEGER DEFAULT 7,
  nach_phase_days INTEGER DEFAULT 14,

  -- General Settings
  qk_tag TEXT DEFAULT 'QK',
  replace_tag_prefix TEXT DEFAULT 'REPLACE_',
  test_mode BOOLEAN DEFAULT false,
  url_prefix TEXT DEFAULT '',

  -- Google Sheets Integration
  sheet_id TEXT,

  -- OpenAI
  openai_api_key TEXT, -- Encrypted

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id)
);

ALTER TABLE public.shop_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD rules for own shops" ON public.shop_rules
  FOR ALL USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  );

-- Trigger to auto-create rules when shop is created
CREATE OR REPLACE FUNCTION public.handle_new_shop()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.shop_rules (shop_id) VALUES (NEW.id);
  INSERT INTO public.product_creation_settings (shop_id) VALUES (NEW.id);
  INSERT INTO public.rate_limits (shop_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_shop_created
  AFTER INSERT ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_shop();

-- =====================================================
-- 4. DISCORD SETTINGS
-- =====================================================

CREATE TABLE public.discord_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  application_id TEXT,
  public_key TEXT,
  bot_token TEXT, -- Encrypted

  -- Channel IDs
  server_channel TEXT,
  private_chat TEXT,
  group_chat TEXT,
  announcement_channel TEXT,
  log_channel TEXT,

  is_connected BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id)
);

ALTER TABLE public.discord_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD discord for own shops" ON public.discord_settings
  FOR ALL USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  );

-- =====================================================
-- 5. SHOPIFY COLLECTIONS
-- =====================================================

CREATE TABLE public.shopify_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  shopify_id TEXT NOT NULL,
  title TEXT NOT NULL,
  collection_type TEXT NOT NULL CHECK (collection_type IN ('custom', 'smart')),
  product_count INTEGER DEFAULT 0,

  is_selected BOOLEAN DEFAULT false,

  synced_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id, shopify_id)
);

ALTER TABLE public.shopify_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD collections for own shops" ON public.shopify_collections
  FOR ALL USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  );

CREATE INDEX idx_collections_shop ON public.shopify_collections(shop_id);

-- =====================================================
-- 6. PRODUCT CREATION SETTINGS
-- =====================================================

CREATE TABLE public.product_creation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  -- Title & Description
  generate_optimized_title BOOLEAN DEFAULT false,
  generate_improved_description BOOLEAN DEFAULT false,
  generate_and_set_tags BOOLEAN DEFAULT false,
  sales_text_season TEXT DEFAULT 'Spring' CHECK (sales_text_season IN ('Spring', 'Summer', 'Autumn', 'Winter')),

  -- German Localization
  change_size_to_groesse BOOLEAN DEFAULT false,
  set_german_sizes BOOLEAN DEFAULT false,

  -- Pricing
  set_compare_price BOOLEAN DEFAULT false,
  compare_price_percentage DECIMAL(5,2) DEFAULT 20.00,
  set_price_decimals BOOLEAN DEFAULT false,
  price_decimals INTEGER DEFAULT 99,
  set_compare_price_decimals BOOLEAN DEFAULT false,
  compare_price_decimals INTEGER DEFAULT 90,

  adjust_normal_price BOOLEAN DEFAULT false,
  price_adjustment_type TEXT DEFAULT 'Percentage' CHECK (price_adjustment_type IN ('Percentage', 'FixedAmount')),
  price_adjustment_value DECIMAL(10,2) DEFAULT 0,

  -- Inventory
  set_global_quantity BOOLEAN DEFAULT false,
  global_quantity INTEGER DEFAULT 1000,
  enable_inventory_tracking BOOLEAN DEFAULT true,
  publish_all_channels BOOLEAN DEFAULT true,

  -- Tags & Status
  set_global_tags BOOLEAN DEFAULT false,
  global_tags TEXT DEFAULT '',
  change_product_status BOOLEAN DEFAULT false,
  product_status TEXT DEFAULT 'active' CHECK (product_status IN ('active', 'draft', 'archived')),
  set_category_tag_fashion BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id)
);

ALTER TABLE public.product_creation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD product settings for own shops" ON public.product_creation_settings
  FOR ALL USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  );

-- =====================================================
-- 7. POD SETTINGS
-- =====================================================

CREATE TABLE public.pod_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  enabled BOOLEAN DEFAULT false,
  gpt_image_quality TEXT DEFAULT 'MEDIUM' CHECK (gpt_image_quality IN ('LOW', 'MEDIUM', 'HIGH')),
  creation_limit INTEGER DEFAULT 10,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id)
);

CREATE TABLE public.pod_selected_niches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_settings_id UUID NOT NULL REFERENCES public.pod_settings(id) ON DELETE CASCADE,

  main_category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.pod_chatgpt_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_settings_id UUID NOT NULL REFERENCES public.pod_settings(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_expanded BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pod_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_selected_niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_chatgpt_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD POD settings for own shops" ON public.pod_settings
  FOR ALL USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can CRUD POD niches" ON public.pod_selected_niches
  FOR ALL USING (
    pod_settings_id IN (
      SELECT ps.id FROM public.pod_settings ps
      JOIN public.shops s ON ps.shop_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can CRUD POD prompts" ON public.pod_chatgpt_prompts
  FOR ALL USING (
    pod_settings_id IN (
      SELECT ps.id FROM public.pod_settings ps
      JOIN public.shops s ON ps.shop_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. RATE LIMITS
-- =====================================================

CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  fast_fashion_limit INTEGER DEFAULT 50,
  pod_creation_limit INTEGER DEFAULT 20,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD limits for own shops" ON public.rate_limits
  FOR ALL USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  );

-- =====================================================
-- 9. PINTEREST INTEGRATION
-- =====================================================

CREATE TABLE public.pinterest_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  expires_at TIMESTAMPTZ,
  scopes TEXT[],

  pinterest_user_id TEXT,
  pinterest_username TEXT,

  is_connected BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id)
);

CREATE TABLE public.pinterest_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  pinterest_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  country TEXT DEFAULT 'DE',
  currency TEXT DEFAULT 'EUR',

  is_selected BOOLEAN DEFAULT false,

  synced_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id, pinterest_account_id)
);

CREATE TABLE public.pinterest_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  ad_account_id UUID REFERENCES public.pinterest_ad_accounts(id) ON DELETE CASCADE,

  pinterest_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'ARCHIVED')),
  daily_budget DECIMAL(10,2),

  targeting JSONB DEFAULT '{
    "age_ranges": ["25-34", "35-44"],
    "genders": ["female", "male"],
    "countries": ["DE"],
    "interests": []
  }'::jsonb,

  performance_plus BOOLEAN DEFAULT false,

  synced_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id, pinterest_campaign_id)
);

CREATE TABLE public.campaign_batch_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.pinterest_campaigns(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.shopify_collections(id) ON DELETE CASCADE,

  batch_indices INTEGER[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, collection_id)
);

CREATE TABLE public.pinterest_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  default_budget DECIMAL(10,2) DEFAULT 20.00,
  default_targeting JSONB,
  auto_sync_enabled BOOLEAN DEFAULT false,
  url_prefix TEXT DEFAULT '',
  global_batch_size INTEGER DEFAULT 50,

  UNIQUE(shop_id)
);

ALTER TABLE public.pinterest_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinterest_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinterest_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_batch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinterest_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pinterest_auth_policy" ON public.pinterest_auth
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

CREATE POLICY "pinterest_ad_accounts_policy" ON public.pinterest_ad_accounts
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

CREATE POLICY "pinterest_campaigns_policy" ON public.pinterest_campaigns
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

CREATE POLICY "campaign_batch_assignments_policy" ON public.campaign_batch_assignments
  FOR ALL USING (
    campaign_id IN (
      SELECT pc.id FROM public.pinterest_campaigns pc
      JOIN public.shops s ON pc.shop_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "pinterest_settings_policy" ON public.pinterest_settings
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

-- =====================================================
-- 10. META ADS INTEGRATION
-- =====================================================

CREATE TABLE public.meta_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  access_token TEXT, -- Encrypted
  expires_at TIMESTAMPTZ,

  meta_user_id TEXT,
  meta_username TEXT,

  is_connected BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id)
);

CREATE TABLE public.meta_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  meta_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'EUR',

  is_selected BOOLEAN DEFAULT false,

  UNIQUE(shop_id, meta_account_id)
);

CREATE TABLE public.meta_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  ad_account_id UUID REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,

  meta_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  daily_budget DECIMAL(10,2),

  creative_strategy TEXT DEFAULT 'single_image' CHECK (creative_strategy IN ('single_image', 'carousel')),

  UNIQUE(shop_id, meta_campaign_id)
);

CREATE TABLE public.meta_campaign_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.shopify_collections(id) ON DELETE CASCADE,

  batch_indices INTEGER[] DEFAULT '{}',

  UNIQUE(campaign_id, collection_id)
);

CREATE TABLE public.meta_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  default_budget DECIMAL(10,2) DEFAULT 20.00,
  global_batch_size INTEGER DEFAULT 50,

  UNIQUE(shop_id)
);

ALTER TABLE public.meta_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_campaign_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_auth_policy" ON public.meta_auth
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

CREATE POLICY "meta_ad_accounts_policy" ON public.meta_ad_accounts
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

CREATE POLICY "meta_campaigns_policy" ON public.meta_campaigns
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

CREATE POLICY "meta_campaign_collections_policy" ON public.meta_campaign_collections
  FOR ALL USING (
    campaign_id IN (
      SELECT mc.id FROM public.meta_campaigns mc
      JOIN public.shops s ON mc.shop_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "meta_settings_policy" ON public.meta_settings
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

-- =====================================================
-- 11. GOOGLE ADS INTEGRATION
-- =====================================================

CREATE TABLE public.google_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  expires_at TIMESTAMPTZ,

  google_customer_id TEXT,

  is_connected BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id)
);

CREATE TABLE public.google_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  google_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT DEFAULT 'PMAX' CHECK (campaign_type IN ('PMAX', 'SEARCH')),
  status TEXT DEFAULT 'ENABLED',

  UNIQUE(shop_id, google_campaign_id)
);

CREATE TABLE public.google_campaign_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.google_campaigns(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.shopify_collections(id) ON DELETE CASCADE,

  UNIQUE(campaign_id, collection_id)
);

ALTER TABLE public.google_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_campaign_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_auth_policy" ON public.google_auth
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

CREATE POLICY "google_campaigns_policy" ON public.google_campaigns
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

CREATE POLICY "google_campaign_collections_policy" ON public.google_campaign_collections
  FOR ALL USING (
    campaign_id IN (
      SELECT gc.id FROM public.google_campaigns gc
      JOIN public.shops s ON gc.shop_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

-- =====================================================
-- 12. ANALYTICS & TRACKING
-- =====================================================

CREATE TABLE public.product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  shopify_product_id TEXT NOT NULL,
  product_title TEXT,

  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'start_phase', 'post_phase', 'winner', 'loser', 'deleted')),
  source TEXT DEFAULT 'fast_fashion' CHECK (source IN ('fast_fashion', 'pod')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  entered_start_phase_at TIMESTAMPTZ,
  entered_post_phase_at TIMESTAMPTZ,
  final_status_at TIMESTAMPTZ,

  total_sales INTEGER DEFAULT 0,
  day7_sales INTEGER DEFAULT 0,

  avg3_passed BOOLEAN,
  avg7_passed BOOLEAN,
  avg10_passed BOOLEAN,
  avg14_passed BOOLEAN,

  UNIQUE(shop_id, shopify_product_id)
);

CREATE TABLE public.shop_analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  products_created INTEGER DEFAULT 0,
  products_in_start_phase INTEGER DEFAULT 0,
  products_in_post_phase INTEGER DEFAULT 0,
  products_won INTEGER DEFAULT 0,
  products_lost INTEGER DEFAULT 0,
  products_deleted INTEGER DEFAULT 0,

  fast_fashion_created INTEGER DEFAULT 0,
  pod_created INTEGER DEFAULT 0,

  estimated_ad_spend_saved DECIMAL(10,2) DEFAULT 0,
  estimated_time_saved_hours DECIMAL(5,2) DEFAULT 0,

  UNIQUE(shop_id, date)
);

ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_analytics_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_analytics_policy" ON public.product_analytics
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

CREATE POLICY "shop_analytics_summary_policy" ON public.shop_analytics_summary
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

CREATE INDEX idx_product_analytics_shop_status ON public.product_analytics(shop_id, status);
CREATE INDEX idx_shop_analytics_shop_date ON public.shop_analytics_summary(shop_id, date DESC);

-- =====================================================
-- 13. HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_rules_updated_at BEFORE UPDATE ON public.shop_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discord_settings_updated_at BEFORE UPDATE ON public.discord_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_creation_settings_updated_at BEFORE UPDATE ON public.product_creation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pod_settings_updated_at BEFORE UPDATE ON public.pod_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON public.rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pinterest_auth_updated_at BEFORE UPDATE ON public.pinterest_auth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_auth_updated_at BEFORE UPDATE ON public.meta_auth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_auth_updated_at BEFORE UPDATE ON public.google_auth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
