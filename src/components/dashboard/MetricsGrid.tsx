import {
  Package,
  TrendingUp,
  Eye,
  DollarSign,
  ShoppingCart,
  Target,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react'

// =====================================================
// TYPES
// =====================================================

export interface DashboardMetrics {
  totalProducts: number
  activeProducts: number
  pendingProducts: number
  totalImpressions: number
  totalClicks: number
  totalSales: number
  totalRevenue: number
  conversionRate: number
  // Changes (percentage)
  productChange?: number
  impressionChange?: number
  salesChange?: number
  revenueChange?: number
}

interface MetricsGridProps {
  metrics: DashboardMetrics | null
  isLoading: boolean
  period?: '7d' | '30d' | '90d'
}

// =====================================================
// STAT CARD COMPONENT
// =====================================================

interface StatCardProps {
  title: string
  value: string | number
  change?: number | undefined
  icon: React.ReactNode
  loading?: boolean
  format?: 'number' | 'currency' | 'percent'
}

function StatCard({ title, value, change, icon, loading, format = 'number' }: StatCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
        }).format(val)
      case 'percent':
        return `${val.toFixed(1)}%`
      default:
        return new Intl.NumberFormat('de-DE').format(val)
    }
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
          {icon}
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-0.5 text-sm font-medium ${
              isPositive
                ? 'text-emerald-400'
                : isNegative
                ? 'text-red-400'
                : 'text-zinc-500'
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : isNegative ? (
              <ArrowDownRight className="w-4 h-4" />
            ) : null}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        {loading ? (
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        ) : (
          <p className="text-2xl font-bold text-white">{formatValue(value)}</p>
        )}
        <p className="text-sm text-zinc-400 mt-1">{title}</p>
      </div>
    </div>
  )
}

// =====================================================
// METRICS GRID COMPONENT
// =====================================================

export function MetricsGrid({ metrics, isLoading, period = '30d' }: MetricsGridProps) {
  const periodLabel = {
    '7d': '7 Tage',
    '30d': '30 Tage',
    '90d': '90 Tage',
  }[period]

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Übersicht</h2>
        <span className="text-sm text-zinc-500">Letzte {periodLabel}</span>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Produkte gesamt"
          value={metrics?.totalProducts ?? 0}
          change={metrics?.productChange}
          icon={<Package className="w-5 h-5 text-violet-400" />}
          loading={isLoading}
        />
        <StatCard
          title="Aktive Produkte"
          value={metrics?.activeProducts ?? 0}
          icon={<Target className="w-5 h-5 text-violet-400" />}
          loading={isLoading}
        />
        <StatCard
          title="Impressionen"
          value={metrics?.totalImpressions ?? 0}
          change={metrics?.impressionChange}
          icon={<Eye className="w-5 h-5 text-violet-400" />}
          loading={isLoading}
        />
        <StatCard
          title="Umsatz"
          value={metrics?.totalRevenue ?? 0}
          change={metrics?.revenueChange}
          icon={<DollarSign className="w-5 h-5 text-violet-400" />}
          loading={isLoading}
          format="currency"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Verkäufe"
          value={metrics?.totalSales ?? 0}
          change={metrics?.salesChange}
          icon={<ShoppingCart className="w-5 h-5 text-violet-400" />}
          loading={isLoading}
        />
        <StatCard
          title="Klicks"
          value={metrics?.totalClicks ?? 0}
          icon={<Zap className="w-5 h-5 text-violet-400" />}
          loading={isLoading}
        />
        <StatCard
          title="Conversion Rate"
          value={metrics?.conversionRate ?? 0}
          icon={<TrendingUp className="w-5 h-5 text-violet-400" />}
          loading={isLoading}
          format="percent"
        />
        <StatCard
          title="Wartend"
          value={metrics?.pendingProducts ?? 0}
          icon={<BarChart3 className="w-5 h-5 text-violet-400" />}
          loading={isLoading}
        />
      </div>
    </div>
  )
}

export default MetricsGrid
