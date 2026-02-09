import type { User, Session, AuthError } from '@supabase/supabase-js'

// Auth Context Types
export interface AuthContextType {
  // State
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean

  // Email/Password Auth
  signUp: (
    email: string,
    password: string,
    metadata?: UserMetadata
  ) => Promise<AuthResult>
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
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'incomplete'
  | 'paused'

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
