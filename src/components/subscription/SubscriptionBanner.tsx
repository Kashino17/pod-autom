import { Link } from 'react-router-dom'
import { AlertCircle, Clock, CreditCard, X, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useCheckout } from '@src/hooks/useCheckout'

// =====================================================
// TYPES
// =====================================================

type BannerType = 'past_due' | 'trial_ending' | 'no_subscription' | 'canceled' | null

// =====================================================
// COMPONENT
// =====================================================

export function SubscriptionBanner() {
  const [isDismissed, setIsDismissed] = useState(false)
  const { subscription, isPastDue, daysUntilRenewal } = useSubscription()
  const { openCustomerPortal, isLoading: isPortalLoading } = useCheckout()

  // Determine which banner to show
  let bannerType: BannerType = null

  if (!subscription) {
    bannerType = 'no_subscription'
  } else if (isPastDue) {
    bannerType = 'past_due'
  } else if (subscription.status === 'canceled') {
    bannerType = 'canceled'
  } else if (subscription.status === 'trialing' && daysUntilRenewal !== null && daysUntilRenewal <= 3) {
    bannerType = 'trial_ending'
  }

  // Don't show if dismissed or no banner needed
  if (isDismissed || !bannerType) {
    return null
  }

  // Banner configurations
  const bannerConfig = {
    past_due: {
      icon: AlertCircle,
      iconColor: 'text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/30',
      title: 'Zahlung fehlgeschlagen',
      description: 'Bitte aktualisiere deine Zahlungsmethode, um weiterhin alle Features nutzen zu koennen.',
      action: 'Zahlungsmethode aktualisieren',
      actionType: 'portal' as const,
      dismissible: false,
    },
    trial_ending: {
      icon: Clock,
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30',
      title: `Testphase endet in ${daysUntilRenewal} ${daysUntilRenewal === 1 ? 'Tag' : 'Tagen'}`,
      description: 'Upgrade jetzt, um ohne Unterbrechung weiterzuarbeiten.',
      action: 'Jetzt upgraden',
      actionType: 'checkout' as const,
      dismissible: true,
    },
    no_subscription: {
      icon: CreditCard,
      iconColor: 'text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/30',
      title: 'Kein aktives Abonnement',
      description: 'Waehle einen Plan, um alle Features freizuschalten.',
      action: 'Plan auswaehlen',
      actionType: 'checkout' as const,
      dismissible: true,
    },
    canceled: {
      icon: AlertTriangle,
      iconColor: 'text-orange-400',
      bgColor: 'bg-orange-500/10 border-orange-500/30',
      title: 'Abonnement gekuendigt',
      description: daysUntilRenewal
        ? `Dein Zugang endet in ${daysUntilRenewal} ${daysUntilRenewal === 1 ? 'Tag' : 'Tagen'}.`
        : 'Dein Zugang endet bald.',
      action: 'Abonnement reaktivieren',
      actionType: 'portal' as const,
      dismissible: true,
    },
  }

  const config = bannerConfig[bannerType]
  const Icon = config.icon

  const handleAction = () => {
    if (config.actionType === 'portal') {
      openCustomerPortal()
    }
  }

  return (
    <div className={`border rounded-xl p-4 mb-6 ${config.bgColor}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white">{config.title}</p>
          <p className="text-sm text-zinc-400 mt-0.5">{config.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {config.actionType === 'checkout' ? (
            <Link
              to="/checkout"
              className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {config.action}
            </Link>
          ) : (
            <button
              onClick={handleAction}
              disabled={isPortalLoading}
              className="px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:bg-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isPortalLoading ? 'Laden...' : config.action}
            </button>
          )}

          {config.dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubscriptionBanner
