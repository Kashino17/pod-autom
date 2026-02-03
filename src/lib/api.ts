import { supabase } from './supabase'
import type { Database } from './database.types'

type Tables = Database['public']['Tables']

// =====================================================
// HTTP API CLIENT (for backend API calls)
// =====================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * HTTP API client for backend requests
 */
export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const headers = await getAuthHeaders()
    const options: RequestInit = {
      method: 'POST',
      headers,
    }

    if (data !== undefined) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(`${API_URL}${endpoint}`, options)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  },

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const headers = await getAuthHeaders()
    const options: RequestInit = {
      method: 'PUT',
      headers,
    }

    if (data !== undefined) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(`${API_URL}${endpoint}`, options)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  },

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  },
}

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
    .eq('id' as never, id as never)
    .select()
    .single()

  return { data: result as Tables[T]['Row'] | null, error }
}

/**
 * Generic Delete
 */
export async function remove<T extends keyof Tables>(table: T, id: string) {
  const { error } = await supabase.from(table).delete().eq('id' as never, id as never)

  return { error }
}

// =====================================================
// POD AUTOM SPECIFIC HELPERS
// =====================================================

/**
 * Holt Subscription fuer User
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
    .select(
      `
      *,
      pod_autom_settings (*)
    `
    )
    .eq('id', shopId)
    .single()

  return { shop: data, error }
}

/**
 * Holt Niches fuer Settings
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
 * Holt Prompts fuer Settings
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
 * Zaehlt aktive Niches fuer Limit-Check
 */
export async function countActiveNiches(settingsId: string) {
  const { count, error } = await supabase
    .from('pod_autom_niches')
    .select('*', { count: 'exact', head: true })
    .eq('settings_id', settingsId)
    .eq('is_active', true)

  return { count: count ?? 0, error }
}
