-- =====================================================
-- Add provider field to OAuth states
-- Migration: 2026-02-04
-- =====================================================

-- Add provider column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pod_autom_oauth_states' 
        AND column_name = 'provider'
    ) THEN
        ALTER TABLE pod_autom_oauth_states 
        ADD COLUMN provider VARCHAR(50) DEFAULT 'shopify';
    END IF;
END $$;

-- Create index for provider lookups
CREATE INDEX IF NOT EXISTS idx_pod_autom_oauth_states_provider 
ON pod_autom_oauth_states(provider);
