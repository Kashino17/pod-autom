import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@src/contexts/AuthContext'
import { api } from '@src/lib/api'
import { useToastStore } from '@src/lib/store'

// =====================================================
// TYPES
// =====================================================

export interface Shop {
  id: string
  shop_domain: string
  internal_name: string | null
  connection_status: 'connected' | 'disconnected' | 'error'
  created_at: string
}

export interface ShopSettings {
  id: string
  shop_id: string
  enabled: boolean
  gpt_image_quality: 'LOW' | 'MEDIUM' | 'HIGH'
  creation_limit: number
  auto_publish: boolean
  default_price: number
  default_compare_at_price: number | null
  created_at: string
  updated_at: string
}

export interface Niche {
  id: string
  settings_id: string
  niche_name: string
  niche_slug: string
  is_active: boolean
  created_at: string
}

// =====================================================
// SHOPS HOOK
// =====================================================

export function useShops() {
  const { session } = useAuth()
  const addToast = useToastStore((state) => state.addToast)
  const queryClient = useQueryClient()

  // Fetch shops
  const {
    data: shops,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['pod-autom-shops'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; shops: Shop[] }>(
        '/api/pod-autom/shops'
      )
      if (!response.success) {
        throw new Error('Failed to fetch shops')
      }
      return response.shops
    },
    enabled: !!session,
  })

  // Create shop mutation (manual connection)
  const createShopMutation = useMutation({
    mutationFn: async (data: {
      shop_domain: string
      access_token: string
      internal_name?: string
    }) => {
      const response = await api.post<{ success: boolean; shop: Shop; error?: string }>(
        '/api/pod-autom/shops',
        data
      )
      if (!response.success) {
        throw new Error(response.error || 'Failed to create shop')
      }
      return response.shop
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-shops'] })
      addToast({
        type: 'success',
        title: 'Shop verbunden',
        description: 'Der Shop wurde erfolgreich verbunden.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: error.message,
      })
    },
  })

  // Delete shop mutation
  const deleteShopMutation = useMutation({
    mutationFn: async (shopId: string) => {
      const response = await api.delete<{ success: boolean; error?: string }>(
        `/api/pod-autom/shops/${shopId}`
      )
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete shop')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-shops'] })
      addToast({
        type: 'success',
        title: 'Shop entfernt',
        description: 'Der Shop wurde erfolgreich entfernt.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: error.message,
      })
    },
  })

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (shopId: string) => {
      const response = await api.post<{
        success: boolean
        status: string
        error?: string
      }>(`/api/pod-autom/shops/${shopId}/test`)
      return response
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-shops'] })
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Verbindung OK',
          description: 'Die Shop-Verbindung funktioniert.',
        })
      } else {
        addToast({
          type: 'error',
          title: 'Verbindungsfehler',
          description: data.error || 'Die Verbindung konnte nicht hergestellt werden.',
        })
      }
    },
  })

  // Start Shopify OAuth flow with specific shop domain
  const startOAuthFlow = (shopDomain: string, userId: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001'
    const cleanDomain = shopDomain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    window.location.href = `${apiUrl}/api/shopify/install?shop=${cleanDomain}&user_id=${userId}`
  }

  // Quick install without specifying shop domain (user selects in Shopify)
  const startQuickInstall = (userId: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001'
    window.location.href = `${apiUrl}/api/shopify/install?user_id=${userId}`
  }

  return {
    shops: shops || [],
    isLoading,
    error,
    refetch,
    createShop: createShopMutation.mutate,
    isCreating: createShopMutation.isPending,
    deleteShop: deleteShopMutation.mutate,
    isDeleting: deleteShopMutation.isPending,
    testConnection: testConnectionMutation.mutate,
    isTesting: testConnectionMutation.isPending,
    startOAuthFlow,
    startQuickInstall,
  }
}

// =====================================================
// SETTINGS HOOK
// =====================================================

export function useShopSettings(shopId: string | null) {
  const { session } = useAuth()
  const addToast = useToastStore((state) => state.addToast)
  const queryClient = useQueryClient()

  // Fetch settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['pod-autom-settings', shopId],
    queryFn: async () => {
      if (!shopId) return null
      const response = await api.get<{
        success: boolean
        settings: ShopSettings | null
      }>(`/api/pod-autom/settings/${shopId}`)
      return response.settings
    },
    enabled: !!session && !!shopId,
  })

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<ShopSettings>) => {
      if (!shopId) throw new Error('No shop selected')
      const response = await api.put<{
        success: boolean
        settings: ShopSettings
        error?: string
      }>(`/api/pod-autom/settings/${shopId}`, data)
      if (!response.success) {
        throw new Error(response.error || 'Failed to update settings')
      }
      return response.settings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-settings', shopId] })
      addToast({
        type: 'success',
        title: 'Einstellungen gespeichert',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: error.message,
      })
    },
  })

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  }
}

// =====================================================
// NICHES HOOK
// =====================================================

export function useNiches(settingsId: string | null) {
  const { session } = useAuth()
  const addToast = useToastStore((state) => state.addToast)
  const queryClient = useQueryClient()

  // Fetch niches
  const {
    data: niches,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['pod-autom-niches', settingsId],
    queryFn: async () => {
      if (!settingsId) return []
      const response = await api.get<{
        success: boolean
        niches: Niche[]
      }>(`/api/pod-autom/niches/${settingsId}`)
      return response.niches
    },
    enabled: !!session && !!settingsId,
  })

  // Create niche mutation
  const createNicheMutation = useMutation({
    mutationFn: async (nicheName: string) => {
      if (!settingsId) throw new Error('No settings selected')
      const response = await api.post<{
        success: boolean
        niche: Niche
        error?: string
      }>(`/api/pod-autom/niches/${settingsId}`, { niche_name: nicheName })
      if (!response.success) {
        throw new Error(response.error || 'Failed to create niche')
      }
      return response.niche
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-niches', settingsId] })
      addToast({
        type: 'success',
        title: 'Nische hinzugefuegt',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: error.message,
      })
    },
  })

  // Delete niche mutation
  const deleteNicheMutation = useMutation({
    mutationFn: async (nicheId: string) => {
      if (!settingsId) throw new Error('No settings selected')
      const response = await api.delete<{ success: boolean; error?: string }>(
        `/api/pod-autom/niches/${settingsId}/${nicheId}`
      )
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete niche')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-niches', settingsId] })
      addToast({
        type: 'success',
        title: 'Nische entfernt',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: error.message,
      })
    },
  })

  return {
    niches: niches || [],
    isLoading,
    error,
    createNiche: createNicheMutation.mutate,
    isCreating: createNicheMutation.isPending,
    deleteNiche: deleteNicheMutation.mutate,
    isDeleting: deleteNicheMutation.isPending,
  }
}
