-- =====================================================
-- ReBoss NextGen - Fast Fashion Research Tables
-- Version: 2.0.0
-- =====================================================
-- Dynamische Tabellen pro Shop: fastfashion_research_SHOPNAME
-- Jeder Shop bekommt seine eigene Tabelle
-- =====================================================

-- =====================================================
-- 1. SHOP RESEARCH TABLE REGISTRY
-- =====================================================
-- Speichert welche Research-Tabellen für welche Shops existieren

CREATE TABLE IF NOT EXISTS public.shop_research_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  table_name TEXT NOT NULL,  -- z.B. "fastfashion_research_myshop"
  is_initialized BOOLEAN DEFAULT false,
  initialized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id),
  UNIQUE(table_name)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_shop_research_tables_user ON public.shop_research_tables(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_research_tables_shop ON public.shop_research_tables(shop_id);

-- RLS aktivieren
ALTER TABLE public.shop_research_tables ENABLE ROW LEVEL SECURITY;

-- Policy: User kann nur eigene Einträge sehen/bearbeiten
CREATE POLICY "shop_research_tables_user_policy" ON public.shop_research_tables
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 2. FUNCTION: Sanitize Shop Name for Table Name
-- =====================================================
-- Wandelt Shop-Namen in gültige PostgreSQL Tabellennamen um

CREATE OR REPLACE FUNCTION public.sanitize_shop_name(shop_name TEXT)
RETURNS TEXT AS $$
DECLARE
  sanitized TEXT;
BEGIN
  -- Lowercase
  sanitized := lower(shop_name);

  -- Entferne .myshopify.com falls vorhanden
  sanitized := regexp_replace(sanitized, '\.myshopify\.com$', '');

  -- Ersetze alle nicht-alphanumerischen Zeichen durch Underscore
  sanitized := regexp_replace(sanitized, '[^a-z0-9]', '_', 'g');

  -- Entferne doppelte Underscores
  sanitized := regexp_replace(sanitized, '_+', '_', 'g');

  -- Entferne führende/trailing Underscores
  sanitized := trim(both '_' from sanitized);

  -- Stelle sicher dass es nicht leer ist
  IF sanitized = '' OR sanitized IS NULL THEN
    sanitized := 'unknown';
  END IF;

  RETURN sanitized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 3. FUNCTION: Create Fast Fashion Research Table for Shop
-- =====================================================
-- Erstellt eine neue Research-Tabelle für einen Shop

CREATE OR REPLACE FUNCTION public.create_fastfashion_research_table(
  target_user_id UUID,
  target_shop_id UUID,
  shop_name TEXT
)
RETURNS JSON AS $$
DECLARE
  sanitized_name TEXT;
  full_table_name TEXT;
  table_exists BOOLEAN;
  result JSON;
BEGIN
  -- Sanitize shop name
  sanitized_name := public.sanitize_shop_name(shop_name);
  full_table_name := 'fastfashion_research_' || sanitized_name;

  -- Prüfe ob Tabelle bereits existiert
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = full_table_name
  ) INTO table_exists;

  IF table_exists THEN
    -- Tabelle existiert bereits - nur Registry-Eintrag prüfen/erstellen
    INSERT INTO public.shop_research_tables (user_id, shop_id, shop_name, table_name, is_initialized, initialized_at)
    VALUES (target_user_id, target_shop_id, shop_name, full_table_name, true, NOW())
    ON CONFLICT (shop_id) DO UPDATE SET
      is_initialized = true,
      initialized_at = COALESCE(public.shop_research_tables.initialized_at, NOW()),
      updated_at = NOW();

    RETURN json_build_object(
      'success', true,
      'table_name', full_table_name,
      'message', 'Tabelle existiert bereits',
      'created', false
    );
  END IF;

  -- Erstelle neue Tabelle mit dem gewünschten Schema
  EXECUTE format('
    CREATE TABLE public.%I (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price TEXT NULL,
      "comparePrice" TEXT NULL,
      images TEXT NULL,
      variants TEXT NULL,
      synced_to_shopify BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT %I UNIQUE (title)
    )
  ', full_table_name, 'unique_title_' || sanitized_name);

  -- RLS aktivieren
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', full_table_name);

  -- Policy erstellen (alle authentifizierten User können lesen/schreiben)
  -- Da die Tabelle Shop-spezifisch ist, ist das ausreichend
  EXECUTE format('
    CREATE POLICY %I ON public.%I
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true)
  ', 'policy_' || sanitized_name, full_table_name);

  -- Registry-Eintrag erstellen
  INSERT INTO public.shop_research_tables (user_id, shop_id, shop_name, table_name, is_initialized, initialized_at)
  VALUES (target_user_id, target_shop_id, shop_name, full_table_name, true, NOW())
  ON CONFLICT (shop_id) DO UPDATE SET
    table_name = full_table_name,
    is_initialized = true,
    initialized_at = NOW(),
    updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'table_name', full_table_name,
    'message', 'Tabelle erfolgreich erstellt',
    'created', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'table_name', full_table_name,
      'message', SQLERRM,
      'created', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNCTION: Check if Research Table exists for Shop
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_fastfashion_research_table(target_shop_id UUID)
RETURNS JSON AS $$
DECLARE
  record_data RECORD;
  table_exists BOOLEAN;
BEGIN
  -- Hole Registry-Eintrag
  SELECT * INTO record_data
  FROM public.shop_research_tables
  WHERE shop_id = target_shop_id;

  IF record_data IS NULL THEN
    RETURN json_build_object(
      'exists', false,
      'is_initialized', false,
      'table_name', null,
      'shop_name', null
    );
  END IF;

  -- Prüfe ob die Tabelle wirklich existiert
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = record_data.table_name
  ) INTO table_exists;

  RETURN json_build_object(
    'exists', table_exists,
    'is_initialized', record_data.is_initialized AND table_exists,
    'table_name', record_data.table_name,
    'shop_name', record_data.shop_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNCTION: Get Products from Research Table
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_fastfashion_research_products(
  target_shop_id UUID,
  limit_count INTEGER DEFAULT 100,
  offset_count INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
  table_info JSON;
  table_name TEXT;
  products JSON;
BEGIN
  -- Hole Tabellen-Info
  table_info := public.check_fastfashion_research_table(target_shop_id);

  IF NOT (table_info->>'exists')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Research table does not exist',
      'products', '[]'::json
    );
  END IF;

  table_name := table_info->>'table_name';

  -- Hole Produkte
  EXECUTE format('
    SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json)
    FROM (
      SELECT * FROM public.%I
      ORDER BY id DESC
      LIMIT %s OFFSET %s
    ) t
  ', table_name, limit_count, offset_count) INTO products;

  RETURN json_build_object(
    'success', true,
    'table_name', table_name,
    'products', products
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNCTION: Delete Product from Research Table
-- =====================================================

CREATE OR REPLACE FUNCTION public.delete_fastfashion_research_product(
  target_shop_id UUID,
  product_id INTEGER
)
RETURNS JSON AS $$
DECLARE
  table_info JSON;
  table_name TEXT;
  deleted_count INTEGER;
BEGIN
  -- Hole Tabellen-Info
  table_info := public.check_fastfashion_research_table(target_shop_id);

  IF NOT (table_info->>'exists')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Research table does not exist'
    );
  END IF;

  table_name := table_info->>'table_name';

  -- Lösche Produkt
  EXECUTE format('
    DELETE FROM public.%I WHERE id = %s
  ', table_name, product_id);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted', deleted_count > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNCTION: Get Product Count from Research Table
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_fastfashion_research_count(target_shop_id UUID)
RETURNS JSON AS $$
DECLARE
  table_info JSON;
  table_name TEXT;
  product_count INTEGER;
BEGIN
  -- Hole Tabellen-Info
  table_info := public.check_fastfashion_research_table(target_shop_id);

  IF NOT (table_info->>'exists')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'count', 0
    );
  END IF;

  table_name := table_info->>'table_name';

  -- Zähle Produkte
  EXECUTE format('SELECT COUNT(*) FROM public.%I', table_name) INTO product_count;

  RETURN json_build_object(
    'success', true,
    'count', product_count,
    'table_name', table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7b. FUNCTION: Get UNSYNCED Products from Research Table
-- =====================================================
-- Holt nur Produkte die noch NICHT zu Shopify synchronisiert wurden

CREATE OR REPLACE FUNCTION public.get_unsynced_research_products(
  target_shop_id UUID,
  limit_count INTEGER DEFAULT 100
)
RETURNS JSON AS $$
DECLARE
  table_info JSON;
  table_name TEXT;
  products JSON;
BEGIN
  -- Hole Tabellen-Info
  table_info := public.check_fastfashion_research_table(target_shop_id);

  IF NOT (table_info->>'exists')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Research table does not exist',
      'products', '[]'::json
    );
  END IF;

  table_name := table_info->>'table_name';

  -- Hole nur unsynced Produkte (synced_to_shopify = FALSE)
  EXECUTE format('
    SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json)
    FROM (
      SELECT * FROM public.%I
      WHERE synced_to_shopify = FALSE
      ORDER BY id ASC
      LIMIT %s
    ) t
  ', table_name, limit_count) INTO products;

  RETURN json_build_object(
    'success', true,
    'table_name', table_name,
    'products', products
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7c. FUNCTION: Mark Product as Synced to Shopify
-- =====================================================
-- Markiert ein Produkt als bereits zu Shopify synchronisiert

CREATE OR REPLACE FUNCTION public.mark_product_synced(
  target_shop_id UUID,
  product_id INTEGER
)
RETURNS JSON AS $$
DECLARE
  table_info JSON;
  table_name TEXT;
  updated_count INTEGER;
BEGIN
  -- Hole Tabellen-Info
  table_info := public.check_fastfashion_research_table(target_shop_id);

  IF NOT (table_info->>'exists')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Research table does not exist'
    );
  END IF;

  table_name := table_info->>'table_name';

  -- Setze synced_to_shopify auf TRUE
  EXECUTE format('
    UPDATE public.%I SET synced_to_shopify = TRUE WHERE id = %s
  ', table_name, product_id);

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'updated', updated_count > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7d. FUNCTION: Get Unsynced Product Count
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_unsynced_research_count(target_shop_id UUID)
RETURNS JSON AS $$
DECLARE
  table_info JSON;
  table_name TEXT;
  unsynced_count INTEGER;
BEGIN
  -- Hole Tabellen-Info
  table_info := public.check_fastfashion_research_table(target_shop_id);

  IF NOT (table_info->>'exists')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'count', 0
    );
  END IF;

  table_name := table_info->>'table_name';

  -- Zähle unsynced Produkte
  EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE synced_to_shopify = FALSE', table_name) INTO unsynced_count;

  RETURN json_build_object(
    'success', true,
    'count', unsynced_count,
    'table_name', table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TRIGGER: Auto-create Research Table when Shop is added
-- =====================================================
-- Automatisch eine Research-Tabelle erstellen wenn ein neuer Shop hinzugefügt wird

CREATE OR REPLACE FUNCTION public.auto_create_research_table_for_shop()
RETURNS TRIGGER AS $$
DECLARE
  result JSON;
BEGIN
  -- Erstelle automatisch die Research-Tabelle für den neuen Shop
  result := public.create_fastfashion_research_table(
    NEW.user_id,
    NEW.id,
    COALESCE(NEW.shop_domain, NEW.internal_name, 'shop_' || NEW.id::text)
  );

  -- Log das Ergebnis (optional, für Debugging)
  RAISE NOTICE 'Auto-created research table for shop %: %', NEW.id, result;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Bei Fehler nicht abbrechen, nur loggen
    RAISE WARNING 'Failed to auto-create research table for shop %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger der bei INSERT auf shops feuert
DROP TRIGGER IF EXISTS trigger_auto_create_research_table ON public.shops;
CREATE TRIGGER trigger_auto_create_research_table
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_research_table_for_shop();

-- =====================================================
-- 9. FUNCTION: Check all shops for missing research tables
-- =====================================================
-- Für Plan B: Prüft alle Shops eines Users und gibt zurück welche keine Tabelle haben

CREATE OR REPLACE FUNCTION public.check_all_shops_research_status()
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  shops_data JSON;
  missing_shops JSON;
  all_ok BOOLEAN;
BEGIN
  -- Hole aktuelle User ID
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Hole alle Shops mit ihrem Research-Table Status
  SELECT json_agg(shop_status) INTO shops_data
  FROM (
    SELECT
      s.id as shop_id,
      s.internal_name,
      s.shop_domain,
      COALESCE(srt.is_initialized, false) as has_research_table,
      srt.table_name
    FROM public.shops s
    LEFT JOIN public.shop_research_tables srt ON s.id = srt.shop_id
    WHERE s.user_id = current_user_id
  ) shop_status;

  -- Finde Shops ohne Research-Tabelle
  SELECT json_agg(missing) INTO missing_shops
  FROM (
    SELECT
      s.id as shop_id,
      s.internal_name,
      s.shop_domain
    FROM public.shops s
    LEFT JOIN public.shop_research_tables srt ON s.id = srt.shop_id
    WHERE s.user_id = current_user_id
    AND (srt.is_initialized IS NULL OR srt.is_initialized = false)
  ) missing;

  -- Check ob alle OK sind
  all_ok := (missing_shops IS NULL OR json_array_length(missing_shops) = 0);

  RETURN json_build_object(
    'success', true,
    'all_initialized', all_ok,
    'shops', COALESCE(shops_data, '[]'::json),
    'missing_shops', COALESCE(missing_shops, '[]'::json),
    'missing_count', COALESCE(json_array_length(missing_shops), 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. FUNCTION: Initialize all missing research tables (Plan B)
-- =====================================================
-- Erstellt Research-Tabellen für alle Shops die noch keine haben

CREATE OR REPLACE FUNCTION public.initialize_all_missing_research_tables()
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  shop_record RECORD;
  result JSON;
  created_count INTEGER := 0;
  failed_count INTEGER := 0;
  results JSON[] := '{}';
BEGIN
  -- Hole aktuelle User ID
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Iteriere über alle Shops ohne Research-Tabelle
  FOR shop_record IN
    SELECT
      s.id,
      s.internal_name,
      s.shop_domain
    FROM public.shops s
    LEFT JOIN public.shop_research_tables srt ON s.id = srt.shop_id
    WHERE s.user_id = current_user_id
    AND (srt.is_initialized IS NULL OR srt.is_initialized = false)
  LOOP
    -- Versuche Research-Tabelle zu erstellen
    result := public.create_fastfashion_research_table(
      current_user_id,
      shop_record.id,
      COALESCE(shop_record.shop_domain, shop_record.internal_name, 'shop_' || shop_record.id::text)
    );

    IF (result->>'success')::boolean THEN
      created_count := created_count + 1;
    ELSE
      failed_count := failed_count + 1;
    END IF;

    results := array_append(results, json_build_object(
      'shop_id', shop_record.id,
      'shop_name', COALESCE(shop_record.internal_name, shop_record.shop_domain),
      'result', result
    ));
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'created_count', created_count,
    'failed_count', failed_count,
    'total_processed', created_count + failed_count,
    'details', to_json(results)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.sanitize_shop_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_fastfashion_research_table(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_fastfashion_research_table(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fastfashion_research_products(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_fastfashion_research_product(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fastfashion_research_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unsynced_research_products(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_product_synced(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unsynced_research_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_create_research_table_for_shop() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_all_shops_research_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_all_missing_research_tables() TO authenticated;
