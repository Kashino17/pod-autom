# Phase 6.2 - Subscription Management

## Ziel
Vollständige Subscription-Verwaltung im Settings-Bereich mit Loading States, Accessibility und Toast-Benachrichtigungen.

---

## 1. TypeScript-Typen (Erweiterung)

### src/types/subscription.types.ts

```typescript
import type { SubscriptionTier, SubscriptionStatus } from './stripe.types'

// Subscription Display States
export type SubscriptionDisplayStatus =
  | 'active'
  | 'past_due'
  | 'canceling'  // will cancel at period end
  | 'canceled'
  | 'trialing'
  | 'incomplete'
  | 'none'

// Subscription Context Value
export interface SubscriptionContextValue {
  subscription: SubscriptionData | null
  tier: SubscriptionTier | null
  isActive: boolean
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  displayStatus: SubscriptionDisplayStatus
}

// Subscription Data from API
export interface SubscriptionData {
  id: string
  user_id: string
  tier: SubscriptionTier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
  updated_at: string
}

// Usage Stats
export interface SubscriptionUsage {
  niches: {
    used: number
    limit: number
    unlimited: boolean
  }
  products: {
    used: number
    limit: number
    unlimited: boolean
    resetDate: string
  }
}

// Billing History Item
export interface BillingHistoryItem {
  id: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed'
  period_start: string
  period_end: string
  invoice_url: string | null
  created_at: string
}
```

---

## 2. Subscription Context (Erweitert)

### src/contexts/SubscriptionContext.tsx

```typescript
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode
} from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@src/lib/supabase'
import type {
  SubscriptionContextValue,
  SubscriptionData,
  SubscriptionDisplayStatus
} from '@src/types/subscription.types'
import type { SubscriptionTier } from '@src/types/stripe.types'

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

interface SubscriptionProviderProps {
  children: ReactNode
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('pod_autom_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setSubscription(data as SubscriptionData | null)
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Initial fetch
  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  // Real-time subscription updates
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pod_autom_subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setSubscription(null)
          } else {
            setSubscription(payload.new as SubscriptionData)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Computed values
  const tier: SubscriptionTier | null = subscription?.tier ?? null

  const isActive = subscription?.status === 'active' ||
                   subscription?.status === 'trialing'

  const displayStatus: SubscriptionDisplayStatus = (() => {
    if (!subscription) return 'none'
    if (subscription.cancel_at_period_end && subscription.status === 'active') {
      return 'canceling'
    }
    if (subscription.status === 'active') return 'active'
    if (subscription.status === 'trialing') return 'trialing'
    if (subscription.status === 'past_due') return 'past_due'
    if (subscription.status === 'canceled') return 'canceled'
    return 'incomplete'
  })()

  const value: SubscriptionContextValue = {
    subscription,
    tier,
    isActive,
    isLoading,
    error,
    refetch: fetchSubscription,
    displayStatus
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return context
}
```

---

## 3. Subscription Settings Komponente

### src/components/settings/SubscriptionSettings.tsx

```typescript
import { useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useCreateCheckoutSession, useCreatePortalSession } from '@src/hooks/useStripe'
import { SUBSCRIPTION_TIERS } from '@src/lib/constants'
import type { SubscriptionTier } from '@src/types/stripe.types'
import {
  CreditCard,
  Check,
  ArrowUpRight,
  Calendar,
  AlertCircle,
  Loader2,
  Crown,
  Sparkles,
  ExternalLink,
  X,
  Clock,
  Zap,
  TrendingUp,
  Shield,
  RefreshCw
} from 'lucide-react'

export default function SubscriptionSettings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    subscription,
    tier,
    isActive,
    isLoading,
    error,
    refetch,
    displayStatus
  } = useSubscription()
  const checkoutMutation = useCreateCheckoutSession()
  const portalMutation = useCreatePortalSession()

  // Handle checkout callback
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout')

    if (checkoutStatus === 'success') {
      toast.success('Zahlung erfolgreich!', {
        description: 'Dein Abonnement wurde aktiviert.'
      })
      refetch()
      // Clear URL param
      setSearchParams({}, { replace: true })
    } else if (checkoutStatus === 'cancel') {
      toast.info('Checkout abgebrochen', {
        description: 'Du kannst jederzeit ein Abonnement abschließen.'
      })
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, refetch])

  const handleUpgrade = useCallback(async (newTier: SubscriptionTier) => {
    try {
      const url = await checkoutMutation.mutateAsync(newTier)
      window.location.href = url
    } catch {
      // Error wird im Hook behandelt
    }
  }, [checkoutMutation])

  const handleManageSubscription = useCallback(async () => {
    try {
      const url = await portalMutation.mutateAsync()
      window.location.href = url
    } catch {
      // Error wird im Hook behandelt
    }
  }, [portalMutation])

  const handleRefresh = useCallback(async () => {
    toast.promise(refetch(), {
      loading: 'Lade Subscription-Daten...',
      success: 'Daten aktualisiert',
      error: 'Fehler beim Laden'
    })
  }, [refetch])

  const currentPlan = tier ? SUBSCRIPTION_TIERS[tier] : null

  // Loading State
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16"
        role="status"
        aria-label="Lade Abonnement-Daten"
      >
        <Loader2
          className="w-8 h-8 animate-spin text-primary mb-4"
          aria-hidden="true"
        />
        <p className="text-zinc-400">Lade Abonnement-Daten...</p>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div
        className="card border-red-500/30 bg-red-500/5"
        role="alert"
        aria-labelledby="subscription-error-title"
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
          <div className="flex-1">
            <h3
              id="subscription-error-title"
              className="font-medium text-red-400"
            >
              Fehler beim Laden
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              Die Abonnement-Daten konnten nicht geladen werden.
              Bitte versuche es erneut.
            </p>
            <button
              onClick={handleRefresh}
              className="btn-secondary mt-3 text-sm"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" role="region" aria-label="Abonnement-Einstellungen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">Abonnement</h2>
          <p className="text-sm text-zinc-400">
            Verwalte dein Abo und Zahlungsinformationen.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-ghost p-2"
          aria-label="Daten aktualisieren"
          title="Daten aktualisieren"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Current Plan Card */}
      <div className="card" role="region" aria-labelledby="current-plan-title">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 id="current-plan-title" className="font-medium mb-1">
              Aktueller Plan
            </h3>
            {currentPlan ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-bold text-primary capitalize">
                  {tier}
                </span>
                <StatusBadge status={displayStatus} />
              </div>
            ) : (
              <p className="text-zinc-400">Kein aktives Abonnement</p>
            )}
          </div>

          {currentPlan && (
            <div className="text-right">
              <span className="text-3xl font-bold">{currentPlan.price}€</span>
              <span className="text-zinc-400">/Monat</span>
            </div>
          )}
        </div>

        {currentPlan && (
          <>
            {/* Plan Features Grid */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
              role="list"
              aria-label="Plan-Features"
            >
              <FeatureCard
                label="Nischen"
                value={currentPlan.maxNiches === -1 ? 'Unbegrenzt' : String(currentPlan.maxNiches)}
                icon={TrendingUp}
              />
              <FeatureCard
                label="Produkte/Monat"
                value={currentPlan.maxProducts === -1 ? 'Unbegrenzt' : String(currentPlan.maxProducts)}
                icon={Zap}
              />
              <FeatureCard
                label="Winner Scaling"
                value={currentPlan.winnerScaling}
                icon={Crown}
              />
              <FeatureCard
                label="Support"
                value={currentPlan.support === '1:1' ? '1:1' : currentPlan.support === 'priority' ? 'Priority' : 'Email'}
                icon={Shield}
              />
            </div>

            {/* Renewal/Cancellation Info */}
            {subscription?.current_period_end && (
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                {displayStatus === 'canceling' ? (
                  <span>
                    Endet am:{' '}
                    <time dateTime={subscription.current_period_end}>
                      {formatDate(subscription.current_period_end)}
                    </time>
                  </span>
                ) : (
                  <span>
                    Nächste Zahlung:{' '}
                    <time dateTime={subscription.current_period_end}>
                      {formatDate(subscription.current_period_end)}
                    </time>
                  </span>
                )}
              </div>
            )}

            {/* Manage Subscription Button */}
            <button
              onClick={handleManageSubscription}
              disabled={portalMutation.isPending}
              aria-busy={portalMutation.isPending}
              className="btn-secondary"
            >
              {portalMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Laden...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" aria-hidden="true" />
                  <span>Abo verwalten</span>
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Past Due Warning */}
      {displayStatus === 'past_due' && (
        <div
          className="card border-red-500/30 bg-red-500/5"
          role="alert"
          aria-labelledby="past-due-title"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">
              <h3
                id="past-due-title"
                className="font-medium text-red-400"
              >
                Zahlung ausstehend
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Deine letzte Zahlung konnte nicht verarbeitet werden.
                Bitte aktualisiere deine Zahlungsmethode, um den Service weiter nutzen zu können.
              </p>
              <button
                onClick={handleManageSubscription}
                disabled={portalMutation.isPending}
                className="btn-primary mt-3"
              >
                {portalMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Zahlungsmethode aktualisieren'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canceling Notice */}
      {displayStatus === 'canceling' && (
        <div
          className="card border-amber-500/30 bg-amber-500/5"
          role="status"
          aria-labelledby="canceling-title"
        >
          <div className="flex items-start gap-3">
            <Clock
              className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">
              <h3
                id="canceling-title"
                className="font-medium text-amber-400"
              >
                Kündigung aktiv
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Dein Abonnement wurde gekündigt und endet am{' '}
                <time dateTime={subscription?.current_period_end || ''}>
                  {subscription?.current_period_end
                    ? formatDate(subscription.current_period_end)
                    : '-'}
                </time>.
                Du behältst bis dahin vollen Zugriff.
              </p>
              <button
                onClick={handleManageSubscription}
                disabled={portalMutation.isPending}
                className="btn-secondary mt-3"
              >
                Kündigung rückgängig machen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Options */}
      {tier !== 'vip' && (
        <div className="card" role="region" aria-labelledby="upgrade-title">
          <h3
            id="upgrade-title"
            className="font-medium mb-4 flex items-center gap-2"
          >
            <Crown className="w-5 h-5 text-amber-400" aria-hidden="true" />
            {tier ? 'Upgrade verfügbar' : 'Plan wählen'}
          </h3>

          <div
            className="grid md:grid-cols-3 gap-4"
            role="list"
            aria-label="Verfügbare Pläne"
          >
            {getUpgradeOptions(tier).map((t) => {
              const plan = SUBSCRIPTION_TIERS[t]
              const isPopular = t === 'premium'

              return (
                <UpgradeCard
                  key={t}
                  tier={t}
                  plan={plan}
                  isPopular={isPopular}
                  isPending={checkoutMutation.isPending}
                  onSelect={() => handleUpgrade(t)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Payment Method */}
      {subscription?.stripe_customer_id && (
        <div className="card" role="region" aria-labelledby="payment-method-title">
          <h3 id="payment-method-title" className="font-medium mb-4">
            Zahlungsmethode
          </h3>

          <div className="flex items-center justify-between p-4 bg-surface-highlight rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center"
                aria-hidden="true"
              >
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Kreditkarte / SEPA</p>
                <p className="text-sm text-zinc-400">Wird über Stripe verwaltet</p>
              </div>
            </div>
            <button
              onClick={handleManageSubscription}
              className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface rounded"
            >
              Ändern
            </button>
          </div>

          <p className="text-xs text-zinc-500 mt-3">
            Zahlungen werden sicher über Stripe abgewickelt. Wir speichern keine Zahlungsdaten.
          </p>
        </div>
      )}

      {/* Cancel Info */}
      {isActive && displayStatus !== 'canceling' && (
        <div className="card border-zinc-700" role="region" aria-labelledby="cancel-info-title">
          <h3 id="cancel-info-title" className="font-medium mb-2">
            Abo kündigen
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Du kannst dein Abo jederzeit kündigen. Nach der Kündigung läuft es bis zum Ende
            der aktuellen Periode weiter und du behältst bis dahin vollen Zugriff.
          </p>
          <button
            onClick={handleManageSubscription}
            disabled={portalMutation.isPending}
            className="btn-ghost text-red-400 hover:bg-red-500/10 focus:ring-red-500"
          >
            Abo über Stripe Portal kündigen
          </button>
        </div>
      )}

      {/* No Subscription CTA */}
      {!tier && (
        <div className="card bg-gradient-to-r from-primary/10 via-transparent to-transparent border-primary/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Starte jetzt mit POD AutoM</h3>
              <p className="text-sm text-zinc-400">
                Wähle einen Plan und automatisiere dein Print-on-Demand Business.
              </p>
            </div>
            <button
              onClick={() => handleUpgrade('premium')}
              disabled={checkoutMutation.isPending}
              className="btn-primary"
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                  Plan wählen
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Sub-Components
// ============================================

interface StatusBadgeProps {
  status: import('@src/types/subscription.types').SubscriptionDisplayStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    active: { label: 'Aktiv', className: 'bg-emerald-500/20 text-emerald-400' },
    trialing: { label: 'Testphase', className: 'bg-blue-500/20 text-blue-400' },
    past_due: { label: 'Zahlung ausstehend', className: 'bg-red-500/20 text-red-400' },
    canceling: { label: 'Wird gekündigt', className: 'bg-amber-500/20 text-amber-400' },
    canceled: { label: 'Gekündigt', className: 'bg-zinc-500/20 text-zinc-400' },
    incomplete: { label: 'Unvollständig', className: 'bg-zinc-500/20 text-zinc-400' },
    none: { label: 'Kein Plan', className: 'bg-zinc-500/20 text-zinc-400' }
  }

  const { label, className } = config[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      role="status"
    >
      {label}
    </span>
  )
}

interface FeatureCardProps {
  label: string
  value: string | boolean
  icon: React.ElementType
}

function FeatureCard({ label, value, icon: Icon }: FeatureCardProps) {
  const displayValue = typeof value === 'boolean'
    ? value
      ? <Check className="w-5 h-5 text-emerald-500" aria-label="Ja" />
      : <span className="text-zinc-500" aria-label="Nein">—</span>
    : value

  return (
    <div
      className="p-3 bg-surface-highlight rounded-lg"
      role="listitem"
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-zinc-500" aria-hidden="true" />
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
      <p className="font-semibold">{displayValue}</p>
    </div>
  )
}

interface UpgradeCardProps {
  tier: SubscriptionTier
  plan: typeof SUBSCRIPTION_TIERS['basis']
  isPopular: boolean
  isPending: boolean
  onSelect: () => void
}

function UpgradeCard({
  tier,
  plan,
  isPopular,
  isPending,
  onSelect
}: UpgradeCardProps) {
  return (
    <div
      role="listitem"
      className={`
        p-4 bg-surface-highlight rounded-lg border-2 transition
        cursor-pointer hover:border-primary/50
        ${isPopular ? 'border-primary/30' : 'border-transparent'}
        focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface
      `}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      tabIndex={0}
      aria-label={`${tier} Plan für ${plan.price}€ pro Monat auswählen`}
    >
      {isPopular && (
        <div className="flex items-center gap-1 text-primary text-xs font-medium mb-2">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          Beliebt
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold capitalize">{tier}</span>
        <span className="font-bold">
          {plan.price}€
          <span className="text-sm text-zinc-400">/Mo</span>
        </span>
      </div>

      <ul className="text-sm text-zinc-400 space-y-1 mb-4" aria-label="Features">
        <li>• {plan.maxNiches === -1 ? 'Unbegrenzt' : plan.maxNiches} Nischen</li>
        <li>• {plan.maxProducts === -1 ? 'Unbegrenzt' : plan.maxProducts} Produkte</li>
        {plan.winnerScaling && <li>• Winner Scaling</li>}
        {plan.advancedAnalytics && <li>• Advanced Analytics</li>}
      </ul>

      <button
        disabled={isPending}
        className={`w-full py-2 ${isPopular ? 'btn-primary' : 'btn-secondary'}`}
        aria-busy={isPending}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <>
            Auswählen
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  )
}

// ============================================
// Helper Functions
// ============================================

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function getUpgradeOptions(currentTier: SubscriptionTier | null): SubscriptionTier[] {
  const allTiers: SubscriptionTier[] = ['basis', 'premium', 'vip']
  const tierOrder: Record<SubscriptionTier, number> = {
    basis: 1,
    premium: 2,
    vip: 3
  }

  if (!currentTier) {
    return allTiers
  }

  return allTiers.filter(t => tierOrder[t] > tierOrder[currentTier])
}
```

---

## 4. Usage Hook (Ressourcen-Nutzung)

### src/hooks/useSubscriptionUsage.ts

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { SUBSCRIPTION_TIERS } from '@src/lib/constants'
import type { SubscriptionUsage } from '@src/types/subscription.types'

export function useSubscriptionUsage() {
  const { tier, subscription } = useSubscription()

  return useQuery({
    queryKey: ['subscription-usage', subscription?.id],
    enabled: !!subscription?.id && !!tier,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async (): Promise<SubscriptionUsage> => {
      const plan = SUBSCRIPTION_TIERS[tier!]

      // Get active niches count
      const { count: nicheCount } = await supabase
        .from('pod_autom_niches')
        .select('*', { count: 'exact', head: true })
        .eq('settings_id', subscription!.id)
        .eq('is_active', true)

      // Get products created this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: productCount } = await supabase
        .from('pod_autom_products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', subscription!.user_id)
        .gte('created_at', startOfMonth.toISOString())

      // Calculate reset date (1st of next month)
      const resetDate = new Date()
      resetDate.setMonth(resetDate.getMonth() + 1)
      resetDate.setDate(1)
      resetDate.setHours(0, 0, 0, 0)

      return {
        niches: {
          used: nicheCount ?? 0,
          limit: plan.maxNiches,
          unlimited: plan.maxNiches === -1
        },
        products: {
          used: productCount ?? 0,
          limit: plan.maxProducts,
          unlimited: plan.maxProducts === -1,
          resetDate: resetDate.toISOString()
        }
      }
    }
  })
}
```

---

## 5. Usage Display Komponente

### src/components/settings/UsageDisplay.tsx

```typescript
import { useSubscriptionUsage } from '@src/hooks/useSubscriptionUsage'
import { Loader2, Infinity, AlertTriangle } from 'lucide-react'

export default function UsageDisplay() {
  const { data: usage, isLoading, error } = useSubscriptionUsage()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-400">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        <span>Lade Nutzungsdaten...</span>
      </div>
    )
  }

  if (error || !usage) {
    return null
  }

  return (
    <div
      className="card"
      role="region"
      aria-labelledby="usage-title"
    >
      <h3 id="usage-title" className="font-medium mb-4">
        Aktuelle Nutzung
      </h3>

      <div className="space-y-4">
        {/* Niches Usage */}
        <UsageBar
          label="Nischen"
          used={usage.niches.used}
          limit={usage.niches.limit}
          unlimited={usage.niches.unlimited}
        />

        {/* Products Usage */}
        <UsageBar
          label="Produkte (Monat)"
          used={usage.products.used}
          limit={usage.products.limit}
          unlimited={usage.products.unlimited}
          resetDate={usage.products.resetDate}
        />
      </div>
    </div>
  )
}

interface UsageBarProps {
  label: string
  used: number
  limit: number
  unlimited: boolean
  resetDate?: string
}

function UsageBar({ label, used, limit, unlimited, resetDate }: UsageBarProps) {
  const percentage = unlimited ? 0 : Math.min((used / limit) * 100, 100)
  const isNearLimit = !unlimited && percentage >= 80
  const isAtLimit = !unlimited && used >= limit

  return (
    <div role="group" aria-label={label}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-zinc-400">
          {used}
          {unlimited ? (
            <span className="ml-1">
              / <Infinity className="w-4 h-4 inline" aria-label="Unbegrenzt" />
            </span>
          ) : (
            <span> / {limit}</span>
          )}
        </span>
      </div>

      {!unlimited && (
        <div
          className="h-2 bg-zinc-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${label}: ${used} von ${limit} genutzt`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isAtLimit
                ? 'bg-red-500'
                : isNearLimit
                  ? 'bg-amber-500'
                  : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {isNearLimit && !isAtLimit && (
        <p className="flex items-center gap-1 text-xs text-amber-400 mt-1">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          Du näherst dich dem Limit
        </p>
      )}

      {isAtLimit && (
        <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          Limit erreicht
        </p>
      )}

      {resetDate && !unlimited && (
        <p className="text-xs text-zinc-500 mt-1">
          Reset am {new Date(resetDate).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'short'
          })}
        </p>
      )}
    </div>
  )
}
```

---

## 6. Integration in Settings Page

### src/pages/Settings.tsx (Auszug)

```typescript
import SubscriptionSettings from '@src/components/settings/SubscriptionSettings'
import UsageDisplay from '@src/components/settings/UsageDisplay'

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-8">Einstellungen</h1>

      <div className="space-y-8">
        {/* Subscription Section */}
        <section>
          <SubscriptionSettings />
        </section>

        {/* Usage Section */}
        <section>
          <UsageDisplay />
        </section>

        {/* Other settings... */}
      </div>
    </div>
  )
}
```

---

## 7. Verifizierung

### Funktionale Tests
- [ ] Aktueller Plan wird korrekt angezeigt
- [ ] Status-Badge zeigt korrekten Status
- [ ] Upgrade-Optionen korrekt gefiltert (nur höhere Tiers)
- [ ] Checkout redirect funktioniert
- [ ] Success/Cancel Toasts erscheinen
- [ ] Portal redirect funktioniert
- [ ] Past Due Warning erscheint bei Zahlungsproblemen
- [ ] Canceling Notice erscheint bei geplanter Kündigung
- [ ] Real-time Updates bei Subscription-Änderungen
- [ ] Usage-Anzeige lädt korrekt

### Loading & Error States
- [ ] Loading Spinner während Daten geladen werden
- [ ] Error Card bei Fehlern mit Retry-Button
- [ ] Disabled States auf Buttons während Mutations

### Accessibility Tests
- [ ] Alle Regionen haben aria-labels
- [ ] Status-Badges sind für Screen Reader lesbar
- [ ] Keyboard-Navigation durch alle interaktiven Elemente
- [ ] Focus-States sind sichtbar
- [ ] Progress Bars haben korrekte ARIA-Attribute
- [ ] Zeitangaben verwenden `<time>` Element

### Responsive Design
- [ ] Layout passt sich auf Mobile an
- [ ] Grid-Layouts werden zu Stacks auf kleinen Screens
- [ ] Touch-Targets sind mindestens 44x44px

---

## 8. Abhängigkeiten

- Phase 6.1 (Stripe Integration)
- Phase 1.5 (SubscriptionContext)
- `sonner` für Toast-Benachrichtigungen
- `@tanstack/react-query` für Server State

---

## 9. Nächster Schritt

→ Phase 6.3 - Feature Gating nach Tier
