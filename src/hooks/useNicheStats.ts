import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@src/contexts/AuthContext'
import { supabase } from '@src/lib/supabase'
import { useToastStore } from '@src/lib/store'
import type { NicheWithStats } from '@src/components/dashboard/NicheSelector'

// =====================================================
// LOCAL STORAGE KEY (for demo mode without auth)
// =====================================================

const LOCAL_STORAGE_KEY = 'pod_autom_niches_demo'

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getLocalNiches(): NicheWithStats[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setLocalNiches(niches: NicheWithStats[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(niches))
}

function mapDbNicheToStats(niche: any): NicheWithStats {
  return {
    id: niche.id,
    name: niche.niche_name,
    slug: niche.niche_slug || '',
    isActive: niche.is_active ?? true,
    productCount: niche.total_products ?? 0,
    impressions: 0, // Would come from analytics
    sales: niche.total_sales ?? 0,
    revenue: parseFloat(niche.total_revenue) || 0,
    trend: 'neutral',
    createdAt: niche.created_at,
  }
}

// =====================================================
// NICHE STATS HOOK
// =====================================================

export function useNicheStats(settingsId: string | null) {
  const { session } = useAuth()
  const addToast = useToastStore((state) => state.addToast)
  const queryClient = useQueryClient()

  const isDemo = !settingsId || !session

  // Fetch niches with stats
  const {
    data: niches,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['niche-stats', settingsId, isDemo],
    queryFn: async () => {
      // Demo mode: use localStorage
      if (isDemo) {
        return getLocalNiches()
      }

      // Production mode: fetch from Supabase
      const { data, error } = await (supabase
        .from('pod_autom_niches') as any)
        .select('*')
        .eq('settings_id', settingsId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching niches:', error)
        // Fall back to localStorage
        return getLocalNiches()
      }

      return data.map(mapDbNicheToStats)
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
  })

  // Add niche mutation
  const addNicheMutation = useMutation({
    mutationFn: async (nicheName: string) => {
      const newNiche: NicheWithStats = {
        id: crypto.randomUUID(),
        name: nicheName,
        slug: nicheName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        isActive: true,
        productCount: 0,
        impressions: 0,
        sales: 0,
        revenue: 0,
        trend: 'neutral',
        createdAt: new Date().toISOString(),
      }

      // Demo mode: save to localStorage
      if (isDemo) {
        const current = getLocalNiches()
        const updated = [newNiche, ...current]
        setLocalNiches(updated)
        return newNiche
      }

      // Production mode: save to Supabase
      const { data, error } = await (supabase
        .from('pod_autom_niches') as any)
        .insert({
          settings_id: settingsId,
          niche_name: nicheName,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return mapDbNicheToStats(data)
    },
    onSuccess: (newNiche) => {
      queryClient.setQueryData<NicheWithStats[]>(
        ['niche-stats', settingsId, isDemo],
        (old) => [newNiche, ...(old || [])]
      )
      addToast({
        type: 'success',
        title: 'Nische hinzugefügt',
        description: `${newNiche.name} wurde erfolgreich erstellt.`,
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

  // Toggle niche mutation
  const toggleNicheMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      // Demo mode: update localStorage
      if (isDemo) {
        const current = getLocalNiches()
        const updated = current.map((n) =>
          n.id === id ? { ...n, isActive: active } : n
        )
        setLocalNiches(updated)
        return { id, active }
      }

      // Production mode: update Supabase
      const { error } = await (supabase
        .from('pod_autom_niches') as any)
        .update({ is_active: active })
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }

      return { id, active }
    },
    onSuccess: ({ id, active }) => {
      queryClient.setQueryData<NicheWithStats[]>(
        ['niche-stats', settingsId, isDemo],
        (old) =>
          old?.map((n) => (n.id === id ? { ...n, isActive: active } : n)) || []
      )
      addToast({
        type: 'success',
        title: active ? 'Nische aktiviert' : 'Nische pausiert',
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
    mutationFn: async (id: string) => {
      // Demo mode: remove from localStorage
      if (isDemo) {
        const current = getLocalNiches()
        const updated = current.filter((n) => n.id !== id)
        setLocalNiches(updated)
        return id
      }

      // Production mode: delete from Supabase
      const { error } = await (supabase
        .from('pod_autom_niches') as any)
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }

      return id
    },
    onSuccess: (id) => {
      queryClient.setQueryData<NicheWithStats[]>(
        ['niche-stats', settingsId, isDemo],
        (old) => old?.filter((n) => n.id !== id) || []
      )
      addToast({
        type: 'success',
        title: 'Nische gelöscht',
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
    isDemo,
    addNiche: addNicheMutation.mutate,
    isAdding: addNicheMutation.isPending,
    toggleNiche: (id: string, active: boolean) =>
      toggleNicheMutation.mutate({ id, active }),
    isToggling: toggleNicheMutation.isPending,
    deleteNiche: deleteNicheMutation.mutate,
    isDeleting: deleteNicheMutation.isPending,
  }
}

export default useNicheStats
