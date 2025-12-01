import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ==========================================
// TYPES
// ==========================================

export interface FastFashionResearchProduct {
  id: number
  title: string
  description: string
  price: string | null
  comparePrice: string | null
  images: string | null
  variants: string | null
  synced_to_shopify: boolean
  created_at?: string
}

export interface ResearchTableStatus {
  exists: boolean
  is_initialized: boolean
  table_name: string | null
  shop_name: string | null
}

// ==========================================
// CHECK IF RESEARCH TABLE EXISTS FOR SHOP
// ==========================================

export function useFastFashionResearchStatus(shopId: string | null) {
  return useQuery({
    queryKey: ['fastfashion-research-status', shopId],
    queryFn: async (): Promise<ResearchTableStatus> => {
      if (!shopId) {
        return { exists: false, is_initialized: false, table_name: null, shop_name: null }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('check_fastfashion_research_table', {
        target_shop_id: shopId
      })

      if (error) {
        console.error('Error checking research table status:', error)
        return { exists: false, is_initialized: false, table_name: null, shop_name: null }
      }

      return data as ResearchTableStatus
    },
    enabled: !!shopId
  })
}

// ==========================================
// CREATE RESEARCH TABLE FOR SHOP
// ==========================================

export function useCreateFastFashionResearchTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, shopName }: { shopId: string; shopName: string }) => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('create_fastfashion_research_table', {
        target_user_id: user.user.id,
        target_shop_id: shopId,
        shop_name: shopName
      })

      if (error) throw error

      const result = data as { success: boolean; table_name: string; message: string; created: boolean }
      if (!result.success) {
        throw new Error(result.message)
      }

      return result
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['fastfashion-research-status', shopId] })
      queryClient.invalidateQueries({ queryKey: ['fastfashion-research-products', shopId] })
    }
  })
}

// ==========================================
// GET RESEARCH PRODUCTS
// ==========================================

export function useFastFashionResearchProducts(shopId: string | null, options?: {
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['fastfashion-research-products', shopId, options],
    queryFn: async () => {
      if (!shopId) return { success: false, products: [] }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_fastfashion_research_products', {
        target_shop_id: shopId,
        limit_count: options?.limit ?? 100,
        offset_count: options?.offset ?? 0
      })

      if (error) throw error

      const result = data as { success: boolean; products: FastFashionResearchProduct[]; table_name?: string; error?: string }
      return result
    },
    enabled: !!shopId
  })
}

// ==========================================
// GET PRODUCT COUNT
// ==========================================

export function useFastFashionResearchCount(shopId: string | null) {
  return useQuery({
    queryKey: ['fastfashion-research-count', shopId],
    queryFn: async () => {
      if (!shopId) return { success: false, count: 0 }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_fastfashion_research_count', {
        target_shop_id: shopId
      })

      if (error) throw error

      return data as { success: boolean; count: number; table_name?: string }
    },
    enabled: !!shopId
  })
}

// ==========================================
// DELETE RESEARCH PRODUCT
// ==========================================

export function useDeleteFastFashionResearchProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, productId }: { shopId: string; productId: number }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('delete_fastfashion_research_product', {
        target_shop_id: shopId,
        product_id: productId
      })

      if (error) throw error

      const result = data as { success: boolean; deleted: boolean; error?: string }
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete product')
      }

      return result
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['fastfashion-research-products', shopId] })
      queryClient.invalidateQueries({ queryKey: ['fastfashion-research-count', shopId] })
      queryClient.invalidateQueries({ queryKey: ['fastfashion-unsynced-products', shopId] })
      queryClient.invalidateQueries({ queryKey: ['fastfashion-unsynced-count', shopId] })
    }
  })
}

// ==========================================
// GET UNSYNCED PRODUCTS (for Shopify sync)
// ==========================================

export function useUnsyncedResearchProducts(shopId: string | null, options?: {
  limit?: number
}) {
  return useQuery({
    queryKey: ['fastfashion-unsynced-products', shopId, options],
    queryFn: async () => {
      if (!shopId) return { success: false, products: [] }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_unsynced_research_products', {
        target_shop_id: shopId,
        limit_count: options?.limit ?? 100
      })

      if (error) throw error

      const result = data as { success: boolean; products: FastFashionResearchProduct[]; table_name?: string; error?: string }
      return result
    },
    enabled: !!shopId
  })
}

// ==========================================
// GET UNSYNCED PRODUCT COUNT
// ==========================================

export function useUnsyncedResearchCount(shopId: string | null) {
  return useQuery({
    queryKey: ['fastfashion-unsynced-count', shopId],
    queryFn: async () => {
      if (!shopId) return { success: false, count: 0 }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_unsynced_research_count', {
        target_shop_id: shopId
      })

      if (error) throw error

      return data as { success: boolean; count: number; table_name?: string }
    },
    enabled: !!shopId
  })
}

// ==========================================
// MARK PRODUCT AS SYNCED
// ==========================================

export function useMarkProductSynced() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, productId }: { shopId: string; productId: number }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('mark_product_synced', {
        target_shop_id: shopId,
        product_id: productId
      })

      if (error) throw error

      const result = data as { success: boolean; updated: boolean; error?: string }
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark product as synced')
      }

      return result
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['fastfashion-research-products', shopId] })
      queryClient.invalidateQueries({ queryKey: ['fastfashion-unsynced-products', shopId] })
      queryClient.invalidateQueries({ queryKey: ['fastfashion-unsynced-count', shopId] })
    }
  })
}

// ==========================================
// CHECK ALL SHOPS RESEARCH STATUS (for Settings)
// ==========================================

export interface ShopResearchStatus {
  shop_id: string
  internal_name: string | null
  shop_domain: string | null
  has_research_table: boolean
  table_name: string | null
}

export interface AllShopsResearchStatus {
  success: boolean
  all_initialized: boolean
  shops: ShopResearchStatus[]
  missing_shops: { shop_id: string; internal_name: string | null; shop_domain: string | null }[]
  missing_count: number
  error?: string
}

export function useAllShopsResearchStatus() {
  return useQuery({
    queryKey: ['all-shops-research-status'],
    queryFn: async (): Promise<AllShopsResearchStatus> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('check_all_shops_research_status')

      if (error) {
        console.error('Error checking all shops research status:', error)
        return {
          success: false,
          all_initialized: false,
          shops: [],
          missing_shops: [],
          missing_count: 0,
          error: error.message
        }
      }

      return data as AllShopsResearchStatus
    }
  })
}

// ==========================================
// INITIALIZE ALL MISSING RESEARCH TABLES (Plan B)
// ==========================================

export interface InitializeAllResult {
  success: boolean
  created_count: number
  failed_count: number
  total_processed: number
  details: { shop_id: string; shop_name: string; result: { success: boolean; table_name: string; message: string } }[]
  error?: string
}

export function useInitializeAllMissingResearchTables() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<InitializeAllResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('initialize_all_missing_research_tables')

      if (error) throw error

      return data as InitializeAllResult
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['all-shops-research-status'] })
      queryClient.invalidateQueries({ queryKey: ['fastfashion-research-status'] })
    }
  })
}
