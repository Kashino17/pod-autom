# Phase 6.3 - Feature Gating nach Tier

## Ziel
Implementierung von Feature-Einschränkungen basierend auf dem Subscription-Tier mit vollständiger Backend-Durchsetzung und benutzerfreundlichen Frontend-Komponenten.

---

## 1. Feature-Matrix

| Feature | Basis | Premium | VIP |
|---------|-------|---------|-----|
| Max Nischen | 5 | 15 | ∞ |
| Max Produkte/Monat | 100 | 500 | ∞ |
| Pinterest Ads | ✓ (nur 1 Account) | ✓ (Multi) | ✓ (Multi) |
| Meta Ads | ✓ (nur 1 Account) | ✓ (Multi) | ✓ (Multi) |
| Google Ads | ✗ | ✗ | ✓ |
| TikTok Ads | ✗ | ✗ | ✓ |
| Winner Scaling | ✗ | ✓ | ✓ |
| Advanced Analytics | ✗ | ✗ | ✓ |
| Support | Email | Priority | 1:1 |

---

## 2. TypeScript-Typen

### src/types/features.types.ts

```typescript
import type { SubscriptionTier } from './stripe.types'

// Alle verfügbaren Features
export type Feature =
  | 'winnerScaling'
  | 'advancedAnalytics'
  | 'multiPlatform'      // Mehrere Ad-Accounts pro Plattform
  | 'allPlatforms'       // Google + TikTok Ads
  | 'prioritySupport'
  | 'oneOnOneSupport'

// Ressourcen mit Limits
export type LimitedResource = 'niches' | 'products' | 'adAccounts'

// Feature Access Result
export interface FeatureAccessResult {
  hasAccess: boolean
  requiredTier: SubscriptionTier | null
  reason?: string
}

// Resource Limit Result
export interface ResourceLimitResult {
  limit: number
  isUnlimited: boolean
  used: number
  remaining: number
  canAdd: boolean
  resetDate?: string  // For monthly limits
}

// Feature Configuration
export interface FeatureConfig {
  name: string
  description: string
  requiredTier: SubscriptionTier
}

// Tier Limits Configuration
export interface TierLimits {
  maxNiches: number      // -1 for unlimited
  maxProducts: number    // -1 for unlimited (per month)
  maxAdAccounts: number  // -1 for unlimited (per platform)
  features: Feature[]
}

// Usage Tracking
export interface MonthlyUsage {
  user_id: string
  month: string          // Format: YYYY-MM
  products_created: number
  updated_at: string
}
```

---

## 3. SQL-Migration

### supabase/migrations/20260131_feature_gating.sql

```sql
-- ============================================
-- POD AutoM Feature Gating Tables
-- ============================================

-- Monthly Usage Tracking für Produkt-Limits
CREATE TABLE IF NOT EXISTS pod_autom_monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,  -- Format: YYYY-MM
  products_created INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_month UNIQUE (user_id, month)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month
  ON pod_autom_monthly_usage(user_id, month);

-- RLS aktivieren
ALTER TABLE pod_autom_monthly_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own usage"
  ON pod_autom_monthly_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access usage"
  ON pod_autom_monthly_usage FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Stored Procedure: Increment Product Count
CREATE OR REPLACE FUNCTION increment_product_count(
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  current_month VARCHAR(7);
  new_count INTEGER;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYY-MM');

  INSERT INTO pod_autom_monthly_usage (user_id, month, products_created)
  VALUES (p_user_id, current_month, 1)
  ON CONFLICT (user_id, month) DO UPDATE SET
    products_created = pod_autom_monthly_usage.products_created + 1,
    updated_at = NOW()
  RETURNING products_created INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored Procedure: Check Resource Limit
CREATE OR REPLACE FUNCTION check_resource_limit(
  p_user_id UUID,
  p_resource VARCHAR(50)
)
RETURNS JSON AS $$
DECLARE
  user_tier VARCHAR(20);
  tier_limit INTEGER;
  current_usage INTEGER;
  current_month VARCHAR(7);
BEGIN
  -- Get user tier
  SELECT tier INTO user_tier
  FROM pod_autom_subscriptions
  WHERE user_id = p_user_id AND status IN ('active', 'trialing');

  IF user_tier IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'no_subscription',
      'limit', 0,
      'used', 0
    );
  END IF;

  -- Get tier limit based on resource
  IF p_resource = 'niches' THEN
    tier_limit := CASE user_tier
      WHEN 'basis' THEN 5
      WHEN 'premium' THEN 15
      WHEN 'vip' THEN -1
    END;

    SELECT COUNT(*) INTO current_usage
    FROM pod_autom_niches n
    JOIN pod_autom_settings s ON n.settings_id = s.id
    JOIN pod_autom_shops sh ON s.shop_id = sh.id
    WHERE sh.user_id = p_user_id AND n.is_active = true;

  ELSIF p_resource = 'products' THEN
    tier_limit := CASE user_tier
      WHEN 'basis' THEN 100
      WHEN 'premium' THEN 500
      WHEN 'vip' THEN -1
    END;

    current_month := TO_CHAR(NOW(), 'YYYY-MM');

    SELECT COALESCE(products_created, 0) INTO current_usage
    FROM pod_autom_monthly_usage
    WHERE user_id = p_user_id AND month = current_month;

    IF current_usage IS NULL THEN
      current_usage := 0;
    END IF;

  ELSIF p_resource = 'adAccounts' THEN
    tier_limit := CASE user_tier
      WHEN 'basis' THEN 1
      WHEN 'premium' THEN -1
      WHEN 'vip' THEN -1
    END;

    SELECT COUNT(*) INTO current_usage
    FROM pod_autom_ad_accounts
    WHERE user_id = p_user_id;

  ELSE
    RETURN json_build_object(
      'allowed', false,
      'reason', 'unknown_resource'
    );
  END IF;

  -- Check if allowed
  IF tier_limit = -1 THEN
    RETURN json_build_object(
      'allowed', true,
      'unlimited', true,
      'limit', -1,
      'used', current_usage
    );
  ELSIF current_usage < tier_limit THEN
    RETURN json_build_object(
      'allowed', true,
      'unlimited', false,
      'limit', tier_limit,
      'used', current_usage,
      'remaining', tier_limit - current_usage
    );
  ELSE
    RETURN json_build_object(
      'allowed', false,
      'reason', 'limit_reached',
      'limit', tier_limit,
      'used', current_usage
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored Procedure: Check Feature Access
CREATE OR REPLACE FUNCTION check_feature_access(
  p_user_id UUID,
  p_feature VARCHAR(50)
)
RETURNS JSON AS $$
DECLARE
  user_tier VARCHAR(20);
  has_access BOOLEAN;
  required_tier VARCHAR(20);
BEGIN
  -- Get user tier
  SELECT tier INTO user_tier
  FROM pod_autom_subscriptions
  WHERE user_id = p_user_id AND status IN ('active', 'trialing');

  IF user_tier IS NULL THEN
    RETURN json_build_object(
      'has_access', false,
      'required_tier', 'basis',
      'reason', 'no_subscription'
    );
  END IF;

  -- Check feature access based on tier
  CASE p_feature
    WHEN 'winnerScaling' THEN
      has_access := user_tier IN ('premium', 'vip');
      required_tier := 'premium';

    WHEN 'advancedAnalytics' THEN
      has_access := user_tier = 'vip';
      required_tier := 'vip';

    WHEN 'multiPlatform' THEN
      has_access := user_tier IN ('premium', 'vip');
      required_tier := 'premium';

    WHEN 'allPlatforms' THEN
      has_access := user_tier = 'vip';
      required_tier := 'vip';

    WHEN 'prioritySupport' THEN
      has_access := user_tier IN ('premium', 'vip');
      required_tier := 'premium';

    WHEN 'oneOnOneSupport' THEN
      has_access := user_tier = 'vip';
      required_tier := 'vip';

    ELSE
      has_access := false;
      required_tier := 'vip';
  END CASE;

  IF has_access THEN
    RETURN json_build_object(
      'has_access', true,
      'current_tier', user_tier
    );
  ELSE
    RETURN json_build_object(
      'has_access', false,
      'required_tier', required_tier,
      'current_tier', user_tier
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Backend: Feature Gating Routes

### backend/api/routes/feature_gating.py

```python
"""
Feature Gating Routes für POD AutoM
- Ressourcen-Limit-Prüfung
- Feature-Zugriffs-Prüfung
- Limit-Enforcement Decorators
"""

from flask import Blueprint, request, jsonify, g
import os
from datetime import datetime
from functools import wraps
from supabase import create_client
import logging

bp = Blueprint('features', __name__, url_prefix='/features')

# Logging
logger = logging.getLogger(__name__)

# Supabase Client
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Tier Configurations
TIER_LIMITS = {
    'basis': {
        'max_niches': 5,
        'max_products': 100,
        'max_ad_accounts': 1,
        'features': []
    },
    'premium': {
        'max_niches': 15,
        'max_products': 500,
        'max_ad_accounts': -1,  # Unlimited
        'features': ['winnerScaling', 'multiPlatform', 'prioritySupport']
    },
    'vip': {
        'max_niches': -1,  # Unlimited
        'max_products': -1,
        'max_ad_accounts': -1,
        'features': ['winnerScaling', 'advancedAnalytics', 'multiPlatform',
                     'allPlatforms', 'prioritySupport', 'oneOnOneSupport']
    }
}


# ============================================
# JWT Authentication (imported from stripe_routes)
# ============================================

def verify_jwt(f):
    """Verifiziert JWT Token aus Authorization Header"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]

        try:
            user = supabase.auth.get_user(token)
            if not user or not user.user:
                return jsonify({'error': 'Invalid token'}), 401

            request.user_id = user.user.id

        except Exception as e:
            logger.error(f"JWT verification failed: {e}")
            return jsonify({'error': 'Token verification failed'}), 401

        return f(*args, **kwargs)
    return decorated


# ============================================
# Limit Enforcement Decorators
# ============================================

def require_subscription(f):
    """Decorator: Erfordert aktive Subscription"""
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = request.user_id

        sub = supabase.table('pod_autom_subscriptions').select(
            'tier, status'
        ).eq('user_id', user_id).maybeSingle().execute()

        if not sub.data:
            return jsonify({
                'error': 'Keine aktive Subscription',
                'code': 'NO_SUBSCRIPTION'
            }), 403

        if sub.data['status'] not in ('active', 'trialing'):
            return jsonify({
                'error': 'Subscription nicht aktiv',
                'code': 'SUBSCRIPTION_INACTIVE',
                'status': sub.data['status']
            }), 403

        g.user_tier = sub.data['tier']
        return f(*args, **kwargs)

    return decorated


def require_feature(feature: str):
    """Decorator: Erfordert bestimmtes Feature"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user_id = request.user_id

            result = supabase.rpc('check_feature_access', {
                'p_user_id': user_id,
                'p_feature': feature
            }).execute()

            if not result.data or not result.data.get('has_access'):
                required_tier = result.data.get('required_tier', 'premium') if result.data else 'premium'
                return jsonify({
                    'error': f'Feature "{feature}" erfordert {required_tier.upper()} Plan',
                    'code': 'FEATURE_NOT_AVAILABLE',
                    'required_tier': required_tier,
                    'feature': feature
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator


def check_resource_limit(resource: str):
    """Decorator: Prüft Ressourcen-Limit vor Aktion"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user_id = request.user_id

            result = supabase.rpc('check_resource_limit', {
                'p_user_id': user_id,
                'p_resource': resource
            }).execute()

            if not result.data or not result.data.get('allowed'):
                reason = result.data.get('reason', 'unknown') if result.data else 'unknown'
                limit = result.data.get('limit', 0) if result.data else 0

                if reason == 'no_subscription':
                    return jsonify({
                        'error': 'Keine aktive Subscription',
                        'code': 'NO_SUBSCRIPTION'
                    }), 403
                elif reason == 'limit_reached':
                    return jsonify({
                        'error': f'{resource.capitalize()}-Limit erreicht ({limit})',
                        'code': 'LIMIT_REACHED',
                        'resource': resource,
                        'limit': limit,
                        'used': result.data.get('used', limit)
                    }), 403
                else:
                    return jsonify({
                        'error': 'Zugriff verweigert',
                        'code': 'ACCESS_DENIED'
                    }), 403

            g.resource_limit = result.data
            return f(*args, **kwargs)
        return decorated
    return decorator


# ============================================
# API Endpoints
# ============================================

@bp.route('/check/<resource>', methods=['GET'])
@verify_jwt
def check_limit(resource: str):
    """
    Prüft das Limit für eine Ressource

    Path Parameters:
        resource: 'niches' | 'products' | 'adAccounts'

    Response:
        allowed: boolean
        limit: number
        used: number
        remaining: number
        unlimited: boolean
        resetDate?: string (for monthly limits)
    """
    if resource not in ('niches', 'products', 'adAccounts'):
        return jsonify({'error': 'Unknown resource type'}), 400

    user_id = request.user_id

    result = supabase.rpc('check_resource_limit', {
        'p_user_id': user_id,
        'p_resource': resource
    }).execute()

    if not result.data:
        return jsonify({'error': 'Failed to check limit'}), 500

    response = {
        'resource': resource,
        'allowed': result.data.get('allowed', False),
        'limit': result.data.get('limit', 0),
        'used': result.data.get('used', 0),
        'unlimited': result.data.get('unlimited', False)
    }

    if result.data.get('allowed') and not result.data.get('unlimited'):
        response['remaining'] = result.data.get('remaining', 0)

    # Add reset date for products (monthly)
    if resource == 'products':
        next_month = datetime.now().replace(day=1)
        if next_month.month == 12:
            next_month = next_month.replace(year=next_month.year + 1, month=1)
        else:
            next_month = next_month.replace(month=next_month.month + 1)
        response['resetDate'] = next_month.isoformat()

    return jsonify(response)


@bp.route('/feature/<feature>', methods=['GET'])
@verify_jwt
def check_feature(feature: str):
    """
    Prüft ob ein Feature verfügbar ist

    Path Parameters:
        feature: Feature name

    Response:
        has_access: boolean
        required_tier?: string
        current_tier?: string
    """
    valid_features = [
        'winnerScaling', 'advancedAnalytics', 'multiPlatform',
        'allPlatforms', 'prioritySupport', 'oneOnOneSupport'
    ]

    if feature not in valid_features:
        return jsonify({'error': f'Unknown feature: {feature}'}), 400

    user_id = request.user_id

    result = supabase.rpc('check_feature_access', {
        'p_user_id': user_id,
        'p_feature': feature
    }).execute()

    if not result.data:
        return jsonify({'error': 'Failed to check feature access'}), 500

    return jsonify({
        'feature': feature,
        **result.data
    })


@bp.route('/all', methods=['GET'])
@verify_jwt
def get_all_limits():
    """
    Gibt alle Limits und Features für den User zurück

    Response:
        tier: string
        limits: { niches, products, adAccounts }
        features: { feature: boolean }
    """
    user_id = request.user_id

    # Get subscription
    sub = supabase.table('pod_autom_subscriptions').select(
        'tier, status'
    ).eq('user_id', user_id).maybeSingle().execute()

    if not sub.data or sub.data['status'] not in ('active', 'trialing'):
        return jsonify({
            'tier': None,
            'active': False,
            'limits': {},
            'features': {}
        })

    tier = sub.data['tier']
    tier_config = TIER_LIMITS.get(tier, TIER_LIMITS['basis'])

    # Get current usage for each resource
    limits = {}
    for resource in ['niches', 'products', 'adAccounts']:
        result = supabase.rpc('check_resource_limit', {
            'p_user_id': user_id,
            'p_resource': resource
        }).execute()

        if result.data:
            limits[resource] = {
                'limit': result.data.get('limit', 0),
                'used': result.data.get('used', 0),
                'unlimited': result.data.get('unlimited', False),
                'allowed': result.data.get('allowed', False)
            }

            if resource == 'products':
                next_month = datetime.now().replace(day=1)
                if next_month.month == 12:
                    next_month = next_month.replace(year=next_month.year + 1, month=1)
                else:
                    next_month = next_month.replace(month=next_month.month + 1)
                limits[resource]['resetDate'] = next_month.isoformat()

    # Get feature access
    features = {}
    all_features = [
        'winnerScaling', 'advancedAnalytics', 'multiPlatform',
        'allPlatforms', 'prioritySupport', 'oneOnOneSupport'
    ]

    for feature in all_features:
        features[feature] = feature in tier_config['features']

    return jsonify({
        'tier': tier,
        'active': True,
        'limits': limits,
        'features': features
    })


# ============================================
# Usage Tracking
# ============================================

@bp.route('/usage/increment-products', methods=['POST'])
@verify_jwt
@require_subscription
@check_resource_limit('products')
def increment_products():
    """
    Erhöht den Produkt-Zähler für den aktuellen Monat
    Wird nach erfolgreicher Produkt-Erstellung aufgerufen
    """
    user_id = request.user_id

    result = supabase.rpc('increment_product_count', {
        'p_user_id': user_id
    }).execute()

    new_count = result.data if result.data else 0

    return jsonify({
        'success': True,
        'new_count': new_count
    })
```

### backend/api/main.py (Blueprint Registration)

```python
from routes.feature_gating import bp as features_bp

app.register_blueprint(features_bp)
```

---

## 5. Frontend: Feature Access Hook

### src/hooks/useFeatureAccess.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { SUBSCRIPTION_TIERS } from '@src/lib/constants'
import { API_URL } from '@src/lib/constants'
import type { Feature, LimitedResource, FeatureAccessResult, ResourceLimitResult } from '@src/types/features.types'
import type { SubscriptionTier } from '@src/types/stripe.types'

/**
 * Hook für Feature-Zugriffsprüfung
 */
export function useFeatureAccess(feature: Feature): FeatureAccessResult {
  const { tier, isActive } = useSubscription()

  if (!tier || !isActive) {
    return {
      hasAccess: false,
      requiredTier: 'basis',
      reason: 'Keine aktive Subscription'
    }
  }

  const featureRequirements: Record<Feature, SubscriptionTier> = {
    winnerScaling: 'premium',
    advancedAnalytics: 'vip',
    multiPlatform: 'premium',
    allPlatforms: 'vip',
    prioritySupport: 'premium',
    oneOnOneSupport: 'vip'
  }

  const requiredTier = featureRequirements[feature]
  const tierOrder: Record<SubscriptionTier, number> = {
    basis: 1,
    premium: 2,
    vip: 3
  }

  const hasAccess = tierOrder[tier] >= tierOrder[requiredTier]

  return {
    hasAccess,
    requiredTier: hasAccess ? null : requiredTier
  }
}

/**
 * Hook für Ressourcen-Limits
 */
export function useResourceLimit(resource: LimitedResource): ResourceLimitResult & { isLoading: boolean } {
  const { session } = useAuth()
  const { tier, isActive, subscription } = useSubscription()

  const query = useQuery({
    queryKey: ['resource-limit', resource, subscription?.id],
    enabled: !!session?.access_token && !!tier && isActive,
    staleTime: 1000 * 60 * 2, // 2 minutes
    queryFn: async () => {
      const response = await fetch(`${API_URL}/features/check/${resource}`, {
        headers: {
          'Authorization': `Bearer ${session!.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to check resource limit')
      }

      return response.json()
    }
  })

  // Fallback wenn nicht geladen
  if (!tier || !isActive) {
    return {
      limit: 0,
      isUnlimited: false,
      used: 0,
      remaining: 0,
      canAdd: false,
      isLoading: false
    }
  }

  if (query.isLoading || !query.data) {
    const plan = SUBSCRIPTION_TIERS[tier]
    const limit = resource === 'niches' ? plan.maxNiches : plan.maxProducts

    return {
      limit,
      isUnlimited: limit === -1,
      used: 0,
      remaining: limit === -1 ? Infinity : limit,
      canAdd: true,
      isLoading: query.isLoading
    }
  }

  const data = query.data
  return {
    limit: data.limit,
    isUnlimited: data.unlimited,
    used: data.used,
    remaining: data.unlimited ? Infinity : data.remaining ?? (data.limit - data.used),
    canAdd: data.allowed,
    resetDate: data.resetDate,
    isLoading: false
  }
}

/**
 * Hook für alle Limits und Features (für Dashboard)
 */
export function useAllLimits() {
  const { session } = useAuth()
  const { isActive } = useSubscription()

  return useQuery({
    queryKey: ['all-limits'],
    enabled: !!session?.access_token && isActive,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      const response = await fetch(`${API_URL}/features/all`, {
        headers: {
          'Authorization': `Bearer ${session!.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch limits')
      }

      return response.json()
    }
  })
}
```

---

## 6. Frontend: FeatureGate Komponente

### src/components/FeatureGate.tsx

```typescript
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useFeatureAccess } from '@src/hooks/useFeatureAccess'
import { Lock, Crown, ArrowRight } from 'lucide-react'
import type { Feature } from '@src/types/features.types'
import type { SubscriptionTier } from '@src/types/stripe.types'

interface FeatureGateProps {
  feature: Feature
  children: ReactNode
  fallback?: ReactNode
  showUpgrade?: boolean
  mode?: 'block' | 'disable' | 'hide'
}

const FEATURE_NAMES: Record<Feature, string> = {
  winnerScaling: 'Winner Scaling',
  advancedAnalytics: 'Advanced Analytics',
  multiPlatform: 'Multi-Platform Ads',
  allPlatforms: 'Alle Ad-Plattformen',
  prioritySupport: 'Priority Support',
  oneOnOneSupport: '1:1 Support'
}

const FEATURE_DESCRIPTIONS: Record<Feature, string> = {
  winnerScaling: 'Automatische Skalierung von erfolgreichen Produkten',
  advancedAnalytics: 'Detaillierte Analysen und Insights für dein Business',
  multiPlatform: 'Verwalte mehrere Ad-Accounts pro Plattform',
  allPlatforms: 'Zugriff auf Google Ads und TikTok Ads',
  prioritySupport: 'Bevorzugte Bearbeitung deiner Support-Anfragen',
  oneOnOneSupport: 'Persönliche Beratung und Betreuung'
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  basis: 'Basis',
  premium: 'Premium',
  vip: 'VIP'
}

export default function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true,
  mode = 'block'
}: FeatureGateProps) {
  const { hasAccess, requiredTier } = useFeatureAccess(feature)

  // User hat Zugriff
  if (hasAccess) {
    return <>{children}</>
  }

  // Mode: hide - zeigt nichts an
  if (mode === 'hide') {
    return null
  }

  // Mode: disable - rendert Children mit disabled state
  if (mode === 'disable') {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none select-none" aria-disabled="true">
          {children}
        </div>
        {showUpgrade && requiredTier && (
          <UpgradeBadge tier={requiredTier} feature={feature} />
        )}
      </div>
    )
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>
  }

  // Default: block mode mit Upgrade-Hinweis
  if (!showUpgrade || !requiredTier) {
    return null
  }

  return (
    <UpgradePrompt feature={feature} requiredTier={requiredTier} />
  )
}

// ============================================
// Sub-Components
// ============================================

interface UpgradePromptProps {
  feature: Feature
  requiredTier: SubscriptionTier
}

function UpgradePrompt({ feature, requiredTier }: UpgradePromptProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="region"
      aria-labelledby={`feature-gate-${feature}-title`}
    >
      <div
        className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        <Lock className="w-8 h-8 text-amber-500" />
      </div>

      <h3
        id={`feature-gate-${feature}-title`}
        className="text-lg font-semibold mb-2"
      >
        {FEATURE_NAMES[feature]}
      </h3>

      <p className="text-zinc-400 mb-2 max-w-sm">
        {FEATURE_DESCRIPTIONS[feature]}
      </p>

      <p className="text-sm text-zinc-500 mb-6">
        Verfügbar ab dem <span className="font-medium text-amber-400">{TIER_LABELS[requiredTier]}</span>-Plan
      </p>

      <Link
        to="/settings#subscription"
        className="btn-primary inline-flex items-center gap-2"
      >
        <Crown className="w-5 h-5" aria-hidden="true" />
        Auf {TIER_LABELS[requiredTier]} upgraden
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </div>
  )
}

interface UpgradeBadgeProps {
  tier: SubscriptionTier
  feature: Feature
}

function UpgradeBadge({ tier, feature }: UpgradeBadgeProps) {
  return (
    <Link
      to="/settings#subscription"
      className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium hover:bg-amber-500/30 transition"
      aria-label={`${FEATURE_NAMES[feature]} erfordert ${TIER_LABELS[tier]} Plan. Klicke zum Upgraden.`}
    >
      <Lock className="w-3 h-3" aria-hidden="true" />
      {TIER_LABELS[tier]}
    </Link>
  )
}
```

---

## 7. Frontend: LimitWarning Komponente

### src/components/LimitWarning.tsx

```typescript
import { useResourceLimit } from '@src/hooks/useFeatureAccess'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LimitedResource } from '@src/types/features.types'

interface LimitWarningProps {
  resource: LimitedResource
  showAt?: number  // Percentage at which to show warning (default 80)
  className?: string
}

const RESOURCE_LABELS: Record<LimitedResource, string> = {
  niches: 'Nischen',
  products: 'Produkte',
  adAccounts: 'Ad-Accounts'
}

export default function LimitWarning({
  resource,
  showAt = 80,
  className = ''
}: LimitWarningProps) {
  const { limit, isUnlimited, used, canAdd, resetDate, isLoading } = useResourceLimit(resource)

  // Don't show for unlimited or while loading
  if (isUnlimited || isLoading) {
    return null
  }

  const usagePercent = (used / limit) * 100
  const isNearLimit = usagePercent >= showAt && usagePercent < 100
  const isAtLimit = used >= limit

  // Don't show if usage is below threshold
  if (usagePercent < showAt) {
    return null
  }

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg
        ${isAtLimit
          ? 'bg-red-500/10 border border-red-500/20'
          : 'bg-amber-500/10 border border-amber-500/20'
        }
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle
        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
          isAtLimit ? 'text-red-400' : 'text-amber-400'
        }`}
        aria-hidden="true"
      />

      <div className="flex-1">
        <p className={`font-medium ${isAtLimit ? 'text-red-400' : 'text-amber-400'}`}>
          {isAtLimit
            ? `${RESOURCE_LABELS[resource]}-Limit erreicht`
            : `${RESOURCE_LABELS[resource]}-Limit fast erreicht`
          }
        </p>

        <p className="text-sm text-zinc-400 mt-1">
          Du nutzt <span className="font-medium">{used}</span> von <span className="font-medium">{limit}</span> {RESOURCE_LABELS[resource]}.
          {resetDate && resource === 'products' && (
            <span className="ml-1">
              Reset am {new Date(resetDate).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'short'
              })}
            </span>
          )}
        </p>

        <Link
          to="/settings#subscription"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
        >
          Upgrade für mehr
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

/**
 * Inline version for compact spaces
 */
interface LimitBadgeProps {
  resource: LimitedResource
}

export function LimitBadge({ resource }: LimitBadgeProps) {
  const { limit, isUnlimited, used, isLoading } = useResourceLimit(resource)

  if (isLoading) {
    return <span className="text-zinc-500">...</span>
  }

  if (isUnlimited) {
    return (
      <span className="text-emerald-400" aria-label="Unbegrenzt">
        ∞
      </span>
    )
  }

  const usagePercent = (used / limit) * 100
  const colorClass = usagePercent >= 100
    ? 'text-red-400'
    : usagePercent >= 80
      ? 'text-amber-400'
      : 'text-zinc-400'

  return (
    <span className={colorClass}>
      {used}/{limit}
    </span>
  )
}
```

---

## 8. Verwendungsbeispiele

### Beispiel: NicheSelector mit Limit-Check

```typescript
import { useResourceLimit } from '@src/hooks/useFeatureAccess'
import LimitWarning from '@src/components/LimitWarning'
import { Plus } from 'lucide-react'

function NicheSelector() {
  const { canAdd, isLoading } = useResourceLimit('niches')

  return (
    <div className="space-y-4">
      {/* Limit Warning */}
      <LimitWarning resource="niches" />

      {/* Niches Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* ...niche cards... */}
      </div>

      {/* Add Button */}
      <button
        disabled={!canAdd || isLoading}
        onClick={handleAddNiche}
        className="btn-primary"
        aria-disabled={!canAdd}
      >
        <Plus className="w-5 h-5" aria-hidden="true" />
        {canAdd ? 'Nische hinzufügen' : 'Limit erreicht'}
      </button>
    </div>
  )
}
```

### Beispiel: Winner Scaling mit Feature Gate

```typescript
import FeatureGate from '@src/components/FeatureGate'
import WinnerScalingContent from './WinnerScalingContent'

function WinnerScalingPage() {
  return (
    <FeatureGate feature="winnerScaling">
      <WinnerScalingContent />
    </FeatureGate>
  )
}
```

### Beispiel: Conditional Navigation Item

```typescript
import { useFeatureAccess } from '@src/hooks/useFeatureAccess'
import { Lock } from 'lucide-react'

function NavigationItem({ feature, icon: Icon, label, to }) {
  const { hasAccess, requiredTier } = useFeatureAccess(feature)

  return (
    <Link
      to={hasAccess ? to : '/settings#subscription'}
      className={`nav-item ${!hasAccess ? 'opacity-60' : ''}`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
      {!hasAccess && (
        <Lock className="w-4 h-4 ml-auto text-amber-400" />
      )}
    </Link>
  )
}
```

---

## 9. Verifizierung

### Backend Tests
- [ ] `check_resource_limit` Stored Procedure funktioniert
- [ ] `check_feature_access` Stored Procedure funktioniert
- [ ] `increment_product_count` erhöht korrekt
- [ ] API Endpoints geben korrekte Daten zurück
- [ ] Decorators blockieren bei fehlendem Zugriff
- [ ] JWT-Authentifizierung funktioniert
- [ ] Korrekter Status-Code (403) bei Limit-Überschreitung

### Frontend Tests
- [ ] `useFeatureAccess` gibt korrekte Werte zurück
- [ ] `useResourceLimit` lädt und cached korrekt
- [ ] `FeatureGate` rendert korrekt in allen Modi
- [ ] `LimitWarning` erscheint bei 80% Nutzung
- [ ] `LimitWarning` zeigt "Limit erreicht" bei 100%
- [ ] Upgrade-Links funktionieren
- [ ] Loading States werden angezeigt

### Accessibility Tests
- [ ] Alerts haben `role="alert"`
- [ ] Locked Features sind für Screen Reader erkennbar
- [ ] Focus-Management bei FeatureGate korrekt
- [ ] Progress-Anzeigen sind barrierefrei

---

## 10. Abhängigkeiten

- Phase 6.1 (Stripe Integration)
- Phase 6.2 (Subscription Management)
- `@tanstack/react-query` für Caching
- Backend API mit Supabase RPC

---

## 11. Nächster Schritt

→ Phase 6.4 - Mobile Optimierung
