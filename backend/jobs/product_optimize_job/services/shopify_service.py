"""
Shopify REST Client for Product Optimize Job
Fetches and updates products via Shopify REST Admin API
"""
import time
import json
import math
import requests
from typing import Dict, List, Optional

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ShopifyProduct, ProductCreationConfig


class ShopifyRESTClient:
    """REST Client for Shopify Admin API - Product Optimization"""

    # Tag used to identify products that need optimization
    NEW_SET_TAG = "NEW_SET"
    OPTIMIZED_TAG = "OPTIMIZED"

    def __init__(self, shop_domain: str, access_token: str):
        self.shop_domain = shop_domain
        self.access_token = access_token
        self.base_url = f"https://{shop_domain}/admin/api/2024-04"
        self.headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }
        self.last_request_time = 0
        self.min_request_interval = 0.5  # 2 requests per second max

    def _rate_limit(self):
        """Implement rate limiting."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)

    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Optional[Dict]:
        """Make HTTP request with error handling and retry logic."""
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
                elif method == "PUT":
                    response = requests.put(url, headers=self.headers, json=data, timeout=30)
                elif method == "DELETE":
                    response = requests.delete(url, headers=self.headers, timeout=30)
                else:
                    raise ValueError(f"Unsupported method: {method}")

                self.last_request_time = time.time()

                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 2))
                    print(f"Rate limited, waiting {retry_after} seconds...")
                    time.sleep(retry_after)
                    retry_count += 1
                    continue

                # Handle errors
                if response.status_code >= 400:
                    error_body = response.text
                    print(f"API Error {response.status_code}: {error_body}")

                    if response.status_code in [500, 502, 503, 504]:
                        retry_count += 1
                        wait_time = 2 ** retry_count
                        print(f"Server error, retrying in {wait_time} seconds...")
                        time.sleep(wait_time)
                        continue

                    return None

                return response.json()

            except requests.exceptions.RequestException as e:
                retry_count += 1
                if retry_count >= max_retries:
                    print(f"Request failed after {max_retries} retries: {e}")
                    return None

                wait_time = 2 ** retry_count
                print(f"Request failed, retrying in {wait_time} seconds...")
                time.sleep(wait_time)

        return None

    def test_connection(self) -> bool:
        """Test connection to Shopify store."""
        result = self._make_request("GET", "shop.json")
        return result is not None

    def get_products_by_tag(self, tag: str, limit: int = 50) -> List[ShopifyProduct]:
        """Get products with a specific tag."""
        # Note: Shopify REST API doesn't support tag filtering directly
        # We need to get all products and filter by tag
        products = []
        since_id = 0

        while len(products) < limit:
            endpoint = f"products.json?limit=250&status=any"
            if since_id:
                endpoint += f"&since_id={since_id}"

            result = self._make_request("GET", endpoint)
            if not result or 'products' not in result:
                break

            batch = result['products']
            if not batch:
                break

            # Filter by tag
            for product_data in batch:
                product = ShopifyProduct.from_api(product_data)
                if tag in product.tags and self.OPTIMIZED_TAG not in product.tags:
                    products.append(product)
                    if len(products) >= limit:
                        break

            since_id = batch[-1]['id']

            # If we got less than 250, we're at the end
            if len(batch) < 250:
                break

        return products

    def update_product(self, product_id: str, updates: Dict) -> Optional[Dict]:
        """Update a product."""
        data = {"product": {"id": product_id, **updates}}
        result = self._make_request("PUT", f"products/{product_id}.json", data)
        return result.get("product") if result else None

    def optimize_product(self, product: ShopifyProduct, config: ProductCreationConfig,
                         new_title: str = None, new_description: str = None,
                         new_tags: List[str] = None) -> Optional[Dict]:
        """
        Apply all optimizations to a product based on config.
        """
        updates = {}
        variant_updates = []

        # 1. Title optimization
        if config.generate_optimized_title and new_title:
            updates['title'] = new_title

        # 2. Description optimization
        if config.generate_optimized_description and new_description:
            updates['body_html'] = new_description

        # 3. Tags optimization
        current_tags = set(product.tags)

        # Remove NEW_SET tag, add OPTIMIZED tag
        current_tags.discard(self.NEW_SET_TAG)
        current_tags.add(self.OPTIMIZED_TAG)

        # Add generated tags
        if config.generate_tags and new_tags:
            current_tags.update(new_tags)

        # Add global tags if enabled
        if config.set_global_tags and config.global_tags_value:
            global_tags = [t.strip() for t in config.global_tags_value.split(',') if t.strip()]
            current_tags.update(global_tags)

        # Add fashion category tag if enabled
        if config.set_category_tag_fashion:
            current_tags.add('fashion')

        updates['tags'] = ', '.join(current_tags)

        # 4. Status change
        if config.change_product_status:
            updates['status'] = config.product_status_value

        # 5. Process variants
        for variant in product.variants:
            variant_update = {'id': variant['id']}

            # Price adjustments
            if config.adjust_product_price and variant.get('price'):
                original_price = float(variant['price'])
                if config.price_adjustment_type == 'PERCENT':
                    new_price = original_price * (1 + config.price_adjustment_value / 100)
                else:  # FIXED
                    new_price = original_price + config.price_adjustment_value

                # Apply decimals
                if config.set_price_decimals:
                    new_price = math.floor(new_price) + (config.price_decimals_value / 100)

                variant_update['price'] = f"{new_price:.2f}"

            # Compare at price
            if config.set_compare_at_price and variant.get('price'):
                base_price = float(variant_update.get('price', variant['price']))
                compare_price = base_price * (1 + config.compare_at_price_percent / 100)

                if config.set_compare_at_price_decimals:
                    compare_price = math.floor(compare_price) + (config.compare_at_price_decimals_value / 100)

                variant_update['compare_at_price'] = f"{compare_price:.2f}"

            # Inventory
            if config.set_global_inventory:
                variant_update['inventory_quantity'] = config.global_inventory_value

            if config.enable_inventory_tracking:
                variant_update['inventory_management'] = 'shopify'

            # Size option translation (if variant has option1 as size)
            if config.translate_size:
                # This would need additional handling for option names
                pass

            variant_updates.append(variant_update)

        if variant_updates:
            updates['variants'] = variant_updates

        # Execute update
        return self.update_product(product.id, updates)
