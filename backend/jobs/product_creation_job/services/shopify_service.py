"""
Shopify REST Client for Product Creation Job
Creates products via Shopify REST Admin API
"""
import time
import json
import requests
from typing import Dict, List, Optional

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ResearchProduct


class ShopifyRESTClient:
    """REST Client for Shopify Admin API - Product Creation"""

    # Hardcoded values for new products
    DEFAULT_VENDOR = "ReBoss Store"
    DEFAULT_PRODUCT_TYPE = "Dress"
    DEFAULT_TAGS = "imported,NEW_SET"
    DEFAULT_STATUS = "draft"
    DEFAULT_INVENTORY = 100
    DEFAULT_VARIANTS = ["S", "M", "L", "XL", "XXL"]

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

    def create_product(self, research_product: ResearchProduct) -> Optional[Dict]:
        """
        Create a product in Shopify from research product data.
        Uses hardcoded values for:
        - vendor: 'ReBoss Store'
        - product_type: 'Dress'
        - tags: 'imported,NEW_SET'
        - status: 'draft'
        - inventory: 100 per variant
        - variants: S, M, L, XL, XXL
        """
        # Build variants with default sizes
        variants = []
        for size in self.DEFAULT_VARIANTS:
            variant = {
                "option1": size,
                "inventory_quantity": self.DEFAULT_INVENTORY,
                "inventory_management": "shopify"
            }

            # Set price if available from research
            if research_product.price:
                try:
                    price_value = research_product.price.replace('$', '').replace(',', '.').strip()
                    variant["price"] = price_value
                except:
                    pass

            # Set compare_at_price if available
            if research_product.compare_price:
                try:
                    compare_value = research_product.compare_price.replace('$', '').replace(',', '.').strip()
                    variant["compare_at_price"] = compare_value
                except:
                    pass

            variants.append(variant)

        # Build product data
        product_data = {
            "product": {
                "title": research_product.title,
                "body_html": research_product.description or "",
                "vendor": self.DEFAULT_VENDOR,
                "product_type": self.DEFAULT_PRODUCT_TYPE,
                "tags": self.DEFAULT_TAGS,
                "status": self.DEFAULT_STATUS,
                "options": [
                    {
                        "name": "Size",
                        "values": self.DEFAULT_VARIANTS
                    }
                ],
                "variants": variants
            }
        }

        # Add images if available
        if research_product.images and len(research_product.images) > 0:
            images = []
            for i, img_url in enumerate(research_product.images):
                if img_url and img_url.strip():
                    image_obj = {"src": img_url.strip()}
                    if i == 0:
                        image_obj["position"] = 1
                    images.append(image_obj)

            if images:
                product_data["product"]["images"] = images

        print(f"Creating product: {research_product.title}")

        result = self._make_request("POST", "products.json", product_data)

        if result and "product" in result:
            created_product = result["product"]
            print(f"  Created Shopify product ID: {created_product['id']}")
            return created_product
        else:
            print(f"  Failed to create product: {research_product.title}")
            return None

    def get_product(self, product_id: str) -> Optional[Dict]:
        """Get product details by ID."""
        result = self._make_request("GET", f"products/{product_id}.json")
        return result.get("product") if result else None

    def update_product(self, product_id: str, updates: Dict) -> Optional[Dict]:
        """Update a product."""
        data = {"product": {"id": product_id, **updates}}
        result = self._make_request("PUT", f"products/{product_id}.json", data)
        return result.get("product") if result else None
