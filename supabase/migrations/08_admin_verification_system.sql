-- =====================================================
-- POD AutoM: Admin & Verification System
-- Migration 08: Admin Panel und User-Verifizierung
-- =====================================================

-- User Profiles Tabelle (erweitert auth.users)
CREATE TABLE IF NOT EXISTS pod_autom_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),

    -- Shopify Daten (vom User im Onboarding eingegeben)
    shopify_domain TEXT,
    shopify_domain_previous TEXT,
    shopify_domain_changed_at TIMESTAMPTZ,

    -- Install Link (vom Admin eingegeben)
    shopify_install_link TEXT,
    install_link_created_at TIMESTAMPTZ,

    -- Onboarding Status
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_profiles_role ON pod_autom_profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON pod_autom_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON pod_autom_profiles(onboarding_completed);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();

    -- Track Shopify Domain Änderungen
    IF OLD.shopify_domain IS DISTINCT FROM NEW.shopify_domain AND OLD.shopify_domain IS NOT NULL THEN
        NEW.shopify_domain_previous = OLD.shopify_domain;
        NEW.shopify_domain_changed_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON pod_autom_profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON pod_autom_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profiles_updated_at();

-- Funktion: Automatisch Profil erstellen bei User-Registrierung
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pod_autom_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger für neue User
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- RLS Policies
ALTER TABLE pod_autom_profiles ENABLE ROW LEVEL SECURITY;

-- User kann eigenes Profil lesen
CREATE POLICY "Users can read own profile"
    ON pod_autom_profiles
    FOR SELECT
    USING (auth.uid() = id);

-- User kann eigenes Profil updaten (außer role und verification_status)
CREATE POLICY "Users can update own profile"
    ON pod_autom_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND (
            -- Normale User können role und verification_status nicht ändern
            (SELECT role FROM pod_autom_profiles WHERE id = auth.uid()) = 'user'
            AND NEW.role = OLD.role
            AND NEW.verification_status = OLD.verification_status
        )
        OR
        -- Admins können alles ändern
        (SELECT role FROM pod_autom_profiles WHERE id = auth.uid()) = 'admin'
    );

-- Admins können alle Profile lesen
CREATE POLICY "Admins can read all profiles"
    ON pod_autom_profiles
    FOR SELECT
    USING (
        (SELECT role FROM pod_autom_profiles WHERE id = auth.uid()) = 'admin'
    );

-- Admins können alle Profile updaten
CREATE POLICY "Admins can update all profiles"
    ON pod_autom_profiles
    FOR UPDATE
    USING (
        (SELECT role FROM pod_autom_profiles WHERE id = auth.uid()) = 'admin'
    );

-- =====================================================
-- Pending Installations Tabelle
-- Speichert die Verknüpfung user_id <-> shop_domain für den OAuth Callback
-- =====================================================

CREATE TABLE IF NOT EXISTS pod_autom_pending_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'installing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    UNIQUE(user_id, shop_domain)
);

CREATE INDEX IF NOT EXISTS idx_pending_installations_shop ON pod_autom_pending_installations(shop_domain);
CREATE INDEX IF NOT EXISTS idx_pending_installations_status ON pod_autom_pending_installations(status);

-- RLS für pending_installations
ALTER TABLE pod_autom_pending_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pending installations"
    ON pod_autom_pending_installations
    FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- View für Admin Panel
-- =====================================================

CREATE OR REPLACE VIEW pod_autom_admin_users AS
SELECT
    p.id,
    p.email,
    p.full_name,
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

-- Grant Zugriff auf die View
GRANT SELECT ON pod_autom_admin_users TO authenticated;

-- =====================================================
-- Hilfsfunktion: Domain-Änderung bestätigen (Flag entfernen)
-- =====================================================

CREATE OR REPLACE FUNCTION confirm_domain_change(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE pod_autom_profiles
    SET
        shopify_domain_previous = NULL,
        shopify_domain_changed_at = NULL
    WHERE id = target_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Initial Admin User setzen (optional - manuell ausführen)
-- Beispiel: SELECT set_user_as_admin('user-uuid-here');
-- =====================================================

CREATE OR REPLACE FUNCTION set_user_as_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE pod_autom_profiles
    SET role = 'admin'
    WHERE id = target_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
