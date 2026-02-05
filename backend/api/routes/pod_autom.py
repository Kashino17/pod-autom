"""
POD AutoM API Routes
Handles shop management, settings, and Shopify OAuth for POD AutoM
"""
import os
import secrets
import requests
from flask import Blueprint, request, jsonify, redirect
from supabase import create_client, Client
from functools import wraps

pod_autom_bp = Blueprint('pod_autom', __name__)

# Supabase client
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

# Shopify OAuth config
SHOPIFY_API_KEY = os.environ.get('SHOPIFY_API_KEY')
SHOPIFY_API_SECRET = os.environ.get('SHOPIFY_API_SECRET')
SHOPIFY_SCOPES = 'read_products,write_products,read_orders,read_inventory'
SHOPIFY_API_VERSION = '2024-01'

# Frontend URLs
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3001')

def get_supabase() -> Client:
    """Get Supabase client"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise Exception('Missing Supabase configuration')
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def verify_auth_token(f):
    """Decorator to verify Supabase auth token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]

        try:
            supabase = get_supabase()
            # Verify the token and get user
            user_response = supabase.auth.get_user(token)
            if not user_response or not user_response.user:
                return jsonify({'error': 'Invalid token'}), 401

            # Add user to request context
            request.user = user_response.user
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': f'Authentication failed: {str(e)}'}), 401

    return decorated


def clean_domain(shop_domain: str) -> str:
    """Clean and normalize shop domain"""
    domain = shop_domain.strip().lower()
    domain = domain.replace('https://', '').replace('http://', '')
    domain = domain.rstrip('/')

    if not domain.endswith('.myshopify.com'):
        domain = f"{domain}.myshopify.com"

    return domain


# =====================================================
# SHOPIFY OAUTH ROUTES
# =====================================================

@pod_autom_bp.route('/api/pod-autom/shopify/install', methods=['GET'])
def shopify_install():
    """Start Shopify OAuth flow"""
    shop = request.args.get('shop')
    user_id = request.args.get('user_id')

    if not shop:
        return jsonify({'error': 'Missing shop parameter'}), 400

    if not user_id:
        return jsonify({'error': 'Missing user_id parameter'}), 400

    if not SHOPIFY_API_KEY:
        return jsonify({'error': 'Shopify not configured'}), 500

    clean_shop = clean_domain(shop)

    # Generate state with user_id for callback
    state = f"{secrets.token_urlsafe(16)}:{user_id}"

    # Store state in session or database for verification
    try:
        supabase = get_supabase()
        supabase.table('pod_autom_oauth_states').insert({
            'state': state,
            'user_id': user_id,
            'shop_domain': clean_shop
        }).execute()
    except Exception as e:
        print(f"Warning: Could not store OAuth state: {e}")

    # Build authorization URL
    redirect_uri = f"{os.environ.get('API_URL', 'http://localhost:5001')}/api/pod-autom/shopify/callback"
    auth_url = (
        f"https://{clean_shop}/admin/oauth/authorize"
        f"?client_id={SHOPIFY_API_KEY}"
        f"&scope={SHOPIFY_SCOPES}"
        f"&redirect_uri={redirect_uri}"
        f"&state={state}"
    )

    return redirect(auth_url)


@pod_autom_bp.route('/api/pod-autom/shopify/callback', methods=['GET'])
def shopify_callback():
    """Handle Shopify OAuth callback"""
    code = request.args.get('code')
    shop = request.args.get('shop')
    state = request.args.get('state')

    if not code or not shop or not state:
        return redirect(f"{FRONTEND_URL}/onboarding?error=missing_params")

    # Extract user_id from state
    try:
        _, user_id = state.rsplit(':', 1)
    except ValueError:
        return redirect(f"{FRONTEND_URL}/onboarding?error=invalid_state")

    clean_shop = clean_domain(shop)

    # Exchange code for access token
    try:
        token_response = requests.post(
            f"https://{clean_shop}/admin/oauth/access_token",
            json={
                'client_id': SHOPIFY_API_KEY,
                'client_secret': SHOPIFY_API_SECRET,
                'code': code
            },
            timeout=30
        )

        if not token_response.ok:
            return redirect(f"{FRONTEND_URL}/onboarding?error=token_exchange_failed")

        token_data = token_response.json()
        access_token = token_data.get('access_token')

        if not access_token:
            return redirect(f"{FRONTEND_URL}/onboarding?error=no_access_token")

        # Get shop info
        shop_response = requests.get(
            f"https://{clean_shop}/admin/api/{SHOPIFY_API_VERSION}/shop.json",
            headers={'X-Shopify-Access-Token': access_token},
            timeout=10
        )

        shop_info = {}
        if shop_response.ok:
            shop_info = shop_response.json().get('shop', {})

        # Save shop to database
        supabase = get_supabase()

        # Check if shop already exists for this user
        existing = supabase.table('pod_autom_shops').select('id').eq(
            'user_id', user_id
        ).eq('shop_domain', clean_shop).execute()

        if existing.data:
            # Update existing shop
            supabase.table('pod_autom_shops').update({
                'access_token': access_token,
                'connection_status': 'connected',
                'internal_name': shop_info.get('name', clean_shop),
                'updated_at': 'now()'
            }).eq('id', existing.data[0]['id']).execute()
            shop_id = existing.data[0]['id']
        else:
            # Create new shop
            result = supabase.table('pod_autom_shops').insert({
                'user_id': user_id,
                'shop_domain': clean_shop,
                'access_token': access_token,
                'connection_status': 'connected',
                'internal_name': shop_info.get('name', clean_shop)
            }).execute()
            shop_id = result.data[0]['id']

        # Clean up OAuth state
        try:
            supabase.table('pod_autom_oauth_states').delete().eq('state', state).execute()
        except Exception:
            pass

        return redirect(f"{FRONTEND_URL}/onboarding?shop_connected=true&shop_id={shop_id}")

    except Exception as e:
        print(f"Shopify OAuth error: {e}")
        return redirect(f"{FRONTEND_URL}/onboarding?error=oauth_failed")


# =====================================================
# SHOP MANAGEMENT ROUTES
# =====================================================

@pod_autom_bp.route('/api/pod-autom/shops', methods=['GET'])
@verify_auth_token
def get_shops():
    """Get all shops for authenticated user"""
    try:
        supabase = get_supabase()
        result = supabase.table('pod_autom_shops').select(
            'id, shop_domain, internal_name, connection_status, created_at'
        ).eq('user_id', request.user.id).execute()

        return jsonify({
            'success': True,
            'shops': result.data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/shops', methods=['POST'])
@verify_auth_token
def create_shop():
    """Create a new shop (manual connection with access token)"""
    try:
        data = request.json
        shop_domain = data.get('shop_domain')
        access_token = data.get('access_token')
        internal_name = data.get('internal_name')

        if not shop_domain or not access_token:
            return jsonify({'success': False, 'error': 'Missing shop_domain or access_token'}), 400

        clean_shop = clean_domain(shop_domain)

        # Test connection
        test_response = requests.get(
            f"https://{clean_shop}/admin/api/{SHOPIFY_API_VERSION}/shop.json",
            headers={'X-Shopify-Access-Token': access_token},
            timeout=10
        )

        if not test_response.ok:
            return jsonify({
                'success': False,
                'error': 'Verbindung fehlgeschlagen - Pruefe Domain und Access Token'
            }), 400

        shop_info = test_response.json().get('shop', {})

        # Save to database
        supabase = get_supabase()

        # Check if already exists
        existing = supabase.table('pod_autom_shops').select('id').eq(
            'user_id', request.user.id
        ).eq('shop_domain', clean_shop).execute()

        if existing.data:
            return jsonify({
                'success': False,
                'error': 'Dieser Shop ist bereits verbunden'
            }), 400

        result = supabase.table('pod_autom_shops').insert({
            'user_id': request.user.id,
            'shop_domain': clean_shop,
            'access_token': access_token,
            'connection_status': 'connected',
            'internal_name': internal_name or shop_info.get('name', clean_shop)
        }).execute()

        return jsonify({
            'success': True,
            'shop': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/shops/<shop_id>', methods=['DELETE'])
@verify_auth_token
def delete_shop(shop_id):
    """Delete a shop"""
    try:
        supabase = get_supabase()

        # Verify ownership
        existing = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not existing.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Delete shop (cascade will handle related records)
        supabase.table('pod_autom_shops').delete().eq('id', shop_id).execute()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/shops/<shop_id>/test', methods=['POST'])
@verify_auth_token
def test_shop_connection(shop_id):
    """Test shop connection"""
    try:
        supabase = get_supabase()

        # Get shop
        result = supabase.table('pod_autom_shops').select(
            'shop_domain, access_token'
        ).eq('id', shop_id).eq('user_id', request.user.id).execute()

        if not result.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        shop = result.data[0]

        # Test connection
        test_response = requests.get(
            f"https://{shop['shop_domain']}/admin/api/{SHOPIFY_API_VERSION}/shop.json",
            headers={'X-Shopify-Access-Token': shop['access_token']},
            timeout=10
        )

        if test_response.ok:
            # Update status
            supabase.table('pod_autom_shops').update({
                'connection_status': 'connected'
            }).eq('id', shop_id).execute()

            return jsonify({
                'success': True,
                'status': 'connected',
                'shop': test_response.json().get('shop', {})
            })
        else:
            # Update status
            supabase.table('pod_autom_shops').update({
                'connection_status': 'error'
            }).eq('id', shop_id).execute()

            return jsonify({
                'success': False,
                'status': 'error',
                'error': 'Verbindung fehlgeschlagen'
            })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# SETTINGS ROUTES
# =====================================================

@pod_autom_bp.route('/api/pod-autom/settings/<shop_id>', methods=['GET'])
@verify_auth_token
def get_settings(shop_id):
    """Get settings for a shop"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Get settings
        result = supabase.table('pod_autom_settings').select('*').eq(
            'shop_id', shop_id
        ).execute()

        return jsonify({
            'success': True,
            'settings': result.data[0] if result.data else None
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/settings/<shop_id>', methods=['PUT'])
@verify_auth_token
def update_settings(shop_id):
    """Update settings for a shop"""
    try:
        data = request.json
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Allowed fields to update
        allowed_fields = [
            'enabled', 'gpt_image_quality', 'creation_limit',
            'auto_publish', 'default_price', 'default_compare_at_price'
        ]

        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data['updated_at'] = 'now()'

        # Check if settings exist
        existing = supabase.table('pod_autom_settings').select('id').eq(
            'shop_id', shop_id
        ).execute()

        if existing.data:
            # Update
            result = supabase.table('pod_autom_settings').update(
                update_data
            ).eq('shop_id', shop_id).execute()
        else:
            # Insert
            update_data['shop_id'] = shop_id
            result = supabase.table('pod_autom_settings').insert(
                update_data
            ).execute()

        return jsonify({
            'success': True,
            'settings': result.data[0] if result.data else None
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# NICHES ROUTES
# =====================================================

@pod_autom_bp.route('/api/pod-autom/niches/<settings_id>', methods=['GET'])
@verify_auth_token
def get_niches(settings_id):
    """Get niches for settings"""
    try:
        supabase = get_supabase()

        # Verify ownership through settings -> shop -> user
        settings = supabase.table('pod_autom_settings').select(
            'id, shop_id, pod_autom_shops(user_id)'
        ).eq('id', settings_id).execute()

        if not settings.data:
            return jsonify({'success': False, 'error': 'Settings nicht gefunden'}), 404

        shop_data = settings.data[0].get('pod_autom_shops', {})
        if shop_data.get('user_id') != request.user.id:
            return jsonify({'success': False, 'error': 'Zugriff verweigert'}), 403

        # Get niches
        result = supabase.table('pod_autom_niches').select('*').eq(
            'settings_id', settings_id
        ).order('created_at').execute()

        return jsonify({
            'success': True,
            'niches': result.data
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/niches/<settings_id>', methods=['POST'])
@verify_auth_token
def create_niche(settings_id):
    """Create a new niche"""
    try:
        data = request.json
        niche_name = data.get('niche_name')

        if not niche_name:
            return jsonify({'success': False, 'error': 'niche_name erforderlich'}), 400

        supabase = get_supabase()

        # Verify ownership
        settings = supabase.table('pod_autom_settings').select(
            'id, shop_id, pod_autom_shops(user_id)'
        ).eq('id', settings_id).execute()

        if not settings.data:
            return jsonify({'success': False, 'error': 'Settings nicht gefunden'}), 404

        shop_data = settings.data[0].get('pod_autom_shops', {})
        if shop_data.get('user_id') != request.user.id:
            return jsonify({'success': False, 'error': 'Zugriff verweigert'}), 403

        # Create niche
        result = supabase.table('pod_autom_niches').insert({
            'settings_id': settings_id,
            'niche_name': niche_name,
            'is_active': True
        }).execute()

        return jsonify({
            'success': True,
            'niche': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/niches/<settings_id>/<niche_id>', methods=['DELETE'])
@verify_auth_token
def delete_niche(settings_id, niche_id):
    """Delete a niche"""
    try:
        supabase = get_supabase()

        # Verify ownership
        settings = supabase.table('pod_autom_settings').select(
            'id, pod_autom_shops(user_id)'
        ).eq('id', settings_id).execute()

        if not settings.data:
            return jsonify({'success': False, 'error': 'Settings nicht gefunden'}), 404

        shop_data = settings.data[0].get('pod_autom_shops', {})
        if shop_data.get('user_id') != request.user.id:
            return jsonify({'success': False, 'error': 'Zugriff verweigert'}), 403

        # Delete niche
        supabase.table('pod_autom_niches').delete().eq('id', niche_id).eq(
            'settings_id', settings_id
        ).execute()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# PROMPTS ROUTES
# =====================================================

@pod_autom_bp.route('/api/pod-autom/prompts/<settings_id>', methods=['GET'])
@verify_auth_token
def get_prompts(settings_id):
    """Get all prompts for settings"""
    try:
        supabase = get_supabase()

        # Verify ownership through settings -> shop -> user
        settings = supabase.table('pod_autom_settings').select(
            'id, shop_id, pod_autom_shops(user_id)'
        ).eq('id', settings_id).execute()

        if not settings.data:
            return jsonify({'success': False, 'error': 'Settings nicht gefunden'}), 404

        shop_data = settings.data[0].get('pod_autom_shops', {})
        if shop_data.get('user_id') != request.user.id:
            return jsonify({'success': False, 'error': 'Zugriff verweigert'}), 403

        # Get prompts
        result = supabase.table('pod_autom_prompts').select('*').eq(
            'settings_id', settings_id
        ).order('created_at').execute()

        return jsonify({
            'success': True,
            'prompts': result.data
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/prompts/<settings_id>', methods=['POST'])
@verify_auth_token
def create_prompt(settings_id):
    """Create a new prompt"""
    try:
        data = request.json
        prompt_name = data.get('prompt_name')
        prompt_type = data.get('prompt_type', 'title')  # 'title', 'description', 'image'
        prompt_text = data.get('prompt_text')

        if not prompt_name or not prompt_text:
            return jsonify({
                'success': False,
                'error': 'prompt_name und prompt_text erforderlich'
            }), 400

        supabase = get_supabase()

        # Verify ownership
        settings = supabase.table('pod_autom_settings').select(
            'id, shop_id, pod_autom_shops(user_id)'
        ).eq('id', settings_id).execute()

        if not settings.data:
            return jsonify({'success': False, 'error': 'Settings nicht gefunden'}), 404

        shop_data = settings.data[0].get('pod_autom_shops', {})
        if shop_data.get('user_id') != request.user.id:
            return jsonify({'success': False, 'error': 'Zugriff verweigert'}), 403

        # Create prompt
        result = supabase.table('pod_autom_prompts').insert({
            'settings_id': settings_id,
            'prompt_name': prompt_name,
            'prompt_type': prompt_type,
            'prompt_text': prompt_text,
            'is_active': True
        }).execute()

        return jsonify({
            'success': True,
            'prompt': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/prompts/<settings_id>/<prompt_id>', methods=['PUT'])
@verify_auth_token
def update_prompt(settings_id, prompt_id):
    """Update a prompt"""
    try:
        data = request.json
        supabase = get_supabase()

        # Verify ownership
        settings = supabase.table('pod_autom_settings').select(
            'id, pod_autom_shops(user_id)'
        ).eq('id', settings_id).execute()

        if not settings.data:
            return jsonify({'success': False, 'error': 'Settings nicht gefunden'}), 404

        shop_data = settings.data[0].get('pod_autom_shops', {})
        if shop_data.get('user_id') != request.user.id:
            return jsonify({'success': False, 'error': 'Zugriff verweigert'}), 403

        # Allowed fields to update
        allowed_fields = ['prompt_name', 'prompt_type', 'prompt_text', 'is_active']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data['updated_at'] = 'now()'

        # Update prompt
        result = supabase.table('pod_autom_prompts').update(
            update_data
        ).eq('id', prompt_id).eq('settings_id', settings_id).execute()

        if not result.data:
            return jsonify({'success': False, 'error': 'Prompt nicht gefunden'}), 404

        return jsonify({
            'success': True,
            'prompt': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/prompts/<settings_id>/<prompt_id>', methods=['DELETE'])
@verify_auth_token
def delete_prompt(settings_id, prompt_id):
    """Delete a prompt"""
    try:
        supabase = get_supabase()

        # Verify ownership
        settings = supabase.table('pod_autom_settings').select(
            'id, pod_autom_shops(user_id)'
        ).eq('id', settings_id).execute()

        if not settings.data:
            return jsonify({'success': False, 'error': 'Settings nicht gefunden'}), 404

        shop_data = settings.data[0].get('pod_autom_shops', {})
        if shop_data.get('user_id') != request.user.id:
            return jsonify({'success': False, 'error': 'Zugriff verweigert'}), 403

        # Delete prompt
        supabase.table('pod_autom_prompts').delete().eq('id', prompt_id).eq(
            'settings_id', settings_id
        ).execute()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# PRODUCTS QUEUE ROUTES
# =====================================================

@pod_autom_bp.route('/api/pod-autom/products/<shop_id>/queue', methods=['GET'])
@verify_auth_token
def get_product_queue(shop_id):
    """Get product queue for a shop"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Get products from queue
        result = supabase.table('pod_autom_product_queue').select(
            'id, title, niche, image_url, status, progress, current_step, '
            'shopify_product_id, shopify_url, error, created_at, updated_at'
        ).eq('shop_id', shop_id).order('created_at', desc=True).limit(100).execute()

        # Get stats
        stats_result = supabase.rpc('get_pod_autom_queue_stats', {
            'p_shop_id': shop_id
        }).execute()

        stats = stats_result.data[0] if stats_result.data else {
            'pending': 0,
            'generating': 0,
            'optimizing': 0,
            'publishing': 0,
            'published': 0,
            'failed': 0
        }

        return jsonify({
            'success': True,
            'products': result.data,
            'stats': stats
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/products/<shop_id>/queue/<product_id>/retry', methods=['POST'])
@verify_auth_token
def retry_product(shop_id, product_id):
    """Retry a failed product"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Reset product status
        result = supabase.table('pod_autom_product_queue').update({
            'status': 'pending',
            'progress': 0,
            'current_step': None,
            'error': None,
            'updated_at': 'now()'
        }).eq('id', product_id).eq('shop_id', shop_id).execute()

        if not result.data:
            return jsonify({'success': False, 'error': 'Produkt nicht gefunden'}), 404

        return jsonify({
            'success': True,
            'product': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/products/<shop_id>/queue/<product_id>', methods=['DELETE'])
@verify_auth_token
def delete_queue_product(shop_id, product_id):
    """Delete a product from queue"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Delete product
        supabase.table('pod_autom_product_queue').delete().eq(
            'id', product_id
        ).eq('shop_id', shop_id).execute()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# PINTEREST INTEGRATION ROUTES
# =====================================================

# Pinterest OAuth config
PINTEREST_APP_ID = os.environ.get('PINTEREST_APP_ID', '')
PINTEREST_APP_SECRET = os.environ.get('PINTEREST_APP_SECRET', '')
API_URL = os.environ.get('API_URL', 'http://localhost:5001')

# OAuth state storage (simple in-memory, use Redis in production)
pinterest_oauth_states = {}


@pod_autom_bp.route('/api/pod-autom/pinterest/authorize', methods=['GET'])
def pinterest_authorize():
    """Start Pinterest OAuth flow for POD AutoM"""
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({'error': 'Missing user_id parameter'}), 400

    if not PINTEREST_APP_ID:
        return jsonify({'error': 'Pinterest not configured'}), 500

    # Generate state token
    state = f"pod_autom:{user_id}:{secrets.token_urlsafe(16)}"
    pinterest_oauth_states[state] = {
        'user_id': user_id,
        'created_at': __import__('time').time()
    }

    # Build authorization URL
    scopes = 'ads:read,ads:write,boards:read,boards:write,pins:read,pins:write,user_accounts:read'
    redirect_uri = f"{API_URL}/api/pod-autom/pinterest/callback"

    auth_url = (
        f"https://www.pinterest.com/oauth/?"
        f"response_type=code&"
        f"client_id={PINTEREST_APP_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scopes}&"
        f"state={state}"
    )

    return redirect(auth_url)


@pod_autom_bp.route('/api/pod-autom/pinterest/callback', methods=['GET'])
def pinterest_callback():
    """Handle Pinterest OAuth callback for POD AutoM"""
    from datetime import datetime, timezone, timedelta

    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')

    # Handle error from Pinterest
    if error:
        error_description = request.args.get('error_description', 'Unknown error')
        return redirect(f"{FRONTEND_URL}/settings?pinterest_error={error_description}")

    # Validate state
    if not state or state not in pinterest_oauth_states:
        return redirect(f"{FRONTEND_URL}/settings?pinterest_error=invalid_state")

    # Get user_id from state
    user_id = pinterest_oauth_states[state]['user_id']
    del pinterest_oauth_states[state]

    if not code:
        return redirect(f"{FRONTEND_URL}/settings?pinterest_error=no_code")

    try:
        # Exchange code for tokens
        redirect_uri = f"{API_URL}/api/pod-autom/pinterest/callback"

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
            return redirect(f"{FRONTEND_URL}/settings?pinterest_error=token_exchange_failed")

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

        # Save to pod_autom_ad_platforms table
        supabase = get_supabase()

        # Upsert Pinterest platform for this user
        supabase.table('pod_autom_ad_platforms').upsert({
            'user_id': user_id,
            'platform': 'pinterest',
            'platform_user_id': pinterest_user.get('id'),
            'platform_username': pinterest_user.get('username'),
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_expires_at': expires_at,
            'scopes': ['ads:read', 'ads:write', 'boards:read', 'boards:write', 'pins:read', 'pins:write', 'user_accounts:read'],
            'connection_status': 'connected',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }, on_conflict='user_id,platform').execute()

        return redirect(f"{FRONTEND_URL}/settings?pinterest=connected")

    except Exception as e:
        print(f"Pinterest OAuth error: {str(e)}")
        return redirect(f"{FRONTEND_URL}/settings?pinterest_error=server_error")


@pod_autom_bp.route('/api/pod-autom/pinterest/status', methods=['GET'])
@verify_auth_token
def pinterest_status():
    """Get Pinterest connection status for user"""
    try:
        supabase = get_supabase()

        result = supabase.table('pod_autom_ad_platforms').select(
            'id, platform_user_id, platform_username, ad_account_id, ad_account_name, '
            'connection_status, token_expires_at, last_sync_at'
        ).eq('user_id', request.user.id).eq('platform', 'pinterest').execute()

        if result.data:
            platform = result.data[0]
            return jsonify({
                'success': True,
                'connected': platform['connection_status'] == 'connected',
                'platform': platform
            })

        return jsonify({
            'success': True,
            'connected': False,
            'platform': None
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/pinterest/disconnect', methods=['POST'])
@verify_auth_token
def pinterest_disconnect():
    """Disconnect Pinterest from user account"""
    try:
        supabase = get_supabase()

        supabase.table('pod_autom_ad_platforms').update({
            'access_token': None,
            'refresh_token': None,
            'token_expires_at': None,
            'ad_account_id': None,
            'ad_account_name': None,
            'connection_status': 'disconnected',
            'updated_at': 'now()'
        }).eq('user_id', request.user.id).eq('platform', 'pinterest').execute()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/pinterest/ad-accounts', methods=['GET'])
@verify_auth_token
def pinterest_ad_accounts():
    """Get Pinterest ad accounts for user"""
    from datetime import datetime, timezone

    try:
        supabase = get_supabase()

        # Get access token
        platform_result = supabase.table('pod_autom_ad_platforms').select(
            'access_token, token_expires_at'
        ).eq('user_id', request.user.id).eq('platform', 'pinterest').execute()

        if not platform_result.data or not platform_result.data[0].get('access_token'):
            return jsonify({'success': False, 'error': 'Pinterest nicht verbunden'}), 401

        access_token = platform_result.data[0]['access_token']

        # Check token expiry
        expires_at = platform_result.data[0].get('token_expires_at')
        if expires_at:
            expiry = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) >= expiry:
                return jsonify({'success': False, 'error': 'Token abgelaufen, bitte neu verbinden'}), 401

        # Fetch ad accounts from Pinterest API
        response = requests.get(
            'https://api.pinterest.com/v5/ad_accounts',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=15
        )

        if not response.ok:
            return jsonify({'success': False, 'error': f'Pinterest API Fehler: {response.status_code}'}), response.status_code

        pinterest_data = response.json()
        ad_accounts = pinterest_data.get('items', [])

        return jsonify({
            'success': True,
            'ad_accounts': ad_accounts
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/pinterest/select-ad-account', methods=['POST'])
@verify_auth_token
def pinterest_select_ad_account():
    """Select an ad account for the user"""
    try:
        data = request.json
        ad_account_id = data.get('ad_account_id')
        ad_account_name = data.get('ad_account_name')

        if not ad_account_id:
            return jsonify({'success': False, 'error': 'ad_account_id erforderlich'}), 400

        supabase = get_supabase()

        supabase.table('pod_autom_ad_platforms').update({
            'ad_account_id': ad_account_id,
            'ad_account_name': ad_account_name,
            'updated_at': 'now()'
        }).eq('user_id', request.user.id).eq('platform', 'pinterest').execute()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/pinterest/boards', methods=['GET'])
@verify_auth_token
def pinterest_boards():
    """Get Pinterest boards for user"""
    try:
        supabase = get_supabase()

        # Get access token
        platform_result = supabase.table('pod_autom_ad_platforms').select(
            'access_token'
        ).eq('user_id', request.user.id).eq('platform', 'pinterest').execute()

        if not platform_result.data or not platform_result.data[0].get('access_token'):
            return jsonify({'success': False, 'error': 'Pinterest nicht verbunden'}), 401

        access_token = platform_result.data[0]['access_token']

        # Fetch boards from Pinterest API
        response = requests.get(
            'https://api.pinterest.com/v5/boards',
            headers={'Authorization': f'Bearer {access_token}'},
            params={'page_size': 100},
            timeout=15
        )

        if not response.ok:
            return jsonify({'success': False, 'error': f'Pinterest API Fehler: {response.status_code}'}), response.status_code

        pinterest_data = response.json()
        boards = pinterest_data.get('items', [])

        return jsonify({
            'success': True,
            'boards': boards
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# WINNER SCALING ROUTES
# =====================================================

@pod_autom_bp.route('/api/pod-autom/winners/<shop_id>', methods=['GET'])
@verify_auth_token
def get_winners(shop_id):
    """Get all winner products for a shop"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Get winners with their campaigns
        result = supabase.table('winner_products').select(
            'id, product_id, collection_id, product_title, product_handle, '
            'shopify_image_url, identified_at, is_active, sales_3d, sales_7d, '
            'sales_10d, sales_14d, buckets_passed, winner_campaigns(id, campaign_name, '
            'creative_type, link_type, status, daily_budget, created_at)'
        ).eq('shop_id', shop_id).order('identified_at', desc=True).execute()

        # Get settings
        settings_result = supabase.table('pod_autom_settings').select(
            'id, winner_scaling_enabled, winner_thresholds, winner_limits'
        ).eq('shop_id', shop_id).execute()

        settings = settings_result.data[0] if settings_result.data else None

        return jsonify({
            'success': True,
            'winners': result.data,
            'settings': settings
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/winners/<shop_id>/stats', methods=['GET'])
@verify_auth_token
def get_winner_stats(shop_id):
    """Get winner scaling statistics"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Get winner counts
        winners_result = supabase.table('winner_products').select(
            'id, is_active'
        ).eq('shop_id', shop_id).execute()

        total_winners = len(winners_result.data)
        active_winners = len([w for w in winners_result.data if w.get('is_active')])

        # Get campaign counts
        campaigns_result = supabase.table('winner_campaigns').select(
            'id, status, creative_type'
        ).eq('shop_id', shop_id).execute()

        total_campaigns = len(campaigns_result.data)
        active_campaigns = len([c for c in campaigns_result.data if c.get('status') == 'ACTIVE'])
        video_campaigns = len([c for c in campaigns_result.data if c.get('creative_type') == 'video'])
        image_campaigns = len([c for c in campaigns_result.data if c.get('creative_type') == 'image'])

        # Get recent activity from winner_scaling_log
        log_result = supabase.table('winner_scaling_log').select(
            'id, action_type, details, executed_at'
        ).eq('shop_id', shop_id).order('executed_at', desc=True).limit(20).execute()

        return jsonify({
            'success': True,
            'stats': {
                'total_winners': total_winners,
                'active_winners': active_winners,
                'total_campaigns': total_campaigns,
                'active_campaigns': active_campaigns,
                'video_campaigns': video_campaigns,
                'image_campaigns': image_campaigns
            },
            'recent_activity': log_result.data
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/winners/<shop_id>/settings', methods=['GET'])
@verify_auth_token
def get_winner_settings(shop_id):
    """Get winner scaling settings for a shop"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Get settings
        result = supabase.table('pod_autom_settings').select(
            'id, winner_scaling_enabled, winner_thresholds, winner_limits, '
            'winner_video_enabled, winner_image_enabled, winner_video_prompt, '
            'winner_image_prompt, winner_daily_budget'
        ).eq('shop_id', shop_id).execute()

        if not result.data:
            return jsonify({
                'success': True,
                'settings': None
            })

        return jsonify({
            'success': True,
            'settings': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/winners/<shop_id>/settings', methods=['PUT'])
@verify_auth_token
def update_winner_settings(shop_id):
    """Update winner scaling settings"""
    try:
        data = request.json
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Allowed fields to update
        allowed_fields = [
            'winner_scaling_enabled', 'winner_thresholds', 'winner_limits',
            'winner_video_enabled', 'winner_image_enabled', 'winner_video_prompt',
            'winner_image_prompt', 'winner_daily_budget'
        ]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data['updated_at'] = 'now()'

        # Update settings
        result = supabase.table('pod_autom_settings').update(
            update_data
        ).eq('shop_id', shop_id).execute()

        if not result.data:
            return jsonify({'success': False, 'error': 'Settings nicht gefunden'}), 404

        return jsonify({
            'success': True,
            'settings': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/winners/<shop_id>/<winner_id>/toggle', methods=['POST'])
@verify_auth_token
def toggle_winner(shop_id, winner_id):
    """Toggle winner active status"""
    try:
        data = request.json
        is_active = data.get('is_active', True)

        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Update winner
        result = supabase.table('winner_products').update({
            'is_active': is_active,
            'updated_at': 'now()'
        }).eq('id', winner_id).eq('shop_id', shop_id).execute()

        if not result.data:
            return jsonify({'success': False, 'error': 'Winner nicht gefunden'}), 404

        return jsonify({
            'success': True,
            'winner': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/winners/<shop_id>/campaigns/<campaign_id>/pause', methods=['POST'])
@verify_auth_token
def pause_campaign(shop_id, campaign_id):
    """Pause a winner campaign"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Update campaign status
        result = supabase.table('winner_campaigns').update({
            'status': 'PAUSED',
            'updated_at': 'now()'
        }).eq('id', campaign_id).eq('shop_id', shop_id).execute()

        if not result.data:
            return jsonify({'success': False, 'error': 'Kampagne nicht gefunden'}), 404

        return jsonify({
            'success': True,
            'campaign': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# CAMPAIGN MANAGEMENT ROUTES
# =====================================================

@pod_autom_bp.route('/api/pod-autom/campaigns/<shop_id>', methods=['GET'])
@verify_auth_token
def get_campaigns(shop_id):
    """Get all campaigns for a shop"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Get filter params
        status = request.args.get('status')
        platform = request.args.get('platform', 'pinterest')
        campaign_type = request.args.get('type')

        # Build query
        query = supabase.table('pod_autom_campaigns').select(
            'id, name, description, platform, external_campaign_id, status, sync_status, '
            'daily_budget, currency, targeting, campaign_type, campaign_objective, '
            'total_spend, total_impressions, total_clicks, total_conversions, total_revenue, '
            'roas, ctr, cpc, start_date, end_date, last_sync_at, created_at, updated_at'
        ).eq('shop_id', shop_id)

        if status:
            query = query.eq('status', status)
        if platform:
            query = query.eq('platform', platform)
        if campaign_type:
            query = query.eq('campaign_type', campaign_type)

        result = query.order('created_at', desc=True).execute()

        # Get stats
        stats_result = supabase.rpc('get_pod_autom_campaign_stats', {
            'p_shop_id': shop_id
        }).execute()

        stats = stats_result.data[0] if stats_result.data else {
            'total_campaigns': 0,
            'active_campaigns': 0,
            'paused_campaigns': 0,
            'total_spend': 0,
            'total_conversions': 0,
            'avg_roas': 0
        }

        return jsonify({
            'success': True,
            'campaigns': result.data,
            'stats': stats
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/campaigns/<shop_id>/<campaign_id>', methods=['GET'])
@verify_auth_token
def get_campaign(shop_id, campaign_id):
    """Get a single campaign with pins"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Get campaign with pins
        result = supabase.table('pod_autom_campaigns').select(
            '*, pod_autom_campaign_pins(id, title, description, link_url, image_url, '
            'video_url, creative_type, status, impressions, clicks, conversions, spend)'
        ).eq('id', campaign_id).eq('shop_id', shop_id).execute()

        if not result.data:
            return jsonify({'success': False, 'error': 'Kampagne nicht gefunden'}), 404

        return jsonify({
            'success': True,
            'campaign': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/campaigns/<shop_id>', methods=['POST'])
@verify_auth_token
def create_campaign(shop_id):
    """Create a new campaign"""
    try:
        data = request.json
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Validate required fields
        name = data.get('name')
        if not name:
            return jsonify({'success': False, 'error': 'Name erforderlich'}), 400

        # Create campaign
        campaign_data = {
            'shop_id': shop_id,
            'user_id': request.user.id,
            'name': name,
            'description': data.get('description'),
            'platform': data.get('platform', 'pinterest'),
            'status': data.get('status', 'DRAFT'),
            'daily_budget': data.get('daily_budget', 10.00),
            'currency': data.get('currency', 'EUR'),
            'targeting': data.get('targeting', {
                'countries': ['DE'],
                'age_min': 18,
                'age_max': 65,
                'genders': ['all'],
                'interests': [],
                'keywords': []
            }),
            'campaign_type': data.get('campaign_type', 'standard'),
            'campaign_objective': data.get('campaign_objective', 'CONVERSIONS'),
            'collection_id': data.get('collection_id'),
            'product_ids': data.get('product_ids', []),
            'start_date': data.get('start_date'),
            'end_date': data.get('end_date')
        }

        result = supabase.table('pod_autom_campaigns').insert(campaign_data).execute()

        return jsonify({
            'success': True,
            'campaign': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/campaigns/<shop_id>/<campaign_id>', methods=['PUT'])
@verify_auth_token
def update_campaign(shop_id, campaign_id):
    """Update a campaign"""
    try:
        data = request.json
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Allowed fields to update
        allowed_fields = [
            'name', 'description', 'status', 'daily_budget', 'lifetime_budget',
            'targeting', 'campaign_objective', 'collection_id', 'product_ids',
            'start_date', 'end_date'
        ]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data['updated_at'] = 'now()'

        result = supabase.table('pod_autom_campaigns').update(
            update_data
        ).eq('id', campaign_id).eq('shop_id', shop_id).execute()

        if not result.data:
            return jsonify({'success': False, 'error': 'Kampagne nicht gefunden'}), 404

        return jsonify({
            'success': True,
            'campaign': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/campaigns/<shop_id>/<campaign_id>/status', methods=['POST'])
@verify_auth_token
def update_campaign_status(shop_id, campaign_id):
    """Update campaign status (activate, pause, archive)"""
    try:
        data = request.json
        new_status = data.get('status')

        if new_status not in ['ACTIVE', 'PAUSED', 'ARCHIVED']:
            return jsonify({'success': False, 'error': 'Ungueltiger Status'}), 400

        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Update status
        result = supabase.table('pod_autom_campaigns').update({
            'status': new_status,
            'updated_at': 'now()'
        }).eq('id', campaign_id).eq('shop_id', shop_id).execute()

        if not result.data:
            return jsonify({'success': False, 'error': 'Kampagne nicht gefunden'}), 404

        # Log the status change
        supabase.table('pod_autom_campaign_sync_log').insert({
            'campaign_id': campaign_id,
            'shop_id': shop_id,
            'sync_type': 'status',
            'sync_status': 'success',
            'metrics_before': {'status': result.data[0].get('status')},
            'metrics_after': {'status': new_status}
        }).execute()

        return jsonify({
            'success': True,
            'campaign': result.data[0]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/campaigns/<shop_id>/<campaign_id>', methods=['DELETE'])
@verify_auth_token
def delete_campaign(shop_id, campaign_id):
    """Delete a campaign"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Delete campaign (cascade will delete pins)
        supabase.table('pod_autom_campaigns').delete().eq(
            'id', campaign_id
        ).eq('shop_id', shop_id).execute()

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/campaigns/<shop_id>/sync-log', methods=['GET'])
@verify_auth_token
def get_campaign_sync_log(shop_id):
    """Get campaign sync log for a shop"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Get sync logs
        result = supabase.table('pod_autom_campaign_sync_log').select(
            'id, campaign_id, sync_type, sync_status, pins_synced, pins_failed, '
            'error_message, started_at, completed_at, created_at'
        ).eq('shop_id', shop_id).order('created_at', desc=True).limit(50).execute()

        return jsonify({
            'success': True,
            'logs': result.data
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================================================
# ADVANCED ANALYTICS ROUTES
# =====================================================

@pod_autom_bp.route('/api/pod-autom/analytics/<shop_id>/overview', methods=['GET'])
@verify_auth_token
def get_analytics_overview(shop_id):
    """Get comprehensive analytics overview"""
    from datetime import datetime, timezone, timedelta

    try:
        supabase = get_supabase()
        period = request.args.get('period', '30d')

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Calculate date range
        days = {'7d': 7, '30d': 30, '90d': 90}.get(period, 30)
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        # Get product stats by phase
        products_result = supabase.table('pod_autom_products').select(
            'id, phase, status, total_views, total_sales, total_revenue, created_at'
        ).eq('shop_id', shop_id).gte('created_at', start_date).execute()

        products = products_result.data or []

        # Calculate funnel data
        funnel = {
            'created': len(products),
            'start_phase': len([p for p in products if p.get('phase') == 'start_phase']),
            'post_phase': len([p for p in products if p.get('phase') == 'post_phase']),
            'winners': len([p for p in products if p.get('phase') == 'winner']),
            'losers': len([p for p in products if p.get('phase') == 'loser']),
            'archived': len([p for p in products if p.get('phase') == 'archived']),
        }

        # Calculate totals
        total_views = sum(p.get('total_views', 0) or 0 for p in products)
        total_sales = sum(p.get('total_sales', 0) or 0 for p in products)
        total_revenue = sum(float(p.get('total_revenue', 0) or 0) for p in products)

        # Calculate conversion rates
        conversion_rate = (total_sales / total_views * 100) if total_views > 0 else 0
        winner_rate = (funnel['winners'] / funnel['created'] * 100) if funnel['created'] > 0 else 0

        # Get niche performance
        niches_result = supabase.table('pod_autom_niches').select(
            'id, name, total_products, total_sales, total_revenue, is_active'
        ).eq('settings_id', shop_id).execute()

        niches = niches_result.data or []
        niche_performance = [
            {
                'id': n['id'],
                'name': n['name'],
                'products': n.get('total_products', 0) or 0,
                'sales': n.get('total_sales', 0) or 0,
                'revenue': float(n.get('total_revenue', 0) or 0),
                'is_active': n.get('is_active', True)
            }
            for n in niches
        ]

        # Get campaign performance
        campaigns_result = supabase.table('pod_autom_campaigns').select(
            'id, name, status, platform, total_spend, total_impressions, total_clicks, '
            'total_conversions, total_revenue, roas'
        ).eq('shop_id', shop_id).execute()

        campaigns = campaigns_result.data or []

        campaign_totals = {
            'total_spend': sum(float(c.get('total_spend', 0) or 0) for c in campaigns),
            'total_impressions': sum(c.get('total_impressions', 0) or 0 for c in campaigns),
            'total_clicks': sum(c.get('total_clicks', 0) or 0 for c in campaigns),
            'total_conversions': sum(c.get('total_conversions', 0) or 0 for c in campaigns),
            'campaign_revenue': sum(float(c.get('total_revenue', 0) or 0) for c in campaigns),
        }

        # Calculate ROAS
        overall_roas = (campaign_totals['campaign_revenue'] / campaign_totals['total_spend']) if campaign_totals['total_spend'] > 0 else 0

        return jsonify({
            'success': True,
            'period': period,
            'overview': {
                'total_products': len(products),
                'total_views': total_views,
                'total_sales': total_sales,
                'total_revenue': total_revenue,
                'conversion_rate': round(conversion_rate, 2),
                'winner_rate': round(winner_rate, 2),
            },
            'funnel': funnel,
            'campaigns': campaign_totals,
            'roas': round(overall_roas, 2),
            'niche_performance': niche_performance
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/analytics/<shop_id>/timeseries', methods=['GET'])
@verify_auth_token
def get_analytics_timeseries(shop_id):
    """Get time-series analytics data for charts"""
    from datetime import datetime, timezone, timedelta

    try:
        supabase = get_supabase()
        period = request.args.get('period', '30d')

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Calculate date range
        days = {'7d': 7, '30d': 30, '90d': 90}.get(period, 30)
        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Get activity log for time series
        activity_result = supabase.table('pod_autom_activity_log').select(
            'action, status, details, created_at'
        ).eq('shop_id', shop_id).gte('created_at', start_date.isoformat()).order(
            'created_at', desc=False
        ).execute()

        activities = activity_result.data or []

        # Group by date
        daily_data = {}
        for activity in activities:
            date = activity['created_at'][:10]  # Extract YYYY-MM-DD
            if date not in daily_data:
                daily_data[date] = {
                    'date': date,
                    'products_created': 0,
                    'products_published': 0,
                    'sales': 0,
                    'errors': 0
                }

            action = activity.get('action', '')
            if 'product.created' in action:
                daily_data[date]['products_created'] += 1
            elif 'product.published' in action:
                daily_data[date]['products_published'] += 1
            elif 'sale' in action:
                daily_data[date]['sales'] += 1
            elif activity.get('status') == 'error':
                daily_data[date]['errors'] += 1

        # Fill in missing dates
        chart_data = []
        current = start_date
        while current <= datetime.now(timezone.utc):
            date_str = current.strftime('%Y-%m-%d')
            if date_str in daily_data:
                chart_data.append(daily_data[date_str])
            else:
                chart_data.append({
                    'date': date_str,
                    'products_created': 0,
                    'products_published': 0,
                    'sales': 0,
                    'errors': 0
                })
            current += timedelta(days=1)

        return jsonify({
            'success': True,
            'period': period,
            'data': chart_data
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/analytics/<shop_id>/top-products', methods=['GET'])
@verify_auth_token
def get_top_products(shop_id):
    """Get top performing products"""
    try:
        supabase = get_supabase()
        limit = int(request.args.get('limit', 10))
        sort_by = request.args.get('sort', 'revenue')  # revenue, sales, views

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Map sort field
        sort_field = {
            'revenue': 'total_revenue',
            'sales': 'total_sales',
            'views': 'total_views'
        }.get(sort_by, 'total_revenue')

        # Get top products
        result = supabase.table('pod_autom_products').select(
            'id, title, shopify_product_id, generated_image_url, phase, '
            'total_views, total_sales, total_revenue, created_at'
        ).eq('shop_id', shop_id).order(
            sort_field, desc=True
        ).limit(limit).execute()

        return jsonify({
            'success': True,
            'products': result.data,
            'sort_by': sort_by
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@pod_autom_bp.route('/api/pod-autom/analytics/<shop_id>/niche-breakdown', methods=['GET'])
@verify_auth_token
def get_niche_breakdown(shop_id):
    """Get detailed niche performance breakdown"""
    try:
        supabase = get_supabase()

        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', request.user.id).execute()

        if not shop.data:
            return jsonify({'success': False, 'error': 'Shop nicht gefunden'}), 404

        # Get settings ID
        settings_result = supabase.table('pod_autom_settings').select('id').eq(
            'shop_id', shop_id
        ).execute()

        if not settings_result.data:
            return jsonify({'success': True, 'niches': []})

        settings_id = settings_result.data[0]['id']

        # Get niches with product counts by phase
        niches_result = supabase.table('pod_autom_niches').select(
            'id, name, slug, is_active, total_products, total_sales, total_revenue'
        ).eq('settings_id', settings_id).execute()

        niches = niches_result.data or []

        # Enrich with phase breakdown
        enriched_niches = []
        for niche in niches:
            # Get products for this niche
            products = supabase.table('pod_autom_products').select(
                'phase'
            ).eq('niche_id', niche['id']).execute()

            phase_counts = {}
            for p in (products.data or []):
                phase = p.get('phase', 'unknown')
                phase_counts[phase] = phase_counts.get(phase, 0) + 1

            enriched_niches.append({
                'id': niche['id'],
                'name': niche['name'],
                'slug': niche['slug'],
                'is_active': niche.get('is_active', True),
                'total_products': niche.get('total_products', 0) or 0,
                'total_sales': niche.get('total_sales', 0) or 0,
                'total_revenue': float(niche.get('total_revenue', 0) or 0),
                'phase_breakdown': phase_counts,
                'winner_count': phase_counts.get('winner', 0),
                'loser_count': phase_counts.get('loser', 0),
            })

        # Sort by revenue
        enriched_niches.sort(key=lambda x: x['total_revenue'], reverse=True)

        return jsonify({
            'success': True,
            'niches': enriched_niches
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
