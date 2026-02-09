-- =====================================================
-- POD AutoM: Onboarding Profile Fields
-- Migration 09: Erweiterte Profil-Felder für Onboarding
-- =====================================================

-- Neue Felder zu pod_autom_profiles hinzufügen
ALTER TABLE pod_autom_profiles
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'company'));

ALTER TABLE pod_autom_profiles
ADD COLUMN IF NOT EXISTS company_name TEXT;

ALTER TABLE pod_autom_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE pod_autom_profiles
ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE pod_autom_profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE pod_autom_profiles
ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- Rechnungsadresse
ALTER TABLE pod_autom_profiles
ADD COLUMN IF NOT EXISTS billing_street TEXT;

ALTER TABLE pod_autom_profiles
ADD COLUMN IF NOT EXISTS billing_city TEXT;

ALTER TABLE pod_autom_profiles
ADD COLUMN IF NOT EXISTS billing_zip TEXT;

ALTER TABLE pod_autom_profiles
ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'DE';

-- Index für Account-Typ Abfragen
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON pod_autom_profiles(account_type);

-- Kommentar für Dokumentation
COMMENT ON COLUMN pod_autom_profiles.account_type IS 'Nutzertyp: individual (Privatperson) oder company (Unternehmen)';
COMMENT ON COLUMN pod_autom_profiles.company_name IS 'Firmenname (nur wenn account_type = company)';
COMMENT ON COLUMN pod_autom_profiles.first_name IS 'Vorname des Nutzers';
COMMENT ON COLUMN pod_autom_profiles.last_name IS 'Nachname des Nutzers';
COMMENT ON COLUMN pod_autom_profiles.phone IS 'Telefonnummer (optional)';
COMMENT ON COLUMN pod_autom_profiles.tax_id IS 'USt-ID (optional, für Unternehmen)';
COMMENT ON COLUMN pod_autom_profiles.billing_street IS 'Rechnungsadresse: Straße und Hausnummer';
COMMENT ON COLUMN pod_autom_profiles.billing_city IS 'Rechnungsadresse: Stadt';
COMMENT ON COLUMN pod_autom_profiles.billing_zip IS 'Rechnungsadresse: Postleitzahl';
COMMENT ON COLUMN pod_autom_profiles.billing_country IS 'Rechnungsadresse: Land (ISO Code)';

-- View für Admin Panel aktualisieren (neue Felder hinzufügen)
CREATE OR REPLACE VIEW pod_autom_admin_users AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.account_type,
    p.company_name,
    p.phone,
    p.tax_id,
    p.billing_street,
    p.billing_city,
    p.billing_zip,
    p.billing_country,
    p.role,
    p.verification_status,
    p.shopify_domain,
    p.shopify_domain_previous,
    p.shopify_domain_changed_at,
    p.shopify_install_link,
    p.install_link_created_at,
    p.onboarding_completed,
    p.onboarding_completed_at,
    p.created_at,
    p.updated_at,
    -- Computed fields
    CASE
        WHEN p.shopify_domain_previous IS NOT NULL
        AND p.shopify_domain_changed_at > COALESCE(p.install_link_created_at, '1970-01-01'::timestamptz)
        THEN TRUE
        ELSE FALSE
    END as domain_changed_flag,
    -- Shop connection status
    (SELECT connection_status FROM pod_autom_shops s WHERE s.user_id = p.id LIMIT 1) as shop_connection_status
FROM pod_autom_profiles p
WHERE p.role = 'user';

-- Grant Zugriff auf die aktualisierte View
GRANT SELECT ON pod_autom_admin_users TO authenticated;
