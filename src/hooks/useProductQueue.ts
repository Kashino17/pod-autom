import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@src/contexts/AuthContext'
import { api } from '@src/lib/api'
import { useToastStore } from '@src/lib/store'
import type { QueuedProduct, ProductStatus } from '@src/components/dashboard/ProductQueue'

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

const MOCK_NICHES = ['Fitness', 'Gaming', 'Haustiere', 'Reisen', 'Kochen']
const MOCK_TITLES = [
  'Motivations-Shirt für Sportler',
  'Gaming Legend T-Shirt',
  'Hundeliebhaber Hoodie',
  'Wanderlust Reise-Shirt',
  'Chef Life Kochschürze',
  'Gym Motivation Tank Top',
  'Pro Gamer Hoodie',
  'Katzenfreund T-Shirt',
  'Adventure Awaits Shirt',
  'Kitchen Boss Schürze',
]

const MOCK_STEPS = {
  generating: ['Prompt wird verarbeitet...', 'Bild wird generiert...', 'Qualitätsprüfung...'],
  optimizing: ['Titel wird optimiert...', 'Beschreibung wird erstellt...', 'SEO-Analyse...'],
  publishing: ['Produkt wird erstellt...', 'Bild wird hochgeladen...', 'Wird veröffentlicht...'],
}

function generateMockProducts(): QueuedProduct[] {
  const products: QueuedProduct[] = []
  const statuses: ProductStatus[] = ['pending', 'generating', 'optimizing', 'publishing', 'published', 'failed']

  // Generate 12 mock products with various statuses
  for (let i = 0; i < 12; i++) {
    const statusIndex = i % statuses.length
    const status = statuses[statusIndex] ?? 'pending'
    const nicheIndex = i % MOCK_NICHES.length
    const niche = MOCK_NICHES[nicheIndex] ?? 'Fitness'
    const titleIndex = i % MOCK_TITLES.length
    const title = MOCK_TITLES[titleIndex] ?? 'Neues Produkt'
    const isProcessing = ['generating', 'optimizing', 'publishing'].includes(status)

    let currentStep: string | undefined = undefined
    if (isProcessing && (status === 'generating' || status === 'optimizing' || status === 'publishing')) {
      const steps = MOCK_STEPS[status]
      const stepIndex = Math.floor(Math.random() * steps.length)
      currentStep = steps[stepIndex]
    }

    products.push({
      id: `prod-${i + 1}`,
      title: status === 'pending' ? '' : title,
      niche,
      imageUrl: status !== 'pending' && status !== 'generating'
        ? `https://picsum.photos/seed/${i + 1}/400/400`
        : undefined,
      status,
      progress: isProcessing ? Math.floor(Math.random() * 80) + 10 : status === 'published' ? 100 : 0,
      currentStep,
      shopifyUrl: status === 'published'
        ? `https://example.myshopify.com/admin/products/${1000 + i}`
        : undefined,
      error: status === 'failed'
        ? 'Bildgenerierung fehlgeschlagen: API-Limit erreicht'
        : undefined,
      createdAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - i * 30 * 60 * 1000).toISOString(),
    })
  }

  return products
}

// =====================================================
// USE PRODUCT QUEUE HOOK
// =====================================================

export function useProductQueue(shopId: string | null) {
  const { session } = useAuth()
  const addToast = useToastStore((state) => state.addToast)
  const queryClient = useQueryClient()

  // Fetch products
  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['productQueue', shopId],
    queryFn: async () => {
      if (!shopId) {
        return generateMockProducts()
      }

      try {
        const response = await api.get<{
          success: boolean
          products: QueuedProduct[]
        }>(`/api/pod-autom/products/${shopId}/queue`)
        return response.products
      } catch {
        // Fall back to mock data
        return generateMockProducts()
      }
    },
    enabled: !!session,
    staleTime: 1000 * 30, // 30 seconds - refresh more frequently for queue
    refetchInterval: 1000 * 60, // Auto-refresh every minute
  })

  // Retry failed product
  const retryMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!shopId) {
        // Mock retry for demo
        return { productId }
      }

      const response = await api.post<{
        success: boolean
        error?: string
      }>(`/api/pod-autom/products/${productId}/retry`)

      if (!response.success) {
        throw new Error(response.error || 'Retry failed')
      }
      return { productId }
    },
    onSuccess: ({ productId }) => {
      // Update product status to pending
      queryClient.setQueryData<QueuedProduct[]>(['productQueue', shopId], (old) =>
        old?.map((p) =>
          p.id === productId
            ? { ...p, status: 'pending' as ProductStatus, error: undefined, progress: 0 }
            : p
        ) || []
      )
      addToast({
        type: 'success',
        title: 'Erneuter Versuch gestartet',
        description: 'Das Produkt wurde zur Queue hinzugefügt.',
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

  // Delete product from queue
  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!shopId) {
        // Mock delete for demo
        return { productId }
      }

      const response = await api.delete<{
        success: boolean
        error?: string
      }>(`/api/pod-autom/products/${productId}`)

      if (!response.success) {
        throw new Error(response.error || 'Delete failed')
      }
      return { productId }
    },
    onSuccess: ({ productId }) => {
      // Remove product from list
      queryClient.setQueryData<QueuedProduct[]>(['productQueue', shopId], (old) =>
        old?.filter((p) => p.id !== productId) || []
      )
      addToast({
        type: 'success',
        title: 'Produkt entfernt',
        description: 'Das Produkt wurde aus der Queue entfernt.',
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
    products: products || [],
    isLoading,
    error,
    retryProduct: retryMutation.mutate,
    isRetrying: retryMutation.isPending,
    deleteProduct: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}

export default useProductQueue
