from flask import Blueprint, request, jsonify
import requests

shopify_bp = Blueprint('shopify', __name__)


@shopify_bp.route('/api/shopify/test-connection', methods=['POST'])
def test_connection():
    """Test Shopify store connection"""
    data = request.json
    shop_domain = data.get('shop_domain', '')
    access_token = data.get('access_token', '')

    if not shop_domain or not access_token:
        return jsonify({'success': False, 'error': 'Missing shop_domain or access_token'}), 400

    # Clean up domain
    shop_domain = shop_domain.strip() \
        .replace('https://', '') \
        .replace('http://', '') \
        .rstrip('/')

    if not shop_domain.endswith('.myshopify.com'):
        shop_domain = f"{shop_domain}.myshopify.com"

    try:
        response = requests.get(
            f'https://{shop_domain}/admin/api/2023-10/shop.json',
            headers={'X-Shopify-Access-Token': access_token},
            timeout=10
        )

        if response.ok:
            return jsonify({'success': True, 'shop': response.json()['shop']})
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
                'status': response.status_code
            }), response.status_code

    except requests.exceptions.Timeout:
        return jsonify({'success': False, 'error': 'Verbindung timeout'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@shopify_bp.route('/api/shopify/get-collections', methods=['POST'])
def get_collections():
    """Get all collections from a Shopify store"""
    data = request.json
    shop_domain = data.get('shop_domain', '')
    access_token = data.get('access_token', '')

    if not shop_domain or not access_token:
        return jsonify({'success': False, 'error': 'Missing shop_domain or access_token'}), 400

    # Clean up domain
    shop_domain = shop_domain.strip() \
        .replace('https://', '') \
        .replace('http://', '') \
        .rstrip('/')

    if not shop_domain.endswith('.myshopify.com'):
        shop_domain = f"{shop_domain}.myshopify.com"

    headers = {'X-Shopify-Access-Token': access_token}

    try:
        # Get custom collections
        custom_response = requests.get(
            f'https://{shop_domain}/admin/api/2023-10/custom_collections.json',
            headers=headers,
            timeout=10
        )
        custom_collections = custom_response.json().get('custom_collections', []) if custom_response.ok else []

        # Get smart collections
        smart_response = requests.get(
            f'https://{shop_domain}/admin/api/2023-10/smart_collections.json',
            headers=headers,
            timeout=10
        )
        smart_collections = smart_response.json().get('smart_collections', []) if smart_response.ok else []

        all_collections = custom_collections + smart_collections

        return jsonify({
            'success': True,
            'collections': all_collections,
            'count': len(all_collections)
        })

    except requests.exceptions.RequestException as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@shopify_bp.route('/api/shopify/get-products', methods=['POST'])
def get_products():
    """Get products from a Shopify store"""
    data = request.json
    shop_domain = data.get('shop_domain', '')
    access_token = data.get('access_token', '')
    limit = data.get('limit', 50)
    collection_id = data.get('collection_id')

    if not shop_domain or not access_token:
        return jsonify({'success': False, 'error': 'Missing shop_domain or access_token'}), 400

    # Clean up domain
    shop_domain = shop_domain.strip() \
        .replace('https://', '') \
        .replace('http://', '') \
        .rstrip('/')

    if not shop_domain.endswith('.myshopify.com'):
        shop_domain = f"{shop_domain}.myshopify.com"

    headers = {'X-Shopify-Access-Token': access_token}

    try:
        url = f'https://{shop_domain}/admin/api/2023-10/products.json?limit={limit}'
        if collection_id:
            url += f'&collection_id={collection_id}'

        response = requests.get(url, headers=headers, timeout=15)

        if response.ok:
            products = response.json().get('products', [])
            return jsonify({
                'success': True,
                'products': products,
                'count': len(products)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Produkte konnten nicht geladen werden'
            }), response.status_code

    except requests.exceptions.RequestException as e:
        return jsonify({'success': False, 'error': str(e)}), 500
