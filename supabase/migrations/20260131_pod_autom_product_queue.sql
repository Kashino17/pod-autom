-- =====================================================
-- POD AutoM Product Queue Table
-- For tracking products through the creation pipeline
-- =====================================================

BEGIN;

-- =====================================================
-- 1. PRODUCT QUEUE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_product_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES pod_autom_shops(id) ON DELETE CASCADE,
  settings_id UUID REFERENCES pod_autom_settings(id) ON DELETE SET NULL,
  niche_id UUID REFERENCES pod_autom_niches(id) ON DELETE SET NULL,

  -- Product Info (generated or user-provided)
  title VARCHAR(500),
  description TEXT,
  niche VARCHAR(255), -- Cached niche name

  -- Pricing
  price DECIMAL(10,2),
  compare_price DECIMAL(10,2),

  -- Images (generated or uploaded)
  image_url TEXT, -- Primary image
  images JSONB DEFAULT '[]', -- All images

  -- Variants
  variants JSONB DEFAULT '[]', -- [{size: 'M', color: 'Black', sku: '...'}]

  -- Pipeline Status
  status VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'optimizing', 'publishing', 'published', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step VARCHAR(100), -- z.B. "Generating image...", "Creating Shopify product..."

  -- Shopify Info (after publishing)
  shopify_product_id VARCHAR(50),
  shopify_handle VARCHAR(255),
  shopify_url TEXT,

  -- Error Handling
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- Generation Metadata
  prompt_used TEXT,
  gpt_model_used VARCHAR(50),
  generation_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_pod_autom_queue_shop_id ON pod_autom_product_queue(shop_id);
CREATE INDEX idx_pod_autom_queue_settings_id ON pod_autom_product_queue(settings_id);
CREATE INDEX idx_pod_autom_queue_status ON pod_autom_product_queue(shop_id, status);
CREATE INDEX idx_pod_autom_queue_created ON pod_autom_product_queue(shop_id, created_at DESC);
CREATE INDEX idx_pod_autom_queue_pending ON pod_autom_product_queue(settings_id, status) WHERE status = 'pending';

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

ALTER TABLE pod_autom_product_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queue items
CREATE POLICY "Users can view own queue"
  ON pod_autom_product_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_shops
      WHERE pod_autom_shops.id = pod_autom_product_queue.shop_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

-- Users can insert their own queue items
CREATE POLICY "Users can insert own queue items"
  ON pod_autom_product_queue FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pod_autom_shops
      WHERE pod_autom_shops.id = shop_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

-- Users can update their own queue items
CREATE POLICY "Users can update own queue items"
  ON pod_autom_product_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_shops
      WHERE pod_autom_shops.id = pod_autom_product_queue.shop_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

-- Users can delete their own queue items
CREATE POLICY "Users can delete own queue items"
  ON pod_autom_product_queue FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pod_autom_shops
      WHERE pod_autom_shops.id = pod_autom_product_queue.shop_id
      AND pod_autom_shops.user_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access to queue"
  ON pod_autom_product_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 3. TRIGGER FOR updated_at
-- =====================================================

CREATE TRIGGER update_pod_autom_queue_updated_at
  BEFORE UPDATE ON pod_autom_product_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. RPC FUNCTION FOR QUEUE STATS
-- =====================================================

CREATE OR REPLACE FUNCTION get_pod_autom_queue_stats(p_shop_id UUID)
RETURNS TABLE (
  pending BIGINT,
  generating BIGINT,
  optimizing BIGINT,
  publishing BIGINT,
  published BIGINT,
  failed BIGINT,
  total BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE status = 'generating') AS generating,
    COUNT(*) FILTER (WHERE status = 'optimizing') AS optimizing,
    COUNT(*) FILTER (WHERE status = 'publishing') AS publishing,
    COUNT(*) FILTER (WHERE status = 'published') AS published,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed,
    COUNT(*) AS total
  FROM pod_autom_product_queue
  WHERE shop_id = p_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_pod_autom_queue_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pod_autom_queue_stats(UUID) TO service_role;

COMMIT;
