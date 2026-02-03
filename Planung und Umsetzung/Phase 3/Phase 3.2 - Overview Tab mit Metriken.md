# Phase 3.2 - Overview Tab mit Metriken

## Ziel
Erstellen des Dashboard-Überblicks mit wichtigen KPIs, Echtzeit-Statistiken und interaktiven Charts.

## Kritische Hinweise

### ⚠️ Tailwind CSS Dynamic Classes
Tailwind CSS scannt zur Build-Zeit nach vollständigen Klassennamen. Dynamische Klassen wie `bg-${color}-500` funktionieren **NICHT**!

**❌ Falsch:**
```typescript
<div className={`bg-${kpi.color}-500/10`}>
```

**✅ Richtig:**
```typescript
const colorClasses = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  // ...
}
<div className={colorClasses[kpi.color].bg}>
```

---

## Komponenten

### 1. src/hooks/useDashboardStats.ts (NEU)

Dedizierter Hook für Dashboard-Statistiken mit echten API-Daten.

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'

export interface DashboardStats {
  // KPIs
  revenue: number
  revenueChange: number
  orders: number
  ordersChange: number
  activeProducts: number
  productsChange: number
  winners: number
  winnersChange: number
  // Limits
  nichesUsed: number
  productsCreatedThisMonth: number
}

export interface ChartDataPoint {
  date: string
  label: string // z.B. "Mo", "01.02"
  revenue?: number
  orders?: number
  productsCreated?: number
  winners?: number
}

export interface ActivityItem {
  id: string
  type: 'product_created' | 'winner_detected' | 'sync_completed' | 'order_received' | 'loser_removed'
  message: string
  metadata?: Record<string, unknown>
  created_at: string
}

type DateRange = '7d' | '30d' | 'mtd' | 'ytd'

export function useDashboardStats(shopId: string | null, dateRange: DateRange = '7d') {
  return useQuery({
    queryKey: ['dashboard-stats', shopId, dateRange],
    queryFn: async (): Promise<DashboardStats | null> => {
      if (!shopId) return null

      // Berechne Datum-Range
      const now = new Date()
      let startDate: Date
      let previousStartDate: Date

      switch (dateRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
          break
        case 'mtd':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          break
        case 'ytd':
          startDate = new Date(now.getFullYear(), 0, 1)
          previousStartDate = new Date(now.getFullYear() - 1, 0, 1)
          break
      }

      // Settings für den Shop holen
      const { data: settings } = await supabase
        .from('pod_autom_settings')
        .select('id')
        .eq('shop_id', shopId)
        .single()

      if (!settings) return null

      // Parallele Queries für Performance
      const [
        nichesResult,
        productsResult,
        analyticsResult,
        previousAnalyticsResult,
        ordersResult,
        previousOrdersResult
      ] = await Promise.all([
        // Aktive Nischen
        supabase
          .from('pod_autom_niches')
          .select('*', { count: 'exact', head: true })
          .eq('settings_id', settings.id)
          .eq('is_active', true),

        // Produkte diesen Monat erstellt
        supabase
          .from('product_analytics')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', shopId)
          .gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),

        // Aktuelle Periode: Produkte & Winner
        supabase
          .from('product_analytics')
          .select('id, current_phase, total_revenue')
          .eq('shop_id', shopId)
          .gte('created_at', startDate.toISOString()),

        // Vorherige Periode für Vergleich
        supabase
          .from('product_analytics')
          .select('id, current_phase, total_revenue')
          .eq('shop_id', shopId)
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString()),

        // Bestellungen aktuelle Periode (aus sales_data)
        supabase
          .from('sales_data')
          .select('order_id, line_item_price')
          .eq('shop_id', shopId)
          .gte('order_date', startDate.toISOString()),

        // Bestellungen vorherige Periode
        supabase
          .from('sales_data')
          .select('order_id, line_item_price')
          .eq('shop_id', shopId)
          .gte('order_date', previousStartDate.toISOString())
          .lt('order_date', startDate.toISOString())
      ])

      // Berechne Umsatz (unique orders)
      const currentOrders = new Set(ordersResult.data?.map(o => o.order_id) || [])
      const previousOrders = new Set(previousOrdersResult.data?.map(o => o.order_id) || [])
      const currentRevenue = ordersResult.data?.reduce((sum, o) => sum + (o.line_item_price || 0), 0) || 0
      const previousRevenue = previousOrdersResult.data?.reduce((sum, o) => sum + (o.line_item_price || 0), 0) || 0

      // Winner zählen
      const currentWinners = analyticsResult.data?.filter(p => p.current_phase === 'winner').length || 0
      const previousWinners = previousAnalyticsResult.data?.filter(p => p.current_phase === 'winner').length || 0

      // Produkte zählen
      const currentProducts = analyticsResult.data?.length || 0
      const previousProducts = previousAnalyticsResult.data?.length || 0

      // Prozentuale Änderungen berechnen
      const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0
        return Math.round(((current - previous) / previous) * 100 * 10) / 10
      }

      return {
        revenue: currentRevenue,
        revenueChange: calculateChange(currentRevenue, previousRevenue),
        orders: currentOrders.size,
        ordersChange: calculateChange(currentOrders.size, previousOrders.size),
        activeProducts: currentProducts,
        productsChange: currentProducts - previousProducts,
        winners: currentWinners,
        winnersChange: currentWinners - previousWinners,
        nichesUsed: nichesResult.count || 0,
        productsCreatedThisMonth: productsResult.count || 0
      }
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // 5 Minuten
    refetchOnWindowFocus: false
  })
}

export function useRevenueChart(shopId: string | null, dateRange: DateRange = '7d') {
  return useQuery({
    queryKey: ['revenue-chart', shopId, dateRange],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      if (!shopId) return []

      const now = new Date()
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 30
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

      const { data } = await supabase
        .from('sales_data')
        .select('order_date, line_item_price')
        .eq('shop_id', shopId)
        .gte('order_date', startDate.toISOString())
        .order('order_date', { ascending: true })

      // Gruppiere nach Tag
      const dailyRevenue: Record<string, number> = {}

      data?.forEach(order => {
        const date = new Date(order.order_date).toISOString().split('T')[0]
        dailyRevenue[date] = (dailyRevenue[date] || 0) + (order.line_item_price || 0)
      })

      // Erstelle Array für alle Tage (auch ohne Daten)
      const result: ChartDataPoint[] = []
      const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const label = days <= 7
          ? dayNames[date.getDay()]
          : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

        result.push({
          date: dateStr,
          label,
          revenue: dailyRevenue[dateStr] || 0
        })
      }

      return result
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5
  })
}

export function useProductChart(shopId: string | null, dateRange: DateRange = '7d') {
  return useQuery({
    queryKey: ['product-chart', shopId, dateRange],
    queryFn: async (): Promise<ChartDataPoint[]> => {
      if (!shopId) return []

      const now = new Date()
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 30
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

      const { data } = await supabase
        .from('product_analytics')
        .select('created_at, current_phase, winner_detected_at')
        .eq('shop_id', shopId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      // Gruppiere nach Tag
      const dailyData: Record<string, { created: number; winners: number }> = {}

      data?.forEach(product => {
        const createdDate = new Date(product.created_at).toISOString().split('T')[0]
        if (!dailyData[createdDate]) {
          dailyData[createdDate] = { created: 0, winners: 0 }
        }
        dailyData[createdDate].created++

        // Winner an dem Tag erkannt?
        if (product.winner_detected_at) {
          const winnerDate = new Date(product.winner_detected_at).toISOString().split('T')[0]
          if (!dailyData[winnerDate]) {
            dailyData[winnerDate] = { created: 0, winners: 0 }
          }
          dailyData[winnerDate].winners++
        }
      })

      // Array erstellen
      const result: ChartDataPoint[] = []
      const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const label = days <= 7
          ? dayNames[date.getDay()]
          : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

        result.push({
          date: dateStr,
          label,
          productsCreated: dailyData[dateStr]?.created || 0,
          winners: dailyData[dateStr]?.winners || 0
        })
      }

      return result
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5
  })
}

export function useRecentActivity(shopId: string | null, limit: number = 10) {
  return useQuery({
    queryKey: ['recent-activity', shopId, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!shopId) return []

      // Hole verschiedene Aktivitäts-Typen parallel
      const [jobsResult, winnersResult, productsResult] = await Promise.all([
        // Letzte Job-Läufe (Sync completed etc.)
        supabase
          .from('job_runs')
          .select('id, job_name, status, created_at, metadata')
          .in('job_name', ['pinterest_sync_job', 'product_creation_job'])
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(5),

        // Kürzlich erkannte Winner
        supabase
          .from('product_analytics')
          .select('id, product_title, winner_detected_at')
          .eq('shop_id', shopId)
          .eq('current_phase', 'winner')
          .not('winner_detected_at', 'is', null)
          .order('winner_detected_at', { ascending: false })
          .limit(5),

        // Kürzlich erstellte Produkte
        supabase
          .from('product_analytics')
          .select('id, product_title, created_at')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false })
          .limit(5)
      ])

      const activities: ActivityItem[] = []

      // Job-Runs verarbeiten
      jobsResult.data?.forEach(job => {
        const jobNames: Record<string, string> = {
          pinterest_sync_job: 'Pinterest Sync abgeschlossen',
          product_creation_job: 'Produkt-Erstellung abgeschlossen'
        }
        activities.push({
          id: job.id,
          type: 'sync_completed',
          message: jobNames[job.job_name] || job.job_name,
          metadata: job.metadata,
          created_at: job.created_at
        })
      })

      // Winner verarbeiten
      winnersResult.data?.forEach(winner => {
        activities.push({
          id: `winner-${winner.id}`,
          type: 'winner_detected',
          message: `Winner erkannt: "${winner.product_title?.substring(0, 30)}${(winner.product_title?.length || 0) > 30 ? '...' : ''}"`,
          created_at: winner.winner_detected_at!
        })
      })

      // Neue Produkte verarbeiten (gruppiert)
      const productsByDay: Record<string, number> = {}
      productsResult.data?.forEach(p => {
        const day = new Date(p.created_at).toISOString().split('T')[0]
        productsByDay[day] = (productsByDay[day] || 0) + 1
      })

      Object.entries(productsByDay).forEach(([day, count]) => {
        activities.push({
          id: `products-${day}`,
          type: 'product_created',
          message: `${count} neue Produkte erstellt`,
          created_at: new Date(day).toISOString()
        })
      })

      // Nach Datum sortieren und limitieren
      return activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2 // 2 Minuten
  })
}
```

### 2. src/components/ui/ChartSkeleton.tsx (NEU)

Loading Skeleton für Charts.

```typescript
export default function ChartSkeleton({ height = 256 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-surface-highlight rounded-lg"
      style={{ height }}
    >
      <div className="h-full flex items-end justify-around px-4 pb-4 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="bg-zinc-700 rounded-t"
            style={{
              width: '12%',
              height: `${30 + Math.random() * 50}%`,
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function KPICardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-700" />
        <div className="w-12 h-4 bg-zinc-700 rounded" />
      </div>
      <div className="h-8 w-24 bg-zinc-700 rounded mb-1" />
      <div className="h-4 w-20 bg-zinc-700 rounded" />
    </div>
  )
}

export function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="w-2 h-2 rounded-full mt-2 bg-zinc-700" />
          <div className="flex-1">
            <div className="h-4 w-3/4 bg-zinc-700 rounded mb-1" />
            <div className="h-3 w-16 bg-zinc-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 3. src/components/ui/DateRangeSelector.tsx (NEU)

Wiederverwendbare Datums-Auswahl.

```typescript
import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type DateRange = '7d' | '30d' | 'mtd' | 'ytd'

interface DateRangeSelectorProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: 'mtd', label: 'Dieser Monat' },
  { value: 'ytd', label: 'Dieses Jahr' }
]

export default function DateRangeSelector({
  value,
  onChange,
  className = ''
}: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Click outside schließt Dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(!open)
    }
  }

  const selectedLabel = dateRangeOptions.find(o => o.value === value)?.label

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Zeitraum auswählen"
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-highlight border border-zinc-700
                   rounded-lg text-sm hover:border-zinc-600 transition focus:outline-none
                   focus:ring-2 focus:ring-primary/50"
      >
        <Calendar className="w-4 h-4 text-zinc-400" />
        <span>{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            aria-label="Zeitraum"
            className="absolute right-0 top-full mt-1 z-50 min-w-[160px] py-1
                       bg-surface border border-zinc-700 rounded-lg shadow-xl"
          >
            {dateRangeOptions.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer
                           hover:bg-surface-highlight transition
                           ${value === option.value ? 'text-primary' : 'text-white'}`}
              >
                {option.label}
                {value === option.value && <Check className="w-4 h-4" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
```

### 4. src/components/dashboard/Overview.tsx (KOMPLETT ÜBERARBEITET)

```typescript
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useShops } from '@src/hooks/useShopify'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useAppStore } from '@src/lib/store'
import {
  useDashboardStats,
  useRevenueChart,
  useProductChart,
  useRecentActivity
} from '@src/hooks/useDashboardStats'
import DateRangeSelector, { type DateRange } from '@src/components/ui/DateRangeSelector'
import ChartSkeleton, { KPICardSkeleton, ActivitySkeleton } from '@src/components/ui/ChartSkeleton'
import {
  Package,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Rocket,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  RefreshCw
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

// ⚠️ WICHTIG: Tailwind CSS unterstützt keine dynamischen Klassen!
// Vollständige Klassennamen müssen verwendet werden.
const kpiColorClasses = {
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30'
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500/30'
  },
  violet: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-500',
    border: 'border-violet-500/30'
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500/30'
  }
} as const

type KPIColor = keyof typeof kpiColorClasses

interface KPICard {
  title: string
  value: string | number
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: typeof DollarSign
  color: KPIColor
}

export default function Overview() {
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const { selectedShopId } = useAppStore()
  const { data: shops } = useShops()
  const { tier, maxNiches, maxProducts } = useSubscription()

  const selectedShop = shops?.find(s => s.id === selectedShopId) || shops?.[0]
  const shopId = selectedShop?.id || null

  // Data Hooks
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useDashboardStats(shopId, dateRange)

  const {
    data: revenueData,
    isLoading: revenueLoading
  } = useRevenueChart(shopId, dateRange)

  const {
    data: productData,
    isLoading: productLoading
  } = useProductChart(shopId, dateRange)

  const {
    data: activities,
    isLoading: activitiesLoading
  } = useRecentActivity(shopId)

  // KPI Cards mit echten Daten
  const kpiCards: KPICard[] = [
    {
      title: 'Umsatz',
      value: stats ? `${stats.revenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}€` : '—',
      change: stats ? `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange}%` : '',
      changeType: stats ? (stats.revenueChange >= 0 ? 'positive' : 'negative') : 'neutral',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      title: 'Bestellungen',
      value: stats?.orders ?? '—',
      change: stats ? `${stats.ordersChange >= 0 ? '+' : ''}${stats.ordersChange}%` : '',
      changeType: stats ? (stats.ordersChange >= 0 ? 'positive' : 'negative') : 'neutral',
      icon: ShoppingCart,
      color: 'blue'
    },
    {
      title: 'Aktive Produkte',
      value: stats?.activeProducts ?? '—',
      change: stats ? `${stats.productsChange >= 0 ? '+' : ''}${stats.productsChange}` : '',
      changeType: stats ? (stats.productsChange >= 0 ? 'positive' : 'negative') : 'neutral',
      icon: Package,
      color: 'violet'
    },
    {
      title: 'Winner',
      value: stats?.winners ?? '—',
      change: stats ? `${stats.winnersChange >= 0 ? '+' : ''}${stats.winnersChange}` : '',
      changeType: stats ? (stats.winnersChange >= 0 ? 'positive' : 'negative') : 'neutral',
      icon: TrendingUp,
      color: 'amber'
    }
  ]

  // Kein Shop verbunden
  if (!selectedShop) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Kein Shop verbunden</h2>
        <p className="text-zinc-400 mb-6 text-center max-w-md">
          Verbinde einen Shopify Store, um das Dashboard zu nutzen und deine
          Automatisierung zu starten.
        </p>
        <Link to="/onboarding" className="btn-primary">
          <Rocket className="w-5 h-5" />
          Shop verbinden
        </Link>
      </div>
    )
  }

  // Relative Zeit formatieren
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'gerade eben'
    if (diffMins < 60) return `vor ${diffMins} Min.`
    if (diffHours < 24) return `vor ${diffHours} Std.`
    if (diffDays === 1) return 'gestern'
    if (diffDays < 7) return `vor ${diffDays} Tagen`
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  }

  // Activity Icon basierend auf Typ
  const getActivityDotClass = (type: string): string => {
    switch (type) {
      case 'product_created':
      case 'order_received':
        return 'bg-emerald-500'
      case 'winner_detected':
        return 'bg-amber-500'
      case 'sync_completed':
        return 'bg-blue-500'
      case 'loser_removed':
        return 'bg-red-500'
      default:
        return 'bg-zinc-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header mit Zeitraum-Auswahl */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-zinc-400">
            Übersicht für{' '}
            <span className="text-white font-medium">
              {selectedShop.internal_name || selectedShop.shop_domain}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchStats()}
            disabled={statsLoading}
            className="p-2 rounded-lg bg-surface-highlight hover:bg-zinc-700 transition
                       disabled:opacity-50"
            aria-label="Daten aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
          </button>
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          // Loading Skeletons
          Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          kpiCards.map((kpi) => {
            const colors = kpiColorClasses[kpi.color]
            return (
              <div key={kpi.title} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <kpi.icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  {kpi.change && kpi.changeType !== 'neutral' && (
                    <div className={`flex items-center gap-1 text-sm ${
                      kpi.changeType === 'positive' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {kpi.changeType === 'positive' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {kpi.change}
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold mb-1">{kpi.value}</p>
                <p className="text-sm text-zinc-400">{kpi.title}</p>
              </div>
            )
          })
        )}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Umsatz</h3>
          </div>
          {revenueLoading ? (
            <ChartSkeleton height={256} />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(v) => `${v}€`}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ color: '#fff', marginBottom: '4px' }}
                    formatter={(value: number) => [
                      `${value.toLocaleString('de-DE', { minimumFractionDigits: 2 })}€`,
                      'Umsatz'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Products Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Produkte erstellt</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full" />
                <span className="text-zinc-400">Erstellt</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-zinc-400">Winner</span>
              </div>
            </div>
          </div>
          {productLoading ? (
            <ChartSkeleton height={256} />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={productData}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    width={40}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ color: '#fff', marginBottom: '4px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="productsCreated"
                    name="Erstellt"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="winners"
                    name="Winner"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Status Cards Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <h3 className="font-semibold mb-4">Schnellaktionen</h3>
          <div className="space-y-2">
            <Link
              to="/dashboard/niches"
              className="flex items-center justify-between p-3 bg-surface-highlight rounded-lg
                         hover:bg-zinc-700 transition group"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-primary" />
                <span>Nischen verwalten</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
            </Link>
            <Link
              to="/dashboard/products"
              className="flex items-center justify-between p-3 bg-surface-highlight rounded-lg
                         hover:bg-zinc-700 transition group"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <span>Produkt-Queue</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
            </Link>
            <Link
              to="/dashboard/campaigns"
              className="flex items-center justify-between p-3 bg-surface-highlight rounded-lg
                         hover:bg-zinc-700 transition group"
            >
              <div className="flex items-center gap-3">
                <Rocket className="w-5 h-5 text-primary" />
                <span>Kampagnen starten</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
            </Link>
          </div>
        </div>

        {/* Plan Usage */}
        <div className="card">
          <h3 className="font-semibold mb-4">Plan-Nutzung</h3>
          <div className="space-y-4">
            {/* Nischen */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-zinc-400">Nischen</span>
                <span>
                  {stats?.nichesUsed ?? 0}/{maxNiches === -1 ? '∞' : maxNiches}
                </span>
              </div>
              <div className="h-2 bg-surface-highlight rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: maxNiches === -1
                      ? '10%'
                      : `${Math.min(((stats?.nichesUsed || 0) / maxNiches) * 100, 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Produkte diesen Monat */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-zinc-400">Produkte (diesen Monat)</span>
                <span>
                  {stats?.productsCreatedThisMonth ?? 0}/{maxProducts === -1 ? '∞' : maxProducts}
                </span>
              </div>
              <div className="h-2 bg-surface-highlight rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: maxProducts === -1
                      ? '25%'
                      : `${Math.min(((stats?.productsCreatedThisMonth || 0) / maxProducts) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Upgrade Hint */}
          {tier !== 'vip' && (
            <Link
              to="/settings#subscription"
              className="flex items-center gap-1 mt-4 text-sm text-primary hover:underline"
            >
              Upgrade für mehr
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="font-semibold mb-4">Letzte Aktivitäten</h3>
          {activitiesLoading ? (
            <ActivitySkeleton />
          ) : activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getActivityDotClass(activity.type)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{activity.message}</p>
                    <p className="text-xs text-zinc-500">
                      {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-zinc-500">
              <p className="text-sm">Noch keine Aktivitäten</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## CSS Hinzufügungen

Für `src/index.css`:

```css
/* Chart Tooltip Styling */
.recharts-tooltip-wrapper {
  outline: none;
}

/* Progress Bar Animationen */
@keyframes progress-grow {
  from {
    width: 0;
  }
}

.animate-progress {
  animation: progress-grow 0.5s ease-out;
}
```

---

## Verifizierung

- [ ] **Kritisch: Tailwind Klassen** - Keine dynamischen Klassen wie `bg-${color}-500`
- [ ] **React Router Links** - Alle internen Links nutzen `<Link>` statt `<a>`
- [ ] **Loading States** - ChartSkeleton, KPICardSkeleton, ActivitySkeleton werden angezeigt
- [ ] **DateRangeSelector** - Funktional mit 7d, 30d, mtd, ytd Optionen
- [ ] **Echte Daten** - useDashboardStats Hook mit korrekten Supabase Queries
- [ ] **Responsive** - Grid passt sich auf Mobile an (2 Spalten → 1 Spalte)
- [ ] **ARIA Labels** - Buttons und interaktive Elemente haben aria-labels
- [ ] **Keyboard Navigation** - DateRangeSelector unterstützt Escape, Enter
- [ ] **Refresh Button** - Manuelle Aktualisierung möglich
- [ ] **Leerer Zustand** - "Noch keine Aktivitäten" wenn keine Daten
- [ ] **Fehlerbehandlung** - "Kein Shop verbunden" mit CTA

## Abhängigkeiten

- Phase 3.1 (Dashboard Layout mit Store)
- Phase 2.2 (useShops Hook)
- `recharts` NPM-Paket
- `framer-motion` NPM-Paket

## Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/hooks/useDashboardStats.ts` | Hooks für alle Dashboard-Daten |
| `src/components/ui/ChartSkeleton.tsx` | Loading Skeletons für Charts |
| `src/components/ui/DateRangeSelector.tsx` | Wiederverwendbare Datums-Auswahl |

## Nächster Schritt
→ Phase 3.3 - NicheSelector Komponente
