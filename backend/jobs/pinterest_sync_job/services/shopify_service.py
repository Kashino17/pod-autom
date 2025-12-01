"""
Shopify REST Client for Pinterest Sync Job
Fetches products from collections for Pinterest sync
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

    BATCH_SIZE = 10  # Products per batch

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

    def _rate_limit(self):
        """Implement rate limiting."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)

    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Optional[Dict]:
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
        """Get all products from a collection."""
        products = []

        # First, get product IDs in the collection via collects
        collects_endpoint = f"collects.json?collection_id={collection_id}&limit=250"
        result = self._make_request("GET", collects_endpoint)

        if not result or 'collects' not in result:
            print(f"  No products found in collection {collection_id}")
            return []

        product_ids = [c['product_id'] for c in result['collects']]
        print(f"  Found {len(product_ids)} products in collection")

        # Fetch product details in batches
        batch_size = 50
        for i in range(0, len(product_ids), batch_size):
            batch_ids = product_ids[i:i + batch_size]
            ids_str = ','.join(str(pid) for pid in batch_ids)

            products_endpoint = f"products.json?ids={ids_str}&status=active"
            result = self._make_request("GET", products_endpoint)

            if result and 'products' in result:
                for product_data in result['products']:
                    product = ShopifyProduct.from_api(product_data)
                    # Only include products with images
                    if product.primary_image_url:
                        products.append(product)

        return products

    def get_products_batch(self, collection_id: str, batch_index: int,
                           batch_size: int = 10) -> List[ShopifyProduct]:
        """Get a specific batch of products from a collection.

        Args:
            collection_id: Shopify collection ID
            batch_index: 0-based batch index
            batch_size: Number of products per batch (default 10)

        Returns:
            List of products in the requested batch
        """
        all_products = self.get_collection_products(collection_id)

        start_idx = batch_index * batch_size
        end_idx = start_idx + batch_size

        if start_idx >= len(all_products):
            return []

        return all_products[start_idx:end_idx]

    def get_product_url(self, handle: str, url_prefix: str = '') -> str:
        """Generate product URL."""
        base_url = f"https://{self.shop_domain}/products/{handle}"

        if url_prefix:
            return f"{base_url}?{url_prefix}"

        return base_url
