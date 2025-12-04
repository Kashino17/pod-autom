-- Add 'winner_scaling' to job_runs job_type check constraint
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing constraint
ALTER TABLE public.job_runs DROP CONSTRAINT job_runs_job_type_check;

-- Step 2: Add updated constraint with 'winner_scaling'
ALTER TABLE public.job_runs ADD CONSTRAINT job_runs_job_type_check CHECK (
  job_type = ANY (ARRAY[
    'sales_tracker'::text,
    'replace_job'::text,
    'delete_job'::text,
    'pinterest_sync_job'::text,
    'winner_scaling'::text
  ])
);

-- Also add 'completed_with_errors' to status check if not already present
ALTER TABLE public.job_runs DROP CONSTRAINT job_runs_status_check;

ALTER TABLE public.job_runs ADD CONSTRAINT job_runs_status_check CHECK (
  status = ANY (ARRAY[
    'running'::text,
    'completed'::text,
    'failed'::text,
    'completed_with_errors'::text
  ])
);
