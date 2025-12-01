"""
Shopify API Proxy Routes
Handles all Shopify Admin API calls to avoid CORS issues
"""
from flask import Blueprint, request, jsonify
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

shopify_bp = Blueprint('shopify', __name__)

SHOPIFY_API_VERSION = '2023-10'


def clean_domain(shop_domain: str) -> str:
    """Clean and normalize shop domain"""
    domain = shop_domain.strip()
    domain = domain.replace('https://', '').replace('http://', '')
    domain = domain.rstrip('/')

    if not domain.endswith('.myshopify.com'):
        domain = f"{domain}.myshopify.com"

    return domain


@shopify_bp.route('/api/shopify/test-connection', methods=['POST'])
def test_connection():
    """Test Shopify store connection"""
    try:
        data = request.json

        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        shop_domain = data.get('shop_domain')
        access_token = data.get('access_token')

        if not shop_domain or not access_token:
            return jsonify({
                'success': False,
                'error': 'Missing shop_domain or access_token'
            }), 400

        # Clean domain
        clean_shop_domain = clean_domain(shop_domain)

        # Call Shopify API
        response = requests.get(
            f'https://{clean_shop_domain}/admin/api/{SHOPIFY_API_VERSION}/shop.json',
            headers={
                'X-Shopify-Access-Token': access_token,
                'Content-Type': 'application/json'
            },
            timeout=10
        )

        if response.ok:
            shop_data = response.json().get('shop', {})
            return jsonify({
                'success': True,
                'shop': {
                    'id': shop_data.get('id'),
                    'name': shop_data.get('name'),
                    'email': shop_data.get('email'),
                    'domain': shop_data.get('domain'),
                    'myshopify_domain': shop_data.get('myshopify_domain'),
                    'plan_name': shop_data.get('plan_name'),
                    'currency': shop_data.get('currency')
                }
            })
        else:
            error_msg = 'Shopify API Fehler'
            if response.status_code == 401:
                error_msg = 'Ungültiger Access Token'
            elif response.status_code == 403:
                error_msg = 'Zugriff verweigert - Fehlende Berechtigungen'
            elif response.status_code == 404:
                error_msg = 'Shop nicht gefunden - Überprüfe die Domain'

            return jsonify({
                'success': False,
                'error': error_msg,
                'status': response.status_code,
                'details': response.text[:500] if response.text else None
            }), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({
            'success': False,
            'error': 'Zeitüberschreitung - Shop nicht erreichbar'
        }), 504
    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': f'Netzwerkfehler: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Unerwarteter Fehler: {str(e)}'
        }), 500


def get_collection_product_count(shop_domain: str, headers: dict, collection_id: int) -> int:
    """Get product count for a collection using the count endpoint"""
    try:
        response = requests.get(
            f'https://{shop_domain}/admin/api/{SHOPIFY_API_VERSION}/products/count.json?collection_id={collection_id}',
            headers=headers,
            timeout=10
        )
        if response.ok:
            return response.json().get('count', 0)
    except Exception:
        pass
    return 0


@shopify_bp.route('/api/shopify/get-collections', methods=['POST'])
def get_collections():
    """Get all collections from Shopify store with product counts"""
    try:
        data = request.json
        shop_domain = data.get('shop_domain')
        access_token = data.get('access_token')

        if not shop_domain or not access_token:
            return jsonify({
                'success': False,
                'error': 'Missing shop_domain or access_token'
            }), 400

        clean_shop_domain = clean_domain(shop_domain)
        headers = {
            'X-Shopify-Access-Token': access_token,
            'Content-Type': 'application/json'
        }

        raw_collections = []

        # Get Custom Collections
        custom_response = requests.get(
            f'https://{clean_shop_domain}/admin/api/{SHOPIFY_API_VERSION}/custom_collections.json?limit=250',
            headers=headers,
            timeout=30
        )

        if custom_response.ok:
            custom_collections = custom_response.json().get('custom_collections', [])
            for col in custom_collections:
                raw_collections.append({
                    'id': col.get('id'),
                    'title': col.get('title'),
                    'handle': col.get('handle'),
                    'type': 'custom',
                    'published_at': col.get('published_at')
                })

        # Get Smart Collections
        smart_response = requests.get(
            f'https://{clean_shop_domain}/admin/api/{SHOPIFY_API_VERSION}/smart_collections.json?limit=250',
            headers=headers,
            timeout=30
        )

        if smart_response.ok:
            smart_collections = smart_response.json().get('smart_collections', [])
            for col in smart_collections:
                raw_collections.append({
                    'id': col.get('id'),
                    'title': col.get('title'),
                    'handle': col.get('handle'),
                    'type': 'smart',
                    'published_at': col.get('published_at')
                })

        # Get product counts in parallel (max 5 concurrent to respect Shopify rate limits)
        collections = []

        def fetch_count(col):
            """Fetch product count for a single collection"""
            count = get_collection_product_count(clean_shop_domain, headers, col['id'])
            return {**col, 'products_count': count}

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(fetch_count, col): col for col in raw_collections}
            for future in as_completed(futures):
                try:
                    result = future.result()
                    collections.append(result)
                except Exception:
                    # On error, add collection with 0 count
                    col = futures[future]
                    collections.append({**col, 'products_count': 0})

        # Sort by title for consistent ordering
        collections.sort(key=lambda x: x.get('title', '').lower())

        return jsonify({
            'success': True,
            'collections': collections,
            'total': len(collections)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@shopify_bp.route('/api/shopify/get-products', methods=['POST'])
def get_products():
    """Get products from Shopify store"""
    try:
        data = request.json
        shop_domain = data.get('shop_domain')
        access_token = data.get('access_token')
        limit = data.get('limit', 50)
        collection_id = data.get('collection_id')

        if not shop_domain or not access_token:
            return jsonify({
                'success': False,
                'error': 'Missing shop_domain or access_token'
            }), 400

        clean_shop_domain = clean_domain(shop_domain)
        headers = {
            'X-Shopify-Access-Token': access_token,
            'Content-Type': 'application/json'
        }

        # Build URL
        url = f'https://{clean_shop_domain}/admin/api/{SHOPIFY_API_VERSION}/products.json?limit={limit}'
        if collection_id:
            url += f'&collection_id={collection_id}'

        response = requests.get(url, headers=headers, timeout=30)

        if response.ok:
            products = response.json().get('products', [])
            return jsonify({
                'success': True,
                'products': products,
                'total': len(products)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Fehler beim Laden der Produkte',
                'status': response.status_code
            }), response.status_code

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
