-- Update job_runs check constraint to include pinterest_campaign_optimization
-- Run this in Supabase SQL Editor

-- First, drop the existing constraint
ALTER TABLE job_runs DROP CONSTRAINT IF EXISTS job_runs_job_type_check;

-- Add new constraint with ALL existing job types plus pinterest_campaign_optimization
ALTER TABLE job_runs ADD CONSTRAINT job_runs_job_type_check CHECK (job_type IN ('product_optimize_job', 'product_creation_job', 'pinterest_sync_job', 'replace_job', 'sales_tracker', 'pinterest_campaign_optimization'));
