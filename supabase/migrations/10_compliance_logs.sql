-- =====================================================
-- POD AutoM: Compliance Logs Table
-- For GDPR/CCPA compliance request tracking
-- =====================================================

-- Create compliance logs table
CREATE TABLE IF NOT EXISTS pod_autom_compliance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type TEXT NOT NULL,  -- 'data_request', 'customer_redact', 'shop_redact'
    shop_domain TEXT NOT NULL,
    customer_id TEXT,
    customer_email TEXT,
    payload JSONB,
    status TEXT DEFAULT 'received',  -- 'received', 'processing', 'completed'
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_compliance_logs_shop ON pod_autom_compliance_logs(shop_domain);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_type ON pod_autom_compliance_logs(request_type);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_created ON pod_autom_compliance_logs(created_at DESC);

-- RLS Policy - Only service role can access compliance logs
ALTER TABLE pod_autom_compliance_logs ENABLE ROW LEVEL SECURITY;

-- No public access - only backend with service role key
CREATE POLICY "Service role only" ON pod_autom_compliance_logs
    FOR ALL
    USING (false)
    WITH CHECK (false);
