import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@src/contexts/AuthContext'
import { api } from '@src/lib/api'

// =====================================================
// TYPES
// =====================================================

export interface PinterestPlatform {
  id: string
  platform_user_id: string | null
  platform_username: string | null
  ad_account_id: string | null
  ad_account_name: string | null
  connection_status: 'connected' | 'disconnected' | 'error' | 'expired'
  token_expires_at: string | null
  last_sync_at: string | null
}

export interface PinterestAdAccount {
  id: string
  name: string
  country: string
  currency: string
}

export interface PinterestBoard {
  id: string
  name: string
  description: string | null
  privacy: 'PUBLIC' | 'SECRET' | 'PROTECTED'
  pin_count: number
}

interface StatusResponse {
  success: boolean
  connected: boolean
  platform: PinterestPlatform | null
}

interface AdAccountsResponse {
  success: boolean
  ad_accounts: PinterestAdAccount[]
}

interface BoardsResponse {
  success: boolean
  boards: PinterestBoard[]
}

// =====================================================
// HOOK
// =====================================================

export function usePinterest() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001'

  // Get Pinterest connection status
  const statusQuery = useQuery({
    queryKey: ['pinterest', 'status', user?.id],
    queryFn: () => api.get<StatusResponse>('/api/pod-autom/pinterest/status'),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  // Get ad accounts
  const adAccountsQuery = useQuery({
    queryKey: ['pinterest', 'ad-accounts', user?.id],
    queryFn: () => api.get<AdAccountsResponse>('/api/pod-autom/pinterest/ad-accounts'),
    enabled: !!user && statusQuery.data?.connected === true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Get boards
  const boardsQuery = useQuery({
    queryKey: ['pinterest', 'boards', user?.id],
    queryFn: () => api.get<BoardsResponse>('/api/pod-autom/pinterest/boards'),
    enabled: !!user && statusQuery.data?.connected === true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Connect Pinterest (redirect to OAuth)
  const connect = () => {
    if (!user) return
    window.location.href = `${apiUrl}/api/pod-autom/pinterest/authorize?user_id=${user.id}`
  }

  // Disconnect Pinterest
  const disconnectMutation = useMutation({
    mutationFn: () => api.post<{ success: boolean }>('/api/pod-autom/pinterest/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest'] })
    },
  })

  // Select ad account
  const selectAdAccountMutation = useMutation({
    mutationFn: (data: { ad_account_id: string; ad_account_name: string }) =>
      api.post<{ success: boolean }>('/api/pod-autom/pinterest/select-ad-account', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'status'] })
    },
  })

  return {
    // Status
    isConnected: statusQuery.data?.connected ?? false,
    platform: statusQuery.data?.platform ?? null,
    isLoading: statusQuery.isLoading,
    error: statusQuery.error,

    // Ad Accounts
    adAccounts: adAccountsQuery.data?.ad_accounts ?? [],
    adAccountsLoading: adAccountsQuery.isLoading,
    refetchAdAccounts: adAccountsQuery.refetch,

    // Boards
    boards: boardsQuery.data?.boards ?? [],
    boardsLoading: boardsQuery.isLoading,
    refetchBoards: boardsQuery.refetch,

    // Actions
    connect,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,

    selectAdAccount: selectAdAccountMutation.mutate,
    isSelectingAdAccount: selectAdAccountMutation.isPending,

    // Refetch
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest'] })
    },
  }
}
