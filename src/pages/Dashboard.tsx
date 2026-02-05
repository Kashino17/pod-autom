import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Sparkles, Target, Settings, TrendingUp } from 'lucide-react'
import { DashboardLayout } from '@src/components/layout'
import {
  MetricsGrid,
  PerformanceChart,
  RecentProducts,
  ActivityFeed,
} from '@src/components/dashboard'
import { SubscriptionBanner, UpgradePrompt } from '@src/components/subscription'
import { useShops } from '@src/hooks/useShopify'
import { ShopifyConnectButton } from '@src/components/ShopifyConnectButton'
import { useDashboardStats } from '@src/hooks/useDashboardStats'
import { useSubscription } from '@src/contexts/SubscriptionContext'

// =====================================================
// PERIOD SELECTOR
// =====================================================

type Period = '7d' | '30d' | '90d'

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
}

function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const periods: { value: Period; label: string }[] = [
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
}

// =====================================================
// QUICK ACTION COMPONENT
// =====================================================

interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
}

function QuickAction({ title, description, icon, href, onClick }: QuickActionProps) {
  const content = (
    <>
      <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-sm text-zinc-400">{description}</p>
      </div>
    </>
  )

  const className =
    'flex items-start gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-violet-500/50 hover:bg-zinc-800 transition-all text-left w-full'

  if (href) {
    return (
      <Link to={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  )
}

// =====================================================
// DASHBOARD PAGE
// =====================================================

export default function Dashboard() {
  const { shops, isLoading: shopsLoading } = useShops()
  const { tier } = useSubscription()
  const [period, setPeriod] = useState<Period>('30d')

  const hasShop = shops.length > 0
  const currentShopId = shops[0]?.id || null

  const { data: stats, isLoading: statsLoading } = useDashboardStats(
    currentShopId,
    period
  )

  const isLoading = shopsLoading || statsLoading

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-zinc-400">
              Willkommen zurück! Hier ist deine Übersicht.
            </p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>

        {/* Subscription Status Banner */}
        <SubscriptionBanner />

        {/* No shop warning */}
        {!shopsLoading && !hasShop && (
          <div className="p-4 sm:p-6 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">Shop verbinden</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Verbinde deinen Shopify Store, um mit der Automatisierung zu
                  starten.
                </p>
                <div className="mt-3">
                  <ShopifyConnectButton className="text-sm bg-amber-500 hover:bg-amber-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <MetricsGrid
          metrics={stats?.metrics || null}
          isLoading={isLoading}
          period={period}
        />

        {/* Performance Chart */}
        <PerformanceChart
          data={stats?.chartData || []}
          isLoading={isLoading}
        />

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Products */}
          <div className="lg:col-span-2">
            <RecentProducts
              products={stats?.recentProducts || []}
              isLoading={isLoading}
            />
          </div>

          {/* Activity Feed */}
          <div>
            <ActivityFeed
              activities={stats?.activities || []}
              isLoading={isLoading}
              maxItems={6}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Schnellaktionen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickAction
              title="Produkte erstellen"
              description="Neue Produkte mit KI generieren"
              icon={<Sparkles className="w-5 h-5 text-violet-400" />}
              href="/dashboard/products"
            />
            <QuickAction
              title="Kampagne starten"
              description="Pinterest/Meta Kampagne"
              icon={<TrendingUp className="w-5 h-5 text-violet-400" />}
              href="/dashboard/campaigns"
            />
            <QuickAction
              title="Winner skalieren"
              description="Top-Performer identifizieren"
              icon={<Target className="w-5 h-5 text-violet-400" />}
              href="/dashboard/winners"
            />
            <QuickAction
              title="Einstellungen"
              description="Shop & Nischen konfigurieren"
              icon={<Settings className="w-5 h-5 text-violet-400" />}
              href="/settings"
            />
          </div>
        </div>

        {/* Tier upgrade prompt */}
        {tier === 'basis' && (
          <UpgradePrompt
            variant="banner"
            title="Mehr Power fuer dein Business"
            description="Schalte Winner Scaling, Multi-Plattform und Priority Support frei."
            dismissible
          />
        )}
      </div>
    </DashboardLayout>
  )
}
