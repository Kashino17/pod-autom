-- Sales Data Table for tracking product sales metrics
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.sales_data (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    collection_id text NOT NULL,
    product_id text NOT NULL,
    product_title text,
    total_sales numeric(12,2) DEFAULT 0,
    total_quantity integer DEFAULT 0,
    sales_first_7_days integer DEFAULT 0,
    sales_last_3_days integer DEFAULT 0,
    sales_last_7_days integer DEFAULT 0,
    sales_last_10_days integer DEFAULT 0,
    sales_last_14_days integer DEFAULT 0,
    last_update timestamp with time zone DEFAULT now(),
    orders_processed jsonb DEFAULT '[]'::jsonb,
    date_added_to_collection timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    -- Unique constraint for upsert operations
    CONSTRAINT unique_shop_collection_product UNIQUE (shop_id, collection_id, product_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sales_data_shop_id ON public.sales_data(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_collection_id ON public.sales_data(collection_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_product_id ON public.sales_data(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_data_last_update ON public.sales_data(last_update);

-- Enable RLS
ALTER TABLE public.sales_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see sales data for shops they own
CREATE POLICY "Users can view own shop sales data"
    ON public.sales_data
    FOR SELECT
    USING (
        shop_id IN (
            SELECT id FROM public.shops WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Service role can do everything (for cron jobs)
CREATE POLICY "Service role full access"
    ON public.sales_data
    FOR ALL
    USING (auth.role() = 'service_role');

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_data_updated_at
    BEFORE UPDATE ON public.sales_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment for documentation
COMMENT ON TABLE public.sales_data IS 'Product sales metrics tracked by the sales_tracker job';
COMMENT ON COLUMN public.sales_data.sales_first_7_days IS 'Units sold in first 7 days after being added to collection';
COMMENT ON COLUMN public.sales_data.sales_last_3_days IS 'Units sold in the last 3 days (rolling)';
COMMENT ON COLUMN public.sales_data.sales_last_7_days IS 'Units sold in the last 7 days (rolling)';
COMMENT ON COLUMN public.sales_data.sales_last_10_days IS 'Units sold in the last 10 days (rolling)';
COMMENT ON COLUMN public.sales_data.sales_last_14_days IS 'Units sold in the last 14 days (rolling)';
