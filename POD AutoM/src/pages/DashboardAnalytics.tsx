import { useState, memo } from 'react'
import { DashboardLayout } from '@src/components/layout'
import { useShops } from '@src/hooks/useShopify'
import {
  useAnalytics,
  type AnalyticsPeriod,
  type FunnelData,
  type TopProduct,
  type NicheBreakdown,
} from '@src/hooks/useAnalytics'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  ShoppingCart,
  Trophy,
  Target,
  RefreshCw,
  Lock,
  Package,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'

// =====================================================
// PERIOD SELECTOR
// =====================================================

interface PeriodSelectorProps {
  value: AnalyticsPeriod
  onChange: (period: AnalyticsPeriod) => void
}

const PeriodSelector = memo(function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const periods: { value: AnalyticsPeriod; label: string }[] = [
    { value: '7d', label: '7 Tage' },
    { value: '30d', label: '30 Tage' },
    { value: '90d', label: '90 Tage' },
  ]

  return (
    <div className="flex bg-zinc-800 rounded-lg p-1">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === period.value
              ? 'bg-violet-500 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
})

// =====================================================
// STAT CARD
// =====================================================

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  change?: number
  color?: string
}

const StatCard = memo(function StatCard({ title, value, icon, change, color = 'violet' }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    violet: 'bg-violet-500/20 text-violet-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-zinc-400">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{value}</span>
        {change !== undefined && (
          <span className={`flex items-center text-sm ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
})

// =====================================================
// PRODUCT FUNNEL CHART
// =====================================================

interface FunnelChartProps {
  data: FunnelData
  isLoading: boolean
}

const FunnelChart = memo(function FunnelChart({ data, isLoading }: FunnelChartProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 h-80 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    )
  }

  const stages = [
    { key: 'created', label: 'Erstellt', value: data.created, color: '#6366f1' },
    { key: 'start_phase', label: 'Start Phase', value: data.start_phase, color: '#8b5cf6' },
    { key: 'post_phase', label: 'Post Phase', value: data.post_phase, color: '#a855f7' },
    { key: 'winners', label: 'Winner', value: data.winners, color: '#10b981' },
  ]

  const maxValue = Math.max(...stages.map((s) => s.value), 1)

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Produkt-Funnel</h3>
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const width = (stage.value / maxValue) * 100
          const nextStage = stages[index + 1]
          const conversionRate = nextStage && stage.value > 0
            ? ((nextStage.value / stage.value) * 100).toFixed(1)
            : null

          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-400">{stage.label}</span>
                <span className="text-sm font-medium text-white">{stage.value}</span>
              </div>
              <div className="h-8 bg-zinc-800 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-500"
                  style={{ width: `${width}%`, backgroundColor: stage.color }}
                />
              </div>
              {conversionRate && (
                <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500">
                  <ArrowRight className="w-3 h-3" />
                  {conversionRate}% Conversion
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-400">{data.winners}</p>
          <p className="text-xs text-zinc-500">Winner</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-400">{data.losers}</p>
          <p className="text-xs text-zinc-500">Loser</p>
        </div>
      </div>
    </div>
  )
})

// =====================================================
// TIME SERIES CHART
// =====================================================

interface TimeSeriesChartProps {
  data: Array<{
    date: string
    products_created: number
    products_published: number
    sales: number
  }>
  isLoading: boolean
}

const TimeSeriesChart = memo(function TimeSeriesChart({ data, isLoading }: TimeSeriesChartProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 h-80 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Aktivitaet</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorProducts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#71717a"
              fontSize={12}
            />
            <YAxis stroke="#71717a" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  products_created: 'Erstellt',
                  products_published: 'Veroeffentlicht',
                  sales: 'Verkaeufe',
                }
                return [value, labels[name] || name]
              }}
              labelFormatter={(label) => formatDate(label)}
            />
            <Area
              type="monotone"
              dataKey="products_created"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorProducts)"
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorSales)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-sm text-zinc-400">Produkte erstellt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-sm text-zinc-400">Verkaeufe</span>
        </div>
      </div>
    </div>
  )
})

// =====================================================
// TOP PRODUCTS TABLE
// =====================================================

interface TopProductsTableProps {
  products: TopProduct[]
  isLoading: boolean
}

const TopProductsTable = memo(function TopProductsTable({ products, isLoading }: TopProductsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 h-80 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    )
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Top Produkte</h3>
      {products.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          Noch keine Produkte mit Verkaeufen
        </div>
      ) : (
        <div className="space-y-3">
          {products.slice(0, 5).map((product, index) => (
            <div
              key={product.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50"
            >
              <span className="text-lg font-bold text-zinc-600 w-6">#{index + 1}</span>
              <div className="w-10 h-10 rounded bg-zinc-700 flex-shrink-0 overflow-hidden">
                {product.generated_image_url ? (
                  <img
                    src={product.generated_image_url}
                    alt={product.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-zinc-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{product.title}</p>
                <p className="text-xs text-zinc-500">
                  {product.total_sales} Verkaeufe | {product.total_views} Views
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-emerald-400">
                  {formatCurrency(product.total_revenue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

// =====================================================
// NICHE PERFORMANCE CHART
// =====================================================

interface NichePerformanceChartProps {
  niches: NicheBreakdown[]
  isLoading: boolean
}

const NichePerformanceChart = memo(function NichePerformanceChart({ niches, isLoading }: NichePerformanceChartProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 h-80 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    )
  }

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

  const pieData = niches.slice(0, 6).map((n) => ({
    name: n.name,
    value: n.total_revenue,
  }))

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Nischen Performance</h3>
      {niches.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          Noch keine Nischen konfiguriert
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {niches.slice(0, 5).map((niche, index) => (
              <div key={niche.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-zinc-300">{niche.name}</span>
                </div>
                <span className="text-sm text-zinc-400">
                  {formatCurrency(niche.total_revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

// =====================================================
// PREMIUM GATE
// =====================================================

const PremiumGate = memo(function PremiumGate() {
  return (
    <div className="bg-zinc-900 rounded-xl border border-violet-500/30 p-12 text-center">
      <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Premium Feature
      </h3>
      <p className="text-zinc-400 mb-6 max-w-md mx-auto">
        Advanced Analytics ist nur im Premium- und VIP-Tarif verfuegbar.
        Upgrade jetzt fuer detaillierte Einblicke in deine Performance.
      </p>
      <Link to="/pricing" className="btn-primary">
        Auf Premium upgraden
      </Link>
    </div>
  )
})

// =====================================================
// DASHBOARD ANALYTICS PAGE
// =====================================================

export default function DashboardAnalytics() {
  const { shops, isLoading: shopsLoading } = useShops()
  const { canUseFeature } = useSubscription()
  const currentShopId = shops[0]?.id ?? null

  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')

  const {
    overview,
    funnel,
    campaigns,
    roas,
    timeSeriesData,
    topProducts,
    nicheBreakdown,
    isLoading,
    refetchAll,
  } = useAnalytics(currentShopId, period)

  const canUseAnalytics = canUseFeature('advancedAnalytics')
  const loading = shopsLoading || isLoading

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)

  if (loading && !overview.total_products) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-violet-400" />
              Analytics
            </h1>
            <p className="text-zinc-400 mt-1">
              Detaillierte Einblicke in deine Shop-Performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetchAll()}
              className="btn-secondary"
              title="Aktualisieren"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
        </div>

        {/* Premium Gate */}
        {!canUseAnalytics && <PremiumGate />}

        {canUseAnalytics && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard
                title="Produkte"
                value={overview.total_products}
                icon={<Package className="w-4 h-4" />}
                color="violet"
              />
              <StatCard
                title="Views"
                value={overview.total_views.toLocaleString('de-DE')}
                icon={<Eye className="w-4 h-4" />}
                color="cyan"
              />
              <StatCard
                title="Verkaeufe"
                value={overview.total_sales}
                icon={<ShoppingCart className="w-4 h-4" />}
                color="emerald"
              />
              <StatCard
                title="Umsatz"
                value={formatCurrency(overview.total_revenue)}
                icon={<DollarSign className="w-4 h-4" />}
                color="amber"
              />
              <StatCard
                title="Conv. Rate"
                value={`${overview.conversion_rate}%`}
                icon={<Target className="w-4 h-4" />}
                color="violet"
              />
              <StatCard
                title="Winner Rate"
                value={`${overview.winner_rate}%`}
                icon={<Trophy className="w-4 h-4" />}
                color="emerald"
              />
            </div>

            {/* Campaign Performance */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 text-center">
                <p className="text-sm text-zinc-400 mb-1">Ad Spend</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(campaigns.total_spend)}
                </p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 text-center">
                <p className="text-sm text-zinc-400 mb-1">Impressionen</p>
                <p className="text-xl font-bold text-white">
                  {campaigns.total_impressions.toLocaleString('de-DE')}
                </p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 text-center">
                <p className="text-sm text-zinc-400 mb-1">Klicks</p>
                <p className="text-xl font-bold text-white">
                  {campaigns.total_clicks.toLocaleString('de-DE')}
                </p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 text-center">
                <p className="text-sm text-zinc-400 mb-1">Conversions</p>
                <p className="text-xl font-bold text-white">
                  {campaigns.total_conversions}
                </p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 text-center">
                <p className="text-sm text-zinc-400 mb-1">ROAS</p>
                <p className={`text-xl font-bold ${roas >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {roas.toFixed(2)}x
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FunnelChart data={funnel} isLoading={isLoading} />
              <TimeSeriesChart data={timeSeriesData} isLoading={isLoading} />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopProductsTable products={topProducts} isLoading={isLoading} />
              <NichePerformanceChart niches={nicheBreakdown} isLoading={isLoading} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
