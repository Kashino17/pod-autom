import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@src/contexts/AuthContext'
import { api } from '@src/lib/api'
import { useToastStore } from '@src/lib/store'
import type { NicheWithStats } from '@src/components/dashboard/NicheSelector'

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

function generateMockNiches(): NicheWithStats[] {
  return [
    {
      id: '1',
      name: 'Fitness & Sport',
      slug: 'fitness-sport',
      isActive: true,
      productCount: 15,
      impressions: 12450,
      sales: 23,
      revenue: 689.77,
      trend: 'up',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      name: 'Yoga & Meditation',
      slug: 'yoga-meditation',
      isActive: true,
      productCount: 12,
      impressions: 8920,
      sales: 18,
      revenue: 539.82,
      trend: 'up',
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      name: 'Gaming',
      slug: 'gaming',
      isActive: true,
      productCount: 8,
      impressions: 5670,
      sales: 9,
      revenue: 269.91,
      trend: 'neutral',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      name: 'Kaffee Liebhaber',
      slug: 'kaffee-liebhaber',
      isActive: true,
      productCount: 6,
      impressions: 3240,
      sales: 5,
      revenue: 149.95,
      trend: 'down',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      name: 'Haustiere',
      slug: 'haustiere',
      isActive: false,
      productCount: 4,
      impressions: 1890,
      sales: 2,
      revenue: 59.98,
      trend: 'down',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

// =====================================================
// NICHE STATS HOOK
// =====================================================

export function useNicheStats(settingsId: string | null) {
  const { session } = useAuth()
  const addToast = useToastStore((state) => state.addToast)
  const queryClient = useQueryClient()

  // Fetch niches with stats
  const {
    data: niches,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['niche-stats', settingsId],
    queryFn: async () => {
      if (!settingsId) {
        return generateMockNiches()
      }

      try {
        const response = await api.get<{
          success: boolean
          niches: NicheWithStats[]
        }>(`/api/pod-autom/niches/${settingsId}/stats`)
        return response.niches
      } catch {
        // Fall back to mock data
        return generateMockNiches()
      }
    },
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
  })

  // Add niche mutation
  const addNicheMutation = useMutation({
    mutationFn: async (nicheName: string) => {
      if (!settingsId) {
        // Mock adding for demo
        const newNiche: NicheWithStats = {
          id: Date.now().toString(),
          name: nicheName,
          slug: nicheName.toLowerCase().replace(/\s+/g, '-'),
          isActive: true,
          productCount: 0,
          impressions: 0,
          sales: 0,
          revenue: 0,
          trend: 'neutral',
          createdAt: new Date().toISOString(),
        }
        return newNiche
      }

      const response = await api.post<{
        success: boolean
        niche: NicheWithStats
        error?: string
      }>(`/api/pod-autom/niches/${settingsId}`, { niche_name: nicheName })

      if (!response.success) {
        throw new Error(response.error || 'Failed to add niche')
      }
      return response.niche
    },
    onSuccess: (newNiche) => {
      queryClient.setQueryData<NicheWithStats[]>(
        ['niche-stats', settingsId],
        (old) => [...(old || []), newNiche]
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
      if (!settingsId) {
        return { id, active }
      }

      const response = await api.put<{ success: boolean; error?: string }>(
        `/api/pod-autom/niches/${settingsId}/${id}`,
        { is_active: active }
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to update niche')
      }
      return { id, active }
    },
    onSuccess: ({ id, active }) => {
      queryClient.setQueryData<NicheWithStats[]>(
        ['niche-stats', settingsId],
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
      if (!settingsId) {
        return id
      }

      const response = await api.delete<{ success: boolean; error?: string }>(
        `/api/pod-autom/niches/${settingsId}/${id}`
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete niche')
      }
      return id
    },
    onSuccess: (id) => {
      queryClient.setQueryData<NicheWithStats[]>(
        ['niche-stats', settingsId],
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
