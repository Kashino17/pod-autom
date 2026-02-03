import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@src/lib/api'

// =====================================================
// TYPES
// =====================================================

export interface CampaignTargeting {
  countries: string[]
  age_min: number
  age_max: number
  genders: string[]
  interests: string[]
  keywords: string[]
}

export interface CampaignPin {
  id: string
  title: string
  description: string | null
  link_url: string | null
  image_url: string | null
  video_url: string | null
  creative_type: 'image' | 'video' | 'carousel'
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'REJECTED' | 'ARCHIVED'
  impressions: number
  clicks: number
  conversions: number
  spend: number
}

export interface Campaign {
  id: string
  name: string
  description: string | null
  platform: 'pinterest' | 'meta' | 'google' | 'tiktok'
  external_campaign_id: string | null
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'ERROR'
  sync_status: 'pending' | 'syncing' | 'synced' | 'error'
  daily_budget: number
  currency: string
  targeting: CampaignTargeting
  campaign_type: 'standard' | 'winner_scaling' | 'collection' | 'product'
  campaign_objective: string
  total_spend: number
  total_impressions: number
  total_clicks: number
  total_conversions: number
  total_revenue: number
  roas: number | null
  ctr: number | null
  cpc: number | null
  start_date: string | null
  end_date: string | null
  last_sync_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  pod_autom_campaign_pins?: CampaignPin[]
}

export interface CampaignStats {
  total_campaigns: number
  active_campaigns: number
  paused_campaigns: number
  total_spend: number
  total_conversions: number
  avg_roas: number
}

export interface SyncLogEntry {
  id: string
  campaign_id: string | null
  sync_type: 'create' | 'update' | 'metrics' | 'status' | 'delete'
  sync_status: 'pending' | 'success' | 'failed'
  pins_synced: number
  pins_failed: number
  error_message: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}

interface CampaignsResponse {
  success: boolean
  campaigns: Campaign[]
  stats: CampaignStats
}

interface CampaignResponse {
  success: boolean
  campaign: Campaign
}

interface SyncLogResponse {
  success: boolean
  logs: SyncLogEntry[]
}

export interface CreateCampaignData {
  name: string
  description?: string | undefined
  platform?: 'pinterest' | 'meta' | 'google' | 'tiktok'
  status?: 'DRAFT' | 'ACTIVE'
  daily_budget?: number
  currency?: string
  targeting?: Partial<CampaignTargeting>
  campaign_type?: 'standard' | 'winner_scaling' | 'collection' | 'product'
  campaign_objective?: string
  collection_id?: string
  product_ids?: string[]
  start_date?: string
  end_date?: string
}

export interface UpdateCampaignData {
  name?: string
  description?: string
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  daily_budget?: number
  lifetime_budget?: number
  targeting?: Partial<CampaignTargeting>
  campaign_objective?: string
  collection_id?: string
  product_ids?: string[]
  start_date?: string
  end_date?: string
}

// =====================================================
// HOOK
// =====================================================

export function useCampaigns(shopId: string | null) {
  const queryClient = useQueryClient()

  // Get all campaigns for shop
  const campaignsQuery = useQuery({
    queryKey: ['campaigns', shopId],
    queryFn: () => api.get<CampaignsResponse>(`/api/pod-autom/campaigns/${shopId}`),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  // Get sync log
  const syncLogQuery = useQuery({
    queryKey: ['campaigns', 'sync-log', shopId],
    queryFn: () => api.get<SyncLogResponse>(`/api/pod-autom/campaigns/${shopId}/sync-log`),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  // Create campaign
  const createCampaignMutation = useMutation({
    mutationFn: (data: CreateCampaignData) =>
      api.post<CampaignResponse>(`/api/pod-autom/campaigns/${shopId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', shopId] })
    },
  })

  // Update campaign
  const updateCampaignMutation = useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: UpdateCampaignData }) =>
      api.put<CampaignResponse>(`/api/pod-autom/campaigns/${shopId}/${campaignId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', shopId] })
    },
  })

  // Update campaign status
  const updateStatusMutation = useMutation({
    mutationFn: ({ campaignId, status }: { campaignId: string; status: string }) =>
      api.post<CampaignResponse>(`/api/pod-autom/campaigns/${shopId}/${campaignId}/status`, {
        status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', shopId] })
    },
  })

  // Delete campaign
  const deleteCampaignMutation = useMutation({
    mutationFn: (campaignId: string) =>
      api.delete<{ success: boolean }>(`/api/pod-autom/campaigns/${shopId}/${campaignId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', shopId] })
    },
  })

  // Computed values
  const campaigns = campaignsQuery.data?.campaigns ?? []
  const stats = campaignsQuery.data?.stats ?? {
    total_campaigns: 0,
    active_campaigns: 0,
    paused_campaigns: 0,
    total_spend: 0,
    total_conversions: 0,
    avg_roas: 0,
  }
  const syncLog = syncLogQuery.data?.logs ?? []

  // Filter helpers
  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE')
  const pausedCampaigns = campaigns.filter((c) => c.status === 'PAUSED')
  const draftCampaigns = campaigns.filter((c) => c.status === 'DRAFT')

  return {
    // Data
    campaigns,
    activeCampaigns,
    pausedCampaigns,
    draftCampaigns,
    stats,
    syncLog,

    // Loading states
    isLoading: campaignsQuery.isLoading,
    isSyncLogLoading: syncLogQuery.isLoading,
    error: campaignsQuery.error,

    // Create
    createCampaign: createCampaignMutation.mutate,
    createCampaignAsync: createCampaignMutation.mutateAsync,
    isCreating: createCampaignMutation.isPending,

    // Update
    updateCampaign: updateCampaignMutation.mutate,
    isUpdating: updateCampaignMutation.isPending,

    // Status
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,

    // Delete
    deleteCampaign: deleteCampaignMutation.mutate,
    isDeleting: deleteCampaignMutation.isPending,

    // Refetch
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', shopId] })
    },
    refetchSyncLog: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', 'sync-log', shopId] })
    },
  }
}

// Single campaign hook
export function useCampaign(shopId: string | null, campaignId: string | null) {
  return useQuery({
    queryKey: ['campaigns', shopId, campaignId],
    queryFn: () =>
      api.get<CampaignResponse>(`/api/pod-autom/campaigns/${shopId}/${campaignId}`),
    enabled: !!shopId && !!campaignId,
    staleTime: 1000 * 60 * 2,
  })
}
