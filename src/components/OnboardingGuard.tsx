import { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { useOnboardingStatus } from '@src/hooks/useOnboardingStatus'
import { OnboardingModal } from '@src/components/onboarding/OnboardingModal'

// =====================================================
// TYPES
// =====================================================

interface OnboardingGuardProps {
  children: React.ReactNode
}

// =====================================================
// COMPONENT
// =====================================================

/**
 * OnboardingGuard wraps protected content and shows the OnboardingModal
 * if the user hasn't completed onboarding yet.
 *
 * The modal cannot be closed without completing all required fields.
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { isComplete, isLoading } = useOnboardingStatus()
  const [showModal, setShowModal] = useState(true)

  const handleComplete = useCallback(() => {
    setShowModal(false)
  }, [])

  // Show loading state while fetching profile
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-zinc-400 text-sm">Lade Profil...</p>
        </div>
      </div>
    )
  }

  // Show modal if onboarding is not complete
  if (!isComplete && showModal) {
    return (
      <>
        {children}
        <OnboardingModal onComplete={handleComplete} />
      </>
    )
  }

  // Render children normally if onboarding is complete
  return <>{children}</>
}

export default OnboardingGuard
