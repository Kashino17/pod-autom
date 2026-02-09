import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@src/lib/supabase'
import { useToastStore } from '@src/lib/store'
import type {
  AuthContextType,
  AuthResult,
  OAuthProvider,
  UserMetadata,
  ProfileUpdates,
  AuthEvent,
} from '@src/types/auth'

// =====================================================
// CONTEXT
// =====================================================

const AuthContext = createContext<AuthContextType | null>(null)

// =====================================================
// PROVIDER
// =====================================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // State
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Toast
  const addToast = useToastStore((state) => state.addToast)

  // =====================================================
  // INITIALIZE SESSION
  // =====================================================

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
        }

        setSession(initialSession)
        setUser(initialSession?.user ?? null)
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    }

    initSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: string, currentSession: Session | null) => {
        console.log('Auth state changed:', event)

        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setLoading(false)

        // Handle specific events
        handleAuthEvent(event as AuthEvent, currentSession)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // =====================================================
  // AUTH EVENT HANDLER
  // =====================================================

  const handleAuthEvent = (event: AuthEvent, _session: Session | null) => {
    switch (event) {
      case 'SIGNED_IN':
        addToast({
          type: 'success',
          title: 'Erfolgreich angemeldet',
          description: 'Willkommen zurueck!',
        })
        break
      case 'SIGNED_OUT':
        addToast({
          type: 'info',
          title: 'Abgemeldet',
          description: 'Du wurdest erfolgreich abgemeldet.',
        })
        break
      case 'PASSWORD_RECOVERY':
        addToast({
          type: 'info',
          title: 'Passwort zuruecksetzen',
          description: 'Du kannst jetzt dein neues Passwort eingeben.',
        })
        break
      case 'USER_UPDATED':
        addToast({
          type: 'success',
          title: 'Profil aktualisiert',
          description: 'Deine Aenderungen wurden gespeichert.',
        })
        break
    }
  }

  // =====================================================
  // AUTH METHODS
  // =====================================================

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata?: UserMetadata
    ): Promise<AuthResult> => {
      setLoading(true)
      try {
        const signUpOptions: {
          emailRedirectTo: string
          data?: Record<string, string>
        } = {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        }

        // Only add data if metadata is provided
        if (metadata) {
          signUpOptions.data = metadata as Record<string, string>
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: signUpOptions,
        })

        if (error) {
          return {
            error,
            success: false,
            message: getErrorMessage(error),
          }
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
          return {
            error: null,
            success: true,
            message:
              'Bitte bestaetigen deine E-Mail-Adresse um fortzufahren.',
          }
        }

        return {
          error: null,
          success: true,
          message: 'Registrierung erfolgreich!',
        }
      } catch (err) {
        const error = err as AuthError
        return {
          error,
          success: false,
          message: getErrorMessage(error),
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          return {
            error,
            success: false,
            message: getErrorMessage(error),
          }
        }

        return {
          error: null,
          success: true,
          message: 'Erfolgreich angemeldet!',
        }
      } catch (err) {
        const error = err as AuthError
        return {
          error,
          success: false,
          message: getErrorMessage(error),
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Sign out
   */
  const signOut = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        addToast({
          type: 'error',
          title: 'Fehler beim Abmelden',
          description: error.message,
        })
      }
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setLoading(false)
    }
  }, [addToast])

  /**
   * Reset password
   */
  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      setLoading(true)
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })

        if (error) {
          return {
            error,
            success: false,
            message: getErrorMessage(error),
          }
        }

        return {
          error: null,
          success: true,
          message:
            'Wenn diese E-Mail-Adresse existiert, haben wir dir einen Link zum Zuruecksetzen deines Passworts gesendet.',
        }
      } catch (err) {
        const error = err as AuthError
        return {
          error,
          success: false,
          message: getErrorMessage(error),
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Update password
   */
  const updatePassword = useCallback(
    async (newPassword: string): Promise<AuthResult> => {
      setLoading(true)
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        })

        if (error) {
          return {
            error,
            success: false,
            message: getErrorMessage(error),
          }
        }

        return {
          error: null,
          success: true,
          message: 'Passwort erfolgreich aktualisiert!',
        }
      } catch (err) {
        const error = err as AuthError
        return {
          error,
          success: false,
          message: getErrorMessage(error),
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Resend verification email
   */
  const resendVerificationEmail = useCallback(async (): Promise<AuthResult> => {
    if (!user?.email) {
      return {
        error: null,
        success: false,
        message: 'Keine E-Mail-Adresse gefunden.',
      }
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      })

      if (error) {
        return {
          error,
          success: false,
          message: getErrorMessage(error),
        }
      }

      return {
        error: null,
        success: true,
        message: 'Bestaetigungs-E-Mail wurde erneut gesendet!',
      }
    } catch (err) {
      const error = err as AuthError
      return {
        error,
        success: false,
        message: getErrorMessage(error),
      }
    } finally {
      setLoading(false)
    }
  }, [user?.email])

  /**
   * Sign in with OAuth provider
   */
  const signInWithOAuth = useCallback(
    async (provider: OAuthProvider): Promise<void> => {
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          addToast({
            type: 'error',
            title: 'OAuth Fehler',
            description: getErrorMessage(error),
          })
        }
      } catch (error) {
        console.error('OAuth error:', error)
        addToast({
          type: 'error',
          title: 'OAuth Fehler',
          description: 'Ein unerwarteter Fehler ist aufgetreten.',
        })
      } finally {
        setLoading(false)
      }
    },
    [addToast]
  )

  /**
   * Update user profile
   */
  const updateProfile = useCallback(
    async (updates: ProfileUpdates): Promise<AuthResult> => {
      setLoading(true)
      try {
        const updateData: { data?: Record<string, string>; email?: string } = {}

        // Handle metadata updates
        if (updates.full_name || updates.avatar_url) {
          updateData.data = {}
          if (updates.full_name) updateData.data.full_name = updates.full_name
          if (updates.avatar_url) updateData.data.avatar_url = updates.avatar_url
        }

        // Handle email update
        if (updates.email) {
          updateData.email = updates.email
        }

        const { error } = await supabase.auth.updateUser(updateData)

        if (error) {
          return {
            error,
            success: false,
            message: getErrorMessage(error),
          }
        }

        return {
          error: null,
          success: true,
          message: 'Profil erfolgreich aktualisiert!',
        }
      } catch (err) {
        const error = err as AuthError
        return {
          error,
          success: false,
          message: getErrorMessage(error),
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Refresh session
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Error refreshing session:', error)
      }
    } catch (error) {
      console.error('Refresh session error:', error)
    }
  }, [])

  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const value: AuthContextType = {
    // State
    user,
    session,
    loading,
    initialized,

    // Auth methods
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
    signInWithOAuth,
    updateProfile,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// =====================================================
// HOOK
// =====================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: AuthError): string {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'E-Mail oder Passwort ist falsch.',
    'Email not confirmed': 'Bitte bestaetigen deine E-Mail-Adresse.',
    'User already registered': 'Diese E-Mail-Adresse ist bereits registriert.',
    'Password should be at least 6 characters':
      'Das Passwort muss mindestens 6 Zeichen haben.',
    'Email rate limit exceeded':
      'Zu viele Anfragen. Bitte versuche es spaeter erneut.',
    'For security purposes, you can only request this once every 60 seconds':
      'Aus Sicherheitsgruenden kannst du dies nur alle 60 Sekunden anfordern.',
  }

  return errorMessages[error.message] || error.message
}

// =====================================================
// EXPORTS
// =====================================================

export { AuthContext }
export type { AuthContextType }
