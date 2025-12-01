import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ==========================================
// TYPES
// ==========================================

export interface RateLimits {
  id: string
  shop_id: string
  fast_fashion_limit: number
  pod_creation_limit: number
  created_at?: string
  updated_at?: string
}

// ==========================================
// GET RATE LIMITS FOR SHOP
// ==========================================

export function useRateLimits(shopId: string | null) {
  return useQuery({
    queryKey: ['rate-limits', shopId],
    queryFn: async () => {
      if (!shopId) return null

      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('shop_id', shopId)
        .single()

      if (error) {
        // If no record exists, return defaults
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data as RateLimits
    },
    enabled: !!shopId
  })
}

// ==========================================
// UPSERT RATE LIMITS (Create or Update)
// ==========================================

export function useUpsertRateLimits() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      shopId,
      fastFashionLimit,
      podCreationLimit
    }: {
      shopId: string
      fastFashionLimit: number
      podCreationLimit: number
    }) => {
      const { data, error } = await supabase
        .from('rate_limits')
        .upsert({
          shop_id: shopId,
          fast_fashion_limit: fastFashionLimit,
          pod_creation_limit: podCreationLimit
        }, {
          onConflict: 'shop_id'
        })
        .select()
        .single()

      if (error) throw error

      return data as RateLimits
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['rate-limits', shopId] })
    }
  })
}
