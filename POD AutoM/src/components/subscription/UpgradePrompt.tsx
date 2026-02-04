import { Link } from 'react-router-dom'
import { Zap, Crown, ArrowRight, X } from 'lucide-react'
import { useState } from 'react'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@src/lib/constants'

// =====================================================
// TYPES
// =====================================================

interface UpgradePromptProps {
  /** Target tier to upgrade to */
  targetTier?: SubscriptionTier
  /** Custom title */
  title?: string
  /** Custom description */
  description?: string
  /** Variant style */
  variant?: 'banner' | 'card' | 'compact'
  /** Allow dismissing the prompt */
  dismissible?: boolean
  /** Callback when dismissed */
  onDismiss?: () => void
}

// =====================================================
// COMPONENT
// =====================================================

export function UpgradePrompt({
  targetTier,
  title,
  description,
  variant = 'banner',
  dismissible = false,
  onDismiss,
}: UpgradePromptProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const { tier } = useSubscription()

  // Determine target tier
  const target: SubscriptionTier = targetTier || (tier === 'basis' ? 'premium' : 'vip')
  const tierData = SUBSCRIPTION_TIERS[target]

  // Don't show if already at target tier or higher
  if (tier) {
    const tierHierarchy: SubscriptionTier[] = ['basis', 'premium', 'vip']
    const currentIndex = tierHierarchy.indexOf(tier)
    const targetIndex = tierHierarchy.indexOf(target)
    if (currentIndex >= targetIndex) {
      return null
    }
  }

  if (isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const defaultTitle = `Upgrade auf ${tierData.name}`
  const defaultDescription = `Schalte mehr Features frei ab ${tierData.price}€/Monat`

  // Compact variant
  if (variant === 'compact') {
    return (
      <Link
        to={`/checkout?tier=${target}`}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg transition-colors group"
      >
        <Zap className="w-4 h-4 text-violet-400" />
        <span className="text-sm text-violet-300 group-hover:text-violet-200">
          {title || defaultTitle}
        </span>
        <ArrowRight className="w-3 h-3 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    )
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className="relative bg-gradient-to-r from-violet-500/20 via-violet-500/10 to-violet-500/20 border border-violet-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
              {target === 'vip' ? (
                <Crown className="w-5 h-5 text-amber-400" />
              ) : (
                <Zap className="w-5 h-5 text-violet-400" />
              )}
            </div>
            <div>
              <p className="font-medium text-white">{title || defaultTitle}</p>
              <p className="text-sm text-zinc-400">{description || defaultDescription}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/checkout?tier=${target}`}
              className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Upgraden
            </Link>

            {dismissible && (
              <button
                onClick={handleDismiss}
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

  // Card variant
  return (
    <div className="relative bg-zinc-800/50 border border-violet-500/30 rounded-xl p-6 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />

      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
            {target === 'vip' ? (
              <Crown className="w-6 h-6 text-amber-400" />
            ) : (
              <Zap className="w-6 h-6 text-violet-400" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-white">{title || defaultTitle}</h3>
            <p className="text-sm text-zinc-400">{description || defaultDescription}</p>
          </div>
        </div>

        {/* Feature highlights */}
        <ul className="space-y-2 mb-6">
          {tierData.features.slice(0, 3).map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              {feature}
            </li>
          ))}
        </ul>

        <Link
          to={`/checkout?tier=${target}`}
          className="flex items-center justify-center gap-2 w-full py-3 bg-violet-500 hover:bg-violet-600 text-white font-medium rounded-xl transition-colors"
        >
          Jetzt upgraden
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

export default UpgradePrompt
