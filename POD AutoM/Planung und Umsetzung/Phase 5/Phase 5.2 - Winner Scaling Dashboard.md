# Phase 5.2 - Winner Scaling Dashboard

## Ziel
Dashboard zur Anzeige und Verwaltung von Winner-Produkten mit Scaling-Optionen, echten API-Endpunkten und vollständiger Fehlerbehandlung.

## Kritische Anforderungen
- **Echte API**: Keine Mock-Daten, vollständige Backend-Integration
- **Feature Gating**: Nur für Premium/VIP Nutzer
- **Error Handling**: Optimistische Updates mit Rollback
- **Accessibility**: WCAG 2.1 AA konform

---

## 1. Shared Types

### src/types/winner.types.ts
```typescript
/**
 * Winner Scaling Typen
 */

export interface PerformanceDataPoint {
  date: string
  sales: number
  revenue: number
  ad_spend: number
}

export interface Winner {
  id: string
  product_id: string
  shop_id: string
  title: string
  niche: string
  image_url: string | null
  price: number
  sales_count: number
  revenue: number
  conversion_rate: number
  ad_spend: number
  roas: number
  status: 'winner' | 'scaling' | 'paused'
  scaling_multiplier: number
  created_at: string
  updated_at: string
  performance_data: PerformanceDataPoint[]
}

export interface WinnerStats {
  total_winners: number
  total_revenue: number
  avg_roas: number
  active_scaling: number
  total_ad_spend: number
}

export interface ScalingUpdateRequest {
  winner_id: string
  scaling_multiplier: number
}

export interface ScalingUpdateResponse {
  success: boolean
  winner: Winner
  message?: string
}
```

---

## 2. Backend: API Endpoints

### backend/api/routes/pod_autom_winners.py
```python
"""
Winner Scaling API Routes für POD AutoM.
"""
import os
import re
import logging
from datetime import datetime, timedelta
from functools import wraps
from typing import Any

from flask import Blueprint, request, jsonify
from supabase import create_client

logger = logging.getLogger(__name__)

bp = Blueprint('pod_autom_winners', __name__, url_prefix='/pod-autom/winners')

supabase = create_client(
    os.getenv('SUPABASE_URL', ''),
    os.getenv('SUPABASE_SERVICE_KEY', '')
)

# UUID Validation
UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE
)


def validate_uuid(value: str) -> bool:
    return bool(UUID_PATTERN.match(value))


def verify_jwt(f):
    """JWT Verification Decorator mit Feature Gating."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing authorization header'}), 401

        token = auth_header.split(' ')[1]
        try:
            user = supabase.auth.get_user(token)
            if not user or not user.user:
                return jsonify({'error': 'Invalid token'}), 401
            request.user_id = user.user.id
        except Exception as e:
            logger.warning(f'JWT verification failed: {e}')
            return jsonify({'error': 'Invalid or expired token'}), 401

        return f(*args, **kwargs)
    return decorated


def check_winner_scaling_access(user_id: str) -> bool:
    """Prüft ob User Zugriff auf Winner Scaling hat (Premium/VIP)."""
    subscription = supabase.table('pod_autom_subscriptions') \
        .select('tier, status') \
        .eq('user_id', user_id) \
        .eq('status', 'active') \
        .single() \
        .execute()

    if not subscription.data:
        return False

    tier = subscription.data.get('tier', 'basis')
    return tier in ['premium', 'vip']


def verify_shop_ownership(shop_id: str, user_id: str) -> bool:
    result = supabase.table('pod_autom_shops') \
        .select('id') \
        .eq('id', shop_id) \
        .eq('user_id', user_id) \
        .execute()
    return bool(result.data)


@bp.route('/<shop_id>', methods=['GET'])
@verify_jwt
def get_winners(shop_id: str):
    """
    Holt alle Winner für einen Shop.

    Query Params:
    - status: 'winner' | 'scaling' | 'paused' | 'all' (default: 'all')
    - limit: int (default: 50, max: 100)
    - offset: int (default: 0)
    """
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop_id format'}), 400

    # Feature Gating
    if not check_winner_scaling_access(request.user_id):
        return jsonify({
            'error': 'Feature not available',
            'message': 'Winner Scaling ist nur mit Premium oder VIP Abo verfügbar.',
            'upgrade_required': True
        }), 403

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found'}), 404

    # Query Parameter
    status_filter = request.args.get('status', 'all')
    limit = min(int(request.args.get('limit', 50)), 100)
    offset = int(request.args.get('offset', 0))

    # Query bauen
    query = supabase.table('pod_autom_winners') \
        .select('*', count='exact') \
        .eq('shop_id', shop_id)

    if status_filter != 'all':
        if status_filter not in ['winner', 'scaling', 'paused']:
            return jsonify({'error': 'Invalid status filter'}), 400
        query = query.eq('status', status_filter)

    # Performance Data aus separater Tabelle holen
    result = query \
        .order('revenue', desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()

    winners = result.data or []

    # Performance Data für jeden Winner laden (letzte 7 Tage)
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()

    for winner in winners:
        perf_result = supabase.table('pod_autom_winner_performance') \
            .select('date, sales, revenue, ad_spend') \
            .eq('winner_id', winner['id']) \
            .gte('date', seven_days_ago) \
            .order('date') \
            .execute()

        winner['performance_data'] = perf_result.data or []

    return jsonify({
        'data': winners,
        'total': result.count or 0,
        'limit': limit,
        'offset': offset
    })


@bp.route('/<shop_id>/stats', methods=['GET'])
@verify_jwt
def get_winner_stats(shop_id: str):
    """Holt aggregierte Winner-Statistiken."""
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop_id format'}), 400

    if not check_winner_scaling_access(request.user_id):
        return jsonify({
            'error': 'Feature not available',
            'upgrade_required': True
        }), 403

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found'}), 404

    # Aggregierte Stats via SQL
    result = supabase.rpc('get_winner_stats', {'p_shop_id': shop_id}).execute()

    if result.data and len(result.data) > 0:
        return jsonify({'data': result.data[0]})

    # Fallback: Manuell berechnen
    winners = supabase.table('pod_autom_winners') \
        .select('revenue, roas, ad_spend, status') \
        .eq('shop_id', shop_id) \
        .execute()

    if not winners.data:
        return jsonify({
            'data': {
                'total_winners': 0,
                'total_revenue': 0,
                'avg_roas': 0,
                'active_scaling': 0,
                'total_ad_spend': 0
            }
        })

    data = winners.data
    total_winners = len(data)
    total_revenue = sum(w.get('revenue', 0) for w in data)
    total_ad_spend = sum(w.get('ad_spend', 0) for w in data)
    active_scaling = sum(1 for w in data if w.get('status') == 'scaling')

    # ROAS nur für Winner mit Ad Spend > 0 berechnen
    roas_values = [w.get('roas', 0) for w in data if w.get('roas', 0) > 0]
    avg_roas = sum(roas_values) / len(roas_values) if roas_values else 0

    return jsonify({
        'data': {
            'total_winners': total_winners,
            'total_revenue': total_revenue,
            'avg_roas': round(avg_roas, 2),
            'active_scaling': active_scaling,
            'total_ad_spend': total_ad_spend
        }
    })


@bp.route('/<winner_id>/scale', methods=['PUT'])
@verify_jwt
def update_scaling(winner_id: str):
    """
    Aktualisiert den Scaling-Multiplikator eines Winners.

    Body:
    - scaling_multiplier: float (0.5 - 5.0)
    """
    if not validate_uuid(winner_id):
        return jsonify({'error': 'Invalid winner_id format'}), 400

    if not check_winner_scaling_access(request.user_id):
        return jsonify({
            'error': 'Feature not available',
            'upgrade_required': True
        }), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    multiplier = data.get('scaling_multiplier')
    if multiplier is None:
        return jsonify({'error': 'scaling_multiplier is required'}), 400

    # Validierung
    try:
        multiplier = float(multiplier)
        if not (0.5 <= multiplier <= 5.0):
            return jsonify({'error': 'scaling_multiplier must be between 0.5 and 5.0'}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'scaling_multiplier must be a number'}), 400

    # Winner holen und Ownership prüfen
    winner = supabase.table('pod_autom_winners') \
        .select('*, pod_autom_shops!inner(user_id)') \
        .eq('id', winner_id) \
        .single() \
        .execute()

    if not winner.data:
        return jsonify({'error': 'Winner not found'}), 404

    if winner.data['pod_autom_shops']['user_id'] != request.user_id:
        return jsonify({'error': 'Access denied'}), 403

    # Status bestimmen
    new_status = 'scaling' if multiplier > 1.0 else 'winner'
    if multiplier == 0.5:
        new_status = 'paused'  # Minimales Budget = pausiert

    # Update
    result = supabase.table('pod_autom_winners') \
        .update({
            'scaling_multiplier': multiplier,
            'status': new_status,
            'updated_at': datetime.utcnow().isoformat()
        }) \
        .eq('id', winner_id) \
        .execute()

    if not result.data:
        return jsonify({'error': 'Update failed'}), 500

    # Scaling-Event loggen
    supabase.table('pod_autom_scaling_log').insert({
        'winner_id': winner_id,
        'previous_multiplier': winner.data.get('scaling_multiplier', 1.0),
        'new_multiplier': multiplier,
        'triggered_by': 'user',
        'user_id': request.user_id
    }).execute()

    return jsonify({
        'success': True,
        'data': result.data[0],
        'message': f'Scaling auf {multiplier}x aktualisiert'
    })


@bp.route('/<winner_id>', methods=['GET'])
@verify_jwt
def get_winner_detail(winner_id: str):
    """Holt detaillierte Winner-Informationen."""
    if not validate_uuid(winner_id):
        return jsonify({'error': 'Invalid winner_id format'}), 400

    if not check_winner_scaling_access(request.user_id):
        return jsonify({
            'error': 'Feature not available',
            'upgrade_required': True
        }), 403

    # Winner mit Shop-Ownership-Check
    winner = supabase.table('pod_autom_winners') \
        .select('*, pod_autom_shops!inner(user_id)') \
        .eq('id', winner_id) \
        .single() \
        .execute()

    if not winner.data:
        return jsonify({'error': 'Winner not found'}), 404

    if winner.data['pod_autom_shops']['user_id'] != request.user_id:
        return jsonify({'error': 'Access denied'}), 403

    # Shop-Daten entfernen aus Response
    del winner.data['pod_autom_shops']

    # Performance Data (letzte 30 Tage)
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    perf_result = supabase.table('pod_autom_winner_performance') \
        .select('date, sales, revenue, ad_spend') \
        .eq('winner_id', winner_id) \
        .gte('date', thirty_days_ago) \
        .order('date') \
        .execute()

    winner.data['performance_data'] = perf_result.data or []

    # Scaling History
    scaling_log = supabase.table('pod_autom_scaling_log') \
        .select('previous_multiplier, new_multiplier, triggered_by, created_at') \
        .eq('winner_id', winner_id) \
        .order('created_at', desc=True) \
        .limit(10) \
        .execute()

    winner.data['scaling_history'] = scaling_log.data or []

    return jsonify({'data': winner.data})
```

---

## 3. SQL: Stored Procedure für Stats

### supabase/migrations/winner_stats_function.sql
```sql
-- Funktion für aggregierte Winner-Stats
CREATE OR REPLACE FUNCTION get_winner_stats(p_shop_id UUID)
RETURNS TABLE (
  total_winners BIGINT,
  total_revenue NUMERIC,
  avg_roas NUMERIC,
  active_scaling BIGINT,
  total_ad_spend NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_winners,
    COALESCE(SUM(revenue), 0)::NUMERIC AS total_revenue,
    COALESCE(AVG(NULLIF(roas, 0)), 0)::NUMERIC AS avg_roas,
    COUNT(*) FILTER (WHERE status = 'scaling')::BIGINT AS active_scaling,
    COALESCE(SUM(ad_spend), 0)::NUMERIC AS total_ad_spend
  FROM pod_autom_winners
  WHERE shop_id = p_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Tabelle für Performance-Daten (täglich)
CREATE TABLE IF NOT EXISTS pod_autom_winner_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id UUID NOT NULL REFERENCES pod_autom_winners(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sales INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  ad_spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(winner_id, date)
);

-- Index für schnelle Abfragen
CREATE INDEX idx_winner_performance_winner_date
ON pod_autom_winner_performance(winner_id, date DESC);


-- Tabelle für Scaling-Log
CREATE TABLE IF NOT EXISTS pod_autom_scaling_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id UUID NOT NULL REFERENCES pod_autom_winners(id) ON DELETE CASCADE,
  previous_multiplier NUMERIC(3,1) NOT NULL,
  new_multiplier NUMERIC(3,1) NOT NULL,
  triggered_by VARCHAR(20) NOT NULL CHECK (triggered_by IN ('user', 'system', 'ai')),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für History
CREATE INDEX idx_scaling_log_winner
ON pod_autom_scaling_log(winner_id, created_at DESC);


-- Winners Tabelle (falls noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS pod_autom_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  shop_id UUID NOT NULL REFERENCES pod_autom_shops(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  niche VARCHAR(100),
  image_url TEXT,
  price NUMERIC(10,2) NOT NULL,
  sales_count INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  ad_spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  roas NUMERIC(5,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'winner' CHECK (status IN ('winner', 'scaling', 'paused')),
  scaling_multiplier NUMERIC(3,1) NOT NULL DEFAULT 1.0 CHECK (scaling_multiplier >= 0.5 AND scaling_multiplier <= 5.0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für Shop-Abfragen
CREATE INDEX idx_winners_shop_status
ON pod_autom_winners(shop_id, status);

-- Trigger für updated_at
CREATE OR REPLACE TRIGGER update_winners_timestamp
BEFORE UPDATE ON pod_autom_winners
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- RLS
ALTER TABLE pod_autom_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_winner_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_autom_scaling_log ENABLE ROW LEVEL SECURITY;

-- Policies (nur über API zugreifbar via Service Key)
CREATE POLICY "Winners only via API"
ON pod_autom_winners FOR ALL TO authenticated
USING (false);

CREATE POLICY "Performance only via API"
ON pod_autom_winner_performance FOR ALL TO authenticated
USING (false);

CREATE POLICY "Scaling log only via API"
ON pod_autom_scaling_log FOR ALL TO authenticated
USING (false);
```

---

## 4. Frontend: Winner Hooks

### src/hooks/useWinners.ts
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { API_URL } from '@src/lib/constants'
import type { Winner, WinnerStats, ScalingUpdateResponse } from '@src/types/winner.types'

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  upgrade_required?: boolean
  total?: number
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken()
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.error || data.message || 'Request failed') as Error & {
      upgrade_required?: boolean
    }
    error.upgrade_required = data.upgrade_required
    throw error
  }

  return data
}

/**
 * Hook für Winner-Liste
 */
export function useWinners(
  shopId: string | undefined,
  options?: { status?: string; limit?: number; offset?: number }
) {
  const { status = 'all', limit = 50, offset = 0 } = options || {}

  return useQuery({
    queryKey: ['winners', shopId, status, limit, offset],
    queryFn: async () => {
      if (!shopId) return { data: [], total: 0 }

      const params = new URLSearchParams({
        status,
        limit: String(limit),
        offset: String(offset)
      })

      const response = await apiRequest<Winner[]>(
        `/pod-autom/winners/${shopId}?${params}`
      )

      return {
        data: response.data || [],
        total: response.total || 0
      }
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2, // 2 Minuten
    retry: (failureCount, error: any) => {
      // Nicht retry bei Feature-Gating
      if (error.upgrade_required) return false
      return failureCount < 2
    }
  })
}

/**
 * Hook für Winner-Stats
 */
export function useWinnerStats(shopId: string | undefined) {
  return useQuery({
    queryKey: ['winner-stats', shopId],
    queryFn: async (): Promise<WinnerStats | null> => {
      if (!shopId) return null

      const response = await apiRequest<WinnerStats>(
        `/pod-autom/winners/${shopId}/stats`
      )
      return response.data || null
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2,
    retry: (failureCount, error: any) => {
      if (error.upgrade_required) return false
      return failureCount < 2
    }
  })
}

/**
 * Hook für Winner Detail
 */
export function useWinnerDetail(winnerId: string | undefined) {
  return useQuery({
    queryKey: ['winner-detail', winnerId],
    queryFn: async (): Promise<Winner | null> => {
      if (!winnerId) return null

      const response = await apiRequest<Winner>(
        `/pod-autom/winners/${winnerId}`
      )
      return response.data || null
    },
    enabled: !!winnerId,
    staleTime: 1000 * 60
  })
}

/**
 * Hook für Scaling Update (Optimistic Update)
 */
export function useScalingUpdate(shopId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      winnerId,
      multiplier
    }: {
      winnerId: string
      multiplier: number
    }): Promise<ScalingUpdateResponse> => {
      const response = await apiRequest<Winner>(
        `/pod-autom/winners/${winnerId}/scale`,
        {
          method: 'PUT',
          body: JSON.stringify({ scaling_multiplier: multiplier })
        }
      )
      return {
        success: true,
        winner: response.data!,
        message: response.message
      }
    },
    // Optimistic Update
    onMutate: async ({ winnerId, multiplier }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['winners', shopId] })

      // Snapshot previous value
      const previousWinners = queryClient.getQueryData(['winners', shopId, 'all', 50, 0])

      // Optimistically update
      queryClient.setQueryData(
        ['winners', shopId, 'all', 50, 0],
        (old: any) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((w: Winner) =>
              w.id === winnerId
                ? {
                    ...w,
                    scaling_multiplier: multiplier,
                    status: multiplier > 1 ? 'scaling' : multiplier === 0.5 ? 'paused' : 'winner'
                  }
                : w
            )
          }
        }
      )

      return { previousWinners }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousWinners) {
        queryClient.setQueryData(
          ['winners', shopId, 'all', 50, 0],
          context.previousWinners
        )
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['winners', shopId] })
      queryClient.invalidateQueries({ queryKey: ['winner-stats', shopId] })
    }
  })
}
```

---

## 5. Frontend: Winner Scaling Komponente

### src/components/dashboard/WinnerScaling.tsx
```typescript
import { useState, useMemo, useCallback } from 'react'
import { useShops } from '@src/hooks/useShopify'
import { useAppStore } from '@src/lib/store'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useWinners, useWinnerStats, useScalingUpdate } from '@src/hooks/useWinners'
import { toast } from 'sonner'
import {
  TrendingUp,
  Rocket,
  DollarSign,
  AlertCircle,
  Loader2,
  Crown,
  Target,
  BarChart3,
  Plus,
  Minus,
  Sparkles,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Pause,
  Play
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import type { Winner } from '@src/types/winner.types'

export default function WinnerScaling() {
  const { selectedShopId } = useAppStore()
  const { data: shops } = useShops()
  const { canUseFeature } = useSubscription()

  const selectedShop = shops?.find(s => s.id === selectedShopId) || shops?.[0]
  const hasWinnerScaling = canUseFeature('winnerScaling')

  // API Queries
  const {
    data: winnersData,
    isLoading,
    error,
    refetch
  } = useWinners(selectedShop?.id)

  const { data: stats, isLoading: statsLoading } = useWinnerStats(selectedShop?.id)

  const scalingMutation = useScalingUpdate(selectedShop?.id || '')

  const winners = winnersData?.data || []

  // Feature Gating: Upgrade erforderlich
  if (!hasWinnerScaling || (error as any)?.upgrade_required) {
    return <UpgradePrompt />
  }

  if (!selectedShop) {
    return <NoShopState />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Winner Scaling</h2>
          <p className="text-sm text-zinc-400">
            Automatische Skalierung deiner Top-Performer
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-zinc-400">
            <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
            KI-optimiert
          </span>
          <button
            onClick={() => refetch()}
            className="btn-secondary"
            aria-label="Daten aktualisieren"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={statsLoading} />

      {/* Winners List */}
      {isLoading ? (
        <LoadingState />
      ) : error && !(error as any)?.upgrade_required ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : winners.length > 0 ? (
        <div className="space-y-4" role="list" aria-label="Winner Produkte">
          {winners.map((winner) => (
            <WinnerCard
              key={winner.id}
              winner={winner}
              onScale={(multiplier) => {
                scalingMutation.mutate(
                  { winnerId: winner.id, multiplier },
                  {
                    onSuccess: (response) => {
                      toast.success(`Scaling auf ${multiplier}x aktualisiert`)
                    },
                    onError: (error) => {
                      toast.error('Scaling fehlgeschlagen', {
                        description: error.message
                      })
                    }
                  }
                )
              }}
              isUpdating={
                scalingMutation.isPending &&
                scalingMutation.variables?.winnerId === winner.id
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      {/* How it Works */}
      <HowItWorks />
    </div>
  )
}

/**
 * Stats Cards Component
 */
function StatsCards({
  stats,
  isLoading
}: {
  stats: ReturnType<typeof useWinnerStats>['data']
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-16 bg-surface-highlight rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={TrendingUp}
        iconColor="emerald"
        value={stats.total_winners}
        label="Winner"
      />
      <StatCard
        icon={DollarSign}
        iconColor="primary"
        value={formatCurrency(stats.total_revenue)}
        label="Umsatz"
      />
      <StatCard
        icon={Target}
        iconColor="amber"
        value={`${stats.avg_roas.toFixed(1)}x`}
        label="Ø ROAS"
      />
      <StatCard
        icon={Rocket}
        iconColor="blue"
        value={stats.active_scaling}
        label="Im Scaling"
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  iconColor,
  value,
  label
}: {
  icon: typeof TrendingUp
  iconColor: string
  value: string | number
  label: string
}) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-500/10 text-amber-500',
    blue: 'bg-blue-500/10 text-blue-500'
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[iconColor]}`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-zinc-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Winner Card Component
 */
function WinnerCard({
  winner,
  onScale,
  isUpdating
}: {
  winner: Winner
  onScale: (multiplier: number) => void
  isUpdating: boolean
}) {
  const [showDetails, setShowDetails] = useState(false)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)

  const handleIncrease = useCallback(() => {
    const newMultiplier = Math.min(5, winner.scaling_multiplier + 0.5)
    onScale(newMultiplier)
  }, [winner.scaling_multiplier, onScale])

  const handleDecrease = useCallback(() => {
    const newMultiplier = Math.max(0.5, winner.scaling_multiplier - 0.5)
    onScale(newMultiplier)
  }, [winner.scaling_multiplier, onScale])

  const statusBadge = useMemo(() => {
    switch (winner.status) {
      case 'scaling':
        return (
          <span className="badge bg-emerald-500/20 text-emerald-400">
            <Rocket className="w-3 h-3 mr-1" aria-hidden="true" />
            Scaling
          </span>
        )
      case 'paused':
        return (
          <span className="badge bg-amber-500/20 text-amber-400">
            <Pause className="w-3 h-3 mr-1" aria-hidden="true" />
            Pausiert
          </span>
        )
      default:
        return null
    }
  }, [winner.status])

  return (
    <article className="card" role="listitem">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Product Info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 bg-surface-highlight rounded-lg overflow-hidden flex-shrink-0">
            {winner.image_url ? (
              <img
                src={winner.image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-emerald-500" aria-hidden="true" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{winner.title}</h3>
              {statusBadge}
            </div>
            <p className="text-sm text-zinc-400">{winner.niche || 'Keine Nische'}</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4 lg:gap-8" role="group" aria-label="Metriken">
          <MetricDisplay label="Verkäufe" value={winner.sales_count} />
          <MetricDisplay label="Umsatz" value={formatCurrency(winner.revenue)} />
          <MetricDisplay
            label="ROAS"
            value={`${winner.roas.toFixed(1)}x`}
            highlight={winner.roas >= 3}
          />
          <MetricDisplay label="CVR" value={`${winner.conversion_rate}%`} />
        </div>

        {/* Scaling Controls */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">Budget:</span>
          <div
            className="flex items-center gap-1 bg-surface-highlight rounded-lg p-1"
            role="group"
            aria-label="Scaling Multiplikator"
          >
            <button
              onClick={handleDecrease}
              disabled={isUpdating || winner.scaling_multiplier <= 0.5}
              className="p-2 hover:bg-zinc-700 rounded-md transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Multiplikator verringern"
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <span
              className="w-16 text-center font-mono font-bold"
              aria-live="polite"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" aria-hidden="true" />
              ) : (
                `${winner.scaling_multiplier.toFixed(1)}x`
              )}
            </span>
            <button
              onClick={handleIncrease}
              disabled={isUpdating || winner.scaling_multiplier >= 5}
              className="p-2 hover:bg-zinc-700 rounded-md transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Multiplikator erhöhen"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-surface-highlight rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={showDetails}
            aria-label={showDetails ? 'Details ausblenden' : 'Details anzeigen'}
          >
            {showDetails ? (
              <ChevronUp className="w-5 h-5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Performance Chart */}
      {showDetails && winner.performance_data.length > 0 && (
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <h4 className="text-sm font-medium mb-4">Performance (letzte 7 Tage)</h4>
          <div className="h-48" role="img" aria-label="Performance Chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={winner.performance_data}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('de-DE', { weekday: 'short' })
                  }}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickFormatter={(value) => `${value}€`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('de-DE')
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'revenue') return [`${value.toFixed(2)} €`, 'Umsatz']
                    if (name === 'sales') return [value, 'Verkäufe']
                    return [value, name]
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  name="Umsatz"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sales"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Verkäufe"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </article>
  )
}

function MetricDisplay({
  label,
  value,
  highlight = false
}: {
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${highlight ? 'text-emerald-400' : ''}`}>
        {value}
      </p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

/**
 * State Components
 */
function UpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-amber-500" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Winner Scaling</h2>
      <p className="text-zinc-400 mb-6 text-center max-w-md">
        Automatische Skalierung von Top-Performern ist ab dem Premium-Plan verfügbar.
      </p>
      <a
        href="/settings#subscription"
        className="btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Crown className="w-5 h-5" aria-hidden="true" />
        Auf Premium upgraden
      </a>
    </div>
  )
}

function NoShopState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertCircle className="w-12 h-12 text-zinc-600 mb-4" aria-hidden="true" />
      <h2 className="text-xl font-semibold mb-2">Kein Shop verbunden</h2>
      <p className="text-zinc-400">Verbinde zuerst einen Shop.</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20" role="status" aria-label="Lade Winner">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-500" aria-hidden="true" />
      <span className="sr-only">Lade Winner...</span>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="card text-center py-12" role="alert">
      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" aria-hidden="true" />
      <h3 className="font-medium mb-2 text-red-400">Fehler beim Laden</h3>
      <p className="text-sm text-zinc-400 mb-4">{error.message}</p>
      <button onClick={onRetry} className="btn-secondary">
        Erneut versuchen
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card text-center py-12">
      <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-4" aria-hidden="true" />
      <h3 className="font-medium mb-2">Noch keine Winner</h3>
      <p className="text-sm text-zinc-400">
        Winner werden automatisch erkannt, sobald Produkte überdurchschnittlich performen.
      </p>
    </div>
  )
}

function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'Erkennung',
      description: 'KI erkennt Produkte mit ROAS > 3x'
    },
    {
      number: 2,
      title: 'Analyse',
      description: 'Performance-Daten werden ausgewertet'
    },
    {
      number: 3,
      title: 'Skalierung',
      description: 'Ad-Budget wird automatisch erhöht'
    }
  ]

  return (
    <section
      className="card bg-gradient-to-r from-primary/5 via-transparent to-transparent border-primary/20"
      aria-labelledby="how-it-works-title"
    >
      <h3 id="how-it-works-title" className="font-semibold mb-4">
        Wie funktioniert Winner Scaling?
      </h3>
      <div className="grid md:grid-cols-3 gap-4 text-sm">
        {steps.map((step) => (
          <div key={step.number} className="flex gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">{step.number}</span>
            </div>
            <div>
              <p className="font-medium">{step.title}</p>
              <p className="text-zinc-400">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

---

## 6. Route hinzufügen

### Dashboard.tsx
```typescript
import WinnerScaling from '@src/components/dashboard/WinnerScaling'

// In Routes:
<Route
  path="winners"
  element={
    <DashboardPage title="Winner Scaling">
      <WinnerScaling />
    </DashboardPage>
  }
/>
```

---

## Verifizierung

### API
- [ ] GET `/pod-autom/winners/{shop_id}` liefert Winner-Liste
- [ ] GET `/pod-autom/winners/{shop_id}/stats` liefert Stats
- [ ] PUT `/pod-autom/winners/{winner_id}/scale` aktualisiert Scaling
- [ ] Feature Gating funktioniert (403 für Basis)
- [ ] Pagination funktioniert

### Frontend
- [ ] Winner werden angezeigt
- [ ] Stats werden korrekt berechnet
- [ ] Scaling-Multiplikator änderbar (0.5 - 5.0)
- [ ] Optimistische Updates mit Rollback
- [ ] Performance-Chart funktioniert
- [ ] Toast-Notifications bei Erfolg/Fehler
- [ ] Upgrade-Hinweis für Basis-Plan
- [ ] Loading Skeletons korrekt
- [ ] Accessibility (ARIA, Keyboard)

### Performance
- [ ] Keine unnötigen Re-Renders
- [ ] Queries werden gecached
- [ ] Bilder lazy geladen

---

## Abhängigkeiten

| Phase | Beschreibung | Status |
|-------|--------------|--------|
| Phase 3.1 | Dashboard Layout | Erforderlich |
| Phase 4.1 | Winner Detection im Job | Erforderlich |
| Phase 5.1 | Toast (sonner) | Erforderlich |

---

## Nächster Schritt
→ Phase 5.3 - Campaign Management
