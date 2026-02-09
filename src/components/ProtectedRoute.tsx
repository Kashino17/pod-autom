import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import type { ProtectedRouteProps, SubscriptionTier } from '@src/types/auth'
import { Loader2 } from 'lucide-react'

// =====================================================
// LOADING SPINNER
// =====================================================

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm text-zinc-400">Laden...</p>
      </div>
    </div>
  )
}

// =====================================================
// PROTECTED ROUTE
// =====================================================

export function ProtectedRoute({
  children,
  requireSubscription = false,
  requiredTier,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading: authLoading, initialized } = useAuth()
  const { tier, isActive, loading: subLoading } = useSubscription()
  const location = useLocation()

  // Wait for auth initialization
  if (!initialized || authLoading) {
    return <LoadingScreen />
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check subscription requirements
  if (requireSubscription || requiredTier) {
    // Wait for subscription data
    if (subLoading) {
      return <LoadingScreen />
    }

    // No active subscription
    if (!isActive) {
      if (fallback) {
        return <>{fallback}</>
      }
      return (
        <Navigate to="/pricing" state={{ from: location, reason: 'no-subscription' }} replace />
      )
    }

    // Check tier requirements
    if (requiredTier) {
      const allowedTiers = Array.isArray(requiredTier)
        ? requiredTier
        : [requiredTier]

      if (!tier || !allowedTiers.includes(tier)) {
        if (fallback) {
          return <>{fallback}</>
        }
        return (
          <Navigate
            to="/pricing"
            state={{ from: location, reason: 'tier-required', requiredTier }}
            replace
          />
        )
      }
    }
  }

  return <>{children}</>
}

// =====================================================
// UPGRADE REQUIRED FALLBACK
// =====================================================

interface UpgradeRequiredProps {
  feature: string
  requiredTier: SubscriptionTier | SubscriptionTier[]
}

export function UpgradeRequired({ feature, requiredTier }: UpgradeRequiredProps) {
  const tiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier]
  const tierLabel = tiers.length === 1 ? tiers[0] : tiers.join(' oder ')

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
      <div className="mb-6 rounded-full bg-violet-500/10 p-4">
        <svg
          className="h-8 w-8 text-violet-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      <h3 className="mb-2 text-xl font-semibold text-white">
        Upgrade erforderlich
      </h3>

      <p className="mb-6 max-w-md text-center text-zinc-400">
        <span className="font-medium text-white">{feature}</span> ist nur im{' '}
        <span className="font-medium capitalize text-violet-400">
          {tierLabel}
        </span>{' '}
        Plan verfuegbar.
      </p>

      <a
        href="/pricing"
        className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition-colors hover:bg-violet-700"
      >
        Jetzt upgraden
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </a>
    </div>
  )
}

// =====================================================
// PUBLIC ONLY ROUTE (redirect if logged in)
// =====================================================

interface PublicOnlyRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function PublicOnlyRoute({
  children,
  redirectTo = '/dashboard',
}: PublicOnlyRouteProps) {
  const { user, loading, initialized } = useAuth()
  const location = useLocation()

  // Wait for auth initialization
  if (!initialized || loading) {
    return <LoadingScreen />
  }

  // Already logged in - redirect
  if (user) {
    // Redirect to the page they tried to visit, or dashboard
    const from = (location.state as { from?: Location })?.from?.pathname
    return <Navigate to={from || redirectTo} replace />
  }

  return <>{children}</>
}

// =====================================================
// ADMIN ROUTE (requires admin role)
// =====================================================

import { useQuery } from '@tanstack/react-query'
import { api } from '@src/lib/api'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading, initialized, session } = useAuth()
  const location = useLocation()

  // Fetch user profile to check role
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile-role'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; profile: { role: string } }>(
        '/api/admin/profile'
      )
      return response.profile
    },
    enabled: !!session,
  })

  // Wait for auth initialization
  if (!initialized || authLoading || profileLoading) {
    return <LoadingScreen />
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Not an admin - redirect to dashboard
  if (!profileData || profileData.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// =====================================================
// EXPORTS
// =====================================================

export default ProtectedRoute
