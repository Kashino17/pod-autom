import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { supabase } from '@src/lib/supabase'
import { useAuth } from './AuthContext'
import type {
  SubscriptionContextType,
  Subscription,
  SubscriptionTier,
  FeatureKey,
} from '@src/types/auth'
import { TIER_LIMITS } from '@src/lib/constants'

// =====================================================
// CONTEXT
// =====================================================

const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

// =====================================================
// FEATURE ACCESS MAP
// =====================================================

const FEATURE_TIERS: Record<FeatureKey, SubscriptionTier[]> = {
  winnerScaling: ['premium', 'vip'],
  advancedAnalytics: ['vip'],
  multiPlatform: ['premium', 'vip'],
  allPlatforms: ['vip'],
  prioritySupport: ['premium', 'vip'],
  oneOnOneSupport: ['vip'],
}

// =====================================================
// PROVIDER
// =====================================================

interface SubscriptionProviderProps {
  children: ReactNode
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth()

  // State
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  // =====================================================
  // FETCH SUBSCRIPTION
  // =====================================================

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pod_autom_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        // No subscription found is not an error
        if (error.code === 'PGRST116') {
          setSubscription(null)
        } else {
          console.error('Error fetching subscription:', error)
        }
      } else {
        setSubscription(data)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initial fetch and subscribe to changes
  useEffect(() => {
    fetchSubscription()

    // Subscribe to subscription changes
    if (user) {
      const channel = supabase
        .channel('subscription-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pod_autom_subscriptions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchSubscription()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, fetchSubscription])

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const tier = useMemo((): SubscriptionTier | null => {
    return subscription?.tier ?? null
  }, [subscription])

  const isActive = useMemo((): boolean => {
    if (!subscription) return false
    return subscription.status === 'active' || subscription.status === 'trialing'
  }, [subscription])

  const isPastDue = useMemo((): boolean => {
    return subscription?.status === 'past_due'
  }, [subscription])

  const daysUntilRenewal = useMemo((): number | null => {
    if (!subscription?.current_period_end) return null

    const endDate = new Date(subscription.current_period_end)
    const now = new Date()
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays > 0 ? diffDays : 0
  }, [subscription])

  const maxNiches = useMemo((): number => {
    if (!tier) return 0
    return TIER_LIMITS[tier].maxNiches
  }, [tier])

  const maxProducts = useMemo((): number => {
    if (!tier) return 0
    return TIER_LIMITS[tier].maxProducts
  }, [tier])

  // =====================================================
  // FEATURE CHECK
  // =====================================================

  const canUseFeature = useCallback(
    (feature: FeatureKey): boolean => {
      if (!tier || !isActive) return false
      const allowedTiers = FEATURE_TIERS[feature]
      return allowedTiers.includes(tier)
    },
    [tier, isActive]
  )

  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const value: SubscriptionContextType = {
    subscription,
    loading,
    tier,
    isActive,
    isPastDue,
    daysUntilRenewal,
    canUseFeature,
    maxNiches,
    maxProducts,
    refetch: fetchSubscription,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

// =====================================================
// HOOK
// =====================================================

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext)

  if (!context) {
    throw new Error(
      'useSubscription must be used within a SubscriptionProvider'
    )
  }

  return context
}

// =====================================================
// EXPORTS
// =====================================================

export { SubscriptionContext }
export type { SubscriptionContextType }
