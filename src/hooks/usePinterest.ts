import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'https://reboss-api.onrender.com'

// ==========================================
// PINTEREST AUTH STATUS
// ==========================================

export function usePinterestAuth(shopId: string | null) {
  return useQuery({
    queryKey: ['pinterest-auth', shopId],
    queryFn: async () => {
      if (!shopId) return null

      const { data, error } = await supabase
        .from('pinterest_auth')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!shopId
  })
}

// ==========================================
// PINTEREST AD ACCOUNTS
// ==========================================

export function usePinterestAdAccounts(shopId: string | null) {
  return useQuery({
    queryKey: ['pinterest-ad-accounts', shopId],
    queryFn: async () => {
      if (!shopId) return []

      const { data, error } = await supabase
        .from('pinterest_ad_accounts')
        .select('*')
        .eq('shop_id', shopId)
        .order('name')

      if (error) throw error
      return data || []
    },
    enabled: !!shopId
  })
}

export function useSyncPinterestAdAccounts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shopId: string) => {
      const response = await fetch(`${API_URL}/api/pinterest/ad-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to sync ad accounts')
      return data.ad_accounts
    },
    onSuccess: (_, shopId) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest-ad-accounts', shopId] })
    }
  })
}

export function useSelectPinterestAdAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, adAccountId }: { shopId: string; adAccountId: string }) => {
      const response = await fetch(`${API_URL}/api/pinterest/select-ad-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId, ad_account_id: adAccountId })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to select ad account')
      return data
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest-ad-accounts', shopId] })
    }
  })
}

// ==========================================
// PINTEREST CAMPAIGNS (from API, not stored in Supabase)
// ==========================================

export function usePinterestCampaigns(shopId: string | null, adAccountId: string | null) {
  return useQuery({
    queryKey: ['pinterest-campaigns', shopId, adAccountId],
    queryFn: async () => {
      if (!shopId || !adAccountId) return []

      // Fetch directly from Pinterest API via our backend
      const response = await fetch(`${API_URL}/api/pinterest/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId, ad_account_id: adAccountId })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch campaigns')
      return data.campaigns || []
    },
    enabled: !!shopId && !!adAccountId
  })
}

export function useRefreshPinterestCampaigns() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, adAccountId }: { shopId: string; adAccountId: string }) => {
      const response = await fetch(`${API_URL}/api/pinterest/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId, ad_account_id: adAccountId })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to refresh campaigns')
      return data.campaigns
    },
    onSuccess: (_, { shopId, adAccountId }) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest-campaigns', shopId, adAccountId] })
    }
  })
}

// ==========================================
// PINTEREST CONNECT/DISCONNECT
// ==========================================

export function useConnectPinterest() {
  return useMutation({
    mutationFn: async (shopId: string) => {
      // Redirect to Pinterest OAuth
      window.location.href = `${API_URL}/api/oauth/pinterest/authorize?shop_id=${shopId}`
    }
  })
}

export function useDisconnectPinterest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shopId: string) => {
      const response = await fetch(`${API_URL}/api/pinterest/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to disconnect Pinterest')
      return data
    },
    onSuccess: (_, shopId) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest-auth', shopId] })
      queryClient.invalidateQueries({ queryKey: ['pinterest-ad-accounts', shopId] })
      queryClient.invalidateQueries({ queryKey: ['pinterest-campaigns', shopId] })
    }
  })
}

// ==========================================
// PINTEREST SETTINGS
// ==========================================

export function usePinterestSettings(shopId: string | null) {
  return useQuery({
    queryKey: ['pinterest-settings', shopId],
    queryFn: async () => {
      if (!shopId) return null

      const { data, error } = await supabase
        .from('pinterest_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!shopId
  })
}

export function useUpdatePinterestSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, settings }: { shopId: string; settings: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('pinterest_settings')
        .upsert({
          shop_id: shopId,
          ...settings
        } as any, { onConflict: 'shop_id' })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest-settings', shopId] })
    }
  })
}

// ==========================================
// PINTEREST CAMPAIGNS (stored in Supabase for FK relationships)
// ==========================================

export function useStoredPinterestCampaigns(shopId: string | null) {
  return useQuery({
    queryKey: ['stored-pinterest-campaigns', shopId],
    queryFn: async () => {
      if (!shopId) return []

      const { data, error } = await supabase
        .from('pinterest_campaigns')
        .select('*')
        .eq('shop_id', shopId)
        .order('name')

      if (error) throw error
      return data || []
    },
    enabled: !!shopId
  })
}

export function useUpsertPinterestCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (campaign: {
      shop_id: string
      ad_account_id?: string  // pinterest_account_id from pinterest_ad_accounts
      pinterest_campaign_id: string  // The actual Pinterest campaign ID
      name: string
      status: string
      daily_budget?: number
    }) => {
      // First get the ad_account UUID if we have the pinterest_account_id
      let adAccountUuid: string | null = null
      if (campaign.ad_account_id) {
        const { data: adAccount } = await supabase
          .from('pinterest_ad_accounts')
          .select('id')
          .eq('shop_id', campaign.shop_id)
          .eq('pinterest_account_id', campaign.ad_account_id)
          .single()
        adAccountUuid = (adAccount as any)?.id || null
      }

      const { data, error } = await supabase
        .from('pinterest_campaigns')
        .upsert({
          shop_id: campaign.shop_id,
          ad_account_id: adAccountUuid,
          pinterest_campaign_id: campaign.pinterest_campaign_id,
          name: campaign.name,
          status: campaign.status,
          daily_budget: campaign.daily_budget,
          synced_at: new Date().toISOString()
        } as any, { onConflict: 'shop_id,pinterest_campaign_id' })
        .select()
        .single()

      if (error) throw error
      return data as { id: string; shop_id: string; name: string; status: string }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stored-pinterest-campaigns', variables.shop_id] })
    }
  })
}

// ==========================================
// SHOPIFY COLLECTIONS (stored in Supabase)
// ==========================================

export function useStoredShopifyCollections(shopId: string | null) {
  return useQuery({
    queryKey: ['stored-shopify-collections', shopId],
    queryFn: async () => {
      if (!shopId) return []

      const { data, error } = await supabase
        .from('shopify_collections')
        .select('*')
        .eq('shop_id', shopId)
        .order('title')

      if (error) throw error
      return data || []
    },
    enabled: !!shopId
  })
}

// ==========================================
// CAMPAIGN BATCH ASSIGNMENTS
// ==========================================

export function useCampaignBatchAssignments(shopId: string | null) {
  return useQuery({
    queryKey: ['campaign-batch-assignments', shopId],
    queryFn: async () => {
      if (!shopId) return []

      // First get all campaigns for this shop to get their IDs
      const { data: campaigns, error: campaignError } = await supabase
        .from('pinterest_campaigns')
        .select('id')
        .eq('shop_id', shopId)

      if (campaignError) throw campaignError
      if (!campaigns || campaigns.length === 0) return []

      const campaignIds = (campaigns as any[]).map(c => c.id)

      // Then get assignments for these campaigns with joined campaign data
      // Collection info is now stored directly in the assignment (shopify_collection_id, collection_title)
      const { data, error } = await supabase
        .from('campaign_batch_assignments')
        .select(`
          id,
          campaign_id,
          shopify_collection_id,
          collection_title,
          batch_indices,
          assigned_shop,
          ad_channel,
          created_at,
          updated_at,
          pinterest_campaigns(id, name, status, pinterest_campaign_id)
        `)
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!shopId
  })
}

export function useCreateCampaignBatchAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (assignment: {
      shop_id: string
      campaign_id: string  // UUID from pinterest_campaigns table
      shopify_collection_id: string  // Shopify Collection ID (from API)
      collection_title: string  // Collection title for display
      batch_indices: number[]
      ad_channel?: string  // 'pinterest', 'meta', or 'google' (not stored, for future use)
    }) => {
      // Note: Only insert columns that exist in the table
      // assigned_shop and ad_channel were removed as they don't exist in DB schema
      const { data, error } = await supabase
        .from('campaign_batch_assignments')
        .insert({
          campaign_id: assignment.campaign_id,
          shopify_collection_id: assignment.shopify_collection_id,
          collection_title: assignment.collection_title,
          batch_indices: assignment.batch_indices
        } as any)
        .select()
        .single()

      if (error) {
        console.error('[usePinterest] Error creating batch assignment:', error)
        throw error
      }
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-batch-assignments', variables.shop_id] })
    }
  })
}

export function useDeleteCampaignBatchAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ assignmentId, shopId }: { assignmentId: string; shopId: string }) => {
      const { error } = await supabase
        .from('campaign_batch_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-batch-assignments', shopId] })
    }
  })
}
