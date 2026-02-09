# Phase 1.5 - AuthContext implementieren

## Ziel
Vollständiges Authentifizierungs-System mit Session-Management, OAuth Social Login, Email-Verifizierung, Passwort-Reset und Subscription-Management.

## Geschätzte Dauer
4-5 Stunden

---

## Übersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTH SYSTEM ARCHITEKTUR                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │   AuthContext    │    │ SubscriptionCtx  │    │  QueryClient  │ │
│  │  ─────────────   │    │  ─────────────   │    │  ───────────  │ │
│  │  • user          │───▶│  • subscription  │    │  • cache      │ │
│  │  • session       │    │  • tier          │    │  • mutations  │ │
│  │  • loading       │    │  • isActive      │    │               │ │
│  │  • signIn()      │    │  • canUseFeature │    │               │ │
│  │  • signUp()      │    │  • maxNiches     │    │               │ │
│  │  • signOut()     │    │  • maxProducts   │    │               │ │
│  │  • OAuth()       │    │                  │    │               │ │
│  └────────┬─────────┘    └────────┬─────────┘    └───────────────┘ │
│           │                       │                                  │
│           └───────────┬───────────┘                                  │
│                       ▼                                              │
│           ┌───────────────────────┐                                  │
│           │    Supabase Auth      │                                  │
│           │   (PKCE Flow)         │                                  │
│           └───────────────────────┘                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Auth Types definieren

### src/types/auth.ts

```typescript
import type { User, Session, AuthError, Provider } from '@supabase/supabase-js'

// Auth Context Types
export interface AuthContextType {
  // State
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean

  // Email/Password Auth
  signUp: (email: string, password: string, metadata?: UserMetadata) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>

  // Password Management
  resetPassword: (email: string) => Promise<AuthResult>
  updatePassword: (newPassword: string) => Promise<AuthResult>

  // Email Verification
  resendVerificationEmail: () => Promise<AuthResult>

  // OAuth
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>

  // Profile
  updateProfile: (updates: ProfileUpdates) => Promise<AuthResult>

  // Utils
  refreshSession: () => Promise<void>
}

export interface AuthResult {
  error: AuthError | null
  success: boolean
  message?: string
}

export type OAuthProvider = 'google' | 'apple'

export interface UserMetadata {
  full_name?: string
  avatar_url?: string
  phone?: string
}

export interface ProfileUpdates {
  full_name?: string
  avatar_url?: string
  email?: string
}

// Auth State Events
export type AuthEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'MFA_CHALLENGE_VERIFIED'

// Protected Route Types
export interface ProtectedRouteProps {
  children: React.ReactNode
  requireSubscription?: boolean
  requiredTier?: SubscriptionTier | SubscriptionTier[]
  fallback?: React.ReactNode
}

// Subscription Types
export type SubscriptionTier = 'basis' | 'premium' | 'vip'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete'

export interface Subscription {
  id: string
  user_id: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionContextType {
  subscription: Subscription | null
  loading: boolean
  tier: SubscriptionTier | null
  isActive: boolean
  isPastDue: boolean
  daysUntilRenewal: number | null
  canUseFeature: (feature: FeatureKey) => boolean
  maxNiches: number
  maxProducts: number
  refetch: () => Promise<void>
}

export type FeatureKey =
  | 'winnerScaling'
  | 'advancedAnalytics'
  | 'multiPlatform'
  | 'allPlatforms'
  | 'prioritySupport'
  | 'oneOnOneSupport'
```

---

## 2. AuthContext erstellen

### src/contexts/AuthContext.tsx

```typescript
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@src/lib/supabase'
import { useUIStore } from '@src/lib/store'
import type {
  AuthContextType,
  AuthResult,
  OAuthProvider,
  UserMetadata,
  ProfileUpdates,
} from '@src/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // State
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Toast notifications
  const addToast = useUIStore((state) => state.addToast)

  // ─────────────────────────────────────────────────────────────
  // Session Initialization
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('[Auth] Error getting session:', error.message)
        }

        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          setInitialized(true)
          setLoading(false)
        }
      } catch (error) {
        console.error('[Auth] Initialization error:', error)
        if (mounted) {
          setInitialized(true)
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log('[Auth] State changed:', event, currentSession?.user?.email)

        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
          setLoading(false)

          // Handle specific events
          switch (event) {
            case 'SIGNED_IN':
              addToast?.({
                type: 'success',
                title: 'Angemeldet',
                message: 'Willkommen zurück!',
              })
              break

            case 'SIGNED_OUT':
              addToast?.({
                type: 'info',
                title: 'Abgemeldet',
                message: 'Du wurdest erfolgreich abgemeldet.',
              })
              break

            case 'PASSWORD_RECOVERY':
              addToast?.({
                type: 'info',
                title: 'Passwort zurücksetzen',
                message: 'Bitte setze ein neues Passwort.',
              })
              break

            case 'USER_UPDATED':
              addToast?.({
                type: 'success',
                title: 'Profil aktualisiert',
                message: 'Deine Änderungen wurden gespeichert.',
              })
              break
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [addToast])

  // ─────────────────────────────────────────────────────────────
  // Sign Up (Email/Password)
  // ─────────────────────────────────────────────────────────────

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: UserMetadata
  ): Promise<AuthResult> => {
    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`,
          data: metadata,
        },
      })

      if (error) {
        return {
          error,
          success: false,
          message: getAuthErrorMessage(error),
        }
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return {
          error: null,
          success: true,
          message: 'Bitte bestätige deine E-Mail-Adresse. Wir haben dir einen Link gesendet.',
        }
      }

      return { error: null, success: true }
    } catch (error) {
      console.error('[Auth] SignUp error:', error)
      return {
        error: error as AuthError,
        success: false,
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Sign In (Email/Password)
  // ─────────────────────────────────────────────────────────────

  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    try {
      setLoading(true)

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return {
          error,
          success: false,
          message: getAuthErrorMessage(error),
        }
      }

      return { error: null, success: true }
    } catch (error) {
      console.error('[Auth] SignIn error:', error)
      return {
        error: error as AuthError,
        success: false,
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Sign Out
  // ─────────────────────────────────────────────────────────────

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)

      // Clear any local state first
      setUser(null)
      setSession(null)

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[Auth] SignOut error:', error)
      }

      // Clear React Query cache on logout
      // queryClient.clear() // Will be handled in App.tsx
    } catch (error) {
      console.error('[Auth] SignOut error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Password Reset (Send Email)
  // ─────────────────────────────────────────────────────────────

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return {
          error,
          success: false,
          message: getAuthErrorMessage(error),
        }
      }

      return {
        error: null,
        success: true,
        message: 'Falls ein Konto mit dieser E-Mail existiert, erhältst du einen Link zum Zurücksetzen.',
      }
    } catch (error) {
      console.error('[Auth] ResetPassword error:', error)
      return {
        error: error as AuthError,
        success: false,
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      }
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Update Password (After Reset or Settings)
  // ─────────────────────────────────────────────────────────────

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        return {
          error,
          success: false,
          message: getAuthErrorMessage(error),
        }
      }

      return {
        error: null,
        success: true,
        message: 'Dein Passwort wurde erfolgreich aktualisiert.',
      }
    } catch (error) {
      console.error('[Auth] UpdatePassword error:', error)
      return {
        error: error as AuthError,
        success: false,
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      }
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Resend Verification Email
  // ─────────────────────────────────────────────────────────────

  const resendVerificationEmail = useCallback(async (): Promise<AuthResult> => {
    if (!user?.email) {
      return {
        error: null,
        success: false,
        message: 'Keine E-Mail-Adresse vorhanden.',
      }
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`,
        },
      })

      if (error) {
        return {
          error,
          success: false,
          message: getAuthErrorMessage(error),
        }
      }

      return {
        error: null,
        success: true,
        message: 'Bestätigungsmail wurde erneut gesendet.',
      }
    } catch (error) {
      console.error('[Auth] ResendVerification error:', error)
      return {
        error: error as AuthError,
        success: false,
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      }
    }
  }, [user?.email])

  // ─────────────────────────────────────────────────────────────
  // OAuth Sign In (Google, Apple)
  // ─────────────────────────────────────────────────────────────

  const signInWithOAuth = useCallback(async (provider: OAuthProvider): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
        },
      })

      if (error) {
        console.error('[Auth] OAuth error:', error)
        addToast?.({
          type: 'error',
          title: 'Anmeldung fehlgeschlagen',
          message: getAuthErrorMessage(error),
        })
      }
    } catch (error) {
      console.error('[Auth] OAuth error:', error)
      addToast?.({
        type: 'error',
        title: 'Anmeldung fehlgeschlagen',
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      })
    }
  }, [addToast])

  // ─────────────────────────────────────────────────────────────
  // Update Profile
  // ─────────────────────────────────────────────────────────────

  const updateProfile = useCallback(async (updates: ProfileUpdates): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: updates.email,
        data: {
          full_name: updates.full_name,
          avatar_url: updates.avatar_url,
        },
      })

      if (error) {
        return {
          error,
          success: false,
          message: getAuthErrorMessage(error),
        }
      }

      return {
        error: null,
        success: true,
        message: updates.email
          ? 'Bestätigungsmail an neue Adresse gesendet.'
          : 'Profil erfolgreich aktualisiert.',
      }
    } catch (error) {
      console.error('[Auth] UpdateProfile error:', error)
      return {
        error: error as AuthError,
        success: false,
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      }
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Refresh Session
  // ─────────────────────────────────────────────────────────────

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('[Auth] Session refresh error:', error)
        // If refresh fails, sign out
        await signOut()
      } else if (newSession) {
        setSession(newSession)
        setUser(newSession.user)
      }
    } catch (error) {
      console.error('[Auth] Session refresh error:', error)
    }
  }, [signOut])

  // ─────────────────────────────────────────────────────────────
  // Context Value (Memoized)
  // ─────────────────────────────────────────────────────────────

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading,
    initialized,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
    signInWithOAuth,
    updateProfile,
    refreshSession,
  }), [
    user,
    session,
    loading,
    initialized,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
    signInWithOAuth,
    updateProfile,
    refreshSession,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────
// useAuth Hook
// ─────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

// ─────────────────────────────────────────────────────────────
// Helper: Auth Error Messages (German)
// ─────────────────────────────────────────────────────────────

function getAuthErrorMessage(error: AuthError): string {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'Ungültige E-Mail oder Passwort.',
    'Email not confirmed': 'Bitte bestätige deine E-Mail-Adresse.',
    'User already registered': 'Diese E-Mail ist bereits registriert.',
    'Password should be at least 6 characters': 'Passwort muss mindestens 6 Zeichen haben.',
    'Password should be at least 8 characters': 'Passwort muss mindestens 8 Zeichen haben.',
    'Email rate limit exceeded': 'Zu viele Anfragen. Bitte warte einen Moment.',
    'Invalid email': 'Bitte gib eine gültige E-Mail-Adresse ein.',
    'Signup requires a valid password': 'Bitte gib ein gültiges Passwort ein.',
    'Token has expired or is invalid': 'Der Link ist abgelaufen. Bitte fordere einen neuen an.',
    'New password should be different from the old password': 'Das neue Passwort muss sich vom alten unterscheiden.',
  }

  return errorMessages[error.message] || error.message || 'Ein Fehler ist aufgetreten.'
}
```

---

## 3. SubscriptionContext erstellen

### src/contexts/SubscriptionContext.tsx

```typescript
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { supabase } from '@src/lib/supabase'
import { useAuth } from './AuthContext'
import { SUBSCRIPTION_TIERS } from '@src/lib/constants'
import type {
  Subscription,
  SubscriptionContextType,
  SubscriptionTier,
  FeatureKey,
} from '@src/types/auth'

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

// Feature Access Rules
const FEATURE_ACCESS: Record<FeatureKey, (tier: SubscriptionTier) => boolean> = {
  winnerScaling: (tier) => tier !== 'basis',
  advancedAnalytics: (tier) => tier === 'vip',
  multiPlatform: (tier) => tier !== 'basis',
  allPlatforms: (tier) => tier === 'vip',
  prioritySupport: (tier) => tier !== 'basis',
  oneOnOneSupport: (tier) => tier === 'vip',
}

interface SubscriptionProviderProps {
  children: ReactNode
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  // ─────────────────────────────────────────────────────────────
  // Fetch Subscription
  // ─────────────────────────────────────────────────────────────

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('pod_autom_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('[Subscription] Fetch error:', error)
        setSubscription(null)
      } else {
        setSubscription(data)
      }
    } catch (error) {
      console.error('[Subscription] Unexpected error:', error)
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchSubscription()

    // Subscribe to realtime changes
    if (!user) return

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pod_autom_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Subscription] Realtime update:', payload)
          if (payload.eventType === 'DELETE') {
            setSubscription(null)
          } else {
            setSubscription(payload.new as Subscription)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchSubscription])

  // ─────────────────────────────────────────────────────────────
  // Computed Values
  // ─────────────────────────────────────────────────────────────

  const tier = subscription?.tier ?? null
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'
  const isPastDue = subscription?.status === 'past_due'

  // Calculate days until renewal
  const daysUntilRenewal = useMemo(() => {
    if (!subscription?.current_period_end) return null

    const endDate = new Date(subscription.current_period_end)
    const now = new Date()
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays > 0 ? diffDays : 0
  }, [subscription?.current_period_end])

  // Feature access check
  const canUseFeature = useCallback((feature: FeatureKey): boolean => {
    if (!tier || !isActive) return false
    return FEATURE_ACCESS[feature](tier)
  }, [tier, isActive])

  // Resource limits
  const maxNiches = tier ? SUBSCRIPTION_TIERS[tier].maxNiches : 0
  const maxProducts = tier ? SUBSCRIPTION_TIERS[tier].maxProducts : 0

  // ─────────────────────────────────────────────────────────────
  // Context Value
  // ─────────────────────────────────────────────────────────────

  const value = useMemo<SubscriptionContextType>(() => ({
    subscription,
    loading,
    tier,
    isActive,
    isPastDue,
    daysUntilRenewal,
    canUseFeature,
    maxNiches,
    maxProducts,
    refetch: fetchSubscription,
  }), [
    subscription,
    loading,
    tier,
    isActive,
    isPastDue,
    daysUntilRenewal,
    canUseFeature,
    maxNiches,
    maxProducts,
    fetchSubscription,
  ])

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────
// useSubscription Hook
// ─────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext)

  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }

  return context
}
```

---

## 4. ProtectedRoute Komponente

### src/components/ProtectedRoute.tsx

```typescript
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { ROUTES } from '@src/lib/constants'
import { Loader2 } from 'lucide-react'
import type { ProtectedRouteProps, SubscriptionTier } from '@src/types/auth'

export function ProtectedRoute({
  children,
  requireSubscription = false,
  requiredTier,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading: authLoading, initialized } = useAuth()
  const { tier, isActive, loading: subLoading } = useSubscription()
  const location = useLocation()

  // Show loading while auth is initializing
  if (!initialized || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-zinc-400">Laden...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  // Show loading while subscription is loading (only if subscription check needed)
  if ((requireSubscription || requiredTier) && subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-zinc-400">Abo wird geprüft...</p>
        </div>
      </div>
    )
  }

  // Check subscription requirement
  if (requireSubscription && !isActive) {
    if (fallback) {
      return <>{fallback}</>
    }
    return <Navigate to={ROUTES.SETTINGS} state={{ upgradeRequired: true }} replace />
  }

  // Check tier requirement
  if (requiredTier && tier) {
    const requiredTiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier]
    const tierOrder: Record<SubscriptionTier, number> = {
      basis: 1,
      premium: 2,
      vip: 3,
    }

    const userTierLevel = tierOrder[tier]
    const minRequiredLevel = Math.min(...requiredTiers.map(t => tierOrder[t]))

    if (userTierLevel < minRequiredLevel) {
      if (fallback) {
        return <>{fallback}</>
      }
      return <Navigate to={ROUTES.SETTINGS} state={{ upgradeRequired: true, requiredTier }} replace />
    }
  }

  return <>{children}</>
}

// ─────────────────────────────────────────────────────────────
// PublicOnlyRoute (Redirect if already logged in)
// ─────────────────────────────────────────────────────────────

interface PublicOnlyRouteProps {
  children: React.ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { user, loading, initialized } = useAuth()
  const location = useLocation()

  // Show loading while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // Redirect to dashboard if already authenticated
  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname || ROUTES.DASHBOARD
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}
```

---

## 5. OAuth Callback Handler

### src/pages/AuthCallback.tsx

```typescript
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@src/lib/supabase'
import { ROUTES } from '@src/lib/constants'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

type CallbackStatus = 'loading' | 'success' | 'error'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<CallbackStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL (PKCE flow)
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // Handle OAuth error
        if (errorParam) {
          setStatus('error')
          setErrorMessage(errorDescription || 'Authentifizierung fehlgeschlagen')
          return
        }

        if (!code) {
          // No code, check if we already have a session
          const { data: { session } } = await supabase.auth.getSession()

          if (session) {
            setStatus('success')
            setTimeout(() => navigate(ROUTES.DASHBOARD, { replace: true }), 1000)
          } else {
            setStatus('error')
            setErrorMessage('Kein Authentifizierungscode gefunden')
          }
          return
        }

        // Exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          setStatus('error')
          setErrorMessage(error.message)
          return
        }

        setStatus('success')

        // Check if this is a new user (needs onboarding)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Check if user has completed onboarding
          const { data: shops } = await supabase
            .from('pod_autom_shops')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

          const hasShops = shops && shops.length > 0

          setTimeout(() => {
            navigate(hasShops ? ROUTES.DASHBOARD : ROUTES.ONBOARDING, { replace: true })
          }, 1000)
        }
      } catch (error) {
        console.error('[AuthCallback] Error:', error)
        setStatus('error')
        setErrorMessage('Ein unerwarteter Fehler ist aufgetreten')
      }
    }

    handleCallback()
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Anmeldung wird verarbeitet...</h1>
            <p className="text-zinc-400">Bitte warte einen Moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Erfolgreich angemeldet!</h1>
            <p className="text-zinc-400">Du wirst weitergeleitet...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Anmeldung fehlgeschlagen</h1>
            <p className="text-zinc-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => navigate(ROUTES.LOGIN)}
              className="btn-primary"
            >
              Zurück zur Anmeldung
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

---

## 6. Reset Password Page

### src/pages/ResetPassword.tsx

```typescript
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { supabase } from '@src/lib/supabase'
import { ROUTES } from '@src/lib/constants'
import { Zap, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { validatePassword, getPasswordStrength } from '@src/lib/validation'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  // Check if user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)

      if (!session) {
        setError('Ungültiger oder abgelaufener Link. Bitte fordere einen neuen an.')
      }
    }

    checkSession()
  }, [])

  const passwordStrength = getPasswordStrength(password)
  const passwordValidation = validatePassword(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.')
      return
    }

    // Validate password strength
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0])
      return
    }

    setLoading(true)

    try {
      const result = await updatePassword(password)

      if (!result.success) {
        setError(result.message || 'Passwort konnte nicht aktualisiert werden.')
        return
      }

      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate(ROUTES.DASHBOARD, { replace: true })
      }, 2000)
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten.')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (hasSession === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Zap className="w-10 h-10 text-primary" />
          <span className="text-2xl font-bold">POD AutoM</span>
        </Link>

        <div className="card">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Passwort aktualisiert!</h1>
              <p className="text-zinc-400">
                Du wirst zum Dashboard weitergeleitet...
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">
                Neues Passwort setzen
              </h1>
              <p className="text-zinc-400 text-center mb-6">
                Wähle ein sicheres Passwort für dein Konto.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Neues Passwort
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pr-12"
                      placeholder="Mindestens 8 Zeichen"
                      required
                      disabled={!hasSession || loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              level <= passwordStrength.score
                                ? passwordStrength.color
                                : 'bg-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${passwordStrength.color.replace('bg-', 'text-')}`}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                    Passwort bestätigen
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="Passwort wiederholen"
                    required
                    disabled={!hasSession || loading}
                    autoComplete="new-password"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!hasSession || loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Wird aktualisiert...
                    </>
                  ) : (
                    'Passwort aktualisieren'
                  )}
                </button>
              </form>

              {!hasSession && (
                <div className="mt-6 text-center">
                  <Link to={ROUTES.FORGOT_PASSWORD} className="text-primary hover:underline">
                    Neuen Reset-Link anfordern
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 7. App.tsx (Vollständig)

### src/App.tsx

```typescript
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider, useAuth } from '@src/contexts/AuthContext'
import { SubscriptionProvider } from '@src/contexts/SubscriptionContext'
import { ProtectedRoute, PublicOnlyRoute } from '@src/components/ProtectedRoute'
import { ROUTES } from '@src/lib/constants'
import { Loader2 } from 'lucide-react'
import Toast from '@src/components/ui/Toast'

// ─────────────────────────────────────────────────────────────
// Lazy Loaded Pages
// ─────────────────────────────────────────────────────────────

const Landing = lazy(() => import('@src/pages/Landing'))
const Login = lazy(() => import('@src/pages/Login'))
const Register = lazy(() => import('@src/pages/Register'))
const ForgotPassword = lazy(() => import('@src/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@src/pages/ResetPassword'))
const AuthCallback = lazy(() => import('@src/pages/AuthCallback'))
const Catalog = lazy(() => import('@src/pages/Catalog'))
const Onboarding = lazy(() => import('@src/pages/Onboarding'))
const Dashboard = lazy(() => import('@src/pages/Dashboard'))
const Settings = lazy(() => import('@src/pages/Settings'))

// ─────────────────────────────────────────────────────────────
// Query Client Configuration
// ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: import.meta.env.PROD,
    },
    mutations: {
      retry: 0,
    },
  },
})

// ─────────────────────────────────────────────────────────────
// Loading Fallback
// ─────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-zinc-400">Laden...</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Scroll to Top on Route Change
// ─────────────────────────────────────────────────────────────

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return null
}

// ─────────────────────────────────────────────────────────────
// Query Cache Invalidation on Auth Change
// ─────────────────────────────────────────────────────────────

function QueryCacheManager() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      // Clear all queries when user logs out
      queryClient.clear()
    }
  }, [user])

  return null
}

// ─────────────────────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <QueryCacheManager />

      <Routes>
        {/* Public Routes */}
        <Route path={ROUTES.HOME} element={<Landing />} />
        <Route path={ROUTES.CATALOG} element={<Catalog />} />

        {/* Auth Routes (redirect if logged in) */}
        <Route
          path={ROUTES.LOGIN}
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path={ROUTES.REGISTER}
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
        <Route path={ROUTES.AUTH_CALLBACK} element={<AuthCallback />} />

        {/* Protected Routes */}
        <Route
          path={ROUTES.ONBOARDING}
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute requireSubscription>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${ROUTES.DASHBOARD}/*`}
          element={
            <ProtectedRoute requireSubscription>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.SETTINGS}
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toast />
          </BrowserRouter>
        </SubscriptionProvider>
      </AuthProvider>

      {/* React Query Devtools (nur in Development) */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
```

---

## 8. main.tsx

### src/main.tsx

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './animations.css'

// Performance monitoring (optional)
if (import.meta.env.PROD) {
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    onCLS(console.log)
    onFID(console.log)
    onFCP(console.log)
    onLCP(console.log)
    onTTFB(console.log)
  })
}

// Render App
const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

---

## 9. Password Validation Utility (Ergänzung zu Phase 1.3)

### src/lib/validation.ts (Ergänzung)

```typescript
// Password strength calculation
export function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++

  // Normalize to 1-4 scale
  score = Math.min(4, Math.max(1, Math.ceil(score * 0.8)))

  const labels: Record<number, { label: string; color: string }> = {
    1: { label: 'Schwach', color: 'bg-red-500' },
    2: { label: 'Mittel', color: 'bg-amber-500' },
    3: { label: 'Gut', color: 'bg-emerald-500' },
    4: { label: 'Stark', color: 'bg-emerald-500' },
  }

  return { score, ...labels[score] }
}

export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Mindestens 8 Zeichen erforderlich')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Mindestens ein Kleinbuchstabe erforderlich')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Mindestens ein Großbuchstabe erforderlich')
  }

  if (!/\d/.test(password)) {
    errors.push('Mindestens eine Zahl erforderlich')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
```

---

## 10. Constants Update

### src/lib/constants.ts (Ergänzung)

```typescript
// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  AUTH_CALLBACK: '/auth/callback',
  CATALOG: '/katalog',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
} as const

export type RouteKey = keyof typeof ROUTES
```

---

## Supabase Email Templates (Dashboard Konfiguration)

Diese Templates müssen im Supabase Dashboard unter Authentication → Email Templates konfiguriert werden:

### Confirm Signup Email
```html
<h2>Willkommen bei POD AutoM!</h2>
<p>Klicke auf den Button um deine E-Mail-Adresse zu bestätigen:</p>
<a href="{{ .ConfirmationURL }}" style="
  display: inline-block;
  background: #8b5cf6;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
">E-Mail bestätigen</a>
<p style="margin-top: 24px; color: #71717a; font-size: 14px;">
  Der Link ist 24 Stunden gültig.
</p>
```

### Reset Password Email
```html
<h2>Passwort zurücksetzen</h2>
<p>Du hast eine Passwort-Zurücksetzung angefordert. Klicke auf den Button:</p>
<a href="{{ .ConfirmationURL }}" style="
  display: inline-block;
  background: #8b5cf6;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
">Neues Passwort setzen</a>
<p style="margin-top: 24px; color: #71717a; font-size: 14px;">
  Falls du dies nicht angefordert hast, ignoriere diese E-Mail.
  Der Link ist 1 Stunde gültig.
</p>
```

### Magic Link Email
```html
<h2>Anmeldung bei POD AutoM</h2>
<p>Klicke auf den Button um dich anzumelden:</p>
<a href="{{ .ConfirmationURL }}" style="
  display: inline-block;
  background: #8b5cf6;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
">Jetzt anmelden</a>
<p style="margin-top: 24px; color: #71717a; font-size: 14px;">
  Der Link ist 1 Stunde gültig.
</p>
```

---

## Supabase OAuth Provider Setup

### Google OAuth
1. Google Cloud Console → APIs & Services → Credentials
2. OAuth 2.0 Client ID erstellen
3. Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
4. Im Supabase Dashboard: Authentication → Providers → Google aktivieren

### Apple OAuth
1. Apple Developer Account → Certificates, Identifiers & Profiles
2. Sign in with Apple aktivieren
3. Service ID erstellen
4. Im Supabase Dashboard: Authentication → Providers → Apple aktivieren

---

## Datei-Struktur

```
src/
├── contexts/
│   ├── AuthContext.tsx          # NEU (komplett überarbeitet)
│   └── SubscriptionContext.tsx  # NEU (komplett überarbeitet)
│
├── components/
│   └── ProtectedRoute.tsx       # NEU (erweitert mit PublicOnlyRoute)
│
├── pages/
│   ├── AuthCallback.tsx         # NEU
│   ├── ResetPassword.tsx        # NEU
│   └── ... (andere Pages)
│
├── types/
│   └── auth.ts                  # NEU
│
├── lib/
│   ├── constants.ts             # Erweitert mit ROUTES
│   └── validation.ts            # Erweitert mit Password Validation
│
├── App.tsx                      # NEU (komplett überarbeitet)
└── main.tsx                     # NEU (mit Web Vitals)
```

---

## Verifizierung

### Auth System
- [ ] AuthProvider wrappiert App korrekt
- [ ] useAuth Hook funktioniert
- [ ] signUp sendet Bestätigungsmail
- [ ] signIn funktioniert mit korrekten Credentials
- [ ] signIn zeigt Fehler bei falschen Credentials
- [ ] signOut löscht Session und Cache
- [ ] resetPassword sendet E-Mail
- [ ] updatePassword funktioniert nach Reset
- [ ] OAuth Login (Google) funktioniert
- [ ] OAuth Login (Apple) funktioniert
- [ ] Session wird über Refreshes persistiert
- [ ] Token wird automatisch refreshed

### Route Protection
- [ ] ProtectedRoute leitet zu /login um
- [ ] PublicOnlyRoute leitet zu /dashboard um
- [ ] requireSubscription funktioniert
- [ ] requiredTier funktioniert
- [ ] Loading States werden angezeigt

### Subscription System
- [ ] SubscriptionContext lädt Daten
- [ ] Realtime Updates funktionieren
- [ ] canUseFeature prüft korrekt
- [ ] maxNiches/maxProducts stimmen
- [ ] daysUntilRenewal berechnet korrekt
- [ ] isPastDue Flag funktioniert

### UX
- [ ] Toast Notifications erscheinen
- [ ] Password Strength Indicator funktioniert
- [ ] Error Messages sind verständlich (Deutsch)
- [ ] Loading States sind konsistent

---

## Abhängigkeiten

- Phase 1.3 (Supabase Client, Store, Validation)
- Phase 1.4 (Datenbank-Tabellen: pod_autom_subscriptions)

---

## Nächster Schritt

→ Phase 1.6 - Landing Page mit Pricing
