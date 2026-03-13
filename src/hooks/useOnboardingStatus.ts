import { useMemo } from 'react'
import { useUserProfile, type UserProfile } from './useAdmin'

// =====================================================
// TYPES
// =====================================================

export interface OnboardingStatus {
  isComplete: boolean
  isLoading: boolean
  missingFields: string[]
  profile: UserProfile | undefined
}

// =====================================================
// HOOK
// =====================================================

/**
 * Hook to check if user has completed onboarding
 * Returns completion status and list of missing fields
 */
export function useOnboardingStatus(): OnboardingStatus {
  const { profile, isLoading } = useUserProfile()

  const { isComplete, missingFields } = useMemo(() => {
    if (!profile) {
      return { isComplete: false, missingFields: [] }
    }

    // Only trust the explicit onboarding_completed flag.
    // Profile fields alone are not enough — user must finish the full flow.
    if (profile.onboarding_completed) {
      return { isComplete: true, missingFields: [] }
    }

    return { isComplete: false, missingFields: ['onboarding'] }
  }, [profile])

  return {
    isComplete,
    isLoading,
    missingFields,
    profile,
  }
}

export default useOnboardingStatus
