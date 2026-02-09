-- POD AutoM Design Generation System
-- Migration: 06_designs_system.sql
-- Created: 2026-02-05

-- =====================================================
-- NISCHEN (Niches) - Extended with language
-- =====================================================

-- Add language column to existing niches table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pod_autom_niches' 
                   AND column_name = 'language') THEN
        ALTER TABLE pod_autom_niches ADD COLUMN language TEXT DEFAULT 'en';
    END IF;
END $$;

-- Add auto_generate flag for cron job
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pod_autom_niches' 
                   AND column_name = 'auto_generate') THEN
        ALTER TABLE pod_autom_niches ADD COLUMN auto_generate BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add daily_limit for generation
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pod_autom_niches' 
                   AND column_name = 'daily_limit') THEN
        ALTER TABLE pod_autom_niches ADD COLUMN daily_limit INTEGER DEFAULT 5;
    END IF;
END $$;

-- =====================================================
-- PROMPT TEMPLATES - For variable generation
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    niche_id UUID REFERENCES pod_autom_niches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    style_hints TEXT,
    variables JSONB DEFAULT '{}',  -- {"sport": ["gym", "yoga"], "mood": ["motivational"]}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for prompt templates
ALTER TABLE pod_autom_prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own prompt templates" ON pod_autom_prompt_templates
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- GENERATED DESIGNS - Core table
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    niche_id UUID REFERENCES pod_autom_niches(id) ON DELETE SET NULL,
    template_id UUID REFERENCES pod_autom_prompt_templates(id) ON DELETE SET NULL,
    
    -- Generation details
    prompt_used TEXT NOT NULL,
    final_prompt TEXT,  -- After variable substitution
    
    -- Image data
    image_url TEXT,
    thumbnail_url TEXT,
    image_path TEXT,  -- Supabase storage path
    
    -- Content
    slogan_text TEXT,
    language TEXT DEFAULT 'en',
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed', 'archived')),
    error_message TEXT,
    
    -- Metadata
    generation_model TEXT DEFAULT 'gpt-image-1.5',
    generation_quality TEXT DEFAULT 'high',
    variables_used JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    generated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for designs - IMPORTANT: Users only see their own designs
ALTER TABLE pod_autom_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own designs" ON pod_autom_designs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own designs" ON pod_autom_designs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own designs" ON pod_autom_designs
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can insert (for cron job)
CREATE POLICY "Service can insert designs" ON pod_autom_designs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- GENERATION QUEUE - For cron job processing
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    niche_id UUID NOT NULL REFERENCES pod_autom_niches(id) ON DELETE CASCADE,
    template_id UUID REFERENCES pod_autom_prompt_templates(id) ON DELETE SET NULL,
    
    -- Queue status
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Result
    design_id UUID REFERENCES pod_autom_designs(id) ON DELETE SET NULL,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- RLS for queue
ALTER TABLE pod_autom_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue" ON pod_autom_generation_queue
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- GENERATION STATS - Track daily usage
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_generation_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Counts
    designs_generated INTEGER DEFAULT 0,
    designs_failed INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    
    -- Unique constraint per user per day
    UNIQUE(user_id, date)
);

-- RLS for stats
ALTER TABLE pod_autom_generation_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats" ON pod_autom_generation_stats
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- INDEXES for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_designs_user_id ON pod_autom_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_designs_status ON pod_autom_designs(status);
CREATE INDEX IF NOT EXISTS idx_designs_niche_id ON pod_autom_designs(niche_id);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON pod_autom_designs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_queue_status ON pod_autom_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON pod_autom_generation_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON pod_autom_prompt_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_niche_id ON pod_autom_prompt_templates(niche_id);

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_designs_updated_at ON pod_autom_designs;
CREATE TRIGGER update_designs_updated_at
    BEFORE UPDATE ON pod_autom_designs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON pod_autom_prompt_templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON pod_autom_prompt_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET for designs
-- =====================================================

-- Note: Run this in Supabase Dashboard > Storage
-- INSERT INTO storage.buckets (id, name, public) VALUES ('designs', 'designs', true);

COMMENT ON TABLE pod_autom_designs IS 'Generated design images for POD products';
COMMENT ON TABLE pod_autom_prompt_templates IS 'Reusable prompt templates with variables';
COMMENT ON TABLE pod_autom_generation_queue IS 'Queue for async design generation';
COMMENT ON TABLE pod_autom_generation_stats IS 'Daily generation statistics per user';
