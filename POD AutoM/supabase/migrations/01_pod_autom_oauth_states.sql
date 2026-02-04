-- =====================================================
-- POD AutoM OAuth States Table
-- For storing temporary OAuth state during Shopify install
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Auto-expire after 10 minutes
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Index for quick lookups
CREATE INDEX idx_pod_autom_oauth_states_state ON pod_autom_oauth_states(state);

-- Auto-delete expired states (run via pg_cron or application)
-- DELETE FROM pod_autom_oauth_states WHERE expires_at < NOW();

-- RLS Policies
ALTER TABLE pod_autom_oauth_states ENABLE ROW LEVEL SECURITY;

-- Service role can manage all states
CREATE POLICY "Service role can manage oauth states"
  ON pod_autom_oauth_states
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
