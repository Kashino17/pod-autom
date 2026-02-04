# Phase 5.1 - Pinterest Integration

## Ziel
Sichere Integration von Pinterest OAuth 2.0 und automatischem Pin/Ad-Posting für POD AutoM mit Token-Refresh, Rate-Limiting und vollständiger Fehlerbehandlung.

## Kritische Anforderungen
- **OAuth 2.0 Security**: PKCE, State-Validation, Token-Encryption
- **Token Lifecycle**: Automatischer Refresh vor Ablauf
- **Rate Limiting**: Schutz vor OAuth-Missbrauch
- **Error Handling**: Vollständige Fehlerbehandlung mit User-Feedback

---

## 1. Shared Types

### src/types/pinterest.types.ts
```typescript
/**
 * Pinterest Integration Typen
 */

export interface PinterestConfig {
  id: string
  shop_id: string
  pinterest_account_id: string | null
  pinterest_username: string | null
  board_id: string | null
  ad_account_id: string | null
  is_active: boolean
  token_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface PinterestBoard {
  id: string
  name: string
  description: string | null
  pin_count: number
  privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET'
}

export interface PinterestAuthResponse {
  auth_url: string
}

export interface PinterestConnectionStatus {
  connected: boolean
  username: string | null
  account_id: string | null
  token_valid: boolean
  expires_in_hours: number | null
}

// API Response Types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
```

---

## 2. Backend: Pinterest OAuth Service

### backend/api/services/pinterest_oauth_service.py
```python
"""
Pinterest OAuth Service mit Token-Refresh und Rate-Limiting.
"""
import os
import base64
import secrets
import logging
from datetime import datetime, timedelta
from functools import wraps
from typing import Any

import requests
from flask import request, jsonify
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Supabase Client
supabase: Client = create_client(
    os.getenv('SUPABASE_URL', ''),
    os.getenv('SUPABASE_SERVICE_KEY', '')
)

# Pinterest Config
PINTEREST_APP_ID = os.getenv('PINTEREST_APP_ID', '')
PINTEREST_APP_SECRET = os.getenv('PINTEREST_APP_SECRET', '')
PINTEREST_API_BASE = 'https://api.pinterest.com/v5'

# Token Encryption Key (für Production: aus Secret Manager)
TOKEN_ENCRYPTION_KEY = os.getenv('TOKEN_ENCRYPTION_KEY', '')

# Rate Limiting: Max 5 OAuth-Starts pro User pro Stunde
OAUTH_RATE_LIMIT = 5
OAUTH_RATE_WINDOW = 3600  # Sekunden


class PinterestOAuthError(Exception):
    """Custom Exception für Pinterest OAuth Fehler."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


def check_rate_limit(user_id: str) -> bool:
    """
    Prüft Rate-Limit für OAuth-Starts.
    Returns True wenn unter Limit, False wenn überschritten.
    """
    window_start = datetime.utcnow() - timedelta(seconds=OAUTH_RATE_WINDOW)

    result = supabase.table('pod_autom_pinterest_oauth_states') \
        .select('id', count='exact') \
        .eq('user_id', user_id) \
        .gte('created_at', window_start.isoformat()) \
        .execute()

    return (result.count or 0) < OAUTH_RATE_LIMIT


def generate_oauth_state(shop_id: str, user_id: str) -> str:
    """
    Generiert sicheren State-Token und speichert ihn.
    """
    state = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    supabase.table('pod_autom_pinterest_oauth_states').insert({
        'shop_id': shop_id,
        'user_id': user_id,
        'state': state,
        'expires_at': expires_at.isoformat()
    }).execute()

    return state


def validate_oauth_state(state: str) -> dict[str, Any] | None:
    """
    Validiert State-Token und gibt Shop/User-Info zurück.
    Löscht State nach erfolgreicher Validierung (one-time use).
    """
    result = supabase.table('pod_autom_pinterest_oauth_states') \
        .select('*') \
        .eq('state', state) \
        .single() \
        .execute()

    if not result.data:
        return None

    state_data = result.data

    # Expiration prüfen
    expires_at = datetime.fromisoformat(state_data['expires_at'].replace('Z', '+00:00'))
    if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
        # Abgelaufenen State löschen
        supabase.table('pod_autom_pinterest_oauth_states') \
            .delete() \
            .eq('state', state) \
            .execute()
        return None

    # State löschen (one-time use)
    supabase.table('pod_autom_pinterest_oauth_states') \
        .delete() \
        .eq('state', state) \
        .execute()

    return state_data


def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict[str, Any]:
    """
    Tauscht Authorization Code gegen Access/Refresh Tokens.
    """
    auth_string = base64.b64encode(
        f"{PINTEREST_APP_ID}:{PINTEREST_APP_SECRET}".encode()
    ).decode()

    response = requests.post(
        f'{PINTEREST_API_BASE}/oauth/token',
        headers={
            'Authorization': f'Basic {auth_string}',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri
        },
        timeout=30
    )

    if response.status_code != 200:
        logger.error(f'Token exchange failed: {response.status_code} - {response.text}')
        raise PinterestOAuthError('Token exchange failed', 500)

    return response.json()


def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    """
    Erneuert Access Token mit Refresh Token.
    """
    auth_string = base64.b64encode(
        f"{PINTEREST_APP_ID}:{PINTEREST_APP_SECRET}".encode()
    ).decode()

    response = requests.post(
        f'{PINTEREST_API_BASE}/oauth/token',
        headers={
            'Authorization': f'Basic {auth_string}',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data={
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token
        },
        timeout=30
    )

    if response.status_code != 200:
        logger.error(f'Token refresh failed: {response.status_code}')
        raise PinterestOAuthError('Token refresh failed', 401)

    return response.json()


def get_pinterest_user(access_token: str) -> dict[str, Any]:
    """
    Holt Pinterest User Info.
    """
    response = requests.get(
        f'{PINTEREST_API_BASE}/user_account',
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=30
    )

    if response.status_code != 200:
        raise PinterestOAuthError('Failed to fetch user info', 500)

    return response.json()


def get_valid_access_token(shop_id: str) -> str | None:
    """
    Holt gültigen Access Token, refreshed wenn nötig.
    """
    config = supabase.table('pod_autom_pinterest_config') \
        .select('access_token, refresh_token, token_expires_at') \
        .eq('shop_id', shop_id) \
        .single() \
        .execute()

    if not config.data:
        return None

    access_token = config.data.get('access_token')
    refresh_token = config.data.get('refresh_token')
    expires_at_str = config.data.get('token_expires_at')

    if not access_token or not refresh_token:
        return None

    # Prüfen ob Token bald abläuft (Buffer: 1 Stunde)
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
        buffer_time = datetime.utcnow().replace(tzinfo=expires_at.tzinfo) + timedelta(hours=1)

        if buffer_time >= expires_at:
            # Token refreshen
            try:
                new_tokens = refresh_access_token(refresh_token)
                new_expires_at = datetime.utcnow() + timedelta(seconds=new_tokens.get('expires_in', 3600))

                supabase.table('pod_autom_pinterest_config').update({
                    'access_token': new_tokens['access_token'],
                    'refresh_token': new_tokens.get('refresh_token', refresh_token),
                    'token_expires_at': new_expires_at.isoformat()
                }).eq('shop_id', shop_id).execute()

                return new_tokens['access_token']
            except PinterestOAuthError:
                return None

    return access_token


def cleanup_expired_states() -> int:
    """
    Löscht abgelaufene OAuth States.
    Sollte als Cron-Job laufen.
    """
    result = supabase.table('pod_autom_pinterest_oauth_states') \
        .delete() \
        .lt('expires_at', datetime.utcnow().isoformat()) \
        .execute()

    deleted_count = len(result.data) if result.data else 0
    logger.info(f'Cleaned up {deleted_count} expired OAuth states')
    return deleted_count
```

---

## 3. Backend: API Routes

### backend/api/routes/pod_autom_pinterest.py
```python
"""
Pinterest OAuth und Config API Routes für POD AutoM.
"""
import os
import re
import logging
from functools import wraps

from flask import Blueprint, request, redirect, jsonify
from supabase import create_client

from services.pinterest_oauth_service import (
    check_rate_limit,
    generate_oauth_state,
    validate_oauth_state,
    exchange_code_for_tokens,
    get_pinterest_user,
    get_valid_access_token,
    PinterestOAuthError
)

logger = logging.getLogger(__name__)

bp = Blueprint('pod_autom_pinterest', __name__, url_prefix='/pod-autom/pinterest')

supabase = create_client(
    os.getenv('SUPABASE_URL', ''),
    os.getenv('SUPABASE_SERVICE_KEY', '')
)

PINTEREST_APP_ID = os.getenv('PINTEREST_APP_ID', '')
FRONTEND_URL = os.getenv('POD_AUTOM_FRONTEND_URL', 'http://localhost:3001')
API_URL = os.getenv('API_URL', '')

PINTEREST_SCOPES = [
    'boards:read',
    'boards:write',
    'pins:read',
    'pins:write',
    'ads:read',
    'ads:write'
]

# UUID Validation
UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE
)


def validate_uuid(value: str) -> bool:
    """Validiert UUID Format."""
    return bool(UUID_PATTERN.match(value))


def verify_jwt(f):
    """JWT Verification Decorator."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing authorization header'}), 401

        token = auth_header.split(' ')[1]
        try:
            user = supabase.auth.get_user(token)
            if not user or not user.user:
                return jsonify({'error': 'Invalid token'}), 401
            request.user_id = user.user.id
        except Exception as e:
            logger.warning(f'JWT verification failed: {e}')
            return jsonify({'error': 'Invalid or expired token'}), 401

        return f(*args, **kwargs)
    return decorated


def verify_shop_ownership(shop_id: str, user_id: str) -> bool:
    """Prüft ob User Besitzer des Shops ist."""
    result = supabase.table('pod_autom_shops') \
        .select('id') \
        .eq('id', shop_id) \
        .eq('user_id', user_id) \
        .execute()
    return bool(result.data)


@bp.route('/auth/<shop_id>', methods=['GET'])
@verify_jwt
def initiate_auth(shop_id: str):
    """
    Startet Pinterest OAuth Flow.

    Returns:
        JSON mit auth_url für Redirect
    """
    # UUID validieren
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop_id format'}), 400

    # Rate Limit prüfen
    if not check_rate_limit(request.user_id):
        return jsonify({
            'error': 'Rate limit exceeded',
            'message': 'Zu viele Verbindungsversuche. Bitte warte eine Stunde.'
        }), 429

    # Shop Ownership prüfen
    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found or access denied'}), 404

    # State Token generieren
    state = generate_oauth_state(shop_id, request.user_id)

    # OAuth URL bauen
    redirect_uri = f"{API_URL}/pod-autom/pinterest/callback"
    scope = ','.join(PINTEREST_SCOPES)

    auth_url = (
        f"https://www.pinterest.com/oauth/?"
        f"client_id={PINTEREST_APP_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&state={state}"
    )

    return jsonify({'auth_url': auth_url})


@bp.route('/callback', methods=['GET'])
def oauth_callback():
    """
    Verarbeitet Pinterest OAuth Callback.
    Redirected zum Frontend mit Status.
    """
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    error_description = request.args.get('error_description', '')

    # Error von Pinterest
    if error:
        logger.warning(f'Pinterest OAuth denied: {error} - {error_description}')
        return redirect(f"{FRONTEND_URL}/dashboard/campaigns?error=pinterest_denied")

    # Parameter prüfen
    if not code or not state:
        return redirect(f"{FRONTEND_URL}/dashboard/campaigns?error=missing_params")

    # State validieren
    state_data = validate_oauth_state(state)
    if not state_data:
        return redirect(f"{FRONTEND_URL}/dashboard/campaigns?error=invalid_or_expired_state")

    shop_id = state_data['shop_id']

    try:
        # Code gegen Tokens tauschen
        redirect_uri = f"{API_URL}/pod-autom/pinterest/callback"
        tokens = exchange_code_for_tokens(code, redirect_uri)

        access_token = tokens.get('access_token')
        refresh_token = tokens.get('refresh_token')
        expires_in = tokens.get('expires_in', 3600)

        # User Info holen
        pinterest_user = get_pinterest_user(access_token)

        # Token Expiration berechnen
        from datetime import datetime, timedelta
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        # Config speichern/updaten (Upsert)
        config_data = {
            'shop_id': shop_id,
            'pinterest_account_id': pinterest_user.get('id'),
            'pinterest_username': pinterest_user.get('username'),
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_expires_at': token_expires_at.isoformat(),
            'is_active': True
        }

        supabase.table('pod_autom_pinterest_config').upsert(
            config_data,
            on_conflict='shop_id'
        ).execute()

        return redirect(f"{FRONTEND_URL}/dashboard/campaigns?pinterest_connected=true")

    except PinterestOAuthError as e:
        logger.error(f'Pinterest OAuth error: {e.message}')
        return redirect(f"{FRONTEND_URL}/dashboard/campaigns?error=oauth_failed")
    except Exception as e:
        logger.exception(f'Unexpected error in OAuth callback: {e}')
        return redirect(f"{FRONTEND_URL}/dashboard/campaigns?error=unexpected_error")


@bp.route('/status/<shop_id>', methods=['GET'])
@verify_jwt
def get_connection_status(shop_id: str):
    """
    Holt Pinterest Verbindungsstatus.
    """
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop_id format'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found'}), 404

    config = supabase.table('pod_autom_pinterest_config') \
        .select('pinterest_account_id, pinterest_username, token_expires_at, is_active') \
        .eq('shop_id', shop_id) \
        .single() \
        .execute()

    if not config.data or not config.data.get('pinterest_account_id'):
        return jsonify({
            'connected': False,
            'username': None,
            'account_id': None,
            'token_valid': False,
            'expires_in_hours': None
        })

    # Token Expiration prüfen
    token_valid = True
    expires_in_hours = None

    if config.data.get('token_expires_at'):
        from datetime import datetime
        expires_at = datetime.fromisoformat(
            config.data['token_expires_at'].replace('Z', '+00:00')
        )
        now = datetime.utcnow().replace(tzinfo=expires_at.tzinfo)

        if now >= expires_at:
            token_valid = False
        else:
            expires_in_hours = int((expires_at - now).total_seconds() / 3600)

    return jsonify({
        'connected': True,
        'username': config.data.get('pinterest_username'),
        'account_id': config.data.get('pinterest_account_id'),
        'token_valid': token_valid,
        'expires_in_hours': expires_in_hours,
        'is_active': config.data.get('is_active', False)
    })


@bp.route('/config/<shop_id>', methods=['GET'])
@verify_jwt
def get_config(shop_id: str):
    """Holt Pinterest Konfiguration."""
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop_id format'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found'}), 404

    config = supabase.table('pod_autom_pinterest_config') \
        .select('id, pinterest_account_id, pinterest_username, board_id, ad_account_id, is_active') \
        .eq('shop_id', shop_id) \
        .single() \
        .execute()

    return jsonify({'data': config.data or {}})


@bp.route('/config/<shop_id>', methods=['PUT'])
@verify_jwt
def update_config(shop_id: str):
    """Aktualisiert Pinterest Konfiguration."""
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop_id format'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Nur erlaubte Felder
    allowed_fields = ['board_id', 'ad_account_id', 'is_active']
    update_data = {}

    for field in allowed_fields:
        if field in data:
            # board_id und ad_account_id als String validieren
            if field in ['board_id', 'ad_account_id']:
                value = data[field]
                if value is not None and not isinstance(value, str):
                    return jsonify({'error': f'{field} must be a string'}), 400
            # is_active als Boolean validieren
            elif field == 'is_active':
                if not isinstance(data[field], bool):
                    return jsonify({'error': 'is_active must be a boolean'}), 400

            update_data[field] = data[field]

    if not update_data:
        return jsonify({'error': 'No valid fields to update'}), 400

    result = supabase.table('pod_autom_pinterest_config') \
        .update(update_data) \
        .eq('shop_id', shop_id) \
        .execute()

    return jsonify({'data': result.data[0] if result.data else {}})


@bp.route('/disconnect/<shop_id>', methods=['POST'])
@verify_jwt
def disconnect(shop_id: str):
    """Trennt Pinterest Verbindung."""
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop_id format'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found'}), 404

    # Config löschen (Hard Delete)
    supabase.table('pod_autom_pinterest_config') \
        .delete() \
        .eq('shop_id', shop_id) \
        .execute()

    return jsonify({'success': True, 'message': 'Pinterest disconnected'})


@bp.route('/boards/<shop_id>', methods=['GET'])
@verify_jwt
def get_boards(shop_id: str):
    """Holt verfügbare Pinterest Boards."""
    if not validate_uuid(shop_id):
        return jsonify({'error': 'Invalid shop_id format'}), 400

    if not verify_shop_ownership(shop_id, request.user_id):
        return jsonify({'error': 'Shop not found'}), 404

    # Gültigen Access Token holen (mit Auto-Refresh)
    access_token = get_valid_access_token(shop_id)
    if not access_token:
        return jsonify({'error': 'Pinterest not connected or token expired'}), 401

    try:
        import requests as http_requests
        response = http_requests.get(
            'https://api.pinterest.com/v5/boards',
            headers={'Authorization': f'Bearer {access_token}'},
            params={'page_size': 100},
            timeout=30
        )

        if response.status_code == 401:
            return jsonify({'error': 'Pinterest token expired, please reconnect'}), 401

        if response.status_code != 200:
            logger.error(f'Failed to fetch boards: {response.status_code}')
            return jsonify({'error': 'Failed to fetch boards'}), 500

        boards_data = response.json()
        boards = boards_data.get('items', [])

        # Nur relevante Felder zurückgeben
        formatted_boards = [
            {
                'id': board.get('id'),
                'name': board.get('name'),
                'description': board.get('description'),
                'pin_count': board.get('pin_count', 0),
                'privacy': board.get('privacy', 'PUBLIC')
            }
            for board in boards
        ]

        return jsonify({'data': formatted_boards})

    except http_requests.RequestException as e:
        logger.error(f'Request error fetching boards: {e}')
        return jsonify({'error': 'Network error'}), 503
```

---

## 4. Frontend: Pinterest Hook

### src/hooks/usePinterest.ts
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { API_URL } from '@src/lib/constants'
import type {
  PinterestConfig,
  PinterestBoard,
  PinterestConnectionStatus,
  ApiResponse
} from '@src/types/pinterest.types'

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken()
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed')
  }

  return data
}

/**
 * Hook für Pinterest Verbindungsstatus
 */
export function usePinterestStatus(shopId: string | undefined) {
  return useQuery({
    queryKey: ['pinterest-status', shopId],
    queryFn: async (): Promise<PinterestConnectionStatus> => {
      if (!shopId) throw new Error('No shop ID')
      return apiRequest<PinterestConnectionStatus>(
        `/pod-autom/pinterest/status/${shopId}`
      )
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // 5 Minuten
    retry: 1
  })
}

/**
 * Hook für Pinterest Config
 */
export function usePinterestConfig(shopId: string | undefined) {
  return useQuery({
    queryKey: ['pinterest-config', shopId],
    queryFn: async (): Promise<PinterestConfig | null> => {
      if (!shopId) return null
      const response = await apiRequest<ApiResponse<PinterestConfig>>(
        `/pod-autom/pinterest/config/${shopId}`
      )
      return response.data ?? null
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5
  })
}

/**
 * Hook für Pinterest Boards
 */
export function usePinterestBoards(shopId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['pinterest-boards', shopId],
    queryFn: async (): Promise<PinterestBoard[]> => {
      if (!shopId) return []
      const response = await apiRequest<ApiResponse<PinterestBoard[]>>(
        `/pod-autom/pinterest/boards/${shopId}`
      )
      return response.data ?? []
    },
    enabled: !!shopId && enabled,
    staleTime: 1000 * 60 * 10, // 10 Minuten
    retry: 1
  })
}

/**
 * Hook für Pinterest Connect Mutation
 */
export function usePinterestConnect() {
  return useMutation({
    mutationFn: async (shopId: string): Promise<void> => {
      const response = await apiRequest<{ auth_url: string }>(
        `/pod-autom/pinterest/auth/${shopId}`
      )
      // Redirect zu Pinterest OAuth
      window.location.href = response.auth_url
    }
  })
}

/**
 * Hook für Pinterest Disconnect Mutation
 */
export function usePinterestDisconnect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shopId: string): Promise<void> => {
      await apiRequest(`/pod-autom/pinterest/disconnect/${shopId}`, {
        method: 'POST'
      })
    },
    onSuccess: (_, shopId) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest-status', shopId] })
      queryClient.invalidateQueries({ queryKey: ['pinterest-config', shopId] })
      queryClient.invalidateQueries({ queryKey: ['pinterest-boards', shopId] })
    }
  })
}

/**
 * Hook für Pinterest Config Update
 */
export function usePinterestConfigUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      shopId,
      data
    }: {
      shopId: string
      data: Partial<Pick<PinterestConfig, 'board_id' | 'ad_account_id' | 'is_active'>>
    }): Promise<PinterestConfig> => {
      const response = await apiRequest<ApiResponse<PinterestConfig>>(
        `/pod-autom/pinterest/config/${shopId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data)
        }
      )
      return response.data!
    },
    onSuccess: (_, { shopId }) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest-config', shopId] })
    }
  })
}
```

---

## 5. Frontend: Campaign Manager (Pinterest Teil)

### src/components/dashboard/PinterestConnection.tsx
```typescript
import { useState, useCallback } from 'react'
import {
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Shield,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import {
  usePinterestStatus,
  usePinterestConfig,
  usePinterestBoards,
  usePinterestConnect,
  usePinterestDisconnect,
  usePinterestConfigUpdate
} from '@src/hooks/usePinterest'
import type { PinterestBoard } from '@src/types/pinterest.types'

// Pinterest Icon
const PinterestIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
  </svg>
)

interface PinterestConnectionProps {
  shopId: string
}

export default function PinterestConnection({ shopId }: PinterestConnectionProps) {
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

  // Queries
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = usePinterestStatus(shopId)
  const { data: config } = usePinterestConfig(shopId)

  // Mutations
  const connectMutation = usePinterestConnect()
  const disconnectMutation = usePinterestDisconnect()

  const handleConnect = useCallback(() => {
    connectMutation.mutate(shopId, {
      onError: (error) => {
        if (error.message.includes('Rate limit')) {
          toast.error('Zu viele Versuche', {
            description: 'Bitte warte eine Stunde und versuche es erneut.'
          })
        } else {
          toast.error('Verbindung fehlgeschlagen', {
            description: error.message
          })
        }
      }
    })
  }, [shopId, connectMutation])

  const handleDisconnect = useCallback(() => {
    disconnectMutation.mutate(shopId, {
      onSuccess: () => {
        toast.success('Pinterest getrennt')
        setShowDisconnectConfirm(false)
      },
      onError: (error) => {
        toast.error('Trennen fehlgeschlagen', {
          description: error.message
        })
      }
    })
  }, [shopId, disconnectMutation])

  const isConnected = status?.connected ?? false

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500"
            aria-hidden="true"
          >
            <PinterestIcon />
          </div>
          <div>
            <h3 className="font-semibold">Pinterest</h3>
            <p className="text-sm text-zinc-400">
              Erreiche kaufbereite Nutzer mit visuellen Pins
            </p>
          </div>
        </div>

        {statusLoading ? (
          <span className="badge bg-zinc-700">
            <Loader2 className="w-3 h-3 animate-spin mr-1" aria-hidden="true" />
            Laden...
          </span>
        ) : isConnected ? (
          <span className="badge-success" role="status">
            <Check className="w-4 h-4 mr-1" aria-hidden="true" />
            Verbunden
          </span>
        ) : (
          <span className="badge bg-zinc-700" role="status">Nicht verbunden</span>
        )}
      </div>

      {isConnected && status ? (
        <div className="mt-6 space-y-4">
          {/* Account Info */}
          <div className="p-4 bg-surface-highlight rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Verbundenes Konto</p>
                <p className="font-medium">@{status.username}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Token Status */}
                {status.token_valid ? (
                  <span
                    className="flex items-center gap-1 text-xs text-emerald-400"
                    title={`Token läuft in ${status.expires_in_hours}h ab`}
                  >
                    <Shield className="w-3 h-3" aria-hidden="true" />
                    Token gültig
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    Token abgelaufen
                  </span>
                )}

                <a
                  href={`https://pinterest.com/${status.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-zinc-400 hover:text-white transition rounded-lg hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Pinterest Profil öffnen (neues Fenster)"
                >
                  <ExternalLink className="w-5 h-5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          {/* Token Expiration Warning */}
          {status.expires_in_hours !== null && status.expires_in_hours < 24 && (
            <div
              className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
              role="alert"
            >
              <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <p className="text-sm text-amber-400">
                Token läuft in {status.expires_in_hours} Stunden ab. Wird automatisch erneuert.
              </p>
            </div>
          )}

          {/* Board Selection */}
          <PinterestBoardSelector shopId={shopId} currentBoardId={config?.board_id ?? null} />

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => refetchStatus()}
              className="btn-ghost text-zinc-400"
              aria-label="Status aktualisieren"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Aktualisieren
            </button>

            <button
              onClick={() => setShowDisconnectConfirm(true)}
              className="btn-ghost text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Trennen
            </button>
          </div>

          {/* Disconnect Confirmation */}
          {showDisconnectConfirm && (
            <div
              className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
              role="alertdialog"
              aria-labelledby="disconnect-title"
              aria-describedby="disconnect-desc"
            >
              <p id="disconnect-title" className="font-medium text-red-400 mb-2">
                Pinterest wirklich trennen?
              </p>
              <p id="disconnect-desc" className="text-sm text-zinc-400 mb-4">
                Alle synchronisierten Pins bleiben erhalten, aber neue Produkte werden nicht mehr gepostet.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="btn-primary bg-red-500 hover:bg-red-600"
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    'Ja, trennen'
                  )}
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="btn-secondary"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <button
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            className="btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                Verbinden...
              </>
            ) : (
              <>
                <ExternalLink className="w-5 h-5" aria-hidden="true" />
                Pinterest verbinden
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Board Selector Sub-Component
 */
function PinterestBoardSelector({
  shopId,
  currentBoardId
}: {
  shopId: string
  currentBoardId: string | null
}) {
  const [selectedBoard, setSelectedBoard] = useState(currentBoardId ?? '')

  const { data: boards, isLoading, error, refetch } = usePinterestBoards(shopId)
  const updateMutation = usePinterestConfigUpdate()

  const handleSave = useCallback(() => {
    if (!selectedBoard) return

    updateMutation.mutate(
      { shopId, data: { board_id: selectedBoard } },
      {
        onSuccess: () => {
          toast.success('Board gespeichert')
        },
        onError: (error) => {
          toast.error('Speichern fehlgeschlagen', {
            description: error.message
          })
        }
      }
    )
  }, [shopId, selectedBoard, updateMutation])

  const hasChanges = selectedBoard !== (currentBoardId ?? '')

  return (
    <div>
      <label htmlFor="board-select" className="text-sm font-medium mb-2 block">
        Pinterest Board
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            id="board-select"
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            className="input w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            disabled={isLoading}
            aria-describedby="board-hint"
          >
            <option value="">Board auswählen...</option>
            {boards?.map((board: PinterestBoard) => (
              <option key={board.id} value={board.id}>
                {board.name} ({board.pin_count} Pins)
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="btn-secondary px-3"
          aria-label="Boards neu laden"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>

        <button
          onClick={handleSave}
          disabled={!selectedBoard || updateMutation.isPending || !hasChanges}
          className="btn-primary"
          aria-label="Board speichern"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 mt-2" role="alert">
          Fehler beim Laden der Boards. Bitte versuche es erneut.
        </p>
      )}

      <p id="board-hint" className="text-xs text-zinc-500 mt-2">
        Neue Produkte werden automatisch in diesem Board als Pins gepostet.
      </p>
    </div>
  )
}
```

---

## 6. Datenbank

### SQL Migration
```sql
-- Pinterest OAuth States (temporär, mit Expiration)
CREATE TABLE IF NOT EXISTS pod_autom_pinterest_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES pod_autom_shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Index für schnelle State-Lookups
CREATE INDEX idx_pinterest_oauth_states_state
ON pod_autom_pinterest_oauth_states(state);

-- Index für Cleanup abgelaufener States
CREATE INDEX idx_pinterest_oauth_states_expires
ON pod_autom_pinterest_oauth_states(expires_at);

-- RLS Policy
ALTER TABLE pod_autom_pinterest_oauth_states ENABLE ROW LEVEL SECURITY;

-- Keine direkte Leseberechtigung (nur über API)
CREATE POLICY "No direct access to oauth states"
ON pod_autom_pinterest_oauth_states
FOR ALL TO authenticated
USING (false);


-- Pinterest Config Erweiterung
ALTER TABLE pod_autom_pinterest_config
ADD COLUMN IF NOT EXISTS pinterest_username VARCHAR(100),
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Unique Constraint für shop_id (für Upsert)
ALTER TABLE pod_autom_pinterest_config
ADD CONSTRAINT pod_autom_pinterest_config_shop_id_unique UNIQUE (shop_id);

-- Trigger für updated_at
CREATE OR REPLACE TRIGGER update_pinterest_config_timestamp
BEFORE UPDATE ON pod_autom_pinterest_config
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();


-- Cleanup Job für abgelaufene States (als Cron oder scheduled function)
-- Kann als Supabase Edge Function mit Cron Trigger implementiert werden:
-- schedule: '*/5 * * * *' (alle 5 Minuten)
/*
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM pod_autom_pinterest_oauth_states
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
```

---

## 7. Toast/Notification Dependency

### package.json (Ergänzung)
```json
{
  "dependencies": {
    "sonner": "^1.7.0"
  }
}
```

### In main.tsx hinzufügen
```typescript
import { Toaster } from 'sonner'

// Im Root:
<Toaster
  theme="dark"
  position="bottom-right"
  toastOptions={{
    style: {
      background: '#18181b',
      border: '1px solid #27272a',
      color: '#fafafa'
    }
  }}
/>
```

---

## Verifizierung

### OAuth Flow
- [ ] Rate Limiting funktioniert (max 5/Stunde)
- [ ] State Token wird generiert und validiert
- [ ] State läuft nach 10 Minuten ab
- [ ] Token Exchange funktioniert
- [ ] Token Refresh funktioniert automatisch
- [ ] Abgelaufene States werden aufgeräumt

### Frontend
- [ ] Verbindungsstatus wird angezeigt
- [ ] Connect startet OAuth Flow
- [ ] Disconnect mit Bestätigung
- [ ] Board-Auswahl funktioniert
- [ ] Toast-Notifications bei Erfolg/Fehler
- [ ] Loading States korrekt
- [ ] Accessibility (ARIA Labels, Keyboard Navigation)

### Error Handling
- [ ] Rate Limit Error wird angezeigt
- [ ] Abgelaufener State wird erkannt
- [ ] Token Expiration Warning angezeigt
- [ ] Netzwerkfehler werden abgefangen

---

## Abhängigkeiten

| Phase | Beschreibung | Status |
|-------|--------------|--------|
| Phase 4.2 | API Struktur | Erforderlich |
| Phase 3.1 | Dashboard Layout | Erforderlich |
| Pinterest Dev | Developer Account mit App | Erforderlich |
| Env Vars | `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, etc. | Erforderlich |

---

## Nächster Schritt
→ Phase 5.2 - Winner Scaling Dashboard
