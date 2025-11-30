import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  Shop,
  ShopInsert,
  ShopUpdate,
  ShopRules,
  ShopRulesUpdate,
  ProductCreationSettings,
  ProductCreationSettingsUpdate,
  RateLimits,
  ShopifyCollection
} from '../lib/database.types'

// ==========================================
// SHOPS
// ==========================================

export function useShops() {
  return useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select(`
          *,
          shop_rules(*),
          product_creation_settings(*),
          rate_limits(*),
          pinterest_auth(is_connected, pinterest_username),
          meta_auth(is_connected, meta_username),
          google_auth(is_connected)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })
}

export function useShop(shopId: string | null) {
  return useQuery({
    queryKey: ['shops', shopId],
    queryFn: async () => {
      if (!shopId) return null

      const { data, error } = await supabase
        .from('shops')
        .select(`
          *,
          shop_rules(*),
          shopify_collections(*),
          product_creation_settings(*),
          pod_settings(*, pod_selected_niches(*), pod_chatgpt_prompts(*)),
          rate_limits(*),
          discord_settings(*),
          pinterest_auth(*),
          pinterest_ad_accounts(*),
          pinterest_campaigns(*, campaign_batch_assignments(*)),
          pinterest_settings(*),
          meta_auth(*),
          meta_ad_accounts(*),
          meta_campaigns(*, meta_campaign_collections(*)),
          meta_settings(*),
          google_auth(*),
          google_campaigns(*, google_campaign_collections(*))
        `)
        .eq('id', shopId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!shopId
  })
}

export function useCreateShop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shop: Omit<ShopInsert, 'user_id'>) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('shops')
        .insert({
          ...shop,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
    }
  })
}

export function useUpdateShop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, updates }: { shopId: string; updates: ShopUpdate }) => {
      const { data, error } = await supabase
        .from('shops')
        .update(updates)
        .eq('id', shopId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      queryClient.invalidateQueries({ queryKey: ['shops', shopId] })
    }
  })
}

export function useDeleteShop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shopId: string) => {
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', shopId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
    }
  })
}

// ==========================================
// SHOP RULES
// ==========================================

export function useUpdateShopRules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, rules }: { shopId: string; rules: ShopRulesUpdate }) => {
      const { data, error } = await supabase
        .from('shop_rules')
        .update(rules)
        .eq('shop_id', shopId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['shops', shopId] })
    }
  })
}

// ==========================================
// PRODUCT CREATION SETTINGS
// ==========================================

export function useUpdateProductCreationSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, settings }: { shopId: string; settings: ProductCreationSettingsUpdate }) => {
      const { data, error } = await supabase
        .from('product_creation_settings')
        .update(settings)
        .eq('shop_id', shopId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['shops', shopId] })
    }
  })
}

// ==========================================
// RATE LIMITS
// ==========================================

export function useUpdateRateLimits() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, limits }: { shopId: string; limits: Partial<RateLimits> }) => {
      const { data, error } = await supabase
        .from('rate_limits')
        .update(limits)
        .eq('shop_id', shopId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['shops', shopId] })
    }
  })
}

// ==========================================
// COLLECTIONS
// ==========================================

export function useShopCollections(shopId: string | null) {
  return useQuery({
    queryKey: ['collections', shopId],
    queryFn: async () => {
      if (!shopId) return []

      const { data, error } = await supabase
        .from('shopify_collections')
        .select('*')
        .eq('shop_id', shopId)
        .order('title')

      if (error) throw error
      return data
    },
    enabled: !!shopId
  })
}

export function useToggleCollectionSelected() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ collectionId, isSelected }: { collectionId: string; isSelected: boolean }) => {
      const { data, error } = await supabase
        .from('shopify_collections')
        .update({ is_selected: isSelected })
        .eq('id', collectionId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['collections', data.shop_id] })
    }
  })
}

// ==========================================
// API URL Configuration
// ==========================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// ==========================================
// TEST SHOPIFY CONNECTION
// ==========================================

export function useTestShopifyConnection() {
  return useMutation({
    mutationFn: async ({ shopDomain, accessToken }: { shopDomain: string; accessToken: string }) => {
      // Use backend API proxy to avoid CORS issues
      const response = await fetch(`${API_URL}/api/shopify/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shop_domain: shopDomain,
          access_token: accessToken
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Verbindung zu Shopify fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.')
      }

      return data.shop
    }
  })
}

// ==========================================
// SYNC SHOPIFY COLLECTIONS
// ==========================================

export function useSyncShopifyCollections() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, shopDomain, accessToken }: { shopId: string; shopDomain: string; accessToken: string }) => {
      // Get collections from Shopify via API proxy
      const response = await fetch(`${API_URL}/api/shopify/get-collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shop_domain: shopDomain,
          access_token: accessToken
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Fehler beim Laden der Kollektionen')
      }

      // Sync collections to Supabase
      for (const collection of data.collections) {
        await supabase
          .from('shopify_collections')
          .upsert({
            shop_id: shopId,
            shopify_collection_id: collection.id.toString(),
            title: collection.title,
            handle: collection.handle,
            collection_type: collection.type,
            products_count: collection.products_count || 0,
            is_selected: false
          }, {
            onConflict: 'shop_id,shopify_collection_id'
          })
      }

      return data.collections
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['collections', shopId] })
      queryClient.invalidateQueries({ queryKey: ['shops', shopId] })
    }
  })
}
