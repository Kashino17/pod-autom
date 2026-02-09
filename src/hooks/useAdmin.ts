import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@src/contexts/AuthContext'
import { api } from '@src/lib/api'
import { useToastStore } from '@src/lib/store'

// =====================================================
// TYPES
// =====================================================

export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  role: 'user' | 'admin'
  verification_status: 'pending' | 'verified' | 'rejected'
  shopify_domain: string | null
  shopify_domain_previous: string | null
  shopify_domain_changed_at: string | null
  shopify_install_link: string | null
  install_link_created_at: string | null
  onboarding_completed: boolean
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
  domain_changed_flag?: boolean
  shop_connection_status?: string | null
  // Onboarding fields
  account_type: 'individual' | 'company' | null
  company_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  tax_id: string | null
  billing_street: string | null
  billing_city: string | null
  billing_zip: string | null
  billing_country: string | null
}

export interface OnboardingData {
  account_type: 'individual' | 'company'
  first_name: string
  last_name: string
  company_name?: string | undefined
  phone?: string | undefined
  tax_id?: string | undefined
  billing_street: string
  billing_city: string
  billing_zip: string
  billing_country: string
  shopify_domain: string
}

export interface AdminStats {
  pending_users: number
  verified_users: number
  total_users: number
  connected_shops: number
}

export interface PaginatedUsersResponse {
  success: boolean
  users: UserProfile[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// =====================================================
// ADMIN USERS HOOK
// =====================================================

export function useAdminUsers(
  page: number = 1,
  pageSize: number = 20,
  status?: string,
  search?: string
) {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['admin-users', page, pageSize, status, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('page_size', pageSize.toString())
      if (status) params.set('status', status)
      if (search) params.set('search', search)

      const response = await api.get<PaginatedUsersResponse>(
        `/api/admin/users?${params.toString()}`
      )
      return response
    },
    enabled: !!session,
  })
}

// =====================================================
// ADMIN STATS HOOK
// =====================================================

export function useAdminStats() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; stats: AdminStats }>(
        '/api/admin/stats'
      )
      return response.stats
    },
    enabled: !!session,
  })
}

// =====================================================
// ADMIN MUTATIONS HOOK
// =====================================================

export function useAdminMutations() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((state) => state.addToast)

  // Set install link for user
  const setInstallLinkMutation = useMutation({
    mutationFn: async ({
      userId,
      installLink,
    }: {
      userId: string
      installLink: string
    }) => {
      const response = await api.put<{ success: boolean; message: string }>(
        `/api/admin/users/${userId}/install-link`,
        { install_link: installLink }
      )
      if (!response.success) {
        throw new Error('Fehler beim Speichern')
      }
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      addToast({
        type: 'success',
        title: 'Install-Link gespeichert',
        description: 'Der User wurde verifiziert.',
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

  // Update verification status
  const updateVerificationMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string
      status: string
    }) => {
      const response = await api.put<{ success: boolean; message: string }>(
        `/api/admin/users/${userId}/verification`,
        { verification_status: status }
      )
      if (!response.success) {
        throw new Error('Fehler beim Aktualisieren')
      }
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      addToast({
        type: 'success',
        title: 'Status aktualisiert',
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

  // Confirm domain change
  const confirmDomainChangeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.post<{ success: boolean; message: string }>(
        `/api/admin/users/${userId}/confirm-domain-change`
      )
      if (!response.success) {
        throw new Error('Fehler beim Bestätigen')
      }
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      addToast({
        type: 'success',
        title: 'Domain-Änderung bestätigt',
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
    setInstallLink: setInstallLinkMutation.mutate,
    isSettingLink: setInstallLinkMutation.isPending,
    updateVerification: updateVerificationMutation.mutate,
    isUpdatingVerification: updateVerificationMutation.isPending,
    confirmDomainChange: confirmDomainChangeMutation.mutate,
    isConfirmingDomainChange: confirmDomainChangeMutation.isPending,
  }
}

// =====================================================
// USER PROFILE HOOK (for regular users)
// =====================================================

export function useUserProfile() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const addToast = useToastStore((state) => state.addToast)

  const profileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; profile: UserProfile }>(
        '/api/admin/profile'
      )
      return response.profile
    },
    enabled: !!session,
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { shopify_domain?: string; full_name?: string }) => {
      const response = await api.put<{ success: boolean; message: string }>(
        '/api/admin/profile',
        data
      )
      if (!response.success) {
        throw new Error('Fehler beim Aktualisieren')
      }
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      addToast({
        type: 'success',
        title: 'Profil aktualisiert',
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

  const completeOnboardingMutation = useMutation({
    mutationFn: async (shopifyDomain: string) => {
      const response = await api.post<{ success: boolean; message: string }>(
        '/api/admin/profile/complete-onboarding',
        { shopify_domain: shopifyDomain }
      )
      if (!response.success) {
        throw new Error('Fehler beim Abschließen')
      }
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      addToast({
        type: 'success',
        title: 'Onboarding abgeschlossen',
        description: 'Bitte warte auf die Verifizierung.',
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

  const startInstallationMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<{
        success: boolean
        install_link: string
        shop_domain: string
      }>('/api/admin/profile/start-installation')
      if (!response.success) {
        throw new Error('Fehler beim Starten der Installation')
      }
      return response
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: error.message,
      })
    },
  })

  // Update shopify domain specifically
  const updateShopifyDomainMutation = useMutation({
    mutationFn: async (shopifyDomain: string) => {
      const response = await api.put<{ success: boolean; message: string }>(
        '/api/admin/profile',
        { shopify_domain: shopifyDomain }
      )
      if (!response.success) {
        throw new Error('Fehler beim Speichern der Domain')
      }
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      addToast({
        type: 'success',
        title: 'Domain gespeichert',
        description: 'Bitte warte auf die Verifizierung.',
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

  // Save onboarding data
  const saveOnboardingDataMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      const response = await api.put<{ success: boolean; message: string }>(
        '/api/admin/profile/onboarding',
        data
      )
      if (!response.success) {
        throw new Error('Fehler beim Speichern')
      }
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      addToast({
        type: 'success',
        title: 'Onboarding abgeschlossen',
        description: 'Deine Daten wurden gespeichert.',
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
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    updateShopifyDomain: updateShopifyDomainMutation.mutateAsync,
    isUpdatingDomain: updateShopifyDomainMutation.isPending,
    completeOnboarding: completeOnboardingMutation.mutate,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
    startInstallation: startInstallationMutation.mutateAsync,
    isStartingInstallation: startInstallationMutation.isPending,
    saveOnboardingData: saveOnboardingDataMutation.mutateAsync,
    isSavingOnboarding: saveOnboardingDataMutation.isPending,
  }
}
