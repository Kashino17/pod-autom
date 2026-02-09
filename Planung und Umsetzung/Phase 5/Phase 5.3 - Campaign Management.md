# Phase 5.3 - Campaign Management

## Ziel
Erweiterte Kampagnenverwaltung mit Übersicht über alle Ad-Plattformen, Performance-Tracking und Kampagnen-Steuerung.

---

## 1. Shared Types

### src/types/campaign.types.ts

```typescript
// =============================================================================
// CAMPAIGN TYPES
// Zentrale Typen für Campaign Management
// =============================================================================

// -----------------------------------------------------------------------------
// Platform Types
// -----------------------------------------------------------------------------

export type AdPlatform = 'pinterest' | 'meta' | 'google'

export type CampaignStatus = 'active' | 'paused' | 'ended' | 'pending' | 'learning'

export type CampaignObjective =
  | 'AWARENESS'
  | 'CONSIDERATION'
  | 'CONVERSIONS'
  | 'TRAFFIC'
  | 'CATALOG_SALES'

// -----------------------------------------------------------------------------
// Campaign Interface
// -----------------------------------------------------------------------------

export interface Campaign {
  id: string
  shop_id: string
  external_id: string  // Pinterest/Meta Campaign ID
  platform: AdPlatform
  name: string
  status: CampaignStatus
  objective: CampaignObjective

  // Budget
  budget_daily: number
  budget_lifetime: number | null
  spent_today: number
  spent_total: number

  // Performance Metrics
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  roas: number
  ctr: number  // Click-Through Rate (%)
  cvr: number  // Conversion Rate (%)
  cpc: number  // Cost per Click
  cpa: number  // Cost per Acquisition

  // Product Info
  products_count: number
  ad_groups_count: number

  // Timestamps
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string
  last_synced_at: string
}

// -----------------------------------------------------------------------------
// Campaign Stats (Aggregated)
// -----------------------------------------------------------------------------

export interface CampaignStats {
  total_campaigns: number
  active_campaigns: number
  paused_campaigns: number
  total_spend_today: number
  total_spend_month: number
  total_revenue: number
  total_impressions: number
  total_clicks: number
  total_conversions: number
  avg_roas: number
  avg_ctr: number
  avg_cvr: number
  platforms: {
    platform: AdPlatform
    campaigns: number
    spend: number
    revenue: number
    roas: number
  }[]
}

// -----------------------------------------------------------------------------
// Campaign Actions
// -----------------------------------------------------------------------------

export interface CampaignToggleRequest {
  campaign_id: string
  new_status: 'active' | 'paused'
}

export interface CampaignBudgetUpdateRequest {
  campaign_id: string
  budget_daily: number
}

export interface CampaignSettingsUpdateRequest {
  campaign_id: string
  settings: {
    budget_daily?: number
    budget_lifetime?: number | null
    end_date?: string | null
  }
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface CampaignsListResponse {
  campaigns: Campaign[]
  total: number
  page: number
  per_page: number
  has_more: boolean
}

export interface CampaignActionResponse {
  success: boolean
  campaign: Campaign
  message: string
}

// -----------------------------------------------------------------------------
// Filter Types
// -----------------------------------------------------------------------------

export interface CampaignFilters {
  platform: AdPlatform | 'all'
  status: CampaignStatus | 'all'
  search: string
  sort_by: 'name' | 'revenue' | 'roas' | 'spend' | 'created_at'
  sort_order: 'asc' | 'desc'
}

// -----------------------------------------------------------------------------
// Export Types
// -----------------------------------------------------------------------------

export interface CampaignExportData {
  name: string
  platform: string
  status: string
  budget_daily: number
  spent_today: number
  impressions: number
  clicks: number
  ctr: string
  conversions: number
  cvr: string
  revenue: number
  roas: string
  cpc: string
  cpa: string
  products_count: number
  start_date: string
}
```

---

## 2. Backend API

### backend/api/routes/pod_autom_campaigns.py

```python
"""
POD AutoM - Campaign Management API Routes
Verwaltung und Überwachung von Werbekampagnen (Pinterest, Meta, Google)
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
import re
from datetime import datetime, timedelta
from supabase import create_client

bp = Blueprint('pod_autom_campaigns', __name__, url_prefix='/pod-autom/campaigns')

# Supabase Client
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_KEY')
)

# UUID Regex Pattern
UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE
)

# =============================================================================
# DECORATORS
# =============================================================================

def require_auth(f):
    """JWT Authentifizierung"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]
        try:
            # Supabase JWT Verification
            payload = jwt.decode(
                token,
                os.environ.get('SUPABASE_JWT_SECRET'),
                algorithms=['HS256'],
                audience='authenticated'
            )
            request.user_id = payload.get('sub')
            if not request.user_id:
                return jsonify({'error': 'Invalid token: missing user ID'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401

        return f(*args, **kwargs)
    return decorated


def require_premium(f):
    """Premium/VIP Subscription erforderlich"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Subscription prüfen
        sub_result = supabase.table('pod_autom_subscriptions') \
            .select('tier, status') \
            .eq('user_id', request.user_id) \
            .eq('status', 'active') \
            .single() \
            .execute()

        if not sub_result.data:
            return jsonify({'error': 'No active subscription found'}), 403

        tier = sub_result.data.get('tier')
        if tier not in ['premium', 'vip']:
            return jsonify({
                'error': 'Feature requires Premium or VIP subscription',
                'required_tier': 'premium',
                'current_tier': tier
            }), 403

        request.subscription_tier = tier
        return f(*args, **kwargs)
    return decorated


def validate_uuid(uuid_string: str) -> bool:
    """UUID Format validieren"""
    return bool(UUID_PATTERN.match(uuid_string))


def verify_shop_ownership(shop_id: str, user_id: str) -> bool:
    """Prüfen ob User Eigentümer des Shops ist"""
    result = supabase.table('pod_autom_shops') \
        .select('id') \
        .eq('id', shop_id) \
        .eq('user_id', user_id) \
        .single() \
        .execute()
    return result.data is not None


# =============================================================================
# ROUTES
# =============================================================================

@bp.route('/<shop_id>', methods=['GET'])
@require_auth
def get_campaigns(shop_id: str):
    """
    Alle Kampagnen eines Shops abrufen

    Query Parameters:
    - platform: pinterest | meta | google | all (default: all)
    - status: active | paused | ended | all (default: all)
    - search: Suchbegriff für Kampagnennamen
    - sort_by: name | revenue | roas | spend | created_at (default: created_at)
    - sort_order: asc | desc (default: desc)
    - page: Seitennummer (default: 1)
    - per_page: Einträge pro Seite (default: 20, max: 100)
    """
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop ID format'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found or access denied'}), 404

    # Query Parameter
    platform = request.args.get('platform', 'all')
    status = request.args.get('status', 'all')
    search = request.args.get('search', '').strip()
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(100, max(1, int(request.args.get('per_page', 20))))

    # Validierung
    valid_platforms = ['pinterest', 'meta', 'google', 'all']
    valid_statuses = ['active', 'paused', 'ended', 'pending', 'learning', 'all']
    valid_sort_fields = ['name', 'revenue', 'roas', 'spent_today', 'created_at']

    if platform not in valid_platforms:
        platform = 'all'
    if status not in valid_statuses:
        status = 'all'
    if sort_by not in valid_sort_fields:
        sort_by = 'created_at'
    if sort_order not in ['asc', 'desc']:
        sort_order = 'desc'

    # Query aufbauen
    query = supabase.table('pod_autom_campaigns') \
        .select('*', count='exact') \
        .eq('shop_id', shop_id)

    if platform != 'all':
        query = query.eq('platform', platform)

    if status != 'all':
        query = query.eq('status', status)

    if search:
        query = query.ilike('name', f'%{search}%')

    # Sortierung
    ascending = sort_order == 'asc'
    query = query.order(sort_by, desc=not ascending)

    # Pagination
    offset = (page - 1) * per_page
    query = query.range(offset, offset + per_page - 1)

    result = query.execute()

    total = result.count or 0
    has_more = offset + per_page < total

    return jsonify({
        'campaigns': result.data or [],
        'total': total,
        'page': page,
        'per_page': per_page,
        'has_more': has_more
    })


@bp.route('/<shop_id>/stats', methods=['GET'])
@require_auth
def get_campaign_stats(shop_id: str):
    """
    Aggregierte Kampagnen-Statistiken abrufen
    Verwendet PostgreSQL RPC für effiziente Berechnung
    """
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop ID format'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found or access denied'}), 404

    # RPC Call für aggregierte Stats
    result = supabase.rpc('get_campaign_stats', {'p_shop_id': shop_id}).execute()

    if result.data:
        stats = result.data[0] if isinstance(result.data, list) else result.data
        return jsonify(stats)

    # Fallback: Leere Stats
    return jsonify({
        'total_campaigns': 0,
        'active_campaigns': 0,
        'paused_campaigns': 0,
        'total_spend_today': 0,
        'total_spend_month': 0,
        'total_revenue': 0,
        'total_impressions': 0,
        'total_clicks': 0,
        'total_conversions': 0,
        'avg_roas': 0,
        'avg_ctr': 0,
        'avg_cvr': 0,
        'platforms': []
    })


@bp.route('/<shop_id>/<campaign_id>/toggle', methods=['POST'])
@require_auth
@require_premium
def toggle_campaign(shop_id: str, campaign_id: str):
    """
    Kampagne pausieren/aktivieren

    Request Body:
    {
        "new_status": "active" | "paused"
    }
    """
    if not validate_uuid(shop_id) or not validate_uuid(campaign_id):
        return jsonify({'error': 'Invalid ID format'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found or access denied'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    new_status = data.get('new_status')
    if new_status not in ['active', 'paused']:
        return jsonify({'error': 'new_status must be "active" or "paused"'}), 400

    # Kampagne abrufen
    campaign_result = supabase.table('pod_autom_campaigns') \
        .select('*') \
        .eq('id', campaign_id) \
        .eq('shop_id', shop_id) \
        .single() \
        .execute()

    if not campaign_result.data:
        return jsonify({'error': 'Campaign not found'}), 404

    campaign = campaign_result.data
    old_status = campaign['status']

    # Keine Änderung nötig
    if old_status == new_status:
        return jsonify({
            'success': True,
            'campaign': campaign,
            'message': f'Campaign already {new_status}'
        })

    # Externe API aufrufen (Pinterest/Meta)
    platform = campaign['platform']
    external_id = campaign['external_id']

    try:
        if platform == 'pinterest':
            success = _toggle_pinterest_campaign(shop_id, external_id, new_status)
        elif platform == 'meta':
            success = _toggle_meta_campaign(shop_id, external_id, new_status)
        else:
            success = True  # Für zukünftige Plattformen

        if not success:
            return jsonify({'error': 'Failed to update campaign on platform'}), 500

    except Exception as e:
        return jsonify({'error': f'Platform API error: {str(e)}'}), 500

    # Lokale Datenbank aktualisieren
    update_result = supabase.table('pod_autom_campaigns') \
        .update({
            'status': new_status,
            'updated_at': datetime.utcnow().isoformat()
        }) \
        .eq('id', campaign_id) \
        .execute()

    # Aktion loggen
    supabase.table('pod_autom_campaign_actions').insert({
        'campaign_id': campaign_id,
        'shop_id': shop_id,
        'user_id': request.user_id,
        'action': 'status_change',
        'old_value': old_status,
        'new_value': new_status,
        'created_at': datetime.utcnow().isoformat()
    }).execute()

    updated_campaign = update_result.data[0] if update_result.data else campaign
    updated_campaign['status'] = new_status

    return jsonify({
        'success': True,
        'campaign': updated_campaign,
        'message': f'Campaign {"activated" if new_status == "active" else "paused"}'
    })


@bp.route('/<shop_id>/<campaign_id>/budget', methods=['PUT'])
@require_auth
@require_premium
def update_campaign_budget(shop_id: str, campaign_id: str):
    """
    Kampagnen-Budget aktualisieren

    Request Body:
    {
        "budget_daily": 50.00,
        "budget_lifetime": null  // Optional
    }
    """
    if not validate_uuid(shop_id) or not validate_uuid(campaign_id):
        return jsonify({'error': 'Invalid ID format'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found or access denied'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    budget_daily = data.get('budget_daily')
    budget_lifetime = data.get('budget_lifetime')

    # Validierung
    if budget_daily is not None:
        try:
            budget_daily = float(budget_daily)
            if budget_daily < 1 or budget_daily > 10000:
                return jsonify({'error': 'budget_daily must be between 1 and 10000'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid budget_daily value'}), 400

    if budget_lifetime is not None:
        try:
            budget_lifetime = float(budget_lifetime)
            if budget_lifetime < 10:
                return jsonify({'error': 'budget_lifetime must be at least 10'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid budget_lifetime value'}), 400

    # Kampagne abrufen
    campaign_result = supabase.table('pod_autom_campaigns') \
        .select('*') \
        .eq('id', campaign_id) \
        .eq('shop_id', shop_id) \
        .single() \
        .execute()

    if not campaign_result.data:
        return jsonify({'error': 'Campaign not found'}), 404

    campaign = campaign_result.data
    old_budget = campaign['budget_daily']

    # Update vorbereiten
    update_data = {'updated_at': datetime.utcnow().isoformat()}
    if budget_daily is not None:
        update_data['budget_daily'] = budget_daily
    if budget_lifetime is not None:
        update_data['budget_lifetime'] = budget_lifetime

    # Externe API aufrufen
    platform = campaign['platform']
    external_id = campaign['external_id']

    try:
        if platform == 'pinterest':
            success = _update_pinterest_campaign_budget(
                shop_id, external_id, budget_daily, budget_lifetime
            )
        elif platform == 'meta':
            success = _update_meta_campaign_budget(
                shop_id, external_id, budget_daily, budget_lifetime
            )
        else:
            success = True

        if not success:
            return jsonify({'error': 'Failed to update budget on platform'}), 500

    except Exception as e:
        return jsonify({'error': f'Platform API error: {str(e)}'}), 500

    # Lokale Datenbank aktualisieren
    update_result = supabase.table('pod_autom_campaigns') \
        .update(update_data) \
        .eq('id', campaign_id) \
        .execute()

    # Aktion loggen
    supabase.table('pod_autom_campaign_actions').insert({
        'campaign_id': campaign_id,
        'shop_id': shop_id,
        'user_id': request.user_id,
        'action': 'budget_change',
        'old_value': str(old_budget),
        'new_value': str(budget_daily),
        'created_at': datetime.utcnow().isoformat()
    }).execute()

    updated_campaign = update_result.data[0] if update_result.data else campaign

    return jsonify({
        'success': True,
        'campaign': updated_campaign,
        'message': 'Budget updated'
    })


@bp.route('/<shop_id>/export', methods=['GET'])
@require_auth
@require_premium
def export_campaigns(shop_id: str):
    """
    Kampagnendaten als CSV exportieren
    VIP-Only Feature
    """
    if request.subscription_tier != 'vip':
        return jsonify({
            'error': 'Export requires VIP subscription',
            'required_tier': 'vip',
            'current_tier': request.subscription_tier
        }), 403

    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop ID format'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found or access denied'}), 404

    # Alle Kampagnen abrufen
    result = supabase.table('pod_autom_campaigns') \
        .select('*') \
        .eq('shop_id', shop_id) \
        .order('created_at', desc=True) \
        .execute()

    campaigns = result.data or []

    # CSV Headers
    headers = [
        'Name', 'Platform', 'Status', 'Daily Budget', 'Spent Today',
        'Impressions', 'Clicks', 'CTR', 'Conversions', 'CVR',
        'Revenue', 'ROAS', 'CPC', 'CPA', 'Products', 'Start Date'
    ]

    # CSV Rows
    rows = []
    for c in campaigns:
        rows.append([
            c['name'],
            c['platform'].capitalize(),
            c['status'].capitalize(),
            f"{c['budget_daily']:.2f}",
            f"{c['spent_today']:.2f}",
            str(c['impressions']),
            str(c['clicks']),
            f"{c['ctr']:.2f}%",
            str(c['conversions']),
            f"{c['cvr']:.2f}%",
            f"{c['revenue']:.2f}",
            f"{c['roas']:.2f}x",
            f"{c['cpc']:.2f}",
            f"{c['cpa']:.2f}",
            str(c['products_count']),
            c['start_date'][:10] if c['start_date'] else ''
        ])

    return jsonify({
        'headers': headers,
        'rows': rows,
        'filename': f"campaigns_{shop_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    })


# =============================================================================
# PLATFORM API HELPERS
# =============================================================================

def _toggle_pinterest_campaign(shop_id: str, external_id: str, status: str) -> bool:
    """Pinterest Kampagne aktivieren/pausieren"""
    from services.pinterest_service import PinterestService

    pinterest = PinterestService(shop_id)
    pinterest_status = 'ACTIVE' if status == 'active' else 'PAUSED'

    return pinterest.update_campaign_status(external_id, pinterest_status)


def _toggle_meta_campaign(shop_id: str, external_id: str, status: str) -> bool:
    """Meta Kampagne aktivieren/pausieren"""
    # TODO: Meta API Integration
    return True


def _update_pinterest_campaign_budget(
    shop_id: str,
    external_id: str,
    daily: float,
    lifetime: float | None
) -> bool:
    """Pinterest Kampagnen-Budget aktualisieren"""
    from services.pinterest_service import PinterestService

    pinterest = PinterestService(shop_id)

    # Pinterest verwendet Microcurrency (Cents)
    daily_micro = int(daily * 1000000) if daily else None
    lifetime_micro = int(lifetime * 1000000) if lifetime else None

    return pinterest.update_campaign_budget(external_id, daily_micro, lifetime_micro)


def _update_meta_campaign_budget(
    shop_id: str,
    external_id: str,
    daily: float,
    lifetime: float | None
) -> bool:
    """Meta Kampagnen-Budget aktualisieren"""
    # TODO: Meta API Integration
    return True
```

---

## 3. SQL Migration

### supabase/migrations/20240601_campaign_management_tables.sql

```sql
-- =============================================================================
-- POD AutoM Campaign Management Tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Campaigns Table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pod_autom_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES pod_autom_shops(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,  -- Pinterest/Meta Campaign ID
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('pinterest', 'meta', 'google')),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('active', 'paused', 'ended', 'pending', 'learning')
    ),
    objective VARCHAR(50) CHECK (
        objective IN ('AWARENESS', 'CONSIDERATION', 'CONVERSIONS', 'TRAFFIC', 'CATALOG_SALES')
    ),

    -- Budget (in Euro)
    budget_daily DECIMAL(10, 2) NOT NULL DEFAULT 0,
    budget_lifetime DECIMAL(10, 2),
    spent_today DECIMAL(10, 2) NOT NULL DEFAULT 0,
    spent_total DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- Performance Metrics
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    conversions INTEGER NOT NULL DEFAULT 0,
    revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    roas DECIMAL(8, 2) NOT NULL DEFAULT 0,
    ctr DECIMAL(6, 4) NOT NULL DEFAULT 0,  -- Click-Through Rate %
    cvr DECIMAL(6, 4) NOT NULL DEFAULT 0,  -- Conversion Rate %
    cpc DECIMAL(8, 4) NOT NULL DEFAULT 0,  -- Cost per Click
    cpa DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- Cost per Acquisition

    -- Related Counts
    products_count INTEGER NOT NULL DEFAULT 0,
    ad_groups_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ,

    -- Constraints
    UNIQUE(shop_id, external_id, platform)
);

-- Indexes für häufige Queries
CREATE INDEX idx_campaigns_shop_id ON pod_autom_campaigns(shop_id);
CREATE INDEX idx_campaigns_platform ON pod_autom_campaigns(platform);
CREATE INDEX idx_campaigns_status ON pod_autom_campaigns(status);
CREATE INDEX idx_campaigns_shop_platform ON pod_autom_campaigns(shop_id, platform);
CREATE INDEX idx_campaigns_created_at ON pod_autom_campaigns(created_at DESC);

-- -----------------------------------------------------------------------------
-- Campaign Actions Log (Audit Trail)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pod_autom_campaign_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES pod_autom_campaigns(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL,
    user_id UUID NOT NULL,

    action VARCHAR(50) NOT NULL CHECK (
        action IN ('status_change', 'budget_change', 'settings_change', 'sync')
    ),
    old_value TEXT,
    new_value TEXT,
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_actions_campaign ON pod_autom_campaign_actions(campaign_id);
CREATE INDEX idx_campaign_actions_created ON pod_autom_campaign_actions(created_at DESC);

-- -----------------------------------------------------------------------------
-- RPC: Get Campaign Stats
-- Effiziente Aggregation aller Kampagnen-Statistiken
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_campaign_stats(p_shop_id UUID)
RETURNS TABLE (
    total_campaigns BIGINT,
    active_campaigns BIGINT,
    paused_campaigns BIGINT,
    total_spend_today NUMERIC,
    total_spend_month NUMERIC,
    total_revenue NUMERIC,
    total_impressions BIGINT,
    total_clicks BIGINT,
    total_conversions BIGINT,
    avg_roas NUMERIC,
    avg_ctr NUMERIC,
    avg_cvr NUMERIC,
    platforms JSONB
) AS $$
DECLARE
    month_start TIMESTAMPTZ := date_trunc('month', NOW());
BEGIN
    RETURN QUERY
    WITH campaign_data AS (
        SELECT
            c.platform,
            c.status,
            c.spent_today,
            c.spent_total,
            c.revenue,
            c.impressions,
            c.clicks,
            c.conversions,
            c.roas,
            c.ctr,
            c.cvr
        FROM pod_autom_campaigns c
        WHERE c.shop_id = p_shop_id
    ),
    platform_stats AS (
        SELECT
            platform,
            COUNT(*)::INTEGER AS campaigns,
            COALESCE(SUM(spent_today), 0) AS spend,
            COALESCE(SUM(revenue), 0) AS revenue,
            CASE
                WHEN SUM(spent_today) > 0
                THEN ROUND((SUM(revenue) / NULLIF(SUM(spent_today), 0))::NUMERIC, 2)
                ELSE 0
            END AS roas
        FROM campaign_data
        GROUP BY platform
    )
    SELECT
        COUNT(*)::BIGINT AS total_campaigns,
        COUNT(*) FILTER (WHERE status = 'active')::BIGINT AS active_campaigns,
        COUNT(*) FILTER (WHERE status = 'paused')::BIGINT AS paused_campaigns,
        COALESCE(SUM(spent_today), 0)::NUMERIC AS total_spend_today,
        COALESCE(SUM(spent_total), 0)::NUMERIC AS total_spend_month,
        COALESCE(SUM(revenue), 0)::NUMERIC AS total_revenue,
        COALESCE(SUM(impressions), 0)::BIGINT AS total_impressions,
        COALESCE(SUM(clicks), 0)::BIGINT AS total_clicks,
        COALESCE(SUM(conversions), 0)::BIGINT AS total_conversions,
        COALESCE(ROUND(AVG(NULLIF(roas, 0)), 2), 0)::NUMERIC AS avg_roas,
        COALESCE(ROUND(AVG(NULLIF(ctr, 0)), 4), 0)::NUMERIC AS avg_ctr,
        COALESCE(ROUND(AVG(NULLIF(cvr, 0)), 4), 0)::NUMERIC AS avg_cvr,
        COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'platform', platform,
                    'campaigns', campaigns,
                    'spend', spend,
                    'revenue', revenue,
                    'roas', roas
                )
            ) FROM platform_stats),
            '[]'::JSONB
        ) AS platforms
    FROM campaign_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Berechtigung
GRANT EXECUTE ON FUNCTION get_campaign_stats(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- RLS Policies
-- -----------------------------------------------------------------------------

ALTER TABLE pod_autom_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_campaign_actions ENABLE ROW LEVEL SECURITY;

-- Campaigns: Nur eigene Shops
CREATE POLICY campaigns_select ON pod_autom_campaigns
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM pod_autom_shops WHERE user_id = auth.uid()
        )
    );

CREATE POLICY campaigns_update ON pod_autom_campaigns
    FOR UPDATE USING (
        shop_id IN (
            SELECT id FROM pod_autom_shops WHERE user_id = auth.uid()
        )
    );

-- Actions: Nur eigene
CREATE POLICY campaign_actions_select ON pod_autom_campaign_actions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY campaign_actions_insert ON pod_autom_campaign_actions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Trigger: Update updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_updated_at
    BEFORE UPDATE ON pod_autom_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_timestamp();
```

---

## 4. Frontend Hooks

### src/hooks/useCampaigns.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { API_URL } from '@src/lib/constants'
import { toast } from 'sonner'
import type {
  Campaign,
  CampaignsListResponse,
  CampaignStats,
  CampaignFilters,
  CampaignActionResponse
} from '@src/types/campaign.types'

// =============================================================================
// API HELPERS
// =============================================================================

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Kampagnen eines Shops abrufen
 */
export function useCampaigns(
  shopId: string | undefined,
  filters: CampaignFilters = {
    platform: 'all',
    status: 'all',
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  },
  page: number = 1,
  perPage: number = 20
) {
  return useQuery({
    queryKey: ['campaigns', shopId, filters, page, perPage],
    queryFn: async (): Promise<CampaignsListResponse> => {
      if (!shopId) throw new Error('Shop ID required')

      const headers = await getAuthHeaders()

      const params = new URLSearchParams({
        platform: filters.platform,
        status: filters.status,
        search: filters.search,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
        page: page.toString(),
        per_page: perPage.toString()
      })

      const response = await fetch(
        `${API_URL}/pod-autom/campaigns/${shopId}?${params}`,
        { headers }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch campaigns')
      }

      return response.json()
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2,  // 2 Minuten
    refetchOnWindowFocus: true
  })
}

/**
 * Kampagnen-Statistiken abrufen
 */
export function useCampaignStats(shopId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-stats', shopId],
    queryFn: async (): Promise<CampaignStats> => {
      if (!shopId) throw new Error('Shop ID required')

      const headers = await getAuthHeaders()

      const response = await fetch(
        `${API_URL}/pod-autom/campaigns/${shopId}/stats`,
        { headers }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch stats')
      }

      return response.json()
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 1  // 1 Minute
  })
}

/**
 * Kampagne pausieren/aktivieren
 * Mit Optimistic Update und Rollback bei Fehler
 */
export function useCampaignToggle(shopId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      campaignId,
      newStatus
    }: {
      campaignId: string
      newStatus: 'active' | 'paused'
    }): Promise<CampaignActionResponse> => {
      const headers = await getAuthHeaders()

      const response = await fetch(
        `${API_URL}/pod-autom/campaigns/${shopId}/${campaignId}/toggle`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ new_status: newStatus })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to toggle campaign')
      }

      return response.json()
    },

    // Optimistic Update
    onMutate: async ({ campaignId, newStatus }) => {
      // Laufende Queries abbrechen
      await queryClient.cancelQueries({ queryKey: ['campaigns', shopId] })

      // Vorherige Daten speichern für Rollback
      const previousData = queryClient.getQueriesData({ queryKey: ['campaigns', shopId] })

      // Optimistisch aktualisieren
      queryClient.setQueriesData(
        { queryKey: ['campaigns', shopId] },
        (old: CampaignsListResponse | undefined) => {
          if (!old) return old
          return {
            ...old,
            campaigns: old.campaigns.map(c =>
              c.id === campaignId ? { ...c, status: newStatus } : c
            )
          }
        }
      )

      return { previousData }
    },

    // Bei Fehler: Rollback
    onError: (err, variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      toast.error(`Fehler: ${err.message}`)
    },

    // Bei Erfolg
    onSuccess: (data) => {
      toast.success(data.message)
    },

    // Immer: Cache invalidieren für frische Daten
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', shopId] })
      queryClient.invalidateQueries({ queryKey: ['campaign-stats', shopId] })
    }
  })
}

/**
 * Kampagnen-Budget aktualisieren
 */
export function useCampaignBudgetUpdate(shopId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      campaignId,
      budgetDaily,
      budgetLifetime
    }: {
      campaignId: string
      budgetDaily: number
      budgetLifetime?: number | null
    }): Promise<CampaignActionResponse> => {
      const headers = await getAuthHeaders()

      const response = await fetch(
        `${API_URL}/pod-autom/campaigns/${shopId}/${campaignId}/budget`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            budget_daily: budgetDaily,
            budget_lifetime: budgetLifetime
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update budget')
      }

      return response.json()
    },

    onSuccess: () => {
      toast.success('Budget aktualisiert')
      queryClient.invalidateQueries({ queryKey: ['campaigns', shopId] })
    },

    onError: (err) => {
      toast.error(`Fehler: ${err.message}`)
    }
  })
}

/**
 * Kampagnen exportieren (VIP Only)
 */
export function useCampaignExport(shopId: string) {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const headers = await getAuthHeaders()

      const response = await fetch(
        `${API_URL}/pod-autom/campaigns/${shopId}/export`,
        { headers }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      const data = await response.json()

      // CSV generieren
      const csvContent = [
        data.headers.join(','),
        ...data.rows.map((row: string[]) =>
          row.map(cell => `"${cell}"`).join(',')
        )
      ].join('\n')

      // Download triggern
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = data.filename
      link.click()
      URL.revokeObjectURL(link.href)
    },

    onSuccess: () => {
      toast.success('Export heruntergeladen')
    },

    onError: (err) => {
      toast.error(`Export fehlgeschlagen: ${err.message}`)
    }
  })
}
```

---

## 5. Frontend Komponente

### src/components/dashboard/CampaignManager.tsx

```typescript
import { useState, useMemo, useCallback } from 'react'
import { useShops } from '@src/hooks/useShopify'
import { useAppStore } from '@src/lib/store'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import {
  useCampaigns,
  useCampaignStats,
  useCampaignToggle,
  useCampaignBudgetUpdate,
  useCampaignExport
} from '@src/hooks/useCampaigns'
import type { Campaign, CampaignFilters, AdPlatform } from '@src/types/campaign.types'
import {
  Megaphone,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Settings,
  ExternalLink,
  BarChart3,
  RefreshCw,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  Lock,
  Crown,
  X,
  Check
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts'

// =============================================================================
// PLATFORM ICONS
// =============================================================================

function PinterestIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  )
}

function MetaIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// -----------------------------------------------------------------------------
// Stats Card
// -----------------------------------------------------------------------------

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: 'default' | 'green' | 'blue' | 'amber'
}

function StatsCard({ title, value, icon, color = 'default' }: StatsCardProps) {
  const colorClasses = {
    default: 'text-white',
    green: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400'
  }

  return (
    <div className="card" role="region" aria-label={title}>
      <div className="flex items-center gap-2 text-zinc-400 mb-1">
        {icon}
        <span className="text-sm">{title}</span>
      </div>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>
        {value}
      </p>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Campaign Settings Dialog
// -----------------------------------------------------------------------------

interface SettingsDialogProps {
  campaign: Campaign
  isOpen: boolean
  onClose: () => void
  onSave: (budgetDaily: number, budgetLifetime: number | null) => void
  isLoading: boolean
}

function CampaignSettingsDialog({
  campaign,
  isOpen,
  onClose,
  onSave,
  isLoading
}: SettingsDialogProps) {
  const [budgetDaily, setBudgetDaily] = useState(campaign.budget_daily.toString())
  const [budgetLifetime, setBudgetLifetime] = useState(
    campaign.budget_lifetime?.toString() || ''
  )

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const daily = parseFloat(budgetDaily)
    const lifetime = budgetLifetime ? parseFloat(budgetLifetime) : null

    if (isNaN(daily) || daily < 1) {
      return
    }

    onSave(daily, lifetime)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-surface rounded-xl p-6 w-full max-w-md shadow-2xl border border-zinc-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-surface-highlight transition"
          aria-label="Dialog schließen"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="settings-dialog-title" className="text-xl font-semibold mb-4">
          Kampagnen-Einstellungen
        </h2>

        <p className="text-zinc-400 mb-6">{campaign.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Daily Budget */}
          <div>
            <label
              htmlFor="budget-daily"
              className="block text-sm font-medium mb-2"
            >
              Tagesbudget (€)
            </label>
            <input
              id="budget-daily"
              type="number"
              min="1"
              max="10000"
              step="0.01"
              value={budgetDaily}
              onChange={(e) => setBudgetDaily(e.target.value)}
              className="input w-full"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">
              Mindestens 1€, maximal 10.000€
            </p>
          </div>

          {/* Lifetime Budget */}
          <div>
            <label
              htmlFor="budget-lifetime"
              className="block text-sm font-medium mb-2"
            >
              Gesamtbudget (€) - Optional
            </label>
            <input
              id="budget-lifetime"
              type="number"
              min="10"
              step="0.01"
              value={budgetLifetime}
              onChange={(e) => setBudgetLifetime(e.target.value)}
              className="input w-full"
              placeholder="Unbegrenzt"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={isLoading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Speichern'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Confirmation Dialog
// -----------------------------------------------------------------------------

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  isLoading
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div className="relative bg-surface rounded-xl p-6 w-full max-w-sm shadow-2xl border border-zinc-800">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold mb-2">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="text-zinc-400 mb-6">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1"
            disabled={isLoading}
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 ${
              confirmVariant === 'danger'
                ? 'btn-primary bg-red-600 hover:bg-red-700'
                : 'btn-primary'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CampaignManager() {
  const { selectedShopId } = useAppStore()
  const { data: shops } = useShops()
  const { tier, canUseFeature } = useSubscription()

  // State
  const [filters, setFilters] = useState<CampaignFilters>({
    platform: 'all',
    status: 'all',
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  })
  const [page, setPage] = useState(1)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    campaign: Campaign
    action: 'pause' | 'activate'
  } | null>(null)

  const perPage = 20
  const selectedShop = shops?.find(s => s.id === selectedShopId) || shops?.[0]
  const hasCampaignManagement = canUseFeature('campaignManagement')

  // Queries
  const {
    data: campaignsData,
    isLoading,
    refetch,
    isFetching
  } = useCampaigns(selectedShop?.id, filters, page, perPage)

  const { data: stats } = useCampaignStats(selectedShop?.id)

  // Mutations
  const toggleMutation = useCampaignToggle(selectedShop?.id || '')
  const budgetMutation = useCampaignBudgetUpdate(selectedShop?.id || '')
  const exportMutation = useCampaignExport(selectedShop?.id || '')

  // Derived Data
  const campaigns = campaignsData?.campaigns || []
  const totalCampaigns = campaignsData?.total || 0
  const totalPages = Math.ceil(totalCampaigns / perPage)

  // Platform Chart Data
  const platformData = useMemo(() => {
    if (!stats?.platforms) return []

    const colors: Record<AdPlatform, string> = {
      pinterest: '#E60023',
      meta: '#1877F2',
      google: '#4285F4'
    }

    return stats.platforms
      .filter(p => p.revenue > 0)
      .map(p => ({
        name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
        value: p.revenue,
        color: colors[p.platform as AdPlatform] || '#8b5cf6'
      }))
  }, [stats])

  // Handlers
  const handleToggleCampaign = useCallback((campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    setConfirmAction({
      campaign,
      action: newStatus === 'paused' ? 'pause' : 'activate'
    })
  }, [])

  const confirmToggle = useCallback(() => {
    if (!confirmAction) return

    toggleMutation.mutate({
      campaignId: confirmAction.campaign.id,
      newStatus: confirmAction.action === 'pause' ? 'paused' : 'active'
    }, {
      onSettled: () => setConfirmAction(null)
    })
  }, [confirmAction, toggleMutation])

  const handleOpenSettings = useCallback((campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setShowSettings(true)
  }, [])

  const handleSaveSettings = useCallback((budgetDaily: number, budgetLifetime: number | null) => {
    if (!selectedCampaign) return

    budgetMutation.mutate({
      campaignId: selectedCampaign.id,
      budgetDaily,
      budgetLifetime
    }, {
      onSuccess: () => {
        setShowSettings(false)
        setSelectedCampaign(null)
      }
    })
  }, [selectedCampaign, budgetMutation])

  const handleExport = useCallback(() => {
    exportMutation.mutate()
  }, [exportMutation])

  const handleFilterChange = useCallback((key: keyof CampaignFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)  // Reset to first page on filter change
  }, [])

  // Platform Icon Helper
  const getPlatformIcon = (platform: AdPlatform) => {
    switch (platform) {
      case 'pinterest':
        return <PinterestIcon />
      case 'meta':
        return <MetaIcon />
      case 'google':
        return <GoogleIcon />
      default:
        return <Megaphone className="w-5 h-5" />
    }
  }

  // -----------------------------------------------------------------------------
  // RENDER: No Shop
  // -----------------------------------------------------------------------------

  if (!selectedShop) {
    return (
      <div className="flex flex-col items-center justify-center py-20" role="status">
        <AlertCircle className="w-12 h-12 text-zinc-600 mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold mb-2">Kein Shop verbunden</h2>
        <p className="text-zinc-400">Verbinde zuerst einen Shop.</p>
      </div>
    )
  }

  // -----------------------------------------------------------------------------
  // RENDER: Feature Locked
  // -----------------------------------------------------------------------------

  if (!hasCampaignManagement) {
    return (
      <div className="card bg-gradient-to-r from-amber-500/10 via-transparent to-transparent border-amber-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-amber-400" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold">Kampagnen-Management freischalten</h3>
              <p className="text-sm text-zinc-400">
                Verwalte und optimiere deine Werbekampagnen über alle Plattformen
              </p>
            </div>
          </div>
          <a
            href="/settings#subscription"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Crown className="w-5 h-5" aria-hidden="true" />
            Auf Premium upgraden
          </a>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------------
  // RENDER: Main Content
  // -----------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Kampagnen</h2>
          <p className="text-sm text-zinc-400">
            Übersicht und Verwaltung deiner Werbekampagnen
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tier === 'vip' && (
            <button
              onClick={handleExport}
              disabled={exportMutation.isPending || campaigns.length === 0}
              className="btn-secondary"
              aria-label="Kampagnen als CSV exportieren"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export
            </button>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary"
            aria-label="Kampagnen aktualisieren"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div
          className="grid grid-cols-2 lg:grid-cols-5 gap-4"
          role="region"
          aria-label="Kampagnen-Statistiken"
        >
          <StatsCard
            title="Aktiv"
            value={stats.active_campaigns}
            icon={<Play className="w-4 h-4" aria-hidden="true" />}
          />
          <StatsCard
            title="Ausgaben heute"
            value={`${stats.total_spend_today.toFixed(2)}€`}
            icon={<DollarSign className="w-4 h-4" aria-hidden="true" />}
          />
          <StatsCard
            title="Umsatz"
            value={`${stats.total_revenue.toFixed(2)}€`}
            icon={<TrendingUp className="w-4 h-4" aria-hidden="true" />}
            color="green"
          />
          <StatsCard
            title="Impressionen"
            value={`${(stats.total_impressions / 1000).toFixed(1)}k`}
            icon={<Eye className="w-4 h-4" aria-hidden="true" />}
          />
          <StatsCard
            title="Ø ROAS"
            value={`${stats.avg_roas.toFixed(1)}x`}
            icon={<BarChart3 className="w-4 h-4" aria-hidden="true" />}
            color="amber"
          />
        </div>
      )}

      {/* Platform Chart + Filters */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Platform Chart */}
        <div className="card" role="figure" aria-label="Umsatz nach Plattform">
          <h3 className="font-medium mb-4">Umsatz nach Plattform</h3>
          {platformData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(2)}€`}
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-500">
              Keine Daten
            </div>
          )}
          <div className="flex justify-center gap-6 mt-4">
            {platformData.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: p.color }}
                  aria-hidden="true"
                />
                <span className="text-sm text-zinc-400">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="lg:col-span-2 card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="font-medium">
              Kampagnen ({totalCampaigns})
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  placeholder="Suchen..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input pl-9 py-1.5 text-sm w-40"
                  aria-label="Kampagnen durchsuchen"
                />
              </div>

              {/* Platform Filter */}
              <select
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
                className="input py-1.5 text-sm"
                aria-label="Nach Plattform filtern"
              >
                <option value="all">Alle Plattformen</option>
                <option value="pinterest">Pinterest</option>
                <option value="meta">Meta</option>
                <option value="google">Google</option>
              </select>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input py-1.5 text-sm"
                aria-label="Nach Status filtern"
              >
                <option value="all">Alle Status</option>
                <option value="active">Aktiv</option>
                <option value="paused">Pausiert</option>
                <option value="ended">Beendet</option>
              </select>
            </div>
          </div>

          {/* Campaign Mini-List */}
          <div
            className="space-y-2 max-h-64 overflow-y-auto"
            role="list"
            aria-label="Kampagnenliste"
          >
            {campaigns.slice(0, 5).map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-3 bg-surface-highlight rounded-lg"
                role="listitem"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      campaign.platform === 'pinterest'
                        ? 'bg-red-500/10 text-red-500'
                        : campaign.platform === 'meta'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-blue-400/10 text-blue-400'
                    }`}
                  >
                    {getPlatformIcon(campaign.platform)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{campaign.name}</p>
                    <p className="text-xs text-zinc-500">
                      {campaign.products_count} Produkte
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {campaign.revenue.toFixed(2)}€
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      campaign.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {campaign.status === 'active' ? 'Aktiv' : 'Pausiert'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Campaign Table */}
      <div className="card">
        <h3 className="font-medium mb-4">Detailübersicht</h3>

        {isLoading ? (
          <div
            className="flex items-center justify-center py-12"
            role="status"
            aria-label="Lade Kampagnen..."
          >
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : campaigns.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table
                className="w-full"
                role="table"
                aria-label="Kampagnen-Detailtabelle"
              >
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                      Kampagne
                    </th>
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                      Status
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-zinc-400">
                      Budget
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-zinc-400">
                      Impressionen
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-zinc-400">
                      CTR
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-zinc-400">
                      Conv.
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-zinc-400">
                      Umsatz
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-zinc-400">
                      ROAS
                    </th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-zinc-400">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b border-zinc-800/50 hover:bg-surface-highlight/30"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              campaign.platform === 'pinterest'
                                ? 'bg-red-500/10 text-red-500'
                                : campaign.platform === 'meta'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-blue-400/10 text-blue-400'
                            }`}
                          >
                            {getPlatformIcon(campaign.platform)}
                          </div>
                          <span className="font-medium">{campaign.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge ${
                            campaign.status === 'active'
                              ? 'badge-success'
                              : 'bg-zinc-700 text-zinc-400'
                          }`}
                        >
                          {campaign.status === 'active' ? 'Aktiv' : 'Pausiert'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {campaign.spent_today.toFixed(2)}€ / {campaign.budget_daily}€
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-400">
                        {campaign.impressions.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-400">
                        {campaign.ctr.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-400">
                        {campaign.conversions}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-400">
                        {campaign.revenue.toFixed(2)}€
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {campaign.roas > 0 ? `${campaign.roas.toFixed(1)}x` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleCampaign(campaign)}
                            disabled={toggleMutation.isPending}
                            className={`p-2 rounded-lg transition ${
                              campaign.status === 'active'
                                ? 'text-amber-400 hover:bg-amber-500/10'
                                : 'text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                            aria-label={
                              campaign.status === 'active'
                                ? `${campaign.name} pausieren`
                                : `${campaign.name} aktivieren`
                            }
                          >
                            {campaign.status === 'active' ? (
                              <Pause className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Play className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenSettings(campaign)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-surface-highlight rounded-lg transition"
                            aria-label={`Einstellungen für ${campaign.name}`}
                          >
                            <Settings className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800"
                role="navigation"
                aria-label="Seitennavigation"
              >
                <p className="text-sm text-zinc-400">
                  Seite {page} von {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary disabled:opacity-50"
                    aria-label="Vorherige Seite"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary disabled:opacity-50"
                    aria-label="Nächste Seite"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-zinc-400" role="status">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p>Keine Kampagnen gefunden</p>
            {filters.search || filters.platform !== 'all' || filters.status !== 'all' ? (
              <button
                onClick={() => setFilters({
                  platform: 'all',
                  status: 'all',
                  search: '',
                  sort_by: 'created_at',
                  sort_order: 'desc'
                })}
                className="text-primary hover:underline mt-2"
              >
                Filter zurücksetzen
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      {selectedCampaign && (
        <CampaignSettingsDialog
          campaign={selectedCampaign}
          isOpen={showSettings}
          onClose={() => {
            setShowSettings(false)
            setSelectedCampaign(null)
          }}
          onSave={handleSaveSettings}
          isLoading={budgetMutation.isPending}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        title={
          confirmAction?.action === 'pause'
            ? 'Kampagne pausieren?'
            : 'Kampagne aktivieren?'
        }
        message={
          confirmAction?.action === 'pause'
            ? `"${confirmAction.campaign.name}" wird pausiert und generiert keine Kosten mehr.`
            : `"${confirmAction?.campaign.name}" wird wieder aktiviert und generiert Kosten.`
        }
        confirmLabel={confirmAction?.action === 'pause' ? 'Pausieren' : 'Aktivieren'}
        confirmVariant={confirmAction?.action === 'pause' ? 'danger' : 'primary'}
        onConfirm={confirmToggle}
        onCancel={() => setConfirmAction(null)}
        isLoading={toggleMutation.isPending}
      />
    </div>
  )
}
```

---

## 6. Verifizierung

- [ ] Kampagnen-Liste lädt korrekt mit Pagination
- [ ] Filter (Plattform, Status, Suche) funktionieren
- [ ] Stats zeigen korrekte aggregierte Werte
- [ ] Plattform-Chart rendert mit korrekten Farben
- [ ] Play/Pause mit Bestätigungsdialog
- [ ] Settings-Dialog öffnet sich und speichert
- [ ] Export (VIP only) generiert CSV-Datei
- [ ] Optimistic Updates mit Rollback bei Fehler
- [ ] Toast-Benachrichtigungen erscheinen
- [ ] Responsive Layout auf Mobile
- [ ] Alle Buttons haben aria-labels
- [ ] Tabelle ist screen-reader-freundlich (scope, role)
- [ ] Tastaturnavigation funktioniert
- [ ] Feature Gating für Nicht-Premium-User

## 7. Abhängigkeiten

- Phase 5.1 (Pinterest Integration)
- Phase 3.1 (Dashboard Layout)
- `sonner` für Toast-Benachrichtigungen
- `recharts` für Pie-Chart
- React Query für State Management

## 8. Nächster Schritt

→ Phase 5.4 - Advanced Analytics
