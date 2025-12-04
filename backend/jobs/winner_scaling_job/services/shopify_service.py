"""
Shopify REST Client for Winner Scaling Job
Fetches product and collection handles from Shopify API
"""
import time
import requests
from typing import Dict, Optional, Tuple


class ShopifyService:
    """REST Client for Shopify Admin API - Handle Fetching."""

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
        # Cache for handles to avoid re-fetching
        self._handle_cache: Dict[str, str] = {}

    def _rate_limit(self):
        """Implement rate limiting."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)

    def _make_request(self, method: str, endpoint: str, silent_404: bool = False) -> Optional[Dict]:
        """Make HTTP request with error handling."""
        self._rate_limit()

        url = f"{self.base_url}/{endpoint}"
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                if method == "GET":
                    response = requests.get(url, headers=self.headers, timeout=30)
                else:
                    raise ValueError(f"Unsupported method: {method}")

                self.last_request_time = time.time()

                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 2))
                    print(f"      Rate limited, waiting {retry_after} seconds...")
                    time.sleep(retry_after)
                    retry_count += 1
                    continue

                if response.status_code >= 400:
                    if not (silent_404 and response.status_code == 404):
                        print(f"      Shopify API Error {response.status_code}: {response.text[:200]}")
                    if response.status_code in [500, 502, 503, 504]:
                        retry_count += 1
                        time.sleep(2 ** retry_count)
                        continue
                    return None

                return response.json()

            except requests.exceptions.RequestException as e:
                retry_count += 1
                if retry_count >= max_retries:
                    print(f"      Shopify request failed after {max_retries} retries: {e}")
                    return None
                time.sleep(2 ** retry_count)

        return None

    def get_product_handle(self, product_id: str) -> Optional[str]:
        """
        Get the handle (URL slug) for a product.

        Args:
            product_id: Shopify product ID

        Returns:
            Product handle/slug or None if not found
        """
        # Check cache first
        cache_key = f"product_{product_id}"
        if cache_key in self._handle_cache:
            return self._handle_cache[cache_key]

        endpoint = f"products/{product_id}.json?fields=id,handle,images"
        result = self._make_request("GET", endpoint, silent_404=True)

        if result and 'product' in result:
            handle = result['product'].get('handle')
            # Also cache the first image URL
            images = result['product'].get('images', [])
            if images:
                image_cache_key = f"product_image_{product_id}"
                self._handle_cache[image_cache_key] = images[0].get('src')

            self._handle_cache[cache_key] = handle
            return handle

        print(f"      [WARNING] Could not find handle for product {product_id}")
        return None

    def get_product_image(self, product_id: str) -> Optional[str]:
        """
        Get the primary image URL for a product.

        Args:
            product_id: Shopify product ID

        Returns:
            Image URL or None if not found
        """
        # Check cache first
        cache_key = f"product_image_{product_id}"
        if cache_key in self._handle_cache:
            return self._handle_cache[cache_key]

        # If not in cache, fetch product (which will cache both handle and image)
        self.get_product_handle(product_id)

        return self._handle_cache.get(cache_key)

    def get_collection_handle(self, collection_id: str) -> Optional[str]:
        """
        Get the handle (URL slug) for a collection.

        Args:
            collection_id: Shopify collection ID

        Returns:
            Collection handle/slug or None if not found
        """
        # Check cache first
        cache_key = f"collection_{collection_id}"
        if cache_key in self._handle_cache:
            return self._handle_cache[cache_key]

        # Try custom collection first
        endpoint = f"custom_collections/{collection_id}.json?fields=id,handle"
        result = self._make_request("GET", endpoint, silent_404=True)

        if result and 'custom_collection' in result:
            handle = result['custom_collection'].get('handle')
            self._handle_cache[cache_key] = handle
            return handle

        # Try smart collection
        endpoint = f"smart_collections/{collection_id}.json?fields=id,handle"
        result = self._make_request("GET", endpoint, silent_404=True)

        if result and 'smart_collection' in result:
            handle = result['smart_collection'].get('handle')
            self._handle_cache[cache_key] = handle
            return handle

        print(f"      [WARNING] Could not find handle for collection {collection_id}")
        return None

    def get_product_position_in_collection(self, collection_id: str, product_id: str) -> int:
        """
        Get the position (index) of a product within a collection.

        Args:
            collection_id: Shopify collection ID
            product_id: Shopify product ID

        Returns:
            0-based position index, or 0 if not found
        """
        # Check cache first
        cache_key = f"position_{collection_id}_{product_id}"
        if cache_key in self._handle_cache:
            return int(self._handle_cache[cache_key])

        # Fetch collection products to determine position
        endpoint = f"collections/{collection_id}/products.json?limit=250"
        result = self._make_request("GET", endpoint, silent_404=True)

        if result and 'products' in result:
            for index, product in enumerate(result['products']):
                pid = str(product['id'])
                # Cache all positions for this collection
                pos_cache_key = f"position_{collection_id}_{pid}"
                self._handle_cache[pos_cache_key] = str(index)

                if pid == str(product_id):
                    return index

        return 0

    def get_handles_for_product(
        self,
        product_id: str,
        collection_id: str
    ) -> Tuple[Optional[str], Optional[str], Optional[str], int]:
        """
        Get all handles and position for a product.

        Args:
            product_id: Shopify product ID
            collection_id: Shopify collection ID

        Returns:
            Tuple of (product_handle, collection_handle, image_url, position)
        """
        product_handle = self.get_product_handle(product_id)
        collection_handle = self.get_collection_handle(collection_id)
        image_url = self.get_product_image(product_id)
        position = self.get_product_position_in_collection(collection_id, product_id)

        return product_handle, collection_handle, image_url, position

    def clear_cache(self):
        """Clear the handle cache."""
        self._handle_cache.clear()
