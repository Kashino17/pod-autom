-- Update job_runs check constraint to include pinterest_campaign_optimization
-- Run this in Supabase SQL Editor

-- First, drop the existing constraint
ALTER TABLE job_runs DROP CONSTRAINT IF EXISTS job_runs_job_type_check;

-- Add new constraint with pinterest_campaign_optimization included
ALTER TABLE job_runs ADD CONSTRAINT job_runs_job_type_check
CHECK (job_type IN (
  'product_sync',
  'pinterest_sync',
  'meta_sync',
  'google_sync',
  'start_phase',
  'post_phase',
  'campaign_optimization',
  'pinterest_campaign_optimization'
));
