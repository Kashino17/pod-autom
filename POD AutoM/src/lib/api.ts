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
export async function api<T = unknown>(
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
  
  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `API Error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Convenience methods
 */
export const apiClient = {
  get: <T>(endpoint: string, headers?: Record<string, string>) => 
    api<T>(endpoint, { method: 'GET', headers }),
  
  post: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    api<T>(endpoint, { method: 'POST', body, headers }),
  
  put: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    api<T>(endpoint, { method: 'PUT', body, headers }),
  
  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    api<T>(endpoint, { method: 'DELETE', headers }),
  
  patch: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    api<T>(endpoint, { method: 'PATCH', body, headers }),
};

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
