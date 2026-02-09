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

    const missing: string[] = []

    // Check required fields for all users
    if (!profile.first_name?.trim()) {
      missing.push('first_name')
    }

    if (!profile.last_name?.trim()) {
      missing.push('last_name')
    }

    // Company name required only for companies
    if (profile.account_type === 'company' && !profile.company_name?.trim()) {
      missing.push('company_name')
    }

    // Billing address fields
    if (!profile.billing_street?.trim()) {
      missing.push('billing_street')
    }

    if (!profile.billing_city?.trim()) {
      missing.push('billing_city')
    }

    if (!profile.billing_zip?.trim()) {
      missing.push('billing_zip')
    }

    if (!profile.billing_country?.trim()) {
      missing.push('billing_country')
    }

    // Shopify domain
    if (!profile.shopify_domain?.trim()) {
      missing.push('shopify_domain')
    }

    // Onboarding is complete only when ALL required fields are filled
    // This ensures existing accounts without the new fields will see the onboarding
    const complete = missing.length === 0

    return {
      isComplete: complete,
      missingFields: missing,
    }
  }, [profile])

  return {
    isComplete,
    isLoading,
    missingFields,
    profile,
  }
}

export default useOnboardingStatus
