# Phase 1.3 - Supabase Client einrichten

## Ziel
Konfiguration des Supabase Clients für Authentifizierung, Datenbankzugriff und Realtime-Funktionalität mit vollständiger TypeScript-Typisierung.

## Technische Anforderungen (Stand 2026)
- **@supabase/supabase-js**: 2.46+
- **Supabase CLI**: 1.200+ (für Typengenerierung)
- Bestehende Supabase-Instanz (gleiche wie ReBoss)

---

## Schritte

### 1. Supabase CLI installieren (falls nicht vorhanden)
```bash
# Global installieren
npm install -g supabase

# Oder als Dev-Dependency
npm install -D supabase
```

### 2. TypeScript-Typen generieren

**WICHTIG**: Die Typen sollten IMMER aus der Datenbank generiert werden, nicht manuell erstellt!

```bash
# Supabase CLI login (einmalig)
npx supabase login

# Typen generieren
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

# Oder mit npm script (package.json)
npm run db:types
```

### 3. src/lib/supabase.ts erstellen

```typescript
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
      storage: window.localStorage,
      storageKey: 'pod-autom-auth',
      flowType: 'pkce', // Sicherster Flow für SPAs
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
        data: metadata,
      },
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
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * Holt aktuelle Session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

/**
 * Sendet Email-Bestätigung erneut
 */
export async function resendVerificationEmail(email: string): Promise<AuthResult> {
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

/**
 * Subscribt zu Tabellenänderungen
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
  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table as string,
        filter,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as Database['public']['Tables'][T]['Row'] | null,
          old: payload.old as Database['public']['Tables'][T]['Row'] | null,
        })
      }
    )
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
export type CatalogProduct = Tables<'pod_autom_catalog'>
```

### 4. src/lib/api.ts erstellen (API Helper)

```typescript
import { supabase } from './supabase'
import type { Database } from './database.types'

type Tables = Database['public']['Tables']

// =====================================================
// GENERIC CRUD HELPERS
// =====================================================

interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: { column: string; ascending?: boolean }
}

/**
 * Generic Select mit Typisierung
 */
export async function select<T extends keyof Tables>(
  table: T,
  options?: QueryOptions & { filter?: Partial<Tables[T]['Row']> }
) {
  let query = supabase.from(table).select('*')

  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value)
      }
    })
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
    })
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 10) - 1)
  }

  const { data, error } = await query

  return { data: data as Tables[T]['Row'][] | null, error }
}

/**
 * Generic Insert
 */
export async function insert<T extends keyof Tables>(
  table: T,
  data: Tables[T]['Insert']
) {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data as never)
    .select()
    .single()

  return { data: result as Tables[T]['Row'] | null, error }
}

/**
 * Generic Update
 */
export async function update<T extends keyof Tables>(
  table: T,
  id: string,
  data: Tables[T]['Update']
) {
  const { data: result, error } = await supabase
    .from(table)
    .update(data as never)
    .eq('id', id)
    .select()
    .single()

  return { data: result as Tables[T]['Row'] | null, error }
}

/**
 * Generic Delete
 */
export async function remove<T extends keyof Tables>(table: T, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id)

  return { error }
}

// =====================================================
// POD AUTOM SPECIFIC HELPERS
// =====================================================

/**
 * Holt Subscription für User
 */
export async function getSubscription(userId: string) {
  const { data, error } = await supabase
    .from('pod_autom_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  return { subscription: data, error }
}

/**
 * Holt alle Shops eines Users
 */
export async function getShops(userId: string) {
  const { data, error } = await supabase
    .from('pod_autom_shops')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return { shops: data ?? [], error }
}

/**
 * Holt Shop mit Settings
 */
export async function getShopWithSettings(shopId: string) {
  const { data, error } = await supabase
    .from('pod_autom_shops')
    .select(`
      *,
      pod_autom_settings (*)
    `)
    .eq('id', shopId)
    .single()

  return { shop: data, error }
}

/**
 * Holt Niches für Settings
 */
export async function getNiches(settingsId: string) {
  const { data, error } = await supabase
    .from('pod_autom_niches')
    .select('*')
    .eq('settings_id', settingsId)
    .order('created_at', { ascending: true })

  return { niches: data ?? [], error }
}

/**
 * Holt Prompts für Settings
 */
export async function getPrompts(settingsId: string) {
  const { data, error } = await supabase
    .from('pod_autom_prompts')
    .select('*')
    .eq('settings_id', settingsId)
    .order('prompt_type', { ascending: true })

  return { prompts: data ?? [], error }
}

/**
 * Holt Katalog-Produkte
 */
export async function getCatalog() {
  const { data, error } = await supabase
    .from('pod_autom_catalog')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return { catalog: data ?? [], error }
}

/**
 * Zählt aktive Niches für Limit-Check
 */
export async function countActiveNiches(settingsId: string) {
  const { count, error } = await supabase
    .from('pod_autom_niches')
    .select('*', { count: 'exact', head: true })
    .eq('settings_id', settingsId)
    .eq('is_active', true)

  return { count: count ?? 0, error }
}
```

### 5. src/lib/store.ts erstellen (Zustand Store)

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// =====================================================
// UI STORE
// =====================================================

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean

  // Mobile
  mobileMenuOpen: boolean

  // Theme (für zukünftige Light-Mode Unterstützung)
  theme: 'dark' | 'light' | 'system'

  // Actions
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileMenuOpen: (open: boolean) => void
  setTheme: (theme: 'dark' | 'light' | 'system') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial State
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      theme: 'dark',

      // Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'pod-autom-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
)

// =====================================================
// APP STORE (mit Immer für komplexe State Updates)
// =====================================================

interface OnboardingData {
  shopDomain?: string
  selectedNiches: string[]
  prompts: {
    image?: string
    title?: string
    description?: string
  }
  adPlatforms: string[]
}

interface AppState {
  // Onboarding
  onboardingStep: number
  onboardingData: OnboardingData
  onboardingCompleted: boolean

  // Selected Shop (für Dashboard)
  selectedShopId: string | null

  // Actions
  setOnboardingStep: (step: number) => void
  updateOnboardingData: (data: Partial<OnboardingData>) => void
  resetOnboarding: () => void
  setOnboardingCompleted: (completed: boolean) => void
  setSelectedShopId: (id: string | null) => void
}

const initialOnboardingData: OnboardingData = {
  shopDomain: undefined,
  selectedNiches: [],
  prompts: {},
  adPlatforms: [],
}

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Initial State
      onboardingStep: 1,
      onboardingData: initialOnboardingData,
      onboardingCompleted: false,
      selectedShopId: null,

      // Actions
      setOnboardingStep: (step) =>
        set((state) => {
          state.onboardingStep = step
        }),

      updateOnboardingData: (data) =>
        set((state) => {
          state.onboardingData = { ...state.onboardingData, ...data }
        }),

      resetOnboarding: () =>
        set((state) => {
          state.onboardingStep = 1
          state.onboardingData = initialOnboardingData
        }),

      setOnboardingCompleted: (completed) =>
        set((state) => {
          state.onboardingCompleted = completed
        }),

      setSelectedShopId: (id) =>
        set((state) => {
          state.selectedShopId = id
        }),
    })),
    {
      name: 'pod-autom-app',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        onboardingCompleted: state.onboardingCompleted,
        selectedShopId: state.selectedShopId,
      }),
    }
  )
)

// =====================================================
// TOAST STORE (für Notifications)
// =====================================================

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    // Auto-remove after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),
}))
```

### 6. src/lib/constants.ts erstellen

```typescript
// =====================================================
// SUBSCRIPTION TIERS
// =====================================================

export const SUBSCRIPTION_TIERS = {
  basis: {
    name: 'Basis',
    price: 200,
    maxNiches: 5,
    maxProducts: 100,
    platforms: ['pinterest', 'meta'] as const, // Nur eine wählbar
    platformLimit: 1,
    winnerScaling: false,
    advancedAnalytics: false,
    support: 'email' as const,
    features: [
      'Pinterest ODER Meta Ads',
      '5 Nischen',
      '100 Produkte/Monat',
      'Basis Analytics',
      'E-Mail Support',
    ],
  },
  premium: {
    name: 'Premium',
    price: 500,
    maxNiches: 15,
    maxProducts: 500,
    platforms: ['pinterest', 'meta'] as const, // Beide nutzbar
    platformLimit: 2,
    winnerScaling: true,
    advancedAnalytics: false,
    support: 'priority' as const,
    features: [
      'Pinterest + Meta Ads',
      '15 Nischen',
      '500 Produkte/Monat',
      'Winner Scaling',
      'Priority Support',
    ],
  },
  vip: {
    name: 'VIP',
    price: 835,
    maxNiches: -1, // Unbegrenzt
    maxProducts: -1, // Unbegrenzt
    platforms: ['pinterest', 'meta', 'google', 'tiktok'] as const,
    platformLimit: -1, // Unbegrenzt
    winnerScaling: true,
    advancedAnalytics: true,
    support: '1:1' as const,
    features: [
      'Alle Plattformen',
      'Unbegrenzte Nischen',
      'Unbegrenzte Produkte',
      'Winner Scaling',
      'Advanced Analytics',
      '1:1 Support',
    ],
  },
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS
export type SubscriptionTierData = (typeof SUBSCRIPTION_TIERS)[SubscriptionTier]

// =====================================================
// ROUTES
// =====================================================

export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  AUTH_CALLBACK: '/auth/callback',
  CATALOG: '/katalog',
  IMPRESSUM: '/impressum',
  DATENSCHUTZ: '/datenschutz',
  AGB: '/agb',

  // Protected
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',

  // Dashboard Sub-Routes
  DASHBOARD_OVERVIEW: '/dashboard',
  DASHBOARD_NICHES: '/dashboard/niches',
  DASHBOARD_PROMPTS: '/dashboard/prompts',
  DASHBOARD_PRODUCTS: '/dashboard/products',
  DASHBOARD_CAMPAIGNS: '/dashboard/campaigns',
  DASHBOARD_ANALYTICS: '/dashboard/analytics',
  DASHBOARD_WINNER_SCALING: '/dashboard/winner-scaling',
} as const

// =====================================================
// API CONFIG
// =====================================================

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:3001'
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'POD AutoM'

// =====================================================
// GPT CONFIG
// =====================================================

export const GPT_IMAGE_QUALITY = ['LOW', 'MEDIUM', 'HIGH'] as const
export type GPTImageQuality = (typeof GPT_IMAGE_QUALITY)[number]

// =====================================================
// AD PLATFORMS
// =====================================================

export const AD_PLATFORMS = {
  pinterest: {
    name: 'Pinterest',
    icon: 'SiPinterest', // Icon name from simple-icons
    color: '#E60023',
    requiredTier: 'basis' as SubscriptionTier,
  },
  meta: {
    name: 'Meta (Facebook/Instagram)',
    icon: 'SiMeta',
    color: '#0082FB',
    requiredTier: 'basis' as SubscriptionTier,
  },
  google: {
    name: 'Google Ads',
    icon: 'SiGoogleads',
    color: '#4285F4',
    requiredTier: 'vip' as SubscriptionTier,
  },
  tiktok: {
    name: 'TikTok Ads',
    icon: 'SiTiktok',
    color: '#000000',
    requiredTier: 'vip' as SubscriptionTier,
  },
} as const

export type AdPlatform = keyof typeof AD_PLATFORMS

// =====================================================
// PROMPT TYPES
// =====================================================

export const PROMPT_TYPES = {
  image: {
    name: 'Bild-Prompt',
    description: 'Prompt für die KI-Bilderstellung',
    placeholder: 'Erstelle ein minimalistisches Design für...',
  },
  title: {
    name: 'Titel-Prompt',
    description: 'Prompt für Produkttitel-Generierung',
    placeholder: 'Erstelle einen SEO-optimierten Titel für...',
  },
  description: {
    name: 'Beschreibungs-Prompt',
    description: 'Prompt für Produktbeschreibungen',
    placeholder: 'Erstelle eine verkaufsstarke Beschreibung für...',
  },
} as const

export type PromptType = keyof typeof PROMPT_TYPES

// =====================================================
// SHOP CONNECTION STATUS
// =====================================================

export const CONNECTION_STATUS = {
  connected: {
    label: 'Verbunden',
    color: 'success',
  },
  disconnected: {
    label: 'Nicht verbunden',
    color: 'neutral',
  },
  error: {
    label: 'Fehler',
    color: 'error',
  },
} as const

// =====================================================
// VALIDATION
// =====================================================

export const VALIDATION = {
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
  },
  niche: {
    minLength: 2,
    maxLength: 50,
  },
  prompt: {
    minLength: 10,
    maxLength: 2000,
  },
} as const

// =====================================================
// DATE/TIME FORMATS
// =====================================================

export const DATE_FORMAT = 'dd.MM.yyyy'
export const TIME_FORMAT = 'HH:mm'
export const DATETIME_FORMAT = 'dd.MM.yyyy HH:mm'
export const LOCALE = 'de-DE'
export const TIMEZONE = 'Europe/Berlin'

// =====================================================
// PAGINATION
// =====================================================

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
```

### 7. src/utils/format.ts erstellen

```typescript
import { LOCALE, TIMEZONE } from '@lib/constants'

/**
 * Formatiert Preis in Euro
 */
export function formatPrice(
  amount: number,
  options?: { minimumFractionDigits?: number }
): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
  }).format(amount)
}

/**
 * Formatiert Zahl mit Tausender-Trennzeichen
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat(LOCALE).format(num)
}

/**
 * Formatiert Datum
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE,
    ...options,
  }).format(d)
}

/**
 * Formatiert Datum relativ (z.B. "vor 2 Stunden")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second')
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return rtf.format(-diffInMinutes, 'minute')
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return rtf.format(-diffInHours, 'hour')
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return rtf.format(-diffInDays, 'day')
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  return rtf.format(-diffInMonths, 'month')
}

/**
 * Kürzt Text auf maximale Länge
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

/**
 * Formatiert Bytes in lesbare Größe
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}
```

### 8. src/utils/validation.ts erstellen

```typescript
import { VALIDATION } from '@lib/constants'

/**
 * Validiert Email-Format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validiert Passwort-Stärke
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const { minLength, requireUppercase, requireLowercase, requireNumber } =
    VALIDATION.password

  if (password.length < minLength) {
    errors.push(`Mindestens ${minLength} Zeichen`)
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Mindestens ein Großbuchstabe')
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Mindestens ein Kleinbuchstabe')
  }

  if (requireNumber && !/[0-9]/.test(password)) {
    errors.push('Mindestens eine Zahl')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validiert Shopify Domain
 */
export function isValidShopifyDomain(domain: string): boolean {
  // Akzeptiert: store.myshopify.com oder nur store
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9](\.myshopify\.com)?$/
  return domainRegex.test(domain)
}

/**
 * Normalisiert Shopify Domain
 */
export function normalizeShopifyDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim()

  // Entferne https:// oder http://
  normalized = normalized.replace(/^https?:\/\//, '')

  // Entferne trailing slash
  normalized = normalized.replace(/\/$/, '')

  // Füge .myshopify.com hinzu wenn nicht vorhanden
  if (!normalized.endsWith('.myshopify.com')) {
    normalized = `${normalized}.myshopify.com`
  }

  return normalized
}

/**
 * Validiert Niche-Name
 */
export function validateNicheName(name: string): {
  isValid: boolean
  error?: string
} {
  const { minLength, maxLength } = VALIDATION.niche

  if (name.length < minLength) {
    return { isValid: false, error: `Mindestens ${minLength} Zeichen` }
  }

  if (name.length > maxLength) {
    return { isValid: false, error: `Maximal ${maxLength} Zeichen` }
  }

  return { isValid: true }
}

/**
 * Validiert Prompt-Text
 */
export function validatePrompt(text: string): {
  isValid: boolean
  error?: string
} {
  const { minLength, maxLength } = VALIDATION.prompt

  if (text.length < minLength) {
    return { isValid: false, error: `Mindestens ${minLength} Zeichen` }
  }

  if (text.length > maxLength) {
    return { isValid: false, error: `Maximal ${maxLength} Zeichen` }
  }

  return { isValid: true }
}
```

### 9. Zusätzliche Dependencies installieren

```bash
# Immer für Zustand (immutable state updates)
npm install immer
```

---

## Verifizierung

### Supabase Connection Tests
- [ ] Supabase Client initialisiert ohne Fehler
- [ ] `getSession()` gibt Session oder null zurück
- [ ] Auth State Listener funktioniert

### Auth Tests
- [ ] `signUp` erstellt neuen User (prüfe in Supabase Dashboard)
- [ ] `signIn` meldet User an
- [ ] `signOut` meldet User ab
- [ ] `resetPassword` sendet Reset-Email
- [ ] Session wird im LocalStorage persistiert

### TypeScript Tests
- [ ] `database.types.ts` wurde generiert
- [ ] Alle Tabellen sind typisiert
- [ ] Keine TypeScript-Fehler in supabase.ts
- [ ] Autocomplete funktioniert für Tabellennamen

### Store Tests
- [ ] `useUIStore` persistiert sidebarCollapsed
- [ ] `useAppStore` persistiert selectedShopId
- [ ] `useToastStore` zeigt und entfernt Toasts

---

## Abhängigkeiten
- Phase 1.1 (Projekt Setup)
- Phase 1.4 (Datenbank-Tabellen müssen existieren für Typengenerierung)
- Supabase Projekt mit korrekten URL/Keys

## Geschätzte Dauer
- Erfahrener Entwickler: 30-45 Minuten
- Anfänger: 1-2 Stunden

## Nächster Schritt
→ Phase 1.4 - Datenbank-Tabellen erstellen
