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
        .single()

      if (error && error.code !== 'PGRST116') throw error
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
        .single()

      if (error && error.code !== 'PGRST116') throw error
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
// CAMPAIGN BATCH ASSIGNMENTS
// ==========================================

export function useCampaignBatchAssignments(shopId: string | null) {
  return useQuery({
    queryKey: ['campaign-batch-assignments', shopId],
    queryFn: async () => {
      if (!shopId) return []

      // Query assignments directly by shop_id
      const { data, error } = await supabase
        .from('campaign_batch_assignments')
        .select('*')
        .eq('shop_id', shopId)
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
      pinterest_campaign_id: string
      pinterest_campaign_name: string
      collection_id: string
      collection_name: string
      batch_indices: number[]
    }) => {
      const { data, error } = await supabase
        .from('campaign_batch_assignments')
        .insert(assignment as any)
        .select()
        .single()

      if (error) throw error
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
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('campaign_batch_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-batch-assignments'] })
    }
  })
}
