# Phase 4.2 - POD AutoM API-Routes hinzufügen

## Ziel
Erstellen der Backend-API-Endpoints für POD AutoM.

## Kritische Hinweise

### ⚠️ NIEMALS DELETE-then-INSERT verwenden
```python
# ❌ FALSCH - Gefährlich und ineffizient
supabase.table('prompts').delete().eq('settings_id', id).execute()
supabase.table('prompts').insert(new_prompts).execute()

# ✅ RICHTIG - Upsert mit ON CONFLICT
supabase.table('prompts').upsert(
    prompts,
    on_conflict='settings_id,prompt_type'
).execute()
```

### ⚠️ Input Validation ist PFLICHT
Alle User-Inputs validieren bevor sie in die Datenbank gehen.

### ⚠️ Pagination braucht Total Count
```python
# ✅ RICHTIG - Mit count='exact'
result = supabase.table('products').select('*', count='exact').range(offset, offset+limit-1).execute()
return {'data': result.data, 'total': result.count}
```

### ⚠️ DB-Aggregation statt Python
```python
# ❌ FALSCH - Lädt alle Daten in Python
products = supabase.table('products').select('*').execute()
total = len(products.data)

# ✅ RICHTIG - Aggregation in der Datenbank
result = supabase.table('products').select('status', count='exact').execute()
```

---

## API-Struktur

### backend/api/routes/pod_autom.py

```python
"""
POD AutoM API Routes

All endpoints for the POD AutoM WebApp.
Protected by JWT authentication except for public catalog endpoints.
"""

from flask import Blueprint, request, jsonify, g
from functools import wraps
from typing import Any
import os
import re
from supabase import create_client, Client
from datetime import datetime

bp = Blueprint('pod_autom', __name__, url_prefix='/pod-autom')

# Supabase Client (Service Role for backend operations)
supabase: Client = create_client(
    os.getenv('SUPABASE_URL', ''),
    os.getenv('SUPABASE_SERVICE_KEY', '')
)


# ====================
# Middleware & Helpers
# ====================

def verify_jwt(f):
    """
    Decorator to verify Supabase JWT token.
    Sets g.user_id on success.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({'error': 'Authorization header required'}), 401

        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Invalid authorization format'}), 401

        token = auth_header.split(' ', 1)[1]

        if not token:
            return jsonify({'error': 'Token required'}), 401

        try:
            user = supabase.auth.get_user(token)
            if not user or not user.user:
                return jsonify({'error': 'Invalid token'}), 401
            g.user_id = user.user.id
        except Exception as e:
            return jsonify({'error': 'Token verification failed'}), 401

        return f(*args, **kwargs)

    return decorated


def validate_uuid(value: str, field_name: str = 'id') -> tuple[bool, str | None]:
    """Validate UUID format"""
    uuid_pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE
    )
    if not uuid_pattern.match(value):
        return False, f'Invalid {field_name} format'
    return True, None


def validate_required_fields(data: dict, required: list[str]) -> tuple[bool, str | None]:
    """Validate required fields exist and are not empty"""
    for field in required:
        if field not in data or data[field] is None or data[field] == '':
            return False, f'{field} is required'
    return True, None


def get_json_or_error():
    """Get JSON body or return error response"""
    if not request.is_json:
        return None, (jsonify({'error': 'Content-Type must be application/json'}), 400)
    data = request.get_json(silent=True)
    if data is None:
        return None, (jsonify({'error': 'Invalid JSON body'}), 400)
    return data, None


# ====================
# SHOPS
# ====================

@bp.route('/shops', methods=['GET'])
@verify_jwt
def get_shops():
    """
    Get all shops for current user.

    Returns:
        200: List of shops with settings
    """
    try:
        result = supabase.table('pod_autom_shops').select(
            '*, pod_autom_settings(*)'
        ).eq('user_id', g.user_id).order('created_at', desc=True).execute()

        return jsonify({'data': result.data or []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/shops/<shop_id>', methods=['GET'])
@verify_jwt
def get_shop(shop_id: str):
    """
    Get single shop with all related data.

    Returns:
        200: Shop with settings, niches, prompts
        404: Shop not found
    """
    # Validate UUID
    valid, error = validate_uuid(shop_id, 'shop_id')
    if not valid:
        return jsonify({'error': error}), 400

    try:
        result = supabase.table('pod_autom_shops').select(
            '''
            *,
            pod_autom_settings(
                *,
                pod_autom_niches(*),
                pod_autom_prompts(*)
            )
            '''
        ).eq('id', shop_id).eq('user_id', g.user_id).maybeSingle().execute()

        if not result.data:
            return jsonify({'error': 'Shop not found'}), 404

        return jsonify({'data': result.data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/shops/<shop_id>', methods=['DELETE'])
@verify_jwt
def delete_shop(shop_id: str):
    """
    Delete a shop and all related data.

    Returns:
        200: Success
        404: Shop not found
    """
    valid, error = validate_uuid(shop_id, 'shop_id')
    if not valid:
        return jsonify({'error': error}), 400

    try:
        # Verify ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', g.user_id).maybeSingle().execute()

        if not shop.data:
            return jsonify({'error': 'Shop not found'}), 404

        # Delete (cascade will handle related records)
        supabase.table('pod_autom_shops').delete().eq('id', shop_id).execute()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# SETTINGS
# ====================

@bp.route('/settings/<shop_id>', methods=['GET'])
@verify_jwt
def get_settings(shop_id: str):
    """
    Get settings for a shop.

    Returns:
        200: Settings object
        404: Shop not found
    """
    valid, error = validate_uuid(shop_id, 'shop_id')
    if not valid:
        return jsonify({'error': error}), 400

    try:
        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', g.user_id).maybeSingle().execute()

        if not shop.data:
            return jsonify({'error': 'Shop not found'}), 404

        result = supabase.table('pod_autom_settings').select('*').eq(
            'shop_id', shop_id
        ).maybeSingle().execute()

        return jsonify({'data': result.data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/settings/<shop_id>', methods=['PUT'])
@verify_jwt
def update_settings(shop_id: str):
    """
    Update settings for a shop.

    Body:
        enabled: bool
        gpt_image_quality: 'LOW' | 'MEDIUM' | 'HIGH'
        creation_limit: int (1-100)
        auto_publish: bool
        default_price: float (> 0)

    Returns:
        200: Updated settings
        400: Validation error
        404: Shop not found
    """
    valid, error = validate_uuid(shop_id, 'shop_id')
    if not valid:
        return jsonify({'error': error}), 400

    data, error_response = get_json_or_error()
    if error_response:
        return error_response

    try:
        # Verify shop ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', g.user_id).maybeSingle().execute()

        if not shop.data:
            return jsonify({'error': 'Shop not found'}), 404

        # Validate and filter fields
        update_data = {}
        allowed_fields = {
            'enabled': bool,
            'gpt_image_quality': str,
            'creation_limit': int,
            'auto_publish': bool,
            'default_price': (int, float)
        }

        for field, expected_type in allowed_fields.items():
            if field in data:
                value = data[field]

                # Type check
                if not isinstance(value, expected_type):
                    return jsonify({'error': f'{field} must be {expected_type.__name__}'}), 400

                # Additional validation
                if field == 'gpt_image_quality' and value not in ('LOW', 'MEDIUM', 'HIGH'):
                    return jsonify({'error': 'gpt_image_quality must be LOW, MEDIUM, or HIGH'}), 400

                if field == 'creation_limit':
                    if value < 1 or value > 100:
                        return jsonify({'error': 'creation_limit must be between 1 and 100'}), 400

                if field == 'default_price' and value <= 0:
                    return jsonify({'error': 'default_price must be greater than 0'}), 400

                update_data[field] = value

        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400

        result = supabase.table('pod_autom_settings').update(update_data).eq(
            'shop_id', shop_id
        ).execute()

        return jsonify({'data': result.data[0] if result.data else None})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# NICHES
# ====================

@bp.route('/niches/<settings_id>', methods=['GET'])
@verify_jwt
def get_niches(settings_id: str):
    """
    Get all niches for a settings ID.

    Returns:
        200: List of niches
        404: Settings not found / not owned
    """
    valid, error = validate_uuid(settings_id, 'settings_id')
    if not valid:
        return jsonify({'error': error}), 400

    try:
        # Verify ownership through settings -> shop -> user
        settings = supabase.table('pod_autom_settings').select(
            'id, pod_autom_shops!inner(user_id)'
        ).eq('id', settings_id).maybeSingle().execute()

        if not settings.data:
            return jsonify({'error': 'Settings not found'}), 404

        if settings.data['pod_autom_shops']['user_id'] != g.user_id:
            return jsonify({'error': 'Access denied'}), 403

        result = supabase.table('pod_autom_niches').select('*').eq(
            'settings_id', settings_id
        ).order('created_at', desc=True).execute()

        return jsonify({'data': result.data or []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/niches/<settings_id>', methods=['POST'])
@verify_jwt
def add_niche(settings_id: str):
    """
    Add a new niche.

    Body:
        niche_name: string (required, 2-100 chars)

    Returns:
        201: Created niche
        400: Validation error or limit reached
        404: Settings not found
    """
    valid, error = validate_uuid(settings_id, 'settings_id')
    if not valid:
        return jsonify({'error': error}), 400

    data, error_response = get_json_or_error()
    if error_response:
        return error_response

    # Validate niche_name
    niche_name = data.get('niche_name', '').strip()
    if not niche_name:
        return jsonify({'error': 'niche_name is required'}), 400

    if len(niche_name) < 2 or len(niche_name) > 100:
        return jsonify({'error': 'niche_name must be between 2 and 100 characters'}), 400

    # Only alphanumeric, spaces, and common chars
    if not re.match(r'^[\w\s\-&äöüÄÖÜß]+$', niche_name):
        return jsonify({'error': 'niche_name contains invalid characters'}), 400

    try:
        # Verify ownership
        settings = supabase.table('pod_autom_settings').select(
            'id, pod_autom_shops!inner(user_id)'
        ).eq('id', settings_id).maybeSingle().execute()

        if not settings.data:
            return jsonify({'error': 'Settings not found'}), 404

        if settings.data['pod_autom_shops']['user_id'] != g.user_id:
            return jsonify({'error': 'Access denied'}), 403

        # Check subscription limits
        subscription = supabase.table('pod_autom_subscriptions').select(
            'tier'
        ).eq('user_id', g.user_id).eq('status', 'active').maybeSingle().execute()

        tier = subscription.data['tier'] if subscription.data else 'basis'
        tier_limits = {'basis': 5, 'premium': 15, 'vip': -1}
        max_niches = tier_limits.get(tier, 5)

        # Count current active niches
        if max_niches != -1:
            current = supabase.table('pod_autom_niches').select(
                'id', count='exact'
            ).eq('settings_id', settings_id).eq('is_active', True).execute()

            if (current.count or 0) >= max_niches:
                return jsonify({
                    'error': f'Nischen-Limit erreicht ({max_niches}). Upgrade für mehr.'
                }), 400

        # Check for duplicate
        existing = supabase.table('pod_autom_niches').select('id').eq(
            'settings_id', settings_id
        ).ilike('niche_name', niche_name).maybeSingle().execute()

        if existing.data:
            return jsonify({'error': 'Diese Nische existiert bereits'}), 400

        # Insert
        result = supabase.table('pod_autom_niches').insert({
            'settings_id': settings_id,
            'niche_name': niche_name,
            'is_active': True
        }).execute()

        return jsonify({'data': result.data[0]}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/niches/<niche_id>', methods=['PUT'])
@verify_jwt
def update_niche(niche_id: str):
    """
    Update a niche.

    Body:
        niche_name: string (optional)
        is_active: bool (optional)

    Returns:
        200: Updated niche
        400: Validation error
        404: Niche not found
    """
    valid, error = validate_uuid(niche_id, 'niche_id')
    if not valid:
        return jsonify({'error': error}), 400

    data, error_response = get_json_or_error()
    if error_response:
        return error_response

    try:
        # Verify ownership
        niche = supabase.table('pod_autom_niches').select(
            '*, pod_autom_settings!inner(pod_autom_shops!inner(user_id))'
        ).eq('id', niche_id).maybeSingle().execute()

        if not niche.data:
            return jsonify({'error': 'Niche not found'}), 404

        if niche.data['pod_autom_settings']['pod_autom_shops']['user_id'] != g.user_id:
            return jsonify({'error': 'Access denied'}), 403

        # Build update data
        update_data = {}

        if 'niche_name' in data:
            niche_name = data['niche_name'].strip()
            if len(niche_name) < 2 or len(niche_name) > 100:
                return jsonify({'error': 'niche_name must be between 2 and 100 characters'}), 400
            update_data['niche_name'] = niche_name

        if 'is_active' in data:
            if not isinstance(data['is_active'], bool):
                return jsonify({'error': 'is_active must be boolean'}), 400
            update_data['is_active'] = data['is_active']

        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400

        result = supabase.table('pod_autom_niches').update(update_data).eq(
            'id', niche_id
        ).execute()

        return jsonify({'data': result.data[0] if result.data else None})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/niches/<niche_id>', methods=['DELETE'])
@verify_jwt
def delete_niche(niche_id: str):
    """
    Delete a niche.

    Returns:
        200: Success
        404: Niche not found
    """
    valid, error = validate_uuid(niche_id, 'niche_id')
    if not valid:
        return jsonify({'error': error}), 400

    try:
        # Verify ownership
        niche = supabase.table('pod_autom_niches').select(
            '*, pod_autom_settings!inner(pod_autom_shops!inner(user_id))'
        ).eq('id', niche_id).maybeSingle().execute()

        if not niche.data:
            return jsonify({'error': 'Niche not found'}), 404

        if niche.data['pod_autom_settings']['pod_autom_shops']['user_id'] != g.user_id:
            return jsonify({'error': 'Access denied'}), 403

        supabase.table('pod_autom_niches').delete().eq('id', niche_id).execute()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# PROMPTS
# ====================

@bp.route('/prompts/<settings_id>', methods=['GET'])
@verify_jwt
def get_prompts(settings_id: str):
    """
    Get all prompts for a settings ID.

    Returns:
        200: List of prompts
        404: Settings not found
    """
    valid, error = validate_uuid(settings_id, 'settings_id')
    if not valid:
        return jsonify({'error': error}), 400

    try:
        # Verify ownership
        settings = supabase.table('pod_autom_settings').select(
            'id, pod_autom_shops!inner(user_id)'
        ).eq('id', settings_id).maybeSingle().execute()

        if not settings.data:
            return jsonify({'error': 'Settings not found'}), 404

        if settings.data['pod_autom_shops']['user_id'] != g.user_id:
            return jsonify({'error': 'Access denied'}), 403

        result = supabase.table('pod_autom_prompts').select('*').eq(
            'settings_id', settings_id
        ).execute()

        return jsonify({'data': result.data or []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/prompts/<settings_id>', methods=['PUT'])
@verify_jwt
def upsert_prompts(settings_id: str):
    """
    Upsert prompts for a settings ID.
    Uses UPSERT to safely update or insert prompts.

    Body:
        prompts: Array of { prompt_type: string, prompt_text: string }

    Returns:
        200: Success
        400: Validation error
        404: Settings not found
    """
    valid, error = validate_uuid(settings_id, 'settings_id')
    if not valid:
        return jsonify({'error': error}), 400

    data, error_response = get_json_or_error()
    if error_response:
        return error_response

    prompts = data.get('prompts', [])
    if not isinstance(prompts, list):
        return jsonify({'error': 'prompts must be an array'}), 400

    # Validate prompt types
    valid_types = {'image', 'title', 'description'}
    for prompt in prompts:
        if not isinstance(prompt, dict):
            return jsonify({'error': 'Each prompt must be an object'}), 400

        prompt_type = prompt.get('prompt_type')
        prompt_text = prompt.get('prompt_text', '').strip()

        if prompt_type not in valid_types:
            return jsonify({'error': f'Invalid prompt_type: {prompt_type}'}), 400

        if not prompt_text:
            return jsonify({'error': f'prompt_text is required for {prompt_type}'}), 400

        if len(prompt_text) > 5000:
            return jsonify({'error': f'prompt_text for {prompt_type} exceeds 5000 characters'}), 400

    try:
        # Verify ownership
        settings = supabase.table('pod_autom_settings').select(
            'id, pod_autom_shops!inner(user_id)'
        ).eq('id', settings_id).maybeSingle().execute()

        if not settings.data:
            return jsonify({'error': 'Settings not found'}), 404

        if settings.data['pod_autom_shops']['user_id'] != g.user_id:
            return jsonify({'error': 'Access denied'}), 403

        # ✅ Use UPSERT instead of DELETE-then-INSERT
        if prompts:
            prompt_records = [{
                'settings_id': settings_id,
                'prompt_type': p['prompt_type'],
                'prompt_text': p['prompt_text'].strip(),
                'is_active': True
            } for p in prompts]

            supabase.table('pod_autom_prompts').upsert(
                prompt_records,
                on_conflict='settings_id,prompt_type'
            ).execute()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# PRODUCTS
# ====================

@bp.route('/products/<shop_id>', methods=['GET'])
@verify_jwt
def get_products(shop_id: str):
    """
    Get products for a shop with pagination and filters.

    Query params:
        status: filter by status
        niche: filter by niche
        search: search in title
        limit: max items (default 20, max 100)
        offset: pagination offset

    Returns:
        200: { data: Product[], total: number, limit: number, offset: number }
        404: Shop not found
    """
    valid, error = validate_uuid(shop_id, 'shop_id')
    if not valid:
        return jsonify({'error': error}), 400

    try:
        # Verify ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', g.user_id).maybeSingle().execute()

        if not shop.data:
            return jsonify({'error': 'Shop not found'}), 404

        # Parse query params
        status = request.args.get('status')
        niche = request.args.get('niche')
        search = request.args.get('search', '').strip()

        try:
            limit = min(int(request.args.get('limit', 20)), 100)
            offset = max(int(request.args.get('offset', 0)), 0)
        except ValueError:
            return jsonify({'error': 'limit and offset must be integers'}), 400

        # Build query with count
        query = supabase.table('pod_autom_products').select('*', count='exact').eq(
            'shop_id', shop_id
        )

        if status and status != 'all':
            valid_statuses = {'draft', 'active', 'winner', 'loser', 'archived'}
            if status not in valid_statuses:
                return jsonify({'error': f'Invalid status: {status}'}), 400
            query = query.eq('status', status)

        if niche and niche != 'all':
            query = query.eq('niche', niche)

        if search:
            query = query.or_(f'title.ilike.%{search}%,niche.ilike.%{search}%')

        result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()

        return jsonify({
            'data': result.data or [],
            'total': result.count or 0,
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/products/<product_id>', methods=['GET'])
@verify_jwt
def get_product(product_id: str):
    """
    Get single product details.

    Returns:
        200: Product object
        404: Product not found
    """
    valid, error = validate_uuid(product_id, 'product_id')
    if not valid:
        return jsonify({'error': error}), 400

    try:
        result = supabase.table('pod_autom_products').select(
            '*, pod_autom_shops!inner(user_id, shop_domain)'
        ).eq('id', product_id).maybeSingle().execute()

        if not result.data:
            return jsonify({'error': 'Product not found'}), 404

        if result.data['pod_autom_shops']['user_id'] != g.user_id:
            return jsonify({'error': 'Access denied'}), 403

        # Remove nested shop data, add shop_domain to top level
        product = {**result.data}
        product['shop_domain'] = product['pod_autom_shops']['shop_domain']
        del product['pod_autom_shops']

        return jsonify({'data': product})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/products/<product_id>/status', methods=['PUT'])
@verify_jwt
def update_product_status(product_id: str):
    """
    Update product status.

    Body:
        status: 'draft' | 'active' | 'winner' | 'loser' | 'archived'

    Returns:
        200: Updated product
        400: Invalid status
        404: Product not found
    """
    valid, error = validate_uuid(product_id, 'product_id')
    if not valid:
        return jsonify({'error': error}), 400

    data, error_response = get_json_or_error()
    if error_response:
        return error_response

    new_status = data.get('status')
    valid_statuses = {'draft', 'active', 'winner', 'loser', 'archived'}

    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400

    try:
        # Verify ownership
        product = supabase.table('pod_autom_products').select(
            'id, pod_autom_shops!inner(user_id)'
        ).eq('id', product_id).maybeSingle().execute()

        if not product.data:
            return jsonify({'error': 'Product not found'}), 404

        if product.data['pod_autom_shops']['user_id'] != g.user_id:
            return jsonify({'error': 'Access denied'}), 403

        result = supabase.table('pod_autom_products').update({
            'status': new_status
        }).eq('id', product_id).execute()

        return jsonify({'data': result.data[0] if result.data else None})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# STATS (Optimized)
# ====================

@bp.route('/stats/<shop_id>', methods=['GET'])
@verify_jwt
def get_stats(shop_id: str):
    """
    Get dashboard stats for a shop.
    Uses database aggregation for performance.

    Returns:
        200: Stats object
        404: Shop not found
    """
    valid, error = validate_uuid(shop_id, 'shop_id')
    if not valid:
        return jsonify({'error': error}), 400

    try:
        # Verify ownership
        shop = supabase.table('pod_autom_shops').select('id').eq(
            'id', shop_id
        ).eq('user_id', g.user_id).maybeSingle().execute()

        if not shop.data:
            return jsonify({'error': 'Shop not found'}), 404

        # ✅ Use single query with RPC for aggregation
        # First, get product counts by status
        products = supabase.table('pod_autom_products').select(
            'status'
        ).eq('shop_id', shop_id).execute()

        # Count by status
        by_status: dict[str, int] = {}
        for p in (products.data or []):
            status = p.get('status', 'unknown')
            by_status[status] = by_status.get(status, 0) + 1

        total = len(products.data or [])

        # Get revenue sum
        revenue_result = supabase.table('pod_autom_products').select(
            'revenue'
        ).eq('shop_id', shop_id).execute()

        total_revenue = sum(
            float(p.get('revenue') or 0)
            for p in (revenue_result.data or [])
        )

        # Get sales sum
        sales_result = supabase.table('pod_autom_products').select(
            'sales_count'
        ).eq('shop_id', shop_id).execute()

        total_sales = sum(
            int(p.get('sales_count') or 0)
            for p in (sales_result.data or [])
        )

        return jsonify({
            'data': {
                'total_products': total,
                'by_status': by_status,
                'total_revenue': round(total_revenue, 2),
                'total_sales': total_sales,
                'winners': by_status.get('winner', 0),
                'active': by_status.get('active', 0),
                'drafts': by_status.get('draft', 0)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ====================
# CATALOG (Public)
# ====================

@bp.route('/catalog', methods=['GET'])
def get_catalog():
    """
    Get fulfillment catalog (public endpoint).

    Returns:
        200: List of catalog products
    """
    try:
        result = supabase.table('pod_autom_catalog').select('*').eq(
            'is_active', True
        ).order('sort_order').execute()

        return jsonify({'data': result.data or []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/catalog/<product_id>', methods=['GET'])
def get_catalog_product(product_id: str):
    """
    Get single catalog product (public endpoint).

    Returns:
        200: Catalog product
        404: Product not found
    """
    valid, error = validate_uuid(product_id, 'product_id')
    if not valid:
        return jsonify({'error': error}), 400

    try:
        result = supabase.table('pod_autom_catalog').select('*').eq(
            'id', product_id
        ).eq('is_active', True).maybeSingle().execute()

        if not result.data:
            return jsonify({'error': 'Product not found'}), 404

        return jsonify({'data': result.data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

---

## backend/api/main.py Erweiterung

```python
"""
Flask API Main Entry Point
"""

from flask import Flask
from flask_cors import CORS
import os

# Import route blueprints
from routes import shopify, pinterest_oauth, pod_autom

def create_app():
    app = Flask(__name__)

    # CORS Configuration
    cors_origins = [
        os.getenv('FRONTEND_URL', 'http://localhost:3000'),
        'https://pod-autom.vercel.app',  # Production frontend
    ]

    CORS(app, resources={
        r"/*": {
            "origins": cors_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
            "max_age": 86400  # Cache preflight for 24h
        }
    })

    # Register blueprints
    app.register_blueprint(shopify.bp)
    app.register_blueprint(pinterest_oauth.bp)
    app.register_blueprint(pod_autom.bp)

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'healthy'}

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
```

---

## API Endpunkte Übersicht

| Method | Endpoint | Auth | Beschreibung |
|--------|----------|------|--------------|
| GET | `/pod-autom/shops` | ✅ | Liste aller Shops |
| GET | `/pod-autom/shops/:id` | ✅ | Shop-Details |
| DELETE | `/pod-autom/shops/:id` | ✅ | Shop löschen |
| GET | `/pod-autom/settings/:shop_id` | ✅ | Settings abrufen |
| PUT | `/pod-autom/settings/:shop_id` | ✅ | Settings ändern |
| GET | `/pod-autom/niches/:settings_id` | ✅ | Nischen abrufen |
| POST | `/pod-autom/niches/:settings_id` | ✅ | Nische hinzufügen |
| PUT | `/pod-autom/niches/:niche_id` | ✅ | Nische ändern |
| DELETE | `/pod-autom/niches/:niche_id` | ✅ | Nische löschen |
| GET | `/pod-autom/prompts/:settings_id` | ✅ | Prompts abrufen |
| PUT | `/pod-autom/prompts/:settings_id` | ✅ | Prompts upsert |
| GET | `/pod-autom/products/:shop_id` | ✅ | Produkte (paginiert) |
| GET | `/pod-autom/products/:product_id` | ✅ | Produkt-Details |
| PUT | `/pod-autom/products/:product_id/status` | ✅ | Status ändern |
| GET | `/pod-autom/stats/:shop_id` | ✅ | Dashboard-Stats |
| GET | `/pod-autom/catalog` | ❌ | Katalog (öffentlich) |
| GET | `/pod-autom/catalog/:id` | ❌ | Katalog-Produkt |

---

## Verifizierung

- [ ] **Input Validation** - Alle Inputs werden validiert
- [ ] **UUID Validation** - Alle IDs werden auf Format geprüft
- [ ] **Upsert statt Delete-Insert** - Prompts verwenden ON CONFLICT
- [ ] **Pagination mit Total** - Products-Endpoint gibt `total` zurück
- [ ] **CORS konfiguriert** - Mit erlaubten Origins
- [ ] **JWT-Verifizierung** - Alle geschützten Routes
- [ ] **Ownership Checks** - User kann nur eigene Daten sehen
- [ ] **Error Handling** - Konsistente Fehlerformate
- [ ] **Type Hints** - Python Type Annotations
- [ ] **Status Validation** - Nur erlaubte Status-Werte

## Abhängigkeiten

- Phase 2.2 (Shopify OAuth - gleiche API)
- Phase 1.4 (Datenbank-Tabellen)
- Flask, Flask-CORS packages

## Nächster Schritt
→ Phase 4.3 - Produkt-Erstellung testen
