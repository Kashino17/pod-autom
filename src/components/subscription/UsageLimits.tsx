import { Link } from 'react-router-dom'
import { Layers, Package, AlertTriangle, ArrowRight, Infinity as InfinityIcon } from 'lucide-react'
import { useSubscription } from '@src/contexts/SubscriptionContext'

// =====================================================
// TYPES
// =====================================================

interface UsageLimitsProps {
  /** Current number of niches */
  currentNiches: number
  /** Current number of products this month */
  currentProducts: number
  /** Show compact version */
  compact?: boolean
  /** Show upgrade prompt when approaching limits */
  showUpgradePrompt?: boolean
}

interface LimitBarProps {
  label: string
  icon: React.ReactNode
  current: number
  max: number
  unit?: string
}

// =====================================================
// HELPER
// =====================================================

function isUnlimitedValue(value: number): boolean {
  return !Number.isFinite(value) || value < 0
}

// =====================================================
// LIMIT BAR COMPONENT
// =====================================================

function LimitBar({ label, icon, current, max, unit = '' }: LimitBarProps) {
  const isUnlimited = isUnlimitedValue(max)
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100)
  const isNearLimit = !isUnlimited && percentage >= 80
  const isAtLimit = !isUnlimited && current >= max

  // Determine colors
  let barColor = 'bg-violet-500'
  let textColor = 'text-zinc-400'

  if (isAtLimit) {
    barColor = 'bg-red-500'
    textColor = 'text-red-400'
  } else if (isNearLimit) {
    barColor = 'bg-amber-500'
    textColor = 'text-amber-400'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <span className={`text-sm ${textColor}`}>
          {current}
          {isUnlimited ? (
            <span className="text-zinc-500"> / <InfinityIcon className="w-4 h-4 inline" /></span>
          ) : (
            <span className="text-zinc-500"> / {max}{unit}</span>
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
        {isUnlimited ? (
          <div className="h-full w-1/4 bg-emerald-500 rounded-full" />
        ) : (
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>

      {/* Warning message */}
      {isAtLimit && !isUnlimited && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Limit erreicht
        </p>
      )}
      {isNearLimit && !isAtLimit && !isUnlimited && (
        <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Fast am Limit
        </p>
      )}
    </div>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function UsageLimits({
  currentNiches,
  currentProducts,
  compact = false,
  showUpgradePrompt = true,
}: UsageLimitsProps) {
  const { maxNiches, maxProducts, tier } = useSubscription()

  const nichesUnlimited = isUnlimitedValue(maxNiches)
  const productsUnlimited = isUnlimitedValue(maxProducts)

  const isNichesNearLimit = !nichesUnlimited && currentNiches >= maxNiches * 0.8
  const isProductsNearLimit = !productsUnlimited && currentProducts >= maxProducts * 0.8
  const shouldShowUpgrade = showUpgradePrompt && tier !== 'vip' && (isNichesNearLimit || isProductsNearLimit)

  // Compact version
  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-500" />
          <span className="text-zinc-400">
            {currentNiches}/{nichesUnlimited ? <InfinityIcon className="w-3 h-3 inline" /> : maxNiches}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-zinc-500" />
          <span className="text-zinc-400">
            {currentProducts}/{productsUnlimited ? <InfinityIcon className="w-3 h-3 inline" /> : maxProducts}
          </span>
        </div>
      </div>
    )
  }

  // Full version
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
      <h4 className="text-sm font-medium text-zinc-300 mb-4">Nutzungslimits</h4>

      <div className="space-y-4">
        <LimitBar
          label="Nischen"
          icon={<Layers className="w-4 h-4 text-violet-400" />}
          current={currentNiches}
          max={maxNiches}
        />

        <LimitBar
          label="Produkte"
          icon={<Package className="w-4 h-4 text-violet-400" />}
          current={currentProducts}
          max={maxProducts}
          unit="/Monat"
        />
      </div>

      {/* Upgrade prompt */}
      {shouldShowUpgrade && (
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <Link
            to={`/checkout?tier=${tier === 'basis' ? 'premium' : 'vip'}`}
            className="flex items-center justify-between w-full px-3 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-lg transition-colors group"
          >
            <span className="text-sm text-violet-300">Mehr Kapazitaet benoetigt?</span>
            <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  )
}

// =====================================================
// HOOK FOR CHECKING LIMITS
// =====================================================

export function useCanCreateNiche(currentNiches: number): boolean {
  const { maxNiches, isActive } = useSubscription()
  if (!isActive) return false
  if (isUnlimitedValue(maxNiches)) return true
  return currentNiches < maxNiches
}

export function useCanCreateProduct(currentProducts: number): boolean {
  const { maxProducts, isActive } = useSubscription()
  if (!isActive) return false
  if (isUnlimitedValue(maxProducts)) return true
  return currentProducts < maxProducts
}

export default UsageLimits
