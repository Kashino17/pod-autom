"""
Pinterest OAuth Routes
Handles Pinterest OAuth2 authorization flow
"""
import os
import secrets
import time
from flask import Blueprint, request, redirect, jsonify
import requests

pinterest_bp = Blueprint('pinterest', __name__)

# OAuth state storage (in production, use Redis)
oauth_states = {}

# Environment variables
PINTEREST_APP_ID = os.environ.get('PINTEREST_APP_ID', '')
PINTEREST_APP_SECRET = os.environ.get('PINTEREST_APP_SECRET', '')
API_URL = os.environ.get('API_URL', 'http://localhost:5001')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3007')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')


def cleanup_expired_states():
    """Remove expired OAuth states (older than 10 minutes)"""
    current_time = time.time()
    expired = [state for state, data in oauth_states.items()
               if current_time - data.get('created_at', 0) > 600]
    for state in expired:
        del oauth_states[state]


@pinterest_bp.route('/api/oauth/pinterest/authorize')
def authorize():
    """Start Pinterest OAuth flow"""
    shop_id = request.args.get('shop_id')

    if not shop_id:
        return jsonify({'error': 'Missing shop_id parameter'}), 400

    if not PINTEREST_APP_ID:
        return jsonify({'error': 'Pinterest App ID not configured'}), 500

    # Cleanup old states
    cleanup_expired_states()

    # Generate state token
    state = f"{shop_id}:{secrets.token_urlsafe(16)}"
    oauth_states[state] = {
        'shop_id': shop_id,
        'created_at': time.time()
    }

    # Build authorization URL
    scopes = 'ads:read,ads:write,boards:read,boards:write,pins:read,pins:write,user_accounts:read'
    redirect_uri = f"{API_URL}/api/oauth/pinterest/callback"

    auth_url = (
        f"https://www.pinterest.com/oauth/?"
        f"response_type=code&"
        f"client_id={PINTEREST_APP_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scopes}&"
        f"state={state}"
    )

    return redirect(auth_url)


@pinterest_bp.route('/api/oauth/pinterest/callback')
def callback():
    """Handle Pinterest OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')

    # Handle error from Pinterest
    if error:
        error_description = request.args.get('error_description', 'Unknown error')
        return redirect(f"{FRONTEND_URL}?pinterest_error={error_description}")

    # Validate state
    if not state or state not in oauth_states:
        return redirect(f"{FRONTEND_URL}?pinterest_error=invalid_state")

    # Get shop_id from state
    shop_id = oauth_states[state]['shop_id']
    del oauth_states[state]

    if not code:
        return redirect(f"{FRONTEND_URL}/shops/{shop_id}?pinterest_error=no_code")

    try:
        # Exchange code for tokens
        redirect_uri = f"{API_URL}/api/oauth/pinterest/callback"

        token_response = requests.post(
            'https://api.pinterest.com/v5/oauth/token',
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': redirect_uri
            },
            auth=(PINTEREST_APP_ID, PINTEREST_APP_SECRET),
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=30
        )

        if not token_response.ok:
            error_detail = token_response.text[:200]
            return redirect(f"{FRONTEND_URL}/shops/{shop_id}?pinterest_error=token_exchange_failed")

        tokens = token_response.json()
        access_token = tokens.get('access_token')
        refresh_token = tokens.get('refresh_token')
        expires_in = tokens.get('expires_in', 3600)

        # Get Pinterest user info
        user_response = requests.get(
            'https://api.pinterest.com/v5/user_account',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )

        pinterest_user = {}
        if user_response.ok:
            pinterest_user = user_response.json()

        # Save tokens to Supabase
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            from supabase import create_client
            supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

            supabase.table('pinterest_auth').upsert({
                'shop_id': shop_id,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': expires_in,
                'pinterest_username': pinterest_user.get('username'),
                'pinterest_account_type': pinterest_user.get('account_type'),
                'connected_at': 'now()'
            }, on_conflict='shop_id').execute()

        return redirect(f"{FRONTEND_URL}/shops/{shop_id}?pinterest=connected")

    except Exception as e:
        print(f"Pinterest OAuth error: {str(e)}")
        return redirect(f"{FRONTEND_URL}/shops/{shop_id}?pinterest_error=server_error")


@pinterest_bp.route('/api/oauth/pinterest/refresh', methods=['POST'])
def refresh_token():
    """Refresh Pinterest access token"""
    try:
        data = request.json
        refresh_token = data.get('refresh_token')

        if not refresh_token:
            return jsonify({'error': 'Missing refresh_token'}), 400

        response = requests.post(
            'https://api.pinterest.com/v5/oauth/token',
            data={
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token
            },
            auth=(PINTEREST_APP_ID, PINTEREST_APP_SECRET),
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=30
        )

        if response.ok:
            tokens = response.json()
            return jsonify({
                'success': True,
                'access_token': tokens.get('access_token'),
                'refresh_token': tokens.get('refresh_token'),
                'expires_in': tokens.get('expires_in')
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Token refresh failed'
            }), response.status_code

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pinterest_bp.route('/api/oauth/pinterest/status')
def status():
    """Check Pinterest OAuth configuration status"""
    return jsonify({
        'configured': bool(PINTEREST_APP_ID and PINTEREST_APP_SECRET),
        'app_id_set': bool(PINTEREST_APP_ID),
        'app_secret_set': bool(PINTEREST_APP_SECRET),
        'api_url': API_URL,
        'frontend_url': FRONTEND_URL
    })
