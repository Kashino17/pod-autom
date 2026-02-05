/**
 * API Client for POD AutoM Backend
 * Handles all API requests with authentication.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Get the current auth token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { supabase } = await import('./supabase');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Make an authenticated API request
 */
async function apiFunction<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  const token = await getAuthToken();
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };
  
  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `API Error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Convenience methods - attached to api function
 */
const apiBase = apiFunction as typeof apiFunction & {
  get: <T>(endpoint: string, headers?: Record<string, string>) => Promise<T>;
  post: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) => Promise<T>;
  put: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) => Promise<T>;
  delete: <T>(endpoint: string, headers?: Record<string, string>) => Promise<T>;
  patch: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) => Promise<T>;
};

apiBase.get = <T>(endpoint: string, headers?: Record<string, string>) => 
  apiFunction<T>(endpoint, { method: 'GET', ...(headers && { headers }) });

apiBase.post = <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
  apiFunction<T>(endpoint, { method: 'POST', body, ...(headers && { headers }) });

apiBase.put = <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
  apiFunction<T>(endpoint, { method: 'PUT', body, ...(headers && { headers }) });

apiBase.delete = <T>(endpoint: string, headers?: Record<string, string>) =>
  apiFunction<T>(endpoint, { method: 'DELETE', ...(headers && { headers }) });

apiBase.patch = <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
  apiFunction<T>(endpoint, { method: 'PATCH', body, ...(headers && { headers }) });

// Create api alias for internal use and export
const api = apiBase;
export { api };
export const apiClient = apiBase;

// =====================================================
// SHOPIFY API
// =====================================================

export interface Shop {
  id: string;
  shop_domain: string;
  shop_name: string | null;
  connection_status: string;
  last_sync_at: string | null;
  created_at: string;
}

export const shopifyApi = {
  /**
   * Start Shopify OAuth flow
   */
  startOAuth: async (shopDomain: string) => {
    return api<{ success: boolean; auth_url: string; shop_domain: string }>(
      '/api/shopify/oauth/start',
      { method: 'POST', body: { shop_domain: shopDomain } }
    );
  },
  
  /**
   * Get connected shops
   */
  getShops: async () => {
    return api<{ success: boolean; shops: Shop[] }>('/api/shopify/shops');
  },
  
  /**
   * Disconnect a shop
   */
  disconnectShop: async (shopId: string) => {
    return api<{ success: boolean }>(`/api/shopify/shops/${shopId}`, { method: 'DELETE' });
  },
  
  /**
   * Trigger manual sync
   */
  syncShop: async (shopId: string) => {
    return api<{ success: boolean }>(`/api/shopify/shops/${shopId}/sync`, { method: 'POST' });
  },
};

// =====================================================
// GENERATION API
// =====================================================

export interface DesignResult {
  success: boolean;
  image_url?: string;
  prompt_used?: string;
  error?: string;
}

export const generationApi = {
  /**
   * Generate a design
   */
  generateDesign: async (niche: string, style?: string) => {
    return api<DesignResult>('/api/generate/design', {
      method: 'POST',
      body: { niche, style: style || 'minimalist' }
    });
  },
  
  /**
   * Generate a product title
   */
  generateTitle: async (niche: string, designDescription: string, productType?: string) => {
    return api<{ success: boolean; title: string }>('/api/generate/title', {
      method: 'POST',
      body: { 
        niche, 
        design_description: designDescription,
        product_type: productType || 'T-Shirt'
      }
    });
  },
  
  /**
   * Generate a product description
   */
  generateDescription: async (niche: string, designDescription: string, productType?: string) => {
    return api<{ success: boolean; description: string }>('/api/generate/description', {
      method: 'POST',
      body: { 
        niche, 
        design_description: designDescription,
        product_type: productType || 'T-Shirt'
      }
    });
  },
  
  /**
   * Create a mockup
   */
  createMockup: async (designUrl: string, productType?: string, color?: string) => {
    return api<{ success: boolean; mockup_url: string }>('/api/generate/mockup', {
      method: 'POST',
      body: {
        design_url: designUrl,
        product_type: productType || 't-shirt',
        color: color || 'black'
      }
    });
  },
  
  /**
   * Generate a full product (design + mockup + title + description)
   */
  generateFullProduct: async (niche: string, productType?: string, style?: string) => {
    return api<{
      success: boolean;
      product: {
        design_url: string;
        mockup_url: string;
        title: string;
        description: string;
        tags: string[];
      }
    }>('/api/generate/full-product', {
      method: 'POST',
      body: { niche, product_type: productType, style }
    });
  },
};

// =====================================================
// DESIGNS API
// =====================================================

export interface Design {
  id: string;
  user_id: string;
  niche_id: string | null;
  template_id: string | null;
  prompt_used: string;
  final_prompt: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  image_path: string | null;
  slogan_text: string | null;
  language: string;
  status: 'pending' | 'generating' | 'ready' | 'failed' | 'archived';
  error_message: string | null;
  generation_model: string;
  generation_quality: string;
  variables_used: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  generated_at: string | null;
  updated_at: string;
}

export interface DesignStats {
  designs_generated: number;
  designs_failed: number;
  api_calls: number;
  date: string;
}

export interface PromptTemplate {
  id: string;
  user_id: string;
  niche_id: string | null;
  name: string;
  prompt_template: string;
  style_hints: string | null;
  variables: Record<string, string[]>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const designsApi = {
  /**
   * Get all designs for the current user
   */
  getDesigns: async (params?: { status?: string; niche_id?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.niche_id) query.set('niche_id', params.niche_id);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return api<{ designs: Design[]; total: number }>(`/api/designs${qs ? `?${qs}` : ''}`);
  },

  /**
   * Get generation stats
   */
  getStats: async (days?: number) => {
    return api<{ stats: DesignStats[] }>(`/api/designs/stats${days ? `?days=${days}` : ''}`);
  },

  /**
   * Archive a design (soft delete)
   */
  archiveDesign: async (designId: string) => {
    return api<{ success: boolean }>(`/api/designs/${designId}`, { method: 'DELETE' });
  },

  /**
   * Get download URL for a design
   */
  getDownloadUrl: async (designId: string) => {
    return api<{ download_url: string }>(`/api/designs/${designId}/download`);
  },

  /**
   * Get prompt templates
   */
  getTemplates: async (nicheId?: string) => {
    const qs = nicheId ? `?niche_id=${nicheId}` : '';
    return api<{ templates: PromptTemplate[] }>(`/api/designs/templates${qs}`);
  },

  /**
   * Create a prompt template
   */
  createTemplate: async (data: {
    name: string;
    prompt_template: string;
    niche_id?: string;
    style_hints?: string;
    variables?: Record<string, string[]>;
  }) => {
    return api<{ template: PromptTemplate }>('/api/designs/templates', {
      method: 'POST',
      body: data,
    });
  },

  /**
   * Update a prompt template
   */
  updateTemplate: async (templateId: string, data: Partial<PromptTemplate>) => {
    return api<{ template: PromptTemplate }>(`/api/designs/templates/${templateId}`, {
      method: 'PUT',
      body: data,
    });
  },

  /**
   * Delete a prompt template
   */
  deleteTemplate: async (templateId: string) => {
    return api<{ success: boolean }>(`/api/designs/templates/${templateId}`, {
      method: 'DELETE',
    });
  },
};

// =====================================================
// HEALTH CHECK
// =====================================================

export const healthApi = {
  check: async () => {
    return api<{ status: string; timestamp: string }>('/health');
  },
  
  ready: async () => {
    return api<{ status: string; checks: Record<string, boolean> }>('/health/ready');
  },
};

// Default export for backward compatibility
export default {
  get: apiClient.get,
  post: apiClient.post,
  put: apiClient.put,
  delete: apiClient.delete,
};
