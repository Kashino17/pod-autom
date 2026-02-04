import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@src/contexts/AuthContext'
import { api } from '@src/lib/api'
import { useToastStore } from '@src/lib/store'
import type { Prompt, PromptType } from '@src/components/dashboard/PromptManager'

// =====================================================
// DEFAULT PROMPTS
// =====================================================

const DEFAULT_PROMPTS: Record<PromptType, string> = {
  image: `Create a modern, eye-catching print-on-demand design.

Style: Clean, minimalist, trendy
Colors: Vibrant, high contrast
Background: Transparent or solid color
Format: Suitable for t-shirts and hoodies

Niche: {{niche}}
Theme: {{theme}}

The design should appeal to {{niche}} enthusiasts and be instantly recognizable.`,

  title: `Create a catchy, SEO-optimized product title.

Requirements:
- Length: 50-70 characters
- Include main keyword: {{niche}}
- Product type: {{product_type}}
- Unique and appealing
- Avoid generic phrases like "Best" or "Amazing"

Format: [Adjective] [Niche-related word] [Product type] - [Unique selling point]`,

  description: `Write a compelling product description for {{niche}} enthusiasts.

Product: {{product_type}}
Design theme: {{theme}}

Structure:
1. Hook (1 sentence) - Grab attention
2. Benefits (2-3 bullet points) - Why they need it
3. Quality details - Premium materials, print quality
4. Call to action - Limited availability, order now

Tone: Enthusiastic but professional
Length: 100-150 words
Include relevant keywords naturally.`,
}

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

function generateMockPrompts(): Prompt[] {
  return [
    {
      id: '1',
      type: 'image',
      name: 'Bild-Prompt',
      content: DEFAULT_PROMPTS.image,
      isDefault: true,
      isActive: true,
      usageCount: 145,
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      type: 'title',
      name: 'Titel-Prompt',
      content: DEFAULT_PROMPTS.title,
      isDefault: true,
      isActive: true,
      usageCount: 145,
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'description',
      name: 'Beschreibungs-Prompt',
      content: DEFAULT_PROMPTS.description,
      isDefault: true,
      isActive: true,
      usageCount: 145,
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

// =====================================================
// USE PROMPTS HOOK
// =====================================================

export function usePrompts(settingsId: string | null) {
  const { session } = useAuth()
  const addToast = useToastStore((state) => state.addToast)
  const queryClient = useQueryClient()

  // Fetch prompts
  const {
    data: prompts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['prompts', settingsId],
    queryFn: async () => {
      if (!settingsId) {
        return generateMockPrompts()
      }

      try {
        const response = await api.get<{
          success: boolean
          prompts: Prompt[]
        }>(`/api/pod-autom/prompts/${settingsId}`)
        return response.prompts
      } catch {
        // Fall back to mock data
        return generateMockPrompts()
      }
    },
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
  })

  // Save prompt mutation
  const savePromptMutation = useMutation({
    mutationFn: async ({ type, content }: { type: PromptType; content: string }) => {
      if (!settingsId) {
        // Mock save for demo
        return { type, content }
      }

      const response = await api.put<{
        success: boolean
        prompt: Prompt
        error?: string
      }>(`/api/pod-autom/prompts/${settingsId}/${type}`, {
        prompt_text: content,
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to save prompt')
      }
      return { type, content }
    },
    onSuccess: ({ type, content }) => {
      queryClient.setQueryData<Prompt[]>(['prompts', settingsId], (old) =>
        old?.map((p) =>
          p.type === type ? { ...p, content, isDefault: false } : p
        ) || []
      )
      addToast({
        type: 'success',
        title: 'Prompt gespeichert',
        description: 'Deine Änderungen wurden übernommen.',
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

  // Reset prompt mutation
  const resetPromptMutation = useMutation({
    mutationFn: async (type: PromptType) => {
      if (!settingsId) {
        return { type, content: DEFAULT_PROMPTS[type] }
      }

      const response = await api.put<{
        success: boolean
        error?: string
      }>(`/api/pod-autom/prompts/${settingsId}/${type}`, {
        prompt_text: DEFAULT_PROMPTS[type],
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to reset prompt')
      }
      return { type, content: DEFAULT_PROMPTS[type] }
    },
    onSuccess: ({ type, content }) => {
      queryClient.setQueryData<Prompt[]>(['prompts', settingsId], (old) =>
        old?.map((p) =>
          p.type === type ? { ...p, content, isDefault: true } : p
        ) || []
      )
      addToast({
        type: 'success',
        title: 'Prompt zurückgesetzt',
        description: 'Der Standard-Prompt wurde wiederhergestellt.',
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
    prompts: prompts || [],
    isLoading,
    error,
    savePrompt: (type: PromptType, content: string) =>
      savePromptMutation.mutate({ type, content }),
    isSaving: savePromptMutation.isPending,
    resetPrompt: resetPromptMutation.mutate,
    isResetting: resetPromptMutation.isPending,
    defaultPrompts: DEFAULT_PROMPTS,
  }
}

export default usePrompts
