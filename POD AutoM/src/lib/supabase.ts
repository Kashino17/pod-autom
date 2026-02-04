import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

// Create Supabase Client
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'pod-autom-auth',
      flowType: 'pkce', // Sicherster Flow fuer SPAs
    },
    global: {
      headers: {
        'x-application': 'pod-autom',
      },
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

// =====================================================
// AUTH HELPERS
// =====================================================

export interface AuthResult<T = void> {
  data: T | null
  error: Error | null
}

/**
 * Registriert einen neuen Benutzer
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: { full_name?: string }
): Promise<AuthResult<{ userId: string }>> {
  try {
    const signUpOptions: {
      emailRedirectTo: string
      data?: { full_name?: string }
    } = {
      emailRedirectTo: `${window.location.origin}/verify-email`,
    }

    if (metadata) {
      signUpOptions.data = metadata
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: signUpOptions,
    })

    if (error) throw error

    return {
      data: data.user ? { userId: data.user.id } : null,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Meldet Benutzer mit Email/Passwort an
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Meldet Benutzer mit OAuth Provider an
 */
export async function signInWithOAuth(
  provider: 'google' | 'apple' | 'github'
): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) throw error

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Meldet Benutzer ab
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Sendet Passwort-Reset Email
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Aktualisiert das Passwort (nach Reset)
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Aktualisiert Benutzerprofil
 */
export async function updateProfile(data: {
  full_name?: string
  avatar_url?: string
}): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({
      data,
    })

    if (error) throw error

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Holt aktuellen Benutzer
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * Holt aktuelle Session
 */
export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  return { session, error }
}

/**
 * Sendet Email-Bestaetigung erneut
 */
export async function resendVerificationEmail(
  email: string
): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    })

    if (error) throw error

    return { data: null, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

// =====================================================
// REALTIME HELPERS
// =====================================================

interface RealtimePayload {
  eventType: string
  new: Record<string, unknown>
  old: Record<string, unknown>
}

/**
 * Subscribt zu Tabellenaenderungen
 */
export function subscribeToTable<T extends keyof Database['public']['Tables']>(
  table: T,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new: Database['public']['Tables'][T]['Row'] | null
    old: Database['public']['Tables'][T]['Row'] | null
  }) => void,
  filter?: string
) {
  const channelConfig = {
    event: '*' as const,
    schema: 'public' as const,
    table: table as string,
    filter,
  }

  const channel = supabase
    .channel(`${String(table)}_changes`)
    .on('postgres_changes' as never, channelConfig as never, ((
      payload: RealtimePayload
    ) => {
      callback({
        eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        new: payload.new as Database['public']['Tables'][T]['Row'] | null,
        old: payload.old as Database['public']['Tables'][T]['Row'] | null,
      })
    }) as never)
    .subscribe()

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}

// =====================================================
// TYPE EXPORTS
// =====================================================

// Re-export Database types for easy access
export type { Database }

// Convenience types for tables
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// Specific table types
export type Subscription = Tables<'pod_autom_subscriptions'>
export type Shop = Tables<'pod_autom_shops'>
export type Settings = Tables<'pod_autom_settings'>
export type Niche = Tables<'pod_autom_niches'>
export type Prompt = Tables<'pod_autom_prompts'>
export type Product = Tables<'pod_autom_products'>
export type AdPlatform = Tables<'pod_autom_ad_platforms'>
export type ActivityLog = Tables<'pod_autom_activity_log'>
export type CatalogProduct = Tables<'pod_autom_catalog'>
