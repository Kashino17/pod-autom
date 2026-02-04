import { useQuery } from '@tanstack/react-query'
import { api } from '@src/lib/api'

// =====================================================
// TYPES
// =====================================================

export type AnalyticsPeriod = '7d' | '30d' | '90d'

export interface AnalyticsOverview {
  total_products: number
  total_views: number
  total_sales: number
  total_revenue: number
  conversion_rate: number
  winner_rate: number
}

export interface FunnelData {
  created: number
  start_phase: number
  post_phase: number
  winners: number
  losers: number
  archived: number
}

export interface CampaignTotals {
  total_spend: number
  total_impressions: number
  total_clicks: number
  total_conversions: number
  campaign_revenue: number
}

export interface NichePerformance {
  id: string
  name: string
  products: number
  sales: number
  revenue: number
  is_active: boolean
}

export interface OverviewResponse {
  success: boolean
  period: string
  overview: AnalyticsOverview
  funnel: FunnelData
  campaigns: CampaignTotals
  roas: number
  niche_performance: NichePerformance[]
}

export interface TimeSeriesDataPoint {
  date: string
  products_created: number
  products_published: number
  sales: number
  errors: number
}

export interface TimeSeriesResponse {
  success: boolean
  period: string
  data: TimeSeriesDataPoint[]
}

export interface TopProduct {
  id: string
  title: string
  shopify_product_id: string | null
  generated_image_url: string | null
  phase: string
  total_views: number
  total_sales: number
  total_revenue: number
  created_at: string
}

export interface TopProductsResponse {
  success: boolean
  products: TopProduct[]
  sort_by: string
}

export interface NicheBreakdown {
  id: string
  name: string
  slug: string
  is_active: boolean
  total_products: number
  total_sales: number
  total_revenue: number
  phase_breakdown: Record<string, number>
  winner_count: number
  loser_count: number
}

export interface NicheBreakdownResponse {
  success: boolean
  niches: NicheBreakdown[]
}

// =====================================================
// HOOK
// =====================================================

export function useAnalytics(shopId: string | null, period: AnalyticsPeriod = '30d') {
  // Get overview data
  const overviewQuery = useQuery({
    queryKey: ['analytics', 'overview', shopId, period],
    queryFn: () =>
      api.get<OverviewResponse>(`/api/pod-autom/analytics/${shopId}/overview?period=${period}`),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Get time series data
  const timeSeriesQuery = useQuery({
    queryKey: ['analytics', 'timeseries', shopId, period],
    queryFn: () =>
      api.get<TimeSeriesResponse>(`/api/pod-autom/analytics/${shopId}/timeseries?period=${period}`),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Get top products
  const topProductsQuery = useQuery({
    queryKey: ['analytics', 'top-products', shopId],
    queryFn: () =>
      api.get<TopProductsResponse>(`/api/pod-autom/analytics/${shopId}/top-products?limit=10`),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Get niche breakdown
  const nicheBreakdownQuery = useQuery({
    queryKey: ['analytics', 'niche-breakdown', shopId],
    queryFn: () =>
      api.get<NicheBreakdownResponse>(`/api/pod-autom/analytics/${shopId}/niche-breakdown`),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Default values
  const defaultOverview: AnalyticsOverview = {
    total_products: 0,
    total_views: 0,
    total_sales: 0,
    total_revenue: 0,
    conversion_rate: 0,
    winner_rate: 0,
  }

  const defaultFunnel: FunnelData = {
    created: 0,
    start_phase: 0,
    post_phase: 0,
    winners: 0,
    losers: 0,
    archived: 0,
  }

  const defaultCampaigns: CampaignTotals = {
    total_spend: 0,
    total_impressions: 0,
    total_clicks: 0,
    total_conversions: 0,
    campaign_revenue: 0,
  }

  return {
    // Overview data
    overview: overviewQuery.data?.overview ?? defaultOverview,
    funnel: overviewQuery.data?.funnel ?? defaultFunnel,
    campaigns: overviewQuery.data?.campaigns ?? defaultCampaigns,
    roas: overviewQuery.data?.roas ?? 0,
    nichePerformance: overviewQuery.data?.niche_performance ?? [],

    // Time series data
    timeSeriesData: timeSeriesQuery.data?.data ?? [],

    // Top products
    topProducts: topProductsQuery.data?.products ?? [],

    // Niche breakdown
    nicheBreakdown: nicheBreakdownQuery.data?.niches ?? [],

    // Loading states
    isLoading:
      overviewQuery.isLoading ||
      timeSeriesQuery.isLoading ||
      topProductsQuery.isLoading ||
      nicheBreakdownQuery.isLoading,
    isLoadingOverview: overviewQuery.isLoading,
    isLoadingTimeSeries: timeSeriesQuery.isLoading,
    isLoadingTopProducts: topProductsQuery.isLoading,
    isLoadingNiches: nicheBreakdownQuery.isLoading,

    // Errors
    error:
      overviewQuery.error ??
      timeSeriesQuery.error ??
      topProductsQuery.error ??
      nicheBreakdownQuery.error,

    // Refetch functions
    refetchOverview: overviewQuery.refetch,
    refetchTimeSeries: timeSeriesQuery.refetch,
    refetchTopProducts: topProductsQuery.refetch,
    refetchNiches: nicheBreakdownQuery.refetch,
    refetchAll: () => {
      overviewQuery.refetch()
      timeSeriesQuery.refetch()
      topProductsQuery.refetch()
      nicheBreakdownQuery.refetch()
    },
  }
}
