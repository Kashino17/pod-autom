import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Crown, Sparkles, ArrowRight } from 'lucide-react'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@src/lib/constants'
import type { FeatureKey } from '@src/types/auth'

// =====================================================
// TYPES
// =====================================================

interface SubscriptionGateProps {
  children: ReactNode
  /** Feature key to check access for */
  feature?: FeatureKey
  /** Minimum tier required */
  requiredTier?: SubscriptionTier | SubscriptionTier[]
  /** Show locked state inline instead of replacing content */
  inline?: boolean
  /** Custom fallback when access denied */
  fallback?: ReactNode
  /** Show nothing when access denied (useful for hiding UI elements) */
  hideWhenLocked?: boolean
}

// =====================================================
// LOCKED CONTENT COMPONENT
// =====================================================

interface LockedContentProps {
  feature: FeatureKey | undefined
  requiredTier: SubscriptionTier | SubscriptionTier[] | undefined
  inline: boolean
}

function LockedContent({ feature, requiredTier, inline }: LockedContentProps) {
  const tiers: SubscriptionTier[] = requiredTier
    ? Array.isArray(requiredTier)
      ? requiredTier
      : [requiredTier]
    : []

  const lowestTier: SubscriptionTier = tiers[0] ?? 'premium'
  const tierData = SUBSCRIPTION_TIERS[lowestTier]

  const featureLabels: Record<FeatureKey, string> = {
    winnerScaling: 'Winner Scaling',
    advancedAnalytics: 'Advanced Analytics',
    multiPlatform: 'Multi-Plattform',
    allPlatforms: 'Alle Plattformen',
    prioritySupport: 'Priority Support',
    oneOnOneSupport: '1:1 Support',
  }

  const featureLabel = feature !== undefined ? featureLabels[feature] : 'Dieses Feature'

  // Inline variant (small badge)
  if (inline) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 border border-violet-500/30 rounded-lg">
        <Lock className="w-3 h-3 text-violet-400" />
        <span className="text-xs text-violet-300">{tierData.name}</span>
      </div>
    )
  }

  // Full variant (card)
  return (
    <div className="relative overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-8">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl" />

      <div className="relative text-center">
        {/* Icon */}
        <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/20">
          {lowestTier === 'vip' ? (
            <Crown className="w-8 h-8 text-amber-400" />
          ) : (
            <Sparkles className="w-8 h-8 text-violet-400" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-2">
          {featureLabel} ist ein {tierData.name}-Feature
        </h3>

        {/* Description */}
        <p className="text-zinc-400 mb-6 max-w-md mx-auto">
          Upgrade auf den {tierData.name} Plan um diese Funktion freizuschalten und dein Business auf das naechste Level zu bringen.
        </p>

        {/* Price hint */}
        <p className="text-sm text-zinc-500 mb-6">
          Ab {tierData.price}€/Monat
        </p>

        {/* CTA */}
        <Link
          to={`/checkout?tier=${lowestTier}`}
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white font-medium rounded-xl transition-colors touch-manipulation"
        >
          Auf {tierData.name} upgraden
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function SubscriptionGate({
  children,
  feature,
  requiredTier,
  inline = false,
  fallback,
  hideWhenLocked = false,
}: SubscriptionGateProps) {
  const { canUseFeature, tier, isActive } = useSubscription()

  // Check access
  let hasAccess = false

  if (feature) {
    hasAccess = canUseFeature(feature)
  } else if (requiredTier) {
    const tiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier]

    if (!tier || !isActive) {
      hasAccess = false
    } else {
      // Check if current tier meets requirement
      const tierHierarchy: SubscriptionTier[] = ['basis', 'premium', 'vip']
      const currentTierIndex = tierHierarchy.indexOf(tier)
      const requiredTierIndex = Math.min(
        ...tiers.map((t) => tierHierarchy.indexOf(t))
      )
      hasAccess = currentTierIndex >= requiredTierIndex
    }
  } else {
    // No restriction specified, allow access
    hasAccess = true
  }

  // Render based on access
  if (hasAccess) {
    return <>{children}</>
  }

  if (hideWhenLocked) {
    return null
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return <LockedContent feature={feature} requiredTier={requiredTier} inline={inline} />
}

export default SubscriptionGate
