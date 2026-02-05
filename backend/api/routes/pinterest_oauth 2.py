from flask import Blueprint, request, redirect, jsonify
import requests
import os
import secrets
import time

pinterest_bp = Blueprint('pinterest', __name__)

# Environment variables
PINTEREST_APP_ID = os.environ.get('PINTEREST_APP_ID', '')
PINTEREST_APP_SECRET = os.environ.get('PINTEREST_APP_SECRET', '')
API_URL = os.environ.get('API_URL', 'http://localhost:5000')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3007')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

# Temporary state storage (in production: use Redis or database)
oauth_states = {}

# Clean up old states (older than 10 minutes)
def cleanup_old_states():
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
        return jsonify({'error': 'Pinterest App not configured'}), 500

    # Clean up old states
    cleanup_old_states()

    # Generate secure state
    state = f"{shop_id}:{secrets.token_urlsafe(32)}"
    oauth_states[state] = {
        'shop_id': shop_id,
        'created_at': time.time()
    }

    # Pinterest OAuth scopes
    scopes = 'ads:read,ads:write,boards:read,pins:read,user_accounts:read'

    auth_url = (
        f"https://www.pinterest.com/oauth/?"
        f"response_type=code&"
        f"client_id={PINTEREST_APP_ID}&"
        f"redirect_uri={API_URL}/api/oauth/pinterest/callback&"
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

    if error:
        return redirect(f"{FRONTEND_URL}?error=pinterest_denied&message={error}")

    if not code or not state:
        return redirect(f"{FRONTEND_URL}?error=missing_params")

    # Validate state
    if state not in oauth_states:
        return redirect(f"{FRONTEND_URL}?error=invalid_state")

    shop_id = oauth_states[state]['shop_id']
    del oauth_states[state]

    try:
        # Exchange code for tokens
        token_response = requests.post(
            'https://api.pinterest.com/v5/oauth/token',
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': f"{API_URL}/api/oauth/pinterest/callback"
            },
            auth=(PINTEREST_APP_ID, PINTEREST_APP_SECRET),
            timeout=10
        )

        if not token_response.ok:
            return redirect(f"{FRONTEND_URL}/shops/{shop_id}?error=token_exchange_failed")

        tokens = token_response.json()

        # Get user info to verify connection
        user_response = requests.get(
            'https://api.pinterest.com/v5/user_account',
            headers={'Authorization': f"Bearer {tokens['access_token']}"},
            timeout=10
        )

        user_info = user_response.json() if user_response.ok else {}

        # Save tokens to Supabase
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            from supabase import create_client
            supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

            supabase.table('pinterest_auth').upsert({
                'shop_id': shop_id,
                'access_token': tokens['access_token'],
                'refresh_token': tokens.get('refresh_token', ''),
                'expires_in': tokens.get('expires_in', 0),
                'token_type': tokens.get('token_type', 'bearer'),
                'username': user_info.get('username', ''),
                'profile_image': user_info.get('profile_image', '')
            }).execute()

        return redirect(f"{FRONTEND_URL}/shops/{shop_id}?pinterest=connected")

    except Exception as e:
        print(f"Pinterest OAuth error: {e}")
        return redirect(f"{FRONTEND_URL}/shops/{shop_id}?error=oauth_failed&message={str(e)}")


@pinterest_bp.route('/api/oauth/pinterest/refresh', methods=['POST'])
def refresh_token():
    """Refresh Pinterest access token"""
    data = request.json
    refresh_token = data.get('refresh_token')

    if not refresh_token:
        return jsonify({'success': False, 'error': 'Missing refresh_token'}), 400

    try:
        response = requests.post(
            'https://api.pinterest.com/v5/oauth/token',
            data={
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token
            },
            auth=(PINTEREST_APP_ID, PINTEREST_APP_SECRET),
            timeout=10
        )

        if response.ok:
            return jsonify({'success': True, 'tokens': response.json()})
        else:
            return jsonify({
                'success': False,
                'error': 'Token refresh failed'
            }), response.status_code

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pinterest_bp.route('/api/oauth/pinterest/status/<shop_id>')
def get_status(shop_id):
    """Check Pinterest connection status for a shop"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return jsonify({'connected': False, 'error': 'Supabase not configured'})

    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        result = supabase.table('pinterest_auth') \
            .select('username, profile_image, created_at') \
            .eq('shop_id', shop_id) \
            .single() \
            .execute()

        if result.data:
            return jsonify({
                'connected': True,
                'username': result.data.get('username', ''),
                'profile_image': result.data.get('profile_image', ''),
                'connected_at': result.data.get('created_at', '')
            })
        else:
            return jsonify({'connected': False})

    except Exception as e:
        return jsonify({'connected': False, 'error': str(e)})
