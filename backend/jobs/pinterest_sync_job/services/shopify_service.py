"""
Shopify REST Client for Pinterest Sync Job
Fetches products from collections for Pinterest sync
IMPORTANT: Uses /collections/{id}/products.json to preserve product order
"""
import time
import requests
from typing import Dict, List, Optional

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ShopifyProduct


class ShopifyRESTClient:
    """REST Client for Shopify Admin API - Product Fetching."""

    def __init__(self, shop_domain: str, access_token: str):
        self.shop_domain = shop_domain
        self.access_token = access_token
        self.base_url = f"https://{shop_domain}/admin/api/2024-04"
        self.headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }
        self.last_request_time = 0
        self.min_request_interval = 0.5
        # Cache for collection products to avoid re-fetching
        self._collection_cache: Dict[str, List[ShopifyProduct]] = {}

    def _rate_limit(self):
        """Implement rate limiting."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)

    def _make_request(self, method: str, endpoint: str, data: Dict = None,
                       silent_404: bool = False) -> Optional[Dict]:
        """Make HTTP request with error handling."""
        self._rate_limit()

        url = f"{self.base_url}/{endpoint}"
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                if method == "GET":
                    response = requests.get(url, headers=self.headers, timeout=30)
                elif method == "POST":
                    response = requests.post(url, headers=self.headers, json=data, timeout=30)
                else:
                    raise ValueError(f"Unsupported method: {method}")

                self.last_request_time = time.time()

                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 2))
                    print(f"Rate limited, waiting {retry_after} seconds...")
                    time.sleep(retry_after)
                    retry_count += 1
                    continue

                if response.status_code >= 400:
                    # Don't log 404 errors when silent_404 is True (expected fallback behavior)
                    if not (silent_404 and response.status_code == 404):
                        print(f"API Error {response.status_code}: {response.text[:200]}")
                    if response.status_code in [500, 502, 503, 504]:
                        retry_count += 1
                        time.sleep(2 ** retry_count)
                        continue
                    return None

                return response.json()

            except requests.exceptions.RequestException as e:
                retry_count += 1
                if retry_count >= max_retries:
                    print(f"Request failed after {max_retries} retries: {e}")
                    return None
                time.sleep(2 ** retry_count)

        return None

    def test_connection(self) -> bool:
        """Test connection to Shopify store."""
        result = self._make_request("GET", "shop.json")
        return result is not None

    def get_collection_products(self, collection_id: str) -> List[ShopifyProduct]:
        """
        Get all products from a collection IN ORDER.

        IMPORTANT: Uses /collections/{id}/products.json endpoint which
        preserves the manual sort order set in Shopify admin.
        This is different from using collects.json which does NOT preserve order.

        Args:
            collection_id: Shopify collection ID

        Returns:
            List of products in the correct order as displayed in the collection
        """
        # Check cache first
        if collection_id in self._collection_cache:
            return self._collection_cache[collection_id]

        products = []

        # Use the collection products endpoint - this preserves order!
        # This endpoint returns products in the same order as they appear in the collection
        endpoint = f"collections/{collection_id}/products.json?limit=250"
        result = self._make_request("GET", endpoint)

        if result and 'products' in result:
            for product_data in result['products']:
                # Only include active products with images
                if product_data.get('status') == 'active':
                    product = ShopifyProduct.from_api(product_data)
                    if product.primary_image_url:
                        products.append(product)

            print(f"  Found {len(products)} active products with images in collection (order preserved)")

            # Handle pagination if needed (collections rarely have > 250 products)
            # Shopify uses link headers for pagination
            # For now, 250 should be sufficient for most use cases

        else:
            # Fallback to collects endpoint if collection products endpoint fails
            print(f"  Collection products endpoint failed, trying fallback...")
            products = self._get_collection_products_fallback(collection_id)

        # Cache the results
        self._collection_cache[collection_id] = products
        return products

    def _get_collection_products_fallback(self, collection_id: str) -> List[ShopifyProduct]:
        """
        Fallback method using collects endpoint.
        WARNING: This does NOT preserve the manual sort order!
        """
        products = []

        # Get product IDs via collects (order may not be preserved)
        collects_endpoint = f"collects.json?collection_id={collection_id}&limit=250"
        result = self._make_request("GET", collects_endpoint)

        if not result or 'collects' not in result:
            print(f"  No products found in collection {collection_id}")
            return []

        # Collects are ordered by position, so we need to sort by position
        collects = sorted(result['collects'], key=lambda x: x.get('position', 0))
        product_ids = [c['product_id'] for c in collects]

        print(f"  Found {len(product_ids)} products in collection (via collects)")

        # Fetch product details - need to maintain order
        # Fetch in smaller batches to maintain order
        batch_size = 50
        for i in range(0, len(product_ids), batch_size):
            batch_ids = product_ids[i:i + batch_size]
            ids_str = ','.join(str(pid) for pid in batch_ids)

            products_endpoint = f"products.json?ids={ids_str}&status=active"
            result = self._make_request("GET", products_endpoint)

            if result and 'products' in result:
                # Create a map for quick lookup
                product_map = {str(p['id']): p for p in result['products']}

                # Add products in the order they appear in batch_ids
                for pid in batch_ids:
                    if str(pid) in product_map:
                        product_data = product_map[str(pid)]
                        product = ShopifyProduct.from_api(product_data)
                        if product.primary_image_url:
                            products.append(product)

        return products

    def get_products_batch(self, collection_id: str, batch_index: int,
                           batch_size: int = 50) -> List[ShopifyProduct]:
        """
        Get a specific batch of products from a collection.

        Uses dynamic batch_size from pinterest_settings.global_batch_size.

        Args:
            collection_id: Shopify collection ID
            batch_index: 0-based batch index
            batch_size: Number of products per batch (from global_batch_size)

        Returns:
            List of products in the requested batch (order preserved)
        """
        all_products = self.get_collection_products(collection_id)

        start_idx = batch_index * batch_size
        end_idx = start_idx + batch_size

        if start_idx >= len(all_products):
            return []

        batch = all_products[start_idx:end_idx]
        print(f"    Batch {batch_index}: Products {start_idx + 1}-{start_idx + len(batch)} of {len(all_products)}")

        return batch

    def get_total_batches(self, collection_id: str, batch_size: int = 50) -> int:
        """
        Calculate total number of batches for a collection.

        Args:
            collection_id: Shopify collection ID
            batch_size: Products per batch

        Returns:
            Total number of batches
        """
        all_products = self.get_collection_products(collection_id)
        import math
        return math.ceil(len(all_products) / batch_size) if all_products else 0

    def get_product_url(self, handle: str, url_prefix: str = '') -> str:
        """
        Generate product URL.

        Args:
            handle: Product handle/slug
            url_prefix: Custom domain prefix (e.g., 'www.mystore.com')

        Returns:
            Full product URL
        """
        if url_prefix:
            # Clean up url_prefix
            prefix = url_prefix.strip().rstrip('/')
            if not prefix.startswith('http'):
                prefix = f"https://{prefix}"
            return f"{prefix}/products/{handle}"

        # Default: use shop domain, replacing .myshopify.com with .com
        domain = self.shop_domain.replace('.myshopify.com', '.com')
        return f"https://{domain}/products/{handle}"

    def get_collection_url(self, collection_handle: str, page: int = 1,
                           url_prefix: str = '') -> str:
        """
        Generate collection URL with page parameter.

        Args:
            collection_handle: Collection handle/slug
            page: Page number (1-based)
            url_prefix: Custom domain prefix

        Returns:
            Collection URL with page parameter
        """
        if url_prefix:
            prefix = url_prefix.strip().rstrip('/')
            if not prefix.startswith('http'):
                prefix = f"https://{prefix}"
            return f"{prefix}/collections/{collection_handle}?page={page}"

        domain = self.shop_domain.replace('.myshopify.com', '.com')
        return f"https://{domain}/collections/{collection_handle}?page={page}"

    def clear_cache(self):
        """Clear the collection products cache."""
        self._collection_cache.clear()

    def get_collection_handle(self, collection_id: str) -> Optional[str]:
        """
        Get the handle (URL slug) for a collection.

        Args:
            collection_id: Shopify collection ID

        Returns:
            Collection handle/slug or None if not found
        """
        # Check cache first
        cache_key = f"handle_{collection_id}"
        if cache_key in self._collection_cache:
            return self._collection_cache[cache_key]

        # Try custom collection first (silent 404 - expected fallback to smart collection)
        endpoint = f"custom_collections/{collection_id}.json"
        result = self._make_request("GET", endpoint, silent_404=True)

        if result and 'custom_collection' in result:
            handle = result['custom_collection'].get('handle')
            self._collection_cache[cache_key] = handle
            return handle

        # Try smart collection (silent 404 - will warn below if both fail)
        endpoint = f"smart_collections/{collection_id}.json"
        result = self._make_request("GET", endpoint, silent_404=True)

        if result and 'smart_collection' in result:
            handle = result['smart_collection'].get('handle')
            self._collection_cache[cache_key] = handle
            return handle

        print(f"  [WARNING] Could not find handle for collection {collection_id}")
        return None

    def get_collection_page_url(self, collection_id: str, product_index: int,
                                 products_per_page: int, url_prefix: str = '') -> str:
        """
        Generate collection page URL for a product at a specific index.

        Args:
            collection_id: Shopify collection ID
            product_index: 0-based index of the product within the collection
            products_per_page: Number of products per page in the collection
            url_prefix: Custom domain prefix

        Returns:
            Collection page URL with ?page= parameter
        """
        collection_handle = self.get_collection_handle(collection_id)

        if not collection_handle:
            # Fallback to product URL if we can't get collection handle
            print(f"    [WARNING] Falling back to product URL - collection handle not found")
            return ''

        # Calculate page number (1-based)
        page = (product_index // products_per_page) + 1

        return self.get_collection_url(collection_handle, page=page, url_prefix=url_prefix)
