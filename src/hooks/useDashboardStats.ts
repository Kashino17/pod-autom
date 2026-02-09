import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@src/contexts/AuthContext'
import { api } from '@src/lib/api'
import type { DashboardMetrics } from '@src/components/dashboard/MetricsGrid'
import type { ChartDataPoint } from '@src/components/dashboard/PerformanceChart'
import type { RecentProduct } from '@src/components/dashboard/RecentProducts'
import type { Activity } from '@src/components/dashboard/ActivityFeed'

// =====================================================
// TYPES
// =====================================================

interface DashboardStatsResponse {
  success: boolean
  metrics: DashboardMetrics
  chartData: ChartDataPoint[]
  recentProducts: RecentProduct[]
  activities: Activity[]
}

type Period = '7d' | '30d' | '90d'

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

function generateMockData(period: Period): DashboardStatsResponse {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90

  // Generate chart data
  const chartData: ChartDataPoint[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    chartData.push({
      date: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      impressions: Math.floor(Math.random() * 5000) + 1000,
      clicks: Math.floor(Math.random() * 500) + 100,
      sales: Math.floor(Math.random() * 20) + 1,
      revenue: Math.floor(Math.random() * 500) + 50,
    })
  }

  // Calculate totals from chart data
  const totalImpressions = chartData.reduce((sum, d) => sum + d.impressions, 0)
  const totalClicks = chartData.reduce((sum, d) => sum + d.clicks, 0)
  const totalSales = chartData.reduce((sum, d) => sum + d.sales, 0)
  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0)

  // Mock metrics
  const metrics: DashboardMetrics = {
    totalProducts: 47,
    activeProducts: 32,
    pendingProducts: 8,
    totalImpressions,
    totalClicks,
    totalSales,
    totalRevenue,
    conversionRate: totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0,
    productChange: 15.2,
    impressionChange: 8.5,
    salesChange: 12.3,
    revenueChange: -3.1,
  }

  // Mock recent products
  const recentProducts: RecentProduct[] = [
    {
      id: '1',
      title: 'Fitness Motivation T-Shirt',
      status: 'winner',
      impressions: 3240,
      sales: 12,
      revenue: 359.88,
      trend: 'up',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      title: 'Yoga Life Hoodie',
      status: 'active',
      impressions: 1890,
      sales: 5,
      revenue: 199.95,
      trend: 'up',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      title: 'Coffee Lover Mug Design',
      status: 'active',
      impressions: 920,
      sales: 3,
      revenue: 59.97,
      trend: 'neutral',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      title: 'Gaming Setup Poster',
      status: 'pending',
      impressions: 450,
      sales: 1,
      revenue: 24.99,
      trend: 'down',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      title: 'Mountain Adventure Tee',
      status: 'active',
      impressions: 680,
      sales: 2,
      revenue: 59.98,
      trend: 'up',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  // Mock activities
  const activities: Activity[] = [
    {
      id: '1',
      type: 'product_created',
      title: '3 neue Produkte erstellt',
      description: 'Fitness Nische',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'campaign_synced',
      title: 'Pinterest Sync abgeschlossen',
      description: '15 Pins aktualisiert',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'winner_found',
      title: '2 Winner identifiziert',
      description: 'Fitness Motivation T-Shirt, Yoga Life Hoodie',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      type: 'sale',
      title: 'Neue Bestellung',
      description: 'Fitness Motivation T-Shirt - €29.99',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      type: 'product_optimized',
      title: '5 Produkte optimiert',
      description: 'Titel und Beschreibungen aktualisiert',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '6',
      type: 'system',
      title: 'Shop verbunden',
      description: 'my-shop.myshopify.com',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  return {
    success: true,
    metrics,
    chartData,
    recentProducts,
    activities,
  }
}

// =====================================================
// DASHBOARD STATS HOOK
// =====================================================

export function useDashboardStats(shopId: string | null, period: Period = '30d') {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['dashboard-stats', shopId, period],
    queryFn: async () => {
      if (!shopId) {
        // Return empty/mock data when no shop is connected
        return generateMockData(period)
      }

      try {
        // Try to fetch real data from API
        const response = await api.get<DashboardStatsResponse>(
          `/api/pod-autom/dashboard/${shopId}?period=${period}`
        )
        return response
      } catch {
        // Fall back to mock data if API doesn't exist yet
        return generateMockData(period)
      }
    },
    enabled: !!session,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}

export default useDashboardStats
