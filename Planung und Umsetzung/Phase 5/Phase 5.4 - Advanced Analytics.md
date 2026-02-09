# Phase 5.4 - Advanced Analytics

## Ziel
Erweiterte Analytics-Seite mit detaillierten Einblicken, Conversion-Tracking und Export-Funktionalität für VIP-Nutzer.

---

## 1. Shared Types

### src/types/analytics.types.ts

```typescript
// =============================================================================
// ANALYTICS TYPES
// Zentrale Typen für Advanced Analytics
// =============================================================================

// -----------------------------------------------------------------------------
// Date Range Types
// -----------------------------------------------------------------------------

export type DateRange = '7d' | '30d' | '90d' | 'custom'

export interface DateRangeParams {
  start_date: string  // ISO 8601
  end_date: string    // ISO 8601
}

// -----------------------------------------------------------------------------
// KPI Types
// -----------------------------------------------------------------------------

export interface KPIData {
  revenue: number
  revenue_change: number  // Prozentuale Änderung zum Vorperiode
  orders: number
  orders_change: number
  avg_order_value: number
  aov_change: number
  conversion_rate: number  // In Prozent
  cr_change: number
  visitors: number
  visitors_change: number
  ad_spend: number
  ad_spend_change: number
  roas: number
  roas_change: number
}

// -----------------------------------------------------------------------------
// Chart Data Types
// -----------------------------------------------------------------------------

export interface RevenueDataPoint {
  date: string          // Format: DD.MM
  full_date: string     // ISO 8601 für Tooltips
  revenue: number
  orders: number
  visitors: number
  ad_spend: number
}

export interface HourlyDataPoint {
  hour: string  // Format: HH:00
  orders: number
  revenue: number
}

export interface NichePerformance {
  id: string
  name: string
  revenue: number
  products: number
  winners: number
  color: string
  growth: number  // Prozent
}

export interface TopProduct {
  id: string
  title: string
  image_url: string | null
  sales: number
  revenue: number
  trend: 'up' | 'down' | 'stable'
}

// -----------------------------------------------------------------------------
// Conversion Funnel
// -----------------------------------------------------------------------------

export interface FunnelStage {
  stage: string
  label: string
  value: number
  percent: number      // Prozent vom ersten Stage
  drop_off: number     // Prozent Verlust vom vorherigen Stage
}

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface AnalyticsOverviewResponse {
  kpi: KPIData
  revenue_chart: RevenueDataPoint[]
  period: {
    start: string
    end: string
    days: number
  }
}

export interface AdvancedAnalyticsResponse {
  niche_performance: NichePerformance[]
  top_products: TopProduct[]
  conversion_funnel: FunnelStage[]
  hourly_distribution: HourlyDataPoint[]
  geographic_data: {
    country: string
    revenue: number
    orders: number
  }[]
}

export interface AnalyticsExportResponse {
  headers: string[]
  rows: (string | number)[][]
  filename: string
}

// -----------------------------------------------------------------------------
// Export Types
// -----------------------------------------------------------------------------

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

export interface ExportRequest {
  format: ExportFormat
  date_range: DateRange
  include_charts: boolean
  sections: ('kpi' | 'revenue' | 'niches' | 'products' | 'funnel')[]
}
```

---

## 2. Backend API

### backend/api/routes/pod_autom_analytics.py

```python
"""
POD AutoM - Analytics API Routes
Detaillierte Geschäftsanalysen und Reporting
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
import re
from datetime import datetime, timedelta
from supabase import create_client

bp = Blueprint('pod_autom_analytics', __name__, url_prefix='/pod-autom/analytics')

# Supabase Client
supabase = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_KEY')
)

# UUID Regex
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
            return jsonify({'error': 'Missing authorization header'}), 401

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(
                token,
                os.environ.get('SUPABASE_JWT_SECRET'),
                algorithms=['HS256'],
                audience='authenticated'
            )
            request.user_id = payload.get('sub')
            if not request.user_id:
                return jsonify({'error': 'Invalid token'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401

        return f(*args, **kwargs)
    return decorated


def require_vip(f):
    """VIP Subscription erforderlich"""
    @wraps(f)
    def decorated(*args, **kwargs):
        sub_result = supabase.table('pod_autom_subscriptions') \
            .select('tier, status') \
            .eq('user_id', request.user_id) \
            .eq('status', 'active') \
            .single() \
            .execute()

        if not sub_result.data:
            return jsonify({'error': 'No active subscription'}), 403

        tier = sub_result.data.get('tier')
        if tier != 'vip':
            return jsonify({
                'error': 'Feature requires VIP subscription',
                'required_tier': 'vip',
                'current_tier': tier
            }), 403

        request.subscription_tier = tier
        return f(*args, **kwargs)
    return decorated


def validate_uuid(uuid_string: str) -> bool:
    return bool(UUID_PATTERN.match(uuid_string))


def verify_shop_ownership(shop_id: str, user_id: str) -> bool:
    result = supabase.table('pod_autom_shops') \
        .select('id') \
        .eq('id', shop_id) \
        .eq('user_id', user_id) \
        .single() \
        .execute()
    return result.data is not None


def get_date_range(range_param: str) -> tuple[datetime, datetime]:
    """Datumsbereich aus Parameter berechnen"""
    now = datetime.utcnow()
    end_date = now.replace(hour=23, minute=59, second=59)

    if range_param == '7d':
        start_date = now - timedelta(days=7)
    elif range_param == '30d':
        start_date = now - timedelta(days=30)
    elif range_param == '90d':
        start_date = now - timedelta(days=90)
    else:
        start_date = now - timedelta(days=7)

    return start_date.replace(hour=0, minute=0, second=0), end_date


# =============================================================================
# ROUTES
# =============================================================================

@bp.route('/<shop_id>/overview', methods=['GET'])
@require_auth
def get_analytics_overview(shop_id: str):
    """
    KPI-Übersicht und Umsatz-Chart

    Query Parameters:
    - range: 7d | 30d | 90d (default: 7d)
    """
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop ID'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found'}), 404

    date_range = request.args.get('range', '7d')
    start_date, end_date = get_date_range(date_range)

    # Vorperiode für Vergleich
    period_days = (end_date - start_date).days
    prev_start = start_date - timedelta(days=period_days)
    prev_end = start_date - timedelta(seconds=1)

    # KPI-Daten abrufen via RPC
    kpi_result = supabase.rpc('get_analytics_kpi', {
        'p_shop_id': shop_id,
        'p_start_date': start_date.isoformat(),
        'p_end_date': end_date.isoformat(),
        'p_prev_start_date': prev_start.isoformat(),
        'p_prev_end_date': prev_end.isoformat()
    }).execute()

    # Umsatz-Chart-Daten (gruppiert nach Tag)
    chart_result = supabase.rpc('get_revenue_chart_data', {
        'p_shop_id': shop_id,
        'p_start_date': start_date.isoformat(),
        'p_end_date': end_date.isoformat()
    }).execute()

    kpi = kpi_result.data[0] if kpi_result.data else _get_empty_kpi()
    chart = chart_result.data or []

    return jsonify({
        'kpi': kpi,
        'revenue_chart': chart,
        'period': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat(),
            'days': period_days
        }
    })


@bp.route('/<shop_id>/advanced', methods=['GET'])
@require_auth
@require_vip
def get_advanced_analytics(shop_id: str):
    """
    Advanced Analytics (nur VIP)
    - Nischen-Performance
    - Top-Produkte
    - Conversion Funnel
    - Hourly Distribution
    """
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop ID'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found'}), 404

    date_range = request.args.get('range', '7d')
    start_date, end_date = get_date_range(date_range)

    # Parallele RPC Calls für Performance
    niche_result = supabase.rpc('get_niche_performance', {
        'p_shop_id': shop_id,
        'p_start_date': start_date.isoformat(),
        'p_end_date': end_date.isoformat()
    }).execute()

    products_result = supabase.rpc('get_top_products', {
        'p_shop_id': shop_id,
        'p_start_date': start_date.isoformat(),
        'p_end_date': end_date.isoformat(),
        'p_limit': 5
    }).execute()

    funnel_result = supabase.rpc('get_conversion_funnel', {
        'p_shop_id': shop_id,
        'p_start_date': start_date.isoformat(),
        'p_end_date': end_date.isoformat()
    }).execute()

    hourly_result = supabase.rpc('get_hourly_distribution', {
        'p_shop_id': shop_id,
        'p_start_date': start_date.isoformat(),
        'p_end_date': end_date.isoformat()
    }).execute()

    return jsonify({
        'niche_performance': niche_result.data or [],
        'top_products': products_result.data or [],
        'conversion_funnel': funnel_result.data or _get_empty_funnel(),
        'hourly_distribution': hourly_result.data or _get_empty_hourly()
    })


@bp.route('/<shop_id>/export', methods=['POST'])
@require_auth
@require_vip
def export_analytics(shop_id: str):
    """
    Analytics-Daten exportieren (VIP only)

    Request Body:
    {
        "format": "csv" | "xlsx",
        "date_range": "7d" | "30d" | "90d",
        "sections": ["kpi", "revenue", "niches", "products", "funnel"]
    }
    """
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop ID'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found'}), 404

    data = request.get_json() or {}
    export_format = data.get('format', 'csv')
    date_range = data.get('date_range', '7d')
    sections = data.get('sections', ['kpi', 'revenue'])

    if export_format not in ['csv', 'xlsx']:
        return jsonify({'error': 'Unsupported format'}), 400

    start_date, end_date = get_date_range(date_range)

    # Export-Daten zusammenstellen
    export_data = {
        'headers': [],
        'rows': []
    }

    if 'kpi' in sections:
        kpi_result = supabase.rpc('get_analytics_kpi', {
            'p_shop_id': shop_id,
            'p_start_date': start_date.isoformat(),
            'p_end_date': end_date.isoformat(),
            'p_prev_start_date': (start_date - timedelta(days=7)).isoformat(),
            'p_prev_end_date': start_date.isoformat()
        }).execute()

        if kpi_result.data:
            kpi = kpi_result.data[0]
            export_data['headers'] = [
                'Metrik', 'Wert', 'Änderung (%)'
            ]
            export_data['rows'] = [
                ['Umsatz', f"{kpi['revenue']:.2f}€", f"{kpi['revenue_change']:.1f}%"],
                ['Bestellungen', kpi['orders'], f"{kpi['orders_change']:.1f}%"],
                ['Ø Warenkorbwert', f"{kpi['avg_order_value']:.2f}€", f"{kpi['aov_change']:.1f}%"],
                ['Conversion Rate', f"{kpi['conversion_rate']:.2f}%", f"{kpi['cr_change']:.1f}%"],
                ['Besucher', kpi['visitors'], f"{kpi['visitors_change']:.1f}%"],
                ['Werbeausgaben', f"{kpi['ad_spend']:.2f}€", f"{kpi['ad_spend_change']:.1f}%"],
                ['ROAS', f"{kpi['roas']:.2f}x", f"{kpi['roas_change']:.1f}%"]
            ]

    if 'revenue' in sections:
        chart_result = supabase.rpc('get_revenue_chart_data', {
            'p_shop_id': shop_id,
            'p_start_date': start_date.isoformat(),
            'p_end_date': end_date.isoformat()
        }).execute()

        if chart_result.data:
            if not export_data['headers']:
                export_data['headers'] = ['Datum', 'Umsatz', 'Bestellungen', 'Besucher']
            for row in chart_result.data:
                export_data['rows'].append([
                    row['date'],
                    f"{row['revenue']:.2f}€",
                    row['orders'],
                    row['visitors']
                ])

    filename = f"analytics_{shop_id}_{date_range}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{export_format}"

    return jsonify({
        'headers': export_data['headers'],
        'rows': export_data['rows'],
        'filename': filename
    })


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _get_empty_kpi():
    """Leere KPI-Daten"""
    return {
        'revenue': 0,
        'revenue_change': 0,
        'orders': 0,
        'orders_change': 0,
        'avg_order_value': 0,
        'aov_change': 0,
        'conversion_rate': 0,
        'cr_change': 0,
        'visitors': 0,
        'visitors_change': 0,
        'ad_spend': 0,
        'ad_spend_change': 0,
        'roas': 0,
        'roas_change': 0
    }


def _get_empty_funnel():
    """Leerer Conversion Funnel"""
    return [
        {'stage': 'impressions', 'label': 'Impressionen', 'value': 0, 'percent': 100, 'drop_off': 0},
        {'stage': 'clicks', 'label': 'Klicks', 'value': 0, 'percent': 0, 'drop_off': 100},
        {'stage': 'add_to_cart', 'label': 'Add to Cart', 'value': 0, 'percent': 0, 'drop_off': 100},
        {'stage': 'checkout', 'label': 'Checkout', 'value': 0, 'percent': 0, 'drop_off': 100},
        {'stage': 'purchase', 'label': 'Kauf', 'value': 0, 'percent': 0, 'drop_off': 100}
    ]


def _get_empty_hourly():
    """Leere stündliche Verteilung"""
    return [{'hour': f"{h:02d}:00", 'orders': 0, 'revenue': 0} for h in range(24)]
```

---

## 3. SQL Stored Procedures

### supabase/migrations/20240602_analytics_functions.sql

```sql
-- =============================================================================
-- POD AutoM Analytics Stored Procedures
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Get Analytics KPI
-- Berechnet alle KPI-Metriken mit Vergleich zur Vorperiode
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_analytics_kpi(
    p_shop_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_prev_start_date TIMESTAMPTZ,
    p_prev_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    revenue NUMERIC,
    revenue_change NUMERIC,
    orders BIGINT,
    orders_change NUMERIC,
    avg_order_value NUMERIC,
    aov_change NUMERIC,
    conversion_rate NUMERIC,
    cr_change NUMERIC,
    visitors BIGINT,
    visitors_change NUMERIC,
    ad_spend NUMERIC,
    ad_spend_change NUMERIC,
    roas NUMERIC,
    roas_change NUMERIC
) AS $$
DECLARE
    current_revenue NUMERIC;
    prev_revenue NUMERIC;
    current_orders BIGINT;
    prev_orders BIGINT;
    current_visitors BIGINT;
    prev_visitors BIGINT;
    current_ad_spend NUMERIC;
    prev_ad_spend NUMERIC;
BEGIN
    -- Aktuelle Periode
    SELECT
        COALESCE(SUM(o.total_amount), 0),
        COUNT(o.id),
        COALESCE(SUM(DISTINCT v.count), 0)
    INTO current_revenue, current_orders, current_visitors
    FROM pod_autom_orders o
    LEFT JOIN pod_autom_visitors v ON v.shop_id = o.shop_id
        AND v.date BETWEEN p_start_date::DATE AND p_end_date::DATE
    WHERE o.shop_id = p_shop_id
        AND o.created_at BETWEEN p_start_date AND p_end_date;

    -- Vorperiode
    SELECT
        COALESCE(SUM(o.total_amount), 0),
        COUNT(o.id),
        COALESCE(SUM(DISTINCT v.count), 0)
    INTO prev_revenue, prev_orders, prev_visitors
    FROM pod_autom_orders o
    LEFT JOIN pod_autom_visitors v ON v.shop_id = o.shop_id
        AND v.date BETWEEN p_prev_start_date::DATE AND p_prev_end_date::DATE
    WHERE o.shop_id = p_shop_id
        AND o.created_at BETWEEN p_prev_start_date AND p_prev_end_date;

    -- Ad Spend
    SELECT COALESCE(SUM(spent_today), 0)
    INTO current_ad_spend
    FROM pod_autom_campaigns
    WHERE shop_id = p_shop_id;

    SELECT COALESCE(SUM(spent_total), 0)
    INTO prev_ad_spend
    FROM pod_autom_campaign_daily_stats
    WHERE shop_id = p_shop_id
        AND date BETWEEN p_prev_start_date::DATE AND p_prev_end_date::DATE;

    -- Berechnung
    RETURN QUERY SELECT
        current_revenue,
        CASE WHEN prev_revenue > 0
            THEN ROUND(((current_revenue - prev_revenue) / prev_revenue * 100)::NUMERIC, 1)
            ELSE 0
        END,
        current_orders,
        CASE WHEN prev_orders > 0
            THEN ROUND(((current_orders - prev_orders)::NUMERIC / prev_orders * 100), 1)
            ELSE 0
        END,
        CASE WHEN current_orders > 0
            THEN ROUND((current_revenue / current_orders)::NUMERIC, 2)
            ELSE 0
        END,
        CASE WHEN prev_orders > 0 AND prev_revenue > 0
            THEN ROUND((((current_revenue / NULLIF(current_orders, 0)) -
                        (prev_revenue / prev_orders)) /
                        (prev_revenue / prev_orders) * 100)::NUMERIC, 1)
            ELSE 0
        END,
        CASE WHEN current_visitors > 0
            THEN ROUND((current_orders::NUMERIC / current_visitors * 100), 2)
            ELSE 0
        END,
        CASE WHEN prev_visitors > 0 AND prev_orders > 0
            THEN ROUND((((current_orders::NUMERIC / NULLIF(current_visitors, 0)) -
                        (prev_orders::NUMERIC / prev_visitors)) /
                        (prev_orders::NUMERIC / prev_visitors) * 100), 1)
            ELSE 0
        END,
        current_visitors,
        CASE WHEN prev_visitors > 0
            THEN ROUND(((current_visitors - prev_visitors)::NUMERIC / prev_visitors * 100), 1)
            ELSE 0
        END,
        current_ad_spend,
        CASE WHEN prev_ad_spend > 0
            THEN ROUND(((current_ad_spend - prev_ad_spend) / prev_ad_spend * 100)::NUMERIC, 1)
            ELSE 0
        END,
        CASE WHEN current_ad_spend > 0
            THEN ROUND((current_revenue / current_ad_spend)::NUMERIC, 2)
            ELSE 0
        END,
        CASE WHEN prev_ad_spend > 0 AND prev_revenue > 0
            THEN ROUND((((current_revenue / NULLIF(current_ad_spend, 0)) -
                        (prev_revenue / prev_ad_spend)) /
                        (prev_revenue / prev_ad_spend) * 100)::NUMERIC, 1)
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Get Revenue Chart Data
-- Tägliche Umsatz-Daten für Charts
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_revenue_chart_data(
    p_shop_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    date TEXT,
    full_date TEXT,
    revenue NUMERIC,
    orders BIGINT,
    visitors BIGINT,
    ad_spend NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            p_start_date::DATE,
            p_end_date::DATE,
            '1 day'::INTERVAL
        )::DATE AS day
    ),
    daily_orders AS (
        SELECT
            DATE(created_at) AS day,
            COALESCE(SUM(total_amount), 0) AS revenue,
            COUNT(*) AS orders
        FROM pod_autom_orders
        WHERE shop_id = p_shop_id
            AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY DATE(created_at)
    ),
    daily_visitors AS (
        SELECT date AS day, COALESCE(count, 0) AS visitors
        FROM pod_autom_visitors
        WHERE shop_id = p_shop_id
            AND date BETWEEN p_start_date::DATE AND p_end_date::DATE
    ),
    daily_spend AS (
        SELECT date AS day, COALESCE(SUM(spend), 0) AS ad_spend
        FROM pod_autom_campaign_daily_stats
        WHERE shop_id = p_shop_id
            AND date BETWEEN p_start_date::DATE AND p_end_date::DATE
        GROUP BY date
    )
    SELECT
        TO_CHAR(ds.day, 'DD.MM') AS date,
        ds.day::TEXT AS full_date,
        COALESCE(o.revenue, 0)::NUMERIC,
        COALESCE(o.orders, 0)::BIGINT,
        COALESCE(v.visitors, 0)::BIGINT,
        COALESCE(s.ad_spend, 0)::NUMERIC
    FROM date_series ds
    LEFT JOIN daily_orders o ON o.day = ds.day
    LEFT JOIN daily_visitors v ON v.day = ds.day
    LEFT JOIN daily_spend s ON s.day = ds.day
    ORDER BY ds.day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Get Niche Performance
-- Performance-Daten nach Nische
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_niche_performance(
    p_shop_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    revenue NUMERIC,
    products BIGINT,
    winners BIGINT,
    color TEXT,
    growth NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.name::TEXT,
        COALESCE(SUM(o.total_amount), 0)::NUMERIC AS revenue,
        COUNT(DISTINCT p.id)::BIGINT AS products,
        COUNT(DISTINCT w.id)::BIGINT AS winners,
        COALESCE(n.color, '#8b5cf6')::TEXT AS color,
        -- Growth: Vergleich zur Vorwoche
        CASE WHEN LAG(SUM(o.total_amount)) OVER (PARTITION BY n.id ORDER BY DATE(o.created_at)) > 0
            THEN ROUND(((SUM(o.total_amount) -
                LAG(SUM(o.total_amount)) OVER (PARTITION BY n.id ORDER BY DATE(o.created_at))) /
                LAG(SUM(o.total_amount)) OVER (PARTITION BY n.id ORDER BY DATE(o.created_at)) * 100)::NUMERIC, 1)
            ELSE 0
        END AS growth
    FROM pod_autom_niches n
    LEFT JOIN pod_autom_products p ON p.niche_id = n.id AND p.shop_id = p_shop_id
    LEFT JOIN pod_autom_orders o ON o.product_id = p.id
        AND o.created_at BETWEEN p_start_date AND p_end_date
    LEFT JOIN pod_autom_winners w ON w.product_id = p.id
    WHERE n.shop_id = p_shop_id
    GROUP BY n.id, n.name, n.color
    ORDER BY revenue DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Get Top Products
-- Top-verkaufte Produkte
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_top_products(
    p_shop_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    image_url TEXT,
    sales BIGINT,
    revenue NUMERIC,
    trend TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH product_stats AS (
        SELECT
            p.id,
            p.title,
            p.image_url,
            COUNT(o.id) AS sales,
            COALESCE(SUM(o.total_amount), 0) AS revenue,
            -- Trend basierend auf letzten 7 Tagen vs. davor
            CASE
                WHEN SUM(CASE WHEN o.created_at >= p_end_date - INTERVAL '7 days' THEN o.total_amount ELSE 0 END) >
                     SUM(CASE WHEN o.created_at < p_end_date - INTERVAL '7 days' THEN o.total_amount ELSE 0 END)
                THEN 'up'
                WHEN SUM(CASE WHEN o.created_at >= p_end_date - INTERVAL '7 days' THEN o.total_amount ELSE 0 END) <
                     SUM(CASE WHEN o.created_at < p_end_date - INTERVAL '7 days' THEN o.total_amount ELSE 0 END)
                THEN 'down'
                ELSE 'stable'
            END AS trend
        FROM pod_autom_products p
        LEFT JOIN pod_autom_orders o ON o.product_id = p.id
            AND o.created_at BETWEEN p_start_date AND p_end_date
        WHERE p.shop_id = p_shop_id
        GROUP BY p.id, p.title, p.image_url
    )
    SELECT
        ps.id,
        ps.title::TEXT,
        ps.image_url::TEXT,
        ps.sales::BIGINT,
        ps.revenue::NUMERIC,
        ps.trend::TEXT
    FROM product_stats ps
    WHERE ps.sales > 0
    ORDER BY ps.revenue DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Get Conversion Funnel
-- Conversion-Funnel-Daten
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_conversion_funnel(
    p_shop_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    stage TEXT,
    label TEXT,
    value BIGINT,
    percent NUMERIC,
    drop_off NUMERIC
) AS $$
DECLARE
    impressions BIGINT;
    clicks BIGINT;
    add_to_cart BIGINT;
    checkouts BIGINT;
    purchases BIGINT;
BEGIN
    -- Daten aus Campaign-Stats und Shop-Analytics holen
    SELECT
        COALESCE(SUM(c.impressions), 0),
        COALESCE(SUM(c.clicks), 0)
    INTO impressions, clicks
    FROM pod_autom_campaigns c
    WHERE c.shop_id = p_shop_id;

    SELECT
        COALESCE(SUM(s.add_to_cart_count), 0),
        COALESCE(SUM(s.checkout_count), 0),
        COALESCE(SUM(s.purchase_count), 0)
    INTO add_to_cart, checkouts, purchases
    FROM pod_autom_shop_analytics s
    WHERE s.shop_id = p_shop_id
        AND s.date BETWEEN p_start_date::DATE AND p_end_date::DATE;

    -- Funnel zurückgeben
    RETURN QUERY
    SELECT * FROM (
        VALUES
            ('impressions', 'Impressionen', impressions,
                100.0::NUMERIC,
                0.0::NUMERIC),
            ('clicks', 'Klicks', clicks,
                CASE WHEN impressions > 0 THEN ROUND((clicks::NUMERIC / impressions * 100), 2) ELSE 0 END,
                CASE WHEN impressions > 0 THEN ROUND((1 - clicks::NUMERIC / impressions) * 100, 1) ELSE 100 END),
            ('add_to_cart', 'Add to Cart', add_to_cart,
                CASE WHEN impressions > 0 THEN ROUND((add_to_cart::NUMERIC / impressions * 100), 2) ELSE 0 END,
                CASE WHEN clicks > 0 THEN ROUND((1 - add_to_cart::NUMERIC / clicks) * 100, 1) ELSE 100 END),
            ('checkout', 'Checkout', checkouts,
                CASE WHEN impressions > 0 THEN ROUND((checkouts::NUMERIC / impressions * 100), 2) ELSE 0 END,
                CASE WHEN add_to_cart > 0 THEN ROUND((1 - checkouts::NUMERIC / add_to_cart) * 100, 1) ELSE 100 END),
            ('purchase', 'Kauf', purchases,
                CASE WHEN impressions > 0 THEN ROUND((purchases::NUMERIC / impressions * 100), 2) ELSE 0 END,
                CASE WHEN checkouts > 0 THEN ROUND((1 - purchases::NUMERIC / checkouts) * 100, 1) ELSE 100 END)
    ) AS funnel(stage, label, value, percent, drop_off);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Get Hourly Distribution
-- Bestellungen nach Uhrzeit
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_hourly_distribution(
    p_shop_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    hour TEXT,
    orders BIGINT,
    revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH hours AS (
        SELECT generate_series(0, 23) AS h
    ),
    hourly_data AS (
        SELECT
            EXTRACT(HOUR FROM created_at)::INTEGER AS h,
            COUNT(*) AS orders,
            COALESCE(SUM(total_amount), 0) AS revenue
        FROM pod_autom_orders
        WHERE shop_id = p_shop_id
            AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY EXTRACT(HOUR FROM created_at)
    )
    SELECT
        LPAD(hrs.h::TEXT, 2, '0') || ':00' AS hour,
        COALESCE(hd.orders, 0)::BIGINT,
        COALESCE(hd.revenue, 0)::NUMERIC
    FROM hours hrs
    LEFT JOIN hourly_data hd ON hd.h = hrs.h
    ORDER BY hrs.h;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Berechtigungen
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION get_analytics_kpi(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_chart_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_niche_performance(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversion_funnel(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_distribution(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
```

---

## 4. Frontend Hooks

### src/hooks/useAnalytics.ts

```typescript
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { API_URL } from '@src/lib/constants'
import { toast } from 'sonner'
import type {
  DateRange,
  AnalyticsOverviewResponse,
  AdvancedAnalyticsResponse,
  ExportFormat
} from '@src/types/analytics.types'

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
 * Analytics-Übersicht (KPIs + Revenue Chart)
 * Verfügbar für alle Subscription-Tiers
 */
export function useAnalyticsOverview(
  shopId: string | undefined,
  dateRange: DateRange = '7d'
) {
  return useQuery({
    queryKey: ['analytics-overview', shopId, dateRange],
    queryFn: async (): Promise<AnalyticsOverviewResponse> => {
      if (!shopId) throw new Error('Shop ID required')

      const headers = await getAuthHeaders()

      const response = await fetch(
        `${API_URL}/pod-autom/analytics/${shopId}/overview?range=${dateRange}`,
        { headers }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch analytics')
      }

      return response.json()
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5,  // 5 Minuten
    refetchOnWindowFocus: false
  })
}

/**
 * Advanced Analytics (nur VIP)
 * - Nischen-Performance
 * - Top-Produkte
 * - Conversion Funnel
 * - Hourly Distribution
 */
export function useAdvancedAnalytics(
  shopId: string | undefined,
  dateRange: DateRange = '7d',
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics-advanced', shopId, dateRange],
    queryFn: async (): Promise<AdvancedAnalyticsResponse> => {
      if (!shopId) throw new Error('Shop ID required')

      const headers = await getAuthHeaders()

      const response = await fetch(
        `${API_URL}/pod-autom/analytics/${shopId}/advanced?range=${dateRange}`,
        { headers }
      )

      if (!response.ok) {
        const error = await response.json()

        // Feature nicht verfügbar für Nicht-VIP
        if (response.status === 403) {
          throw new Error('VIP_REQUIRED')
        }

        throw new Error(error.error || 'Failed to fetch advanced analytics')
      }

      return response.json()
    },
    enabled: !!shopId && enabled,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      // Nicht retry bei VIP-Fehler
      if (error.message === 'VIP_REQUIRED') return false
      return failureCount < 2
    }
  })
}

/**
 * Analytics exportieren (VIP only)
 */
export function useAnalyticsExport(shopId: string) {
  return useMutation({
    mutationFn: async ({
      format = 'csv',
      dateRange = '7d',
      sections = ['kpi', 'revenue']
    }: {
      format?: ExportFormat
      dateRange?: DateRange
      sections?: string[]
    }): Promise<void> => {
      const headers = await getAuthHeaders()

      const response = await fetch(
        `${API_URL}/pod-autom/analytics/${shopId}/export`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            format,
            date_range: dateRange,
            sections
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      const data = await response.json()

      // CSV generieren
      const csvContent = [
        data.headers.join(','),
        ...data.rows.map((row: (string | number)[]) =>
          row.map(cell => `"${cell}"`).join(',')
        )
      ].join('\n')

      // BOM für Excel-Kompatibilität
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], {
        type: 'text/csv;charset=utf-8;'
      })

      // Download
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
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

### src/components/dashboard/Analytics.tsx

```typescript
import { useState, useMemo } from 'react'
import { useShops } from '@src/hooks/useShopify'
import { useAppStore } from '@src/lib/store'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import {
  useAnalyticsOverview,
  useAdvancedAnalytics,
  useAnalyticsExport
} from '@src/hooks/useAnalytics'
import type { DateRange, FunnelStage } from '@src/types/analytics.types'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertCircle,
  Loader2,
  Lock,
  Crown,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

// =============================================================================
// CONSTANTS
// =============================================================================

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7 Tage' },
  { value: '30d', label: '30 Tage' },
  { value: '90d', label: '90 Tage' }
]

// Farben für Nischen (konsistent)
const NICHE_COLORS = [
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
]

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface KPICardProps {
  title: string
  value: string | number
  change: number
  icon: React.ComponentType<{ className?: string }>
  color: 'emerald' | 'blue' | 'violet' | 'amber' | 'red'
}

function KPICard({ title, value, change, icon: Icon, color }: KPICardProps) {
  const isPositive = change >= 0
  const isNeutral = change === 0

  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-500/10 text-blue-500',
    violet: 'bg-violet-500/10 text-violet-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500'
  }

  return (
    <div className="card" role="region" aria-label={title}>
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" />
        </div>
        <div
          className={`flex items-center gap-1 text-sm ${
            isNeutral
              ? 'text-zinc-400'
              : isPositive
              ? 'text-emerald-400'
              : 'text-red-400'
          }`}
          aria-label={`${isPositive ? 'Steigerung' : 'Rückgang'} um ${Math.abs(change)}%`}
        >
          {isNeutral ? (
            <Minus className="w-4 h-4" aria-hidden="true" />
          ) : isPositive ? (
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
          )}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-sm text-zinc-400">{title}</p>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Conversion Funnel Component
// -----------------------------------------------------------------------------

interface ConversionFunnelProps {
  data: FunnelStage[]
}

function ConversionFunnel({ data }: ConversionFunnelProps) {
  // Minimum width für Sichtbarkeit (5%)
  const getVisibleWidth = (percent: number) => Math.max(5, percent)

  return (
    <div className="space-y-4" role="list" aria-label="Conversion Funnel">
      {data.map((stage, index) => (
        <div key={stage.stage} role="listitem">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">{stage.label}</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-300">
                {stage.value.toLocaleString()}
              </span>
              <span className="text-zinc-500">
                ({stage.percent.toFixed(stage.percent < 1 ? 2 : 1)}%)
              </span>
              {index > 0 && stage.drop_off > 0 && (
                <span className="text-red-400 text-xs">
                  -{stage.drop_off.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div className="h-4 bg-surface-highlight rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-violet-400 rounded-full transition-all duration-500"
              style={{ width: `${getVisibleWidth(stage.percent)}%` }}
              role="progressbar"
              aria-valuenow={stage.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${stage.label}: ${stage.percent}%`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Analytics() {
  const { selectedShopId } = useAppStore()
  const { data: shops } = useShops()
  const { tier, canUseFeature } = useSubscription()

  const [dateRange, setDateRange] = useState<DateRange>('7d')

  const selectedShop = shops?.find(s => s.id === selectedShopId) || shops?.[0]
  const hasAdvancedAnalytics = canUseFeature('advancedAnalytics')

  // Queries
  const {
    data: overview,
    isLoading: isLoadingOverview
  } = useAnalyticsOverview(selectedShop?.id, dateRange)

  const {
    data: advanced,
    isLoading: isLoadingAdvanced
  } = useAdvancedAnalytics(selectedShop?.id, dateRange, hasAdvancedAnalytics)

  // Export Mutation
  const exportMutation = useAnalyticsExport(selectedShop?.id || '')

  // Memoized Chart Data
  const revenueChartData = useMemo(() => {
    if (!overview?.revenue_chart) return []
    return overview.revenue_chart
  }, [overview?.revenue_chart])

  const hourlyChartData = useMemo(() => {
    if (!advanced?.hourly_distribution) return []
    return advanced.hourly_distribution
  }, [advanced?.hourly_distribution])

  // Handlers
  const handleExport = () => {
    exportMutation.mutate({
      format: 'csv',
      dateRange,
      sections: ['kpi', 'revenue', 'niches', 'products']
    })
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
  // RENDER: Main
  // -----------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-zinc-400">
            Detaillierte Einblicke in deine Shop-Performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div
            className="flex gap-1 p-1 bg-surface rounded-lg"
            role="tablist"
            aria-label="Zeitraum auswählen"
          >
            {DATE_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                role="tab"
                aria-selected={dateRange === range.value}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  dateRange === range.value
                    ? 'bg-primary text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {hasAdvancedAnalytics && (
            <button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="btn-secondary"
              aria-label="Analytics als CSV exportieren"
            >
              {exportMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-4 h-4" aria-hidden="true" />
              )}
              Export
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {isLoadingOverview ? (
        <div className="flex items-center justify-center py-12" role="status">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          <span className="sr-only">Lade Analytics...</span>
        </div>
      ) : overview?.kpi && (
        <>
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            role="region"
            aria-label="Kennzahlen-Übersicht"
          >
            <KPICard
              title="Umsatz"
              value={`${overview.kpi.revenue.toLocaleString('de-DE')}€`}
              change={overview.kpi.revenue_change}
              icon={DollarSign}
              color="emerald"
            />
            <KPICard
              title="Bestellungen"
              value={overview.kpi.orders}
              change={overview.kpi.orders_change}
              icon={ShoppingCart}
              color="blue"
            />
            <KPICard
              title="Ø Warenkorbwert"
              value={`${overview.kpi.avg_order_value.toFixed(2)}€`}
              change={overview.kpi.aov_change}
              icon={Package}
              color="violet"
            />
            <KPICard
              title="Conversion Rate"
              value={`${overview.kpi.conversion_rate.toFixed(2)}%`}
              change={overview.kpi.cr_change}
              icon={TrendingUp}
              color="amber"
            />
          </div>

          {/* Revenue Chart */}
          <div className="card" role="figure" aria-label="Umsatzentwicklung">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold">Umsatzentwicklung</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full" aria-hidden="true" />
                  <span className="text-zinc-400">Umsatz</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" aria-hidden="true" />
                  <span className="text-zinc-400">Bestellungen</span>
                </div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? `${value.toFixed(2)}€` : value,
                      name === 'revenue' ? 'Umsatz' : 'Bestellungen'
                    ]}
                    labelFormatter={(label) => `Datum: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Advanced Analytics (VIP Only) */}
          {hasAdvancedAnalytics ? (
            isLoadingAdvanced ? (
              <div className="flex items-center justify-center py-12" role="status">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                <span className="sr-only">Lade erweiterte Analytics...</span>
              </div>
            ) : advanced && (
              <>
                {/* Niche Performance + Top Products */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Niche Performance */}
                  <div className="card">
                    <h3 className="font-semibold mb-4">Performance nach Nische</h3>
                    {advanced.niche_performance.length > 0 ? (
                      <div className="space-y-4" role="list">
                        {advanced.niche_performance.map((niche, index) => (
                          <div
                            key={niche.id}
                            className="flex items-center gap-4"
                            role="listitem"
                          >
                            <div className="w-24 text-sm font-medium truncate">
                              {niche.name}
                            </div>
                            <div className="flex-1">
                              <div className="h-2 bg-surface-highlight rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.max(5, (niche.revenue / (advanced.niche_performance[0]?.revenue || 1)) * 100)}%`,
                                    backgroundColor: NICHE_COLORS[index % NICHE_COLORS.length]
                                  }}
                                />
                              </div>
                            </div>
                            <div className="text-right min-w-[100px]">
                              <p className="font-medium">
                                {niche.revenue.toLocaleString('de-DE')}€
                              </p>
                              <p className="text-xs text-zinc-500">
                                {niche.products} Produkte
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-center py-8">
                        Keine Nischen-Daten verfügbar
                      </p>
                    )}
                  </div>

                  {/* Top Products */}
                  <div className="card">
                    <h3 className="font-semibold mb-4">Top Produkte</h3>
                    {advanced.top_products.length > 0 ? (
                      <div className="space-y-3" role="list">
                        {advanced.top_products.map((product, index) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-3 bg-surface-highlight rounded-lg"
                            role="listitem"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold text-primary"
                                aria-label={`Rang ${index + 1}`}
                              >
                                {index + 1}
                              </span>
                              <span className="font-medium truncate max-w-[200px]">
                                {product.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {product.trend === 'up' && (
                                <TrendingUp
                                  className="w-4 h-4 text-emerald-400"
                                  aria-label="Steigend"
                                />
                              )}
                              {product.trend === 'down' && (
                                <TrendingDown
                                  className="w-4 h-4 text-red-400"
                                  aria-label="Fallend"
                                />
                              )}
                              <div className="text-right">
                                <p className="font-medium">
                                  {product.revenue.toFixed(2)}€
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {product.sales} Verkäufe
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-center py-8">
                        Keine Produkt-Daten verfügbar
                      </p>
                    )}
                  </div>
                </div>

                {/* Conversion Funnel + Hourly Distribution */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Conversion Funnel */}
                  <div className="card">
                    <h3 className="font-semibold mb-4">Conversion Funnel</h3>
                    <ConversionFunnel data={advanced.conversion_funnel} />
                  </div>

                  {/* Hourly Distribution */}
                  <div
                    className="card"
                    role="figure"
                    aria-label="Bestellungen nach Uhrzeit"
                  >
                    <h3 className="font-semibold mb-4">Bestellungen nach Uhrzeit</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyChartData}>
                          <XAxis
                            dataKey="hour"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#71717a', fontSize: 10 }}
                            interval={3}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#71717a', fontSize: 10 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              border: '1px solid #27272a',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number) => [value, 'Bestellungen']}
                            labelFormatter={(label) => `Uhrzeit: ${label}`}
                          />
                          <Bar
                            dataKey="orders"
                            fill="#8b5cf6"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )
          ) : (
            /* Upgrade Banner */
            <div className="card bg-gradient-to-r from-amber-500/10 via-transparent to-transparent border-amber-500/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <Lock className="w-6 h-6 text-amber-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Advanced Analytics freischalten</h3>
                    <p className="text-sm text-zinc-400">
                      Conversion Funnel, Nischen-Analyse, Zeitbasierte Insights und mehr
                    </p>
                  </div>
                </div>
                <a
                  href="/settings#subscription"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Crown className="w-5 h-5" aria-hidden="true" />
                  Auf VIP upgraden
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

---

## 6. Performance-Ziele

| Metrik | Ziel | Beschreibung |
|--------|------|--------------|
| FCP | < 1.8s | First Contentful Paint |
| LCP | < 2.5s | Largest Contentful Paint |
| FID | < 100ms | First Input Delay |
| CLS | < 0.1 | Cumulative Layout Shift |
| TTI | < 3.8s | Time to Interactive |

---

## 7. Verifizierung

- [ ] KPI-Cards zeigen korrekte Werte mit Vergleich zur Vorperiode
- [ ] Umsatz-Chart rendert mit Gradient und zwei Linien
- [ ] Date-Range Filter aktualisiert alle Daten
- [ ] Nischen-Performance zeigt Progress-Bars mit Farben
- [ ] Top-Produkte zeigen Trend-Indikatoren
- [ ] Conversion Funnel zeigt Drop-Off-Raten
- [ ] Funnel-Balken haben Mindestbreite von 5%
- [ ] Hourly Distribution zeigt 24h-Daten
- [ ] Export-Button (nur VIP) generiert CSV mit BOM
- [ ] Upgrade-Banner für Nicht-VIP-User
- [ ] Alle Charts haben Tooltips mit korrekter Formatierung
- [ ] Y-Achsen haben lesbare Labels (€, %)
- [ ] Responsive Layout auf Mobile
- [ ] Alle Elemente haben aria-labels
- [ ] Loading States für alle API-Calls
- [ ] Error Handling mit Toast-Notifications

---

## 8. Abhängigkeiten

- Phase 3.1 (Dashboard Layout)
- Phase 6.1 (Stripe Integration für VIP-Prüfung)
- `recharts` für alle Charts
- `sonner` für Toast-Benachrichtigungen
- React Query für Data Fetching

---

## 9. Nächster Schritt

→ Phase 6.1 - Stripe Integration
