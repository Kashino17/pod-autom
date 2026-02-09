-- =====================================================
-- POD AutoM Database Functions
-- RPC functions for atomic counter updates
-- =====================================================

-- Increment product sales
CREATE OR REPLACE FUNCTION increment_product_sales(
    p_product_id UUID,
    p_quantity INTEGER,
    p_revenue DECIMAL
)
RETURNS VOID AS $$
BEGIN
    UPDATE pod_autom_products
    SET 
        total_sales = total_sales + p_quantity,
        total_revenue = total_revenue + p_revenue,
        updated_at = NOW()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment niche sales
CREATE OR REPLACE FUNCTION increment_niche_sales(
    p_niche_id UUID,
    p_quantity INTEGER,
    p_revenue DECIMAL
)
RETURNS VOID AS $$
BEGIN
    UPDATE pod_autom_niches
    SET 
        total_sales = total_sales + p_quantity,
        total_revenue = total_revenue + p_revenue,
        updated_at = NOW()
    WHERE id = p_niche_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment niche product count
CREATE OR REPLACE FUNCTION increment_niche_products(
    p_niche_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE pod_autom_niches
    SET 
        total_products = total_products + 1,
        updated_at = NOW()
    WHERE id = p_niche_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add pinterest_pin_id column to products if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pod_autom_products' 
        AND column_name = 'pinterest_pin_id'
    ) THEN
        ALTER TABLE pod_autom_products ADD COLUMN pinterest_pin_id VARCHAR(255);
    END IF;
END $$;

-- Create index for pinterest_pin_id
CREATE INDEX IF NOT EXISTS idx_pod_autom_products_pinterest 
ON pod_autom_products(pinterest_pin_id) 
WHERE pinterest_pin_id IS NOT NULL;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_product_sales TO authenticated;
GRANT EXECUTE ON FUNCTION increment_niche_sales TO authenticated;
GRANT EXECUTE ON FUNCTION increment_niche_products TO authenticated;
