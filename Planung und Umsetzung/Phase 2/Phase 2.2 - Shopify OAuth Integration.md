# Phase 2.2 - Shopify OAuth Integration

## Ziel
Sichere Shopify OAuth-Integration mit Token-Verschlüsselung, Webhook-Registrierung und Rate-Limiting.

## Geschätzte Dauer
6-8 Stunden

## Übersicht

### Features
- Shopify OAuth 2.0 Flow
- Token-Verschlüsselung (AES-256)
- Webhook-Registrierung für Orders/Products
- Shop-Verifizierung und Health-Check
- Rate-Limiting Handling
- Async Backend mit httpx
- "Verbindung testen" Funktion

---

## Backend Implementation

### 1. backend/api/routes/pod_autom.py
```python
from flask import Blueprint, request, redirect, jsonify
from functools import wraps
import httpx
import hashlib
import hmac
import os
import secrets
import asyncio
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from supabase import create_client

bp = Blueprint('pod_autom', __name__, url_prefix='/pod-autom')

# Supabase Client
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Shopify OAuth Config
SHOPIFY_API_KEY = os.getenv('SHOPIFY_API_KEY')
SHOPIFY_API_SECRET = os.getenv('SHOPIFY_API_SECRET')
FRONTEND_URL = os.getenv('POD_AUTOM_FRONTEND_URL', 'http://localhost:3001')
API_URL = os.getenv('API_URL')

# Shopify API Version - 2025-10 for 2026 compatibility
SHOPIFY_API_VERSION = '2025-10'

# Required Scopes for POD Business
SCOPES = ','.join([
    'read_products',
    'write_products',
    'read_orders',
    'read_analytics',
    'read_fulfillment_orders',
    'write_fulfillment_orders',
    'read_inventory',
    'write_inventory',
    'read_price_rules',
    'read_customers'
])

# Token Encryption Key (generate with: Fernet.generate_key())
ENCRYPTION_KEY = os.getenv('TOKEN_ENCRYPTION_KEY')
if ENCRYPTION_KEY:
    fernet = Fernet(ENCRYPTION_KEY.encode())
else:
    fernet = None
    print("WARNING: TOKEN_ENCRYPTION_KEY not set, tokens will not be encrypted")


def encrypt_token(token: str) -> str:
    """Encrypt access token for secure storage"""
    if fernet and token:
        return fernet.encrypt(token.encode()).decode()
    return token


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt access token for API calls"""
    if fernet and encrypted_token:
        try:
            return fernet.decrypt(encrypted_token.encode()).decode()
        except Exception:
            return encrypted_token
    return encrypted_token


def verify_jwt(f):
    """Decorator to verify Supabase JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing authorization header'}), 401

        token = auth_header.split(' ')[1]

        try:
            user = supabase.auth.get_user(token)
            request.user_id = user.user.id
        except Exception as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401

        return f(*args, **kwargs)

    return decorated


def verify_hmac(params: dict, hmac_value: str) -> bool:
    """Verify Shopify HMAC signature"""
    sorted_params = '&'.join(f"{k}={v}" for k, v in sorted(params.items()) if k != 'hmac')
    computed_hmac = hmac.new(
        SHOPIFY_API_SECRET.encode(),
        sorted_params.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed_hmac, hmac_value)


async def make_shopify_request(
    shop_domain: str,
    access_token: str,
    endpoint: str,
    method: str = 'GET',
    data: dict = None,
    max_retries: int = 3
) -> dict:
    """Make async Shopify API request with rate limiting and retries"""
    url = f"https://{shop_domain}/admin/api/{SHOPIFY_API_VERSION}/{endpoint}"
    headers = {
        'X-Shopify-Access-Token': decrypt_token(access_token),
        'Content-Type': 'application/json'
    }

    async with httpx.AsyncClient() as client:
        for attempt in range(max_retries):
            try:
                if method == 'GET':
                    response = await client.get(url, headers=headers, timeout=30.0)
                elif method == 'POST':
                    response = await client.post(url, headers=headers, json=data, timeout=30.0)
                elif method == 'PUT':
                    response = await client.put(url, headers=headers, json=data, timeout=30.0)
                elif method == 'DELETE':
                    response = await client.delete(url, headers=headers, timeout=30.0)

                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 2))
                    await asyncio.sleep(retry_after)
                    continue

                response.raise_for_status()
                return response.json()

            except httpx.HTTPStatusError as e:
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    return None


async def register_webhooks(shop_domain: str, access_token: str) -> list:
    """Register required webhooks for the shop"""
    webhook_topics = [
        'orders/create',
        'orders/updated',
        'orders/fulfilled',
        'products/create',
        'products/update',
        'products/delete',
        'app/uninstalled'
    ]

    callback_url = f"{API_URL}/pod-autom/webhooks"
    registered = []

    for topic in webhook_topics:
        try:
            result = await make_shopify_request(
                shop_domain,
                access_token,
                'webhooks.json',
                method='POST',
                data={
                    'webhook': {
                        'topic': topic,
                        'address': f"{callback_url}/{topic.replace('/', '-')}",
                        'format': 'json'
                    }
                }
            )
            if result:
                registered.append(topic)
        except Exception as e:
            print(f"Failed to register webhook {topic}: {e}")

    return registered


async def verify_shop_active(shop_domain: str, access_token: str) -> dict:
    """Verify shop is active and get shop info"""
    try:
        result = await make_shopify_request(
            shop_domain,
            access_token,
            'shop.json'
        )
        if result and 'shop' in result:
            shop = result['shop']
            return {
                'active': True,
                'name': shop.get('name'),
                'email': shop.get('email'),
                'currency': shop.get('currency'),
                'plan_name': shop.get('plan_name'),
                'domain': shop.get('domain'),
                'country': shop.get('country_name')
            }
    except Exception as e:
        print(f"Shop verification failed: {e}")

    return {'active': False}


# ================== API Routes ==================

@bp.route('/shopify/auth', methods=['GET'])
@verify_jwt
def shopify_auth():
    """Initiate Shopify OAuth flow"""
    shop = request.args.get('shop')

    if not shop:
        return jsonify({'error': 'Shop domain required'}), 400

    # Normalize shop domain
    shop = shop.strip().lower()
    if not shop.endswith('.myshopify.com'):
        shop = f"{shop}.myshopify.com"

    # Validate shop domain format
    if not shop.replace('.myshopify.com', '').replace('-', '').isalnum():
        return jsonify({'error': 'Invalid shop domain format'}), 400

    # Generate secure nonce
    nonce = secrets.token_urlsafe(32)

    # Store nonce with user_id and expiry
    supabase.table('pod_autom_oauth_states').insert({
        'user_id': request.user_id,
        'shop_domain': shop,
        'nonce': nonce,
        'created_at': datetime.utcnow().isoformat(),
        'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    }).execute()

    # Build OAuth URL
    redirect_uri = f"{API_URL}/pod-autom/shopify/callback"
    auth_url = (
        f"https://{shop}/admin/oauth/authorize"
        f"?client_id={SHOPIFY_API_KEY}"
        f"&scope={SCOPES}"
        f"&redirect_uri={redirect_uri}"
        f"&state={nonce}"
        f"&grant_options[]="  # Prevents offline access token expiry prompt
    )

    return jsonify({'auth_url': auth_url})


@bp.route('/shopify/callback', methods=['GET'])
def shopify_callback():
    """Handle Shopify OAuth callback"""
    shop = request.args.get('shop')
    code = request.args.get('code')
    state = request.args.get('state')
    hmac_param = request.args.get('hmac')

    # Validate required params
    if not all([shop, code, state]):
        return redirect(f"{FRONTEND_URL}/onboarding?error=missing_params")

    # Verify HMAC
    params = {k: v for k, v in request.args.items() if k != 'hmac'}
    if not verify_hmac(params, hmac_param):
        return redirect(f"{FRONTEND_URL}/onboarding?error=invalid_hmac")

    # Verify state/nonce
    state_result = supabase.table('pod_autom_oauth_states').select('*').eq(
        'nonce', state
    ).single().execute()

    if not state_result.data:
        return redirect(f"{FRONTEND_URL}/onboarding?error=invalid_state")

    # Check expiry
    expires_at = datetime.fromisoformat(state_result.data['expires_at'].replace('Z', ''))
    if datetime.utcnow() > expires_at:
        supabase.table('pod_autom_oauth_states').delete().eq('nonce', state).execute()
        return redirect(f"{FRONTEND_URL}/onboarding?error=state_expired")

    user_id = state_result.data['user_id']

    # Delete used state
    supabase.table('pod_autom_oauth_states').delete().eq('nonce', state).execute()

    # Exchange code for access token
    try:
        with httpx.Client() as client:
            token_response = client.post(
                f"https://{shop}/admin/oauth/access_token",
                json={
                    'client_id': SHOPIFY_API_KEY,
                    'client_secret': SHOPIFY_API_SECRET,
                    'code': code
                },
                timeout=30.0
            )
            token_response.raise_for_status()
            token_data = token_response.json()
    except Exception as e:
        print(f"Token exchange failed: {e}")
        return redirect(f"{FRONTEND_URL}/onboarding?error=token_exchange_failed")

    access_token = token_data.get('access_token')
    scope = token_data.get('scope', '')

    # Encrypt token for storage
    encrypted_token = encrypt_token(access_token)

    # Verify shop and get info
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        shop_info = loop.run_until_complete(verify_shop_active(shop, access_token))
    finally:
        loop.close()

    if not shop_info.get('active'):
        return redirect(f"{FRONTEND_URL}/onboarding?error=shop_inactive")

    # Save or update shop in database
    existing_shop = supabase.table('pod_autom_shops').select('id').eq(
        'user_id', user_id
    ).eq('shop_domain', shop).execute()

    if existing_shop.data:
        # Update existing shop
        supabase.table('pod_autom_shops').update({
            'access_token': encrypted_token,
            'connection_status': 'connected',
            'internal_name': shop_info.get('name', shop),
            'shop_currency': shop_info.get('currency'),
            'shop_country': shop_info.get('country'),
            'scopes': scope,
            'last_verified_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', existing_shop.data[0]['id']).execute()
        shop_id = existing_shop.data[0]['id']
    else:
        # Create new shop
        new_shop = supabase.table('pod_autom_shops').insert({
            'user_id': user_id,
            'shop_domain': shop,
            'access_token': encrypted_token,
            'connection_status': 'connected',
            'internal_name': shop_info.get('name', shop),
            'shop_currency': shop_info.get('currency'),
            'shop_country': shop_info.get('country'),
            'scopes': scope,
            'last_verified_at': datetime.utcnow().isoformat()
        }).execute()
        shop_id = new_shop.data[0]['id']

        # Create default settings for new shop
        supabase.table('pod_autom_settings').insert({
            'shop_id': shop_id,
            'enabled': True,
            'gpt_image_quality': 'HIGH',
            'creation_limit': 20,
            'auto_publish': True,
            'default_price': 29.99
        }).execute()

    # Register webhooks asynchronously
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        registered_webhooks = loop.run_until_complete(
            register_webhooks(shop, access_token)
        )
        # Save registered webhooks
        supabase.table('pod_autom_shops').update({
            'webhooks_registered': registered_webhooks
        }).eq('id', shop_id).execute()
    except Exception as e:
        print(f"Webhook registration failed: {e}")
    finally:
        loop.close()

    return redirect(f"{FRONTEND_URL}/onboarding?step=2&shop_connected=true")


@bp.route('/shops', methods=['GET'])
@verify_jwt
def get_shops():
    """Get all shops for current user"""
    result = supabase.table('pod_autom_shops').select(
        'id, shop_domain, internal_name, connection_status, shop_currency, '
        'shop_country, scopes, last_verified_at, created_at'
    ).eq('user_id', request.user_id).execute()

    return jsonify(result.data)


@bp.route('/shops/<shop_id>', methods=['GET'])
@verify_jwt
def get_shop(shop_id):
    """Get single shop with stats"""
    # Verify ownership
    shop = supabase.table('pod_autom_shops').select('*').eq(
        'id', shop_id
    ).eq('user_id', request.user_id).single().execute()

    if not shop.data:
        return jsonify({'error': 'Shop not found'}), 404

    # Get settings
    settings = supabase.table('pod_autom_settings').select('id').eq(
        'shop_id', shop_id
    ).single().execute()

    # Get counts
    niches_count = 0
    products_count = 0
    if settings.data:
        niches = supabase.table('pod_autom_niches').select(
            '*', count='exact'
        ).eq('settings_id', settings.data['id']).eq('is_active', True).execute()
        niches_count = niches.count or 0

    # Remove access token from response
    shop_data = {k: v for k, v in shop.data.items() if k != 'access_token'}
    shop_data['stats'] = {
        'active_niches': niches_count,
        'total_products': products_count
    }

    return jsonify(shop_data)


@bp.route('/shops/<shop_id>/test', methods=['POST'])
@verify_jwt
def test_shop_connection(shop_id):
    """Test shop connection and verify access token"""
    # Verify ownership
    shop = supabase.table('pod_autom_shops').select('*').eq(
        'id', shop_id
    ).eq('user_id', request.user_id).single().execute()

    if not shop.data:
        return jsonify({'error': 'Shop not found'}), 404

    # Test connection
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        shop_info = loop.run_until_complete(
            verify_shop_active(shop.data['shop_domain'], shop.data['access_token'])
        )
    finally:
        loop.close()

    if shop_info.get('active'):
        # Update last verified
        supabase.table('pod_autom_shops').update({
            'connection_status': 'connected',
            'last_verified_at': datetime.utcnow().isoformat()
        }).eq('id', shop_id).execute()

        return jsonify({
            'success': True,
            'shop_info': shop_info
        })
    else:
        # Mark as disconnected
        supabase.table('pod_autom_shops').update({
            'connection_status': 'error'
        }).eq('id', shop_id).execute()

        return jsonify({
            'success': False,
            'error': 'Connection test failed'
        }), 400


@bp.route('/shops/<shop_id>', methods=['DELETE'])
@verify_jwt
def delete_shop(shop_id):
    """Disconnect a shop"""
    # Verify ownership
    shop = supabase.table('pod_autom_shops').select('*').eq(
        'id', shop_id
    ).eq('user_id', request.user_id).single().execute()

    if not shop.data:
        return jsonify({'error': 'Shop not found'}), 404

    # Revoke access token (optional - Shopify API doesn't have revoke endpoint)
    # Instead, we just delete from our database

    # Delete shop (cascades to settings, niches, prompts via FK)
    supabase.table('pod_autom_shops').delete().eq('id', shop_id).execute()

    return jsonify({'success': True})


@bp.route('/webhooks/<topic>', methods=['POST'])
def handle_webhook(topic):
    """Handle incoming Shopify webhooks"""
    # Verify webhook signature
    hmac_header = request.headers.get('X-Shopify-Hmac-SHA256')
    if not hmac_header:
        return '', 401

    computed_hmac = hmac.new(
        SHOPIFY_API_SECRET.encode(),
        request.data,
        hashlib.sha256
    ).digest()

    import base64
    if not hmac.compare_digest(base64.b64encode(computed_hmac).decode(), hmac_header):
        return '', 401

    # Get shop domain from header
    shop_domain = request.headers.get('X-Shopify-Shop-Domain')

    # Process webhook based on topic
    topic = topic.replace('-', '/')
    data = request.json

    # Log webhook for debugging
    print(f"Webhook received: {topic} from {shop_domain}")

    # Handle specific topics
    if topic == 'app/uninstalled':
        # Mark shop as disconnected
        supabase.table('pod_autom_shops').update({
            'connection_status': 'disconnected',
            'access_token': None
        }).eq('shop_domain', shop_domain).execute()

    # Add more webhook handlers as needed

    return '', 200
```

### 2. OAuth States Tabelle (SQL - Aktualisiert)
```sql
-- Temporäre Tabelle für OAuth States mit Auto-Cleanup
CREATE TABLE IF NOT EXISTS pod_autom_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain VARCHAR(255) NOT NULL,
  nonce VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

CREATE INDEX idx_pod_autom_oauth_states_nonce ON pod_autom_oauth_states(nonce);
CREATE INDEX idx_pod_autom_oauth_states_expires ON pod_autom_oauth_states(expires_at);

-- Cleanup-Funktion für abgelaufene States
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM pod_autom_oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger für automatisches Cleanup (alle 5 Minuten via pg_cron)
-- Erfordert pg_cron Extension in Supabase
SELECT cron.schedule(
  'cleanup-oauth-states',
  '*/5 * * * *',
  $$SELECT cleanup_expired_oauth_states()$$
);
```

### 3. Shops Tabelle (SQL - Erweitert)
```sql
-- Erweiterte Shops-Tabelle
ALTER TABLE pod_autom_shops ADD COLUMN IF NOT EXISTS shop_currency VARCHAR(10);
ALTER TABLE pod_autom_shops ADD COLUMN IF NOT EXISTS shop_country VARCHAR(100);
ALTER TABLE pod_autom_shops ADD COLUMN IF NOT EXISTS scopes TEXT;
ALTER TABLE pod_autom_shops ADD COLUMN IF NOT EXISTS webhooks_registered TEXT[];
ALTER TABLE pod_autom_shops ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE pod_autom_shops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_pod_autom_shops_user ON pod_autom_shops(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_autom_shops_domain ON pod_autom_shops(shop_domain);
```

---

## Frontend Implementation

### 1. src/types/shopify.ts
```typescript
/**
 * Shopify-related TypeScript types
 */

export interface Shop {
  id: string
  shop_domain: string
  internal_name: string | null
  connection_status: 'connected' | 'disconnected' | 'error'
  shop_currency: string | null
  shop_country: string | null
  scopes: string | null
  last_verified_at: string | null
  created_at: string
  stats?: ShopStats
}

export interface ShopStats {
  active_niches: number
  total_products: number
  products_this_month?: number
  last_sync?: string
}

export interface ShopConnectionError {
  code: 'missing_params' | 'invalid_hmac' | 'invalid_state' | 'state_expired' | 'token_exchange_failed' | 'shop_inactive'
  message: string
}

export interface ShopTestResult {
  success: boolean
  shop_info?: {
    active: boolean
    name: string
    email: string
    currency: string
    plan_name: string
    domain: string
    country: string
  }
  error?: string
}

export const SHOP_ERROR_MESSAGES: Record<string, string> = {
  missing_params: 'Fehlende Parameter in der Antwort von Shopify',
  invalid_hmac: 'Ungültige Signatur. Bitte versuche es erneut.',
  invalid_state: 'Ungültiger Sicherheitstoken. Bitte starte den Prozess neu.',
  state_expired: 'Der Verbindungsprozess ist abgelaufen. Bitte versuche es erneut.',
  token_exchange_failed: 'Fehler beim Verbinden mit Shopify. Bitte versuche es später erneut.',
  shop_inactive: 'Dieser Shop ist nicht aktiv oder gesperrt.'
}
```

### 2. src/hooks/useShopify.ts (Erweitert)
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { API_URL } from '@src/lib/constants'
import type { Shop, ShopTestResult } from '@src/types/shopify'

async function getAuthToken(): Promise<string | undefined> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

/**
 * Fetch all shops for current user
 */
export function useShops() {
  return useQuery({
    queryKey: ['pod-autom-shops'],
    queryFn: () => apiRequest<Shop[]>('/pod-autom/shops'),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true
  })
}

/**
 * Fetch single shop with stats
 */
export function useShop(shopId: string | undefined) {
  return useQuery({
    queryKey: ['pod-autom-shop', shopId],
    queryFn: () => apiRequest<Shop>(`/pod-autom/shops/${shopId}`),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2
  })
}

/**
 * Initiate Shopify OAuth connection
 */
export function useConnectShopify() {
  return useMutation({
    mutationFn: async (shopDomain: string): Promise<string> => {
      const data = await apiRequest<{ auth_url: string }>(
        `/pod-autom/shopify/auth?shop=${encodeURIComponent(shopDomain)}`
      )
      return data.auth_url
    }
  })
}

/**
 * Test shop connection
 */
export function useTestShopConnection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shopId: string): Promise<ShopTestResult> => {
      return apiRequest<ShopTestResult>(`/pod-autom/shops/${shopId}/test`, {
        method: 'POST'
      })
    },
    onSuccess: (_, shopId) => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-shops'] })
      queryClient.invalidateQueries({ queryKey: ['pod-autom-shop', shopId] })
    }
  })
}

/**
 * Disconnect shop
 */
export function useDisconnectShop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shopId: string) => {
      return apiRequest(`/pod-autom/shops/${shopId}`, {
        method: 'DELETE'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-shops'] })
    }
  })
}
```

### 3. src/components/onboarding/ShopConnection.tsx (Erweitert)
```typescript
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useShops,
  useConnectShopify,
  useDisconnectShop,
  useTestShopConnection
} from '@src/hooks/useShopify'
import { SHOP_ERROR_MESSAGES } from '@src/types/shopify'
import {
  Store,
  ExternalLink,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react'

interface ShopConnectionProps {
  onComplete: () => void
}

export default function ShopConnection({ onComplete }: ShopConnectionProps) {
  const [searchParams] = useSearchParams()
  const [shopDomain, setShopDomain] = useState('')
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const { data: shops, isLoading: shopsLoading, refetch } = useShops()
  const connectMutation = useConnectShopify()
  const disconnectMutation = useDisconnectShop()
  const testMutation = useTestShopConnection()

  const hasConnectedShop = shops?.some(s => s.connection_status === 'connected')
  const connectedShop = shops?.find(s => s.connection_status === 'connected')

  // Handle OAuth callback errors
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam && SHOP_ERROR_MESSAGES[errorParam]) {
      setError(SHOP_ERROR_MESSAGES[errorParam])
    }

    const shopConnected = searchParams.get('shop_connected')
    if (shopConnected === 'true') {
      refetch()
    }
  }, [searchParams, refetch])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const domain = shopDomain.trim().toLowerCase()

    if (!domain) {
      setError('Bitte gib deine Shop-Domain ein')
      return
    }

    // Validate domain format
    if (!/^[a-z0-9-]+$/.test(domain)) {
      setError('Ungültiges Format. Nur Buchstaben, Zahlen und Bindestriche erlaubt.')
      return
    }

    try {
      const authUrl = await connectMutation.mutateAsync(domain)
      window.location.href = authUrl
    } catch (err) {
      setError('Verbindung fehlgeschlagen. Bitte versuche es erneut.')
    }
  }

  const handleDisconnect = async (shopId: string) => {
    if (!confirm('Shop wirklich trennen? Alle Einstellungen und Daten gehen verloren.')) return
    await disconnectMutation.mutateAsync(shopId)
  }

  const handleTestConnection = async (shopId: string) => {
    try {
      const result = await testMutation.mutateAsync(shopId)
      if (result.success) {
        setError('')
      }
    } catch (err) {
      setError('Verbindungstest fehlgeschlagen')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Shopify Store verbinden</h2>
        <p className="text-zinc-400">
          Verbinde deinen Shopify Store, um automatisch Produkte zu erstellen.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-6 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            <button
              onClick={() => setError('')}
              className="text-xs underline mt-1 hover:no-underline"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {shopsLoading && (
        <div className="space-y-3 mb-8">
          {[1, 2].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-zinc-800 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connected Shops */}
      {!shopsLoading && shops && shops.length > 0 && (
        <div className="space-y-3 mb-8">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className={`card transition-all ${
                shop.connection_status === 'connected'
                  ? 'border-emerald-500/50'
                  : shop.connection_status === 'error'
                  ? 'border-red-500/50'
                  : 'border-amber-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      shop.connection_status === 'connected'
                        ? 'bg-emerald-500/10'
                        : shop.connection_status === 'error'
                        ? 'bg-red-500/10'
                        : 'bg-amber-500/10'
                    }`}
                  >
                    {shop.connection_status === 'connected' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : shop.connection_status === 'error' ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Store className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{shop.internal_name || shop.shop_domain}</p>
                    <p className="text-sm text-zinc-500">{shop.shop_domain}</p>
                    {shop.last_verified_at && (
                      <p className="text-xs text-zinc-600">
                        Zuletzt geprüft: {new Date(shop.last_verified_at).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`badge ${
                    shop.connection_status === 'connected'
                      ? 'badge-success'
                      : shop.connection_status === 'error'
                      ? 'badge-error'
                      : 'badge-warning'
                  }`}>
                    {shop.connection_status === 'connected' ? 'Verbunden' :
                     shop.connection_status === 'error' ? 'Fehler' : 'Getrennt'}
                  </span>

                  {/* Test Connection */}
                  <button
                    onClick={() => handleTestConnection(shop.id)}
                    disabled={testMutation.isPending}
                    className="p-2 text-zinc-400 hover:text-primary transition"
                    title="Verbindung testen"
                  >
                    {testMutation.isPending && testMutation.variables === shop.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>

                  {/* Disconnect */}
                  <button
                    onClick={() => handleDisconnect(shop.id)}
                    disabled={disconnectMutation.isPending}
                    className="p-2 text-zinc-400 hover:text-red-400 transition"
                    title="Shop trennen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Shop Info */}
              {shop.connection_status === 'connected' && (shop.shop_currency || shop.shop_country) && (
                <div className="mt-3 pt-3 border-t border-zinc-800 flex gap-4 text-xs text-zinc-500">
                  {shop.shop_currency && (
                    <span>Währung: {shop.shop_currency}</span>
                  )}
                  {shop.shop_country && (
                    <span>Land: {shop.shop_country}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Connect Form */}
      <form onSubmit={handleConnect} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Shop Domain</label>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs text-zinc-400 hover:text-primary flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              Hilfe
            </button>
          </div>

          {showHelp && (
            <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-zinc-400">
              <p className="mb-2">Deine Shop-Domain findest du in deinem Shopify Admin:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Gehe zu deinem Shopify Admin</li>
                <li>Schau in die URL-Leiste</li>
                <li>Kopiere den Teil vor <code className="bg-zinc-800 px-1 rounded">.myshopify.com</code></li>
              </ol>
              <p className="mt-2 text-xs">
                Beispiel: Wenn deine URL <code className="bg-zinc-800 px-1 rounded">https://mein-shop.myshopify.com</code> ist,
                gib <code className="bg-zinc-800 px-1 rounded">mein-shop</code> ein.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="input flex-1"
              placeholder="dein-shop"
              disabled={connectMutation.isPending}
            />
            <span className="flex items-center text-zinc-500 text-sm">.myshopify.com</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={connectMutation.isPending || !shopDomain.trim()}
          className="w-full btn-secondary"
        >
          {connectMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verbinden...
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              {hasConnectedShop ? 'Weiteren Shop verbinden' : 'Shop verbinden'}
            </>
          )}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Was passiert beim Verbinden?</h4>
        <ul className="text-xs text-zinc-400 space-y-1">
          <li>• Du wirst zu Shopify weitergeleitet</li>
          <li>• Bestätige die Berechtigungen für POD AutoM</li>
          <li>• Du wirst automatisch zurückgeleitet</li>
        </ul>
      </div>

      {/* Continue Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onComplete}
          disabled={!hasConnectedShop}
          className="btn-primary"
        >
          {hasConnectedShop ? (
            <>
              Weiter
              <Check className="w-5 h-5" />
            </>
          ) : (
            'Bitte Shop verbinden'
          )}
        </button>
      </div>
    </div>
  )
}
```

---

## Environment Variables

### Backend (.env)
```env
# Shopify OAuth
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret

# Token Encryption (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
TOKEN_ENCRYPTION_KEY=your_fernet_key_here

# URLs
API_URL=https://your-api.render.com
POD_AUTOM_FRONTEND_URL=https://pod-autom.your-domain.com
```

### Frontend (.env)
```env
VITE_API_URL=https://your-api.render.com
```

---

## Verifizierung

### Funktionale Tests
- [ ] OAuth Flow startet korrekt
- [ ] Redirect zu Shopify funktioniert
- [ ] HMAC Validierung funktioniert
- [ ] State/Nonce Validierung funktioniert
- [ ] State Expiry wird geprüft
- [ ] Access Token wird verschlüsselt gespeichert
- [ ] Shop Info wird korrekt abgerufen
- [ ] Webhooks werden registriert
- [ ] Shop wird in Datenbank gespeichert
- [ ] Default Settings werden erstellt
- [ ] Verbindungstest funktioniert
- [ ] Shop-Disconnect funktioniert
- [ ] Fehlerbehandlung für ungültige Domains

### Security Tests
- [ ] Tokens werden verschlüsselt gespeichert
- [ ] HMAC Validierung aktiv
- [ ] State/Nonce schützt vor CSRF
- [ ] Rate Limiting funktioniert
- [ ] Keine Tokens in Logs

### UI Tests
- [ ] Loading Skeleton beim Laden
- [ ] Error Messages verständlich
- [ ] Hilfe-Text hilfreich
- [ ] Responsive auf Mobile

---

## Abhängigkeiten

### Python Packages (backend/api/requirements.txt)
```
httpx>=0.27.0
cryptography>=42.0.0
```

### Backend
- Phase 1.4 (Datenbank-Tabellen)
- Supabase Service Key
- Shopify Partner Account

### Frontend
- Phase 1.5 (AuthContext)
- Phase 2.1 (Login/Register)

## Nächster Schritt
→ Phase 2.3 - 4-Step Onboarding Wizard
