"""
Pinterest OAuth Routes
Handles Pinterest OAuth2 authorization flow and API operations
"""
import os
import secrets
import time
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, redirect, jsonify
import requests

pinterest_bp = Blueprint('pinterest', __name__)

# OAuth state storage (in production, use Redis)
oauth_states = {}

# Environment variables
PINTEREST_APP_ID = os.environ.get('PINTEREST_APP_ID', '')
PINTEREST_APP_SECRET = os.environ.get('PINTEREST_APP_SECRET', '')
API_URL = os.environ.get('API_URL', 'http://localhost:5001')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')

def get_supabase_client():
    """Get Supabase client if configured"""
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return None


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

        # Calculate expiry timestamp
        expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()
        scopes_list = ['ads:read', 'ads:write', 'boards:read', 'boards:write', 'pins:read', 'pins:write', 'user_accounts:read']

        # Save tokens to Supabase
        supabase = get_supabase_client()
        if supabase:
            supabase.table('pinterest_auth').upsert({
                'shop_id': shop_id,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_at': expires_at,
                'scopes': scopes_list,
                'pinterest_user_id': pinterest_user.get('id'),
                'pinterest_username': pinterest_user.get('username'),
                'is_connected': True,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }, on_conflict='shop_id').execute()

        return redirect(f"{FRONTEND_URL}?shop={shop_id}&pinterest=connected")

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


@pinterest_bp.route('/api/pinterest/disconnect', methods=['POST'])
def disconnect():
    """Disconnect Pinterest from shop"""
    try:
        data = request.json
        shop_id = data.get('shop_id')

        if not shop_id:
            return jsonify({'error': 'Missing shop_id'}), 400

        supabase = get_supabase_client()
        if supabase:
            # Clear auth tokens
            supabase.table('pinterest_auth').update({
                'access_token': None,
                'refresh_token': None,
                'expires_at': None,
                'pinterest_user_id': None,
                'pinterest_username': None,
                'is_connected': False,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('shop_id', shop_id).execute()

            # Clear ad accounts
            supabase.table('pinterest_ad_accounts').delete().eq('shop_id', shop_id).execute()

            # Clear campaigns
            supabase.table('pinterest_campaigns').delete().eq('shop_id', shop_id).execute()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pinterest_bp.route('/api/pinterest/ad-accounts', methods=['POST'])
def get_ad_accounts():
    """Get Pinterest Ad Accounts for a shop"""
    try:
        data = request.json
        shop_id = data.get('shop_id')

        if not shop_id:
            return jsonify({'error': 'Missing shop_id'}), 400

        supabase = get_supabase_client()
        if not supabase:
            return jsonify({'error': 'Supabase not configured'}), 500

        # Get access token from Supabase
        auth_result = supabase.table('pinterest_auth').select('access_token, expires_at').eq('shop_id', shop_id).single().execute()

        if not auth_result.data or not auth_result.data.get('access_token'):
            return jsonify({'error': 'Pinterest not connected'}), 401

        access_token = auth_result.data['access_token']

        # Check if token expired
        expires_at = auth_result.data.get('expires_at')
        if expires_at:
            expiry = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) >= expiry:
                return jsonify({'error': 'Token expired, please reconnect'}), 401

        # Fetch ad accounts from Pinterest API
        response = requests.get(
            'https://api.pinterest.com/v5/ad_accounts',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=15
        )

        if not response.ok:
            return jsonify({'error': f'Pinterest API error: {response.status_code}'}), response.status_code

        pinterest_data = response.json()
        ad_accounts = pinterest_data.get('items', [])

        # Sync to Supabase
        for account in ad_accounts:
            supabase.table('pinterest_ad_accounts').upsert({
                'shop_id': shop_id,
                'pinterest_account_id': account.get('id'),
                'name': account.get('name', 'Unnamed Account'),
                'country': account.get('country', 'US'),
                'currency': account.get('currency', 'USD'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            }, on_conflict='shop_id,pinterest_account_id').execute()

        return jsonify({
            'success': True,
            'ad_accounts': ad_accounts
        })

    except Exception as e:
        print(f"Error fetching ad accounts: {e}")
        return jsonify({'error': str(e)}), 500


@pinterest_bp.route('/api/pinterest/campaigns', methods=['POST'])
def get_campaigns():
    """Get Pinterest Campaigns for an ad account - returns directly from Pinterest API without storing"""
    try:
        data = request.json
        shop_id = data.get('shop_id')
        pinterest_account_id = data.get('ad_account_id')

        if not shop_id or not pinterest_account_id:
            return jsonify({'error': 'Missing shop_id or ad_account_id'}), 400

        supabase = get_supabase_client()
        if not supabase:
            return jsonify({'error': 'Supabase not configured'}), 500

        # Get access token
        auth_result = supabase.table('pinterest_auth').select('access_token').eq('shop_id', shop_id).single().execute()

        if not auth_result.data or not auth_result.data.get('access_token'):
            return jsonify({'error': 'Pinterest not connected'}), 401

        access_token = auth_result.data['access_token']

        # Fetch ALL campaigns from Pinterest API with pagination
        all_campaigns = []
        bookmark = None

        while True:
            params = {'page_size': 100}  # Max page size
            if bookmark:
                params['bookmark'] = bookmark

            response = requests.get(
                f'https://api.pinterest.com/v5/ad_accounts/{pinterest_account_id}/campaigns',
                headers={'Authorization': f'Bearer {access_token}'},
                params=params,
                timeout=15
            )

            if not response.ok:
                return jsonify({'error': f'Pinterest API error: {response.status_code}'}), response.status_code

            pinterest_data = response.json()
            campaigns = pinterest_data.get('items', [])
            all_campaigns.extend(campaigns)

            # Check for next page
            bookmark = pinterest_data.get('bookmark')
            if not bookmark:
                break

        # Return all campaigns directly - don't store in Supabase
        # Only linked campaigns will be stored when user creates a sync assignment
        return jsonify({
            'success': True,
            'campaigns': all_campaigns
        })

    except Exception as e:
        print(f"Error fetching campaigns: {e}")
        return jsonify({'error': str(e)}), 500


@pinterest_bp.route('/api/pinterest/select-ad-account', methods=['POST'])
def select_ad_account():
    """Set selected ad account for a shop"""
    try:
        data = request.json
        shop_id = data.get('shop_id')
        ad_account_id = data.get('ad_account_id')

        if not shop_id or not ad_account_id:
            return jsonify({'error': 'Missing shop_id or ad_account_id'}), 400

        supabase = get_supabase_client()
        if not supabase:
            return jsonify({'error': 'Supabase not configured'}), 500

        # Deselect all ad accounts for this shop
        supabase.table('pinterest_ad_accounts').update({
            'is_selected': False
        }).eq('shop_id', shop_id).execute()

        # Select the chosen one
        supabase.table('pinterest_ad_accounts').update({
            'is_selected': True
        }).eq('shop_id', shop_id).eq('pinterest_account_id', ad_account_id).execute()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pinterest_bp.route('/api/pinterest/sync-campaigns', methods=['POST'])
def sync_campaigns():
    """
    Sync all active Pinterest campaigns to the database.
    Fetches campaigns from Pinterest API and stores them in pinterest_campaigns table.
    """
    try:
        data = request.json
        shop_id = data.get('shop_id')

        if not shop_id:
            return jsonify({'error': 'Missing shop_id'}), 400

        supabase = get_supabase_client()
        if not supabase:
            return jsonify({'error': 'Supabase not configured'}), 500

        # Get access token and selected ad account
        auth_result = supabase.table('pinterest_auth').select('access_token').eq('shop_id', shop_id).single().execute()

        if not auth_result.data or not auth_result.data.get('access_token'):
            return jsonify({'error': 'Pinterest not connected'}), 401

        access_token = auth_result.data['access_token']

        # Get selected ad account
        ad_account_result = supabase.table('pinterest_ad_accounts').select('id, pinterest_account_id').eq('shop_id', shop_id).eq('is_selected', True).single().execute()

        if not ad_account_result.data:
            return jsonify({'error': 'No ad account selected'}), 400

        ad_account_uuid = ad_account_result.data['id']  # Internal UUID
        pinterest_account_id = ad_account_result.data['pinterest_account_id']  # Pinterest's ID for API calls

        # Fetch ALL campaigns from Pinterest API with pagination
        all_campaigns = []
        bookmark = None

        while True:
            params = {'page_size': 100}
            if bookmark:
                params['bookmark'] = bookmark

            response = requests.get(
                f'https://api.pinterest.com/v5/ad_accounts/{pinterest_account_id}/campaigns',
                headers={'Authorization': f'Bearer {access_token}'},
                params=params,
                timeout=15
            )

            if not response.ok:
                return jsonify({'error': f'Pinterest API error: {response.status_code}'}), response.status_code

            pinterest_data = response.json()
            campaigns = pinterest_data.get('items', [])
            all_campaigns.extend(campaigns)

            bookmark = pinterest_data.get('bookmark')
            if not bookmark:
                break

        # Sync campaigns to database
        synced_count = 0
        for campaign in all_campaigns:
            campaign_id = campaign.get('id')
            status = campaign.get('status', 'UNKNOWN')

            # Get daily spend cap (budget) - convert from micro-currency
            daily_spend_cap = campaign.get('daily_spend_cap', 0)
            if daily_spend_cap:
                daily_budget = daily_spend_cap / 1_000_000  # Convert micro to regular currency
            else:
                daily_budget = 0

            # Upsert campaign
            supabase.table('pinterest_campaigns').upsert({
                'shop_id': shop_id,
                'pinterest_campaign_id': campaign_id,
                'ad_account_id': ad_account_uuid,
                'name': campaign.get('name', 'Unnamed Campaign'),
                'status': status,
                'daily_budget': daily_budget
            }, on_conflict='shop_id,pinterest_campaign_id').execute()

            synced_count += 1

        return jsonify({
            'success': True,
            'synced_count': synced_count,
            'campaigns': all_campaigns
        })

    except Exception as e:
        print(f"Error syncing campaigns: {e}")
        return jsonify({'error': str(e)}), 500
