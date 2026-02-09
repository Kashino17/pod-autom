import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@src/lib/api'

// =====================================================
// TYPES
// =====================================================

export interface WinnerCampaign {
  id: string
  campaign_name: string
  creative_type: 'video' | 'image'
  link_type: 'product' | 'collection'
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  daily_budget: number
  created_at: string
}

export interface WinnerProduct {
  id: string
  product_id: string
  collection_id: string
  product_title: string
  product_handle: string | null
  shopify_image_url: string | null
  identified_at: string
  is_active: boolean
  sales_3d: number
  sales_7d: number
  sales_10d: number
  sales_14d: number
  buckets_passed: number
  winner_campaigns: WinnerCampaign[]
}

export interface WinnerStats {
  total_winners: number
  active_winners: number
  total_campaigns: number
  active_campaigns: number
  video_campaigns: number
  image_campaigns: number
}

export interface WinnerActivity {
  id: string
  action_type: string
  details: Record<string, unknown>
  executed_at: string
}

export interface WinnerThresholds {
  sales_3d: number
  sales_7d: number
  sales_10d: number
  sales_14d: number
  min_buckets: number
}

export interface WinnerLimits {
  max_video_campaigns: number
  max_image_campaigns: number
  video_count: number
  image_count: number
}

export interface WinnerSettings {
  id: string
  winner_scaling_enabled: boolean
  winner_thresholds: WinnerThresholds | null
  winner_limits: WinnerLimits | null
  winner_video_enabled: boolean
  winner_image_enabled: boolean
  winner_video_prompt: string | null
  winner_image_prompt: string | null
  winner_daily_budget: number
}

interface WinnersResponse {
  success: boolean
  winners: WinnerProduct[]
  settings: WinnerSettings | null
}

interface StatsResponse {
  success: boolean
  stats: WinnerStats
  recent_activity: WinnerActivity[]
}

interface SettingsResponse {
  success: boolean
  settings: WinnerSettings | null
}

interface ToggleResponse {
  success: boolean
  winner: WinnerProduct
}

interface CampaignResponse {
  success: boolean
  campaign: WinnerCampaign
}

// =====================================================
// DEFAULT VALUES
// =====================================================

const DEFAULT_THRESHOLDS: WinnerThresholds = {
  sales_3d: 5,
  sales_7d: 10,
  sales_10d: 15,
  sales_14d: 20,
  min_buckets: 3,
}

const DEFAULT_LIMITS: WinnerLimits = {
  max_video_campaigns: 2,
  max_image_campaigns: 4,
  video_count: 2,
  image_count: 4,
}

// =====================================================
// HOOK
// =====================================================

export function useWinnerScaling(shopId: string | null) {
  const queryClient = useQueryClient()

  // Get all winners for shop
  const winnersQuery = useQuery({
    queryKey: ['winners', shopId],
    queryFn: () => api.get<WinnersResponse>(`/api/pod-autom/winners/${shopId}`),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  // Get winner statistics
  const statsQuery = useQuery({
    queryKey: ['winners', 'stats', shopId],
    queryFn: () => api.get<StatsResponse>(`/api/pod-autom/winners/${shopId}/stats`),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  // Get winner scaling settings
  const settingsQuery = useQuery({
    queryKey: ['winners', 'settings', shopId],
    queryFn: () => api.get<SettingsResponse>(`/api/pod-autom/winners/${shopId}/settings`),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Toggle winner active status
  const toggleWinnerMutation = useMutation({
    mutationFn: ({ winnerId, isActive }: { winnerId: string; isActive: boolean }) =>
      api.post<ToggleResponse>(`/api/pod-autom/winners/${shopId}/${winnerId}/toggle`, {
        is_active: isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['winners', shopId] })
      queryClient.invalidateQueries({ queryKey: ['winners', 'stats', shopId] })
    },
  })

  // Pause campaign
  const pauseCampaignMutation = useMutation({
    mutationFn: (campaignId: string) =>
      api.post<CampaignResponse>(
        `/api/pod-autom/winners/${shopId}/campaigns/${campaignId}/pause`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['winners', shopId] })
      queryClient.invalidateQueries({ queryKey: ['winners', 'stats', shopId] })
    },
  })

  // Update settings
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<WinnerSettings>) =>
      api.put<SettingsResponse>(`/api/pod-autom/winners/${shopId}/settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['winners', 'settings', shopId] })
    },
  })

  // Computed values
  const winners = winnersQuery.data?.winners ?? []
  const stats = statsQuery.data?.stats ?? {
    total_winners: 0,
    active_winners: 0,
    total_campaigns: 0,
    active_campaigns: 0,
    video_campaigns: 0,
    image_campaigns: 0,
  }
  const recentActivity = statsQuery.data?.recent_activity ?? []
  const settings = settingsQuery.data?.settings ?? null

  // Get thresholds with defaults
  const thresholds: WinnerThresholds = settings?.winner_thresholds ?? DEFAULT_THRESHOLDS
  const limits: WinnerLimits = settings?.winner_limits ?? DEFAULT_LIMITS

  return {
    // Data
    winners,
    stats,
    recentActivity,
    settings,
    thresholds,
    limits,

    // Loading states
    isLoading: winnersQuery.isLoading || statsQuery.isLoading,
    isLoadingSettings: settingsQuery.isLoading,
    error: winnersQuery.error ?? statsQuery.error ?? settingsQuery.error,

    // Actions
    toggleWinner: toggleWinnerMutation.mutate,
    isTogglingWinner: toggleWinnerMutation.isPending,

    pauseCampaign: pauseCampaignMutation.mutate,
    isPausingCampaign: pauseCampaignMutation.isPending,

    updateSettings: updateSettingsMutation.mutate,
    isUpdatingSettings: updateSettingsMutation.isPending,

    // Refetch
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['winners'] })
    },
  }
}

// Export defaults for components
export { DEFAULT_THRESHOLDS, DEFAULT_LIMITS }
