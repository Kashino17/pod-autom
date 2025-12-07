"""
Shopify REST Client for Product Creation Job
Creates products via Shopify REST Admin API
"""
import time
import json
import re
import requests
from typing import Dict, List, Optional, Tuple

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

    # Known size values for detection
    KNOWN_SIZES = {
        'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
        '2XL', '3XL', '4XL', '5XL', '6XL',
        '32', '34', '36', '38', '40', '42', '44', '46', '48', '50',
        'One Size', 'Free Size', 'OS'
    }

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

    def _is_size_value(self, value: str) -> bool:
        """Check if a value is a size (not a color/style)."""
        value_upper = value.strip().upper()
        # Check exact matches
        if value_upper in {s.upper() for s in self.KNOWN_SIZES}:
            return True
        # Check patterns like "2XL", "3XL", etc.
        if re.match(r'^\d+XL$', value_upper):
            return True
        # Check numeric sizes
        if re.match(r'^\d{2}$', value_upper):
            return True
        return False

    def _clean_variant_value(self, value: str) -> Optional[str]:
        """
        Clean a variant value by removing price/status suffixes.

        Input: "S - Sold Out" or "M - $35.99 USD" or "L"
        Output: "S" or "M" or "L"

        Returns None if the value looks like a price (starts with $)
        """
        value = value.strip()

        # Skip if the value itself is a price (e.g., "$78.99 USD")
        if value.startswith('$') or re.match(r'^\$?\d+\.?\d*\s*(USD|EUR|€)?$', value):
            return None

        # Remove " - Sold Out", " - $XX.XX USD", " - In Stock", etc.
        # Pattern: " - " followed by price or status
        if ' - ' in value:
            parts = value.split(' - ')
            # Keep only the first part (the actual variant value)
            cleaned = parts[0].strip()
            # Verify it's not a price
            if cleaned.startswith('$') or re.match(r'^\$?\d+\.?\d*', cleaned):
                return None
            return cleaned

        return value

    def _parse_variant_string(self, variant_str: str, base_title: str) -> List[str]:
        """
        Parse a variant string to extract option values.

        Input formats supported:
        - "Black / S" (simple)
        - "Black / S - Sold Out" (with status)
        - "Black / M - $35.99 USD" (with price)

        Output: ['Black', 'S'] - list of option values

        Returns list of option values (Color, Size, etc.)
        """
        variant_str = variant_str.strip()

        # Handle format: "Color / Size - Price/Status"
        # We need to split by " / " but also handle the trailing " - Price/Status"

        # Split by " / " to get individual parts
        raw_parts = variant_str.split(' / ')

        if not raw_parts:
            return []

        # Clean each part (remove price/status suffixes)
        option_values = []
        for part in raw_parts:
            cleaned = self._clean_variant_value(part)
            if cleaned:
                option_values.append(cleaned)

        return option_values

    def _parse_variants_from_string(self, variants_string: str, product_title: str) -> Dict:
        """
        Parse variants from a comma-separated string.

        Input formats:
        - "Black / S, Black / M, Red / S, Red / M"
        - "Black / S - Sold Out, Black / M - $35.99 USD, Red / S - $35.99 USD"

        Output: {
            'options': [
                {'name': 'Farbe', 'values': ['Black', 'Red']},
                {'name': 'Größe', 'values': ['S', 'M']}
            ],
            'variants': [
                {'option1': 'Black', 'option2': 'S'},
                {'option1': 'Black', 'option2': 'M'},
                {'option1': 'Red', 'option2': 'S'},
                {'option1': 'Red', 'option2': 'M'}
            ]
        }
        """
        if not variants_string:
            return None

        # Split by comma to get individual variant strings
        variant_strings = [v.strip() for v in variants_string.split(',')]

        if not variant_strings:
            return None

        # Parse each variant to get option values
        all_variants = []
        for vs in variant_strings:
            option_values = self._parse_variant_string(vs, product_title)
            if option_values:
                all_variants.append(option_values)

        if not all_variants:
            return None

        # Determine the number of options (1, 2, or 3)
        num_options = len(all_variants[0]) if all_variants else 0

        if num_options == 0:
            return None

        # Collect unique values for each option position
        option_values_by_position = [[] for _ in range(num_options)]

        for variant in all_variants:
            for i, value in enumerate(variant):
                if i < num_options and value not in option_values_by_position[i]:
                    option_values_by_position[i].append(value)

        # Determine option names based on values
        option_names = []
        for i, values in enumerate(option_values_by_position):
            # Check if all values are sizes
            all_sizes = all(self._is_size_value(v) for v in values)
            if all_sizes:
                option_names.append('Größe')  # German for Size
            elif i == 0:
                option_names.append('Farbe')  # German for Color (first non-size option)
            else:
                option_names.append('Stil')  # German for Style

        # Build options list for Shopify
        options = []
        for i, name in enumerate(option_names):
            options.append({
                'name': name,
                'values': option_values_by_position[i]
            })

        # Build variants list for Shopify (removing duplicates)
        variants = []
        seen_combinations = set()

        for variant_values in all_variants:
            # Create a tuple key for deduplication
            combo_key = tuple(variant_values)
            if combo_key in seen_combinations:
                continue  # Skip duplicate variant combinations
            seen_combinations.add(combo_key)

            variant_dict = {}
            for i, value in enumerate(variant_values):
                variant_dict[f'option{i+1}'] = value
            variants.append(variant_dict)

        return {
            'options': options,
            'variants': variants,
            'num_options': num_options
        }

    def create_product(self, research_product: ResearchProduct) -> Optional[Dict]:
        """
        Create a product in Shopify from research product data.

        Parses variant string from research to create proper options and variants.
        Falls back to default variants (S, M, L, XL, XXL) if parsing fails.

        Uses hardcoded values for:
        - vendor: 'ReBoss Store'
        - product_type: 'Dress'
        - tags: 'imported,NEW_SET'
        - status: 'draft'
        - inventory: 100 per variant
        """
        # Parse price values once for all variants
        price_value = None
        compare_value = None

        if research_product.price:
            try:
                price_value = research_product.price.replace('$', '').replace(',', '.').replace('€', '').strip()
            except:
                pass

        if research_product.compare_price:
            try:
                compare_value = research_product.compare_price.replace('$', '').replace(',', '.').replace('€', '').strip()
            except:
                pass

        # Try to parse variants from research product
        parsed_data = None
        if research_product.variants_string:
            parsed_data = self._parse_variants_from_string(
                research_product.variants_string,
                research_product.title
            )

        if parsed_data and parsed_data.get('variants'):
            # Use parsed variants
            print(f"  Parsed {len(parsed_data['variants'])} variants with {parsed_data['num_options']} option(s)")

            options = parsed_data['options']
            variants = []

            for variant_data in parsed_data['variants']:
                variant = {
                    "inventory_quantity": self.DEFAULT_INVENTORY,
                    "inventory_management": "shopify"
                }

                # Set option values (option1, option2, option3)
                for key, value in variant_data.items():
                    variant[key] = value

                if price_value:
                    variant["price"] = price_value
                if compare_value:
                    variant["compare_at_price"] = compare_value

                variants.append(variant)

            # Build product data with parsed options
            product_data = {
                "product": {
                    "title": research_product.title,
                    "body_html": research_product.description or "",
                    "vendor": self.DEFAULT_VENDOR,
                    "product_type": self.DEFAULT_PRODUCT_TYPE,
                    "tags": self.DEFAULT_TAGS,
                    "status": self.DEFAULT_STATUS,
                    "options": options,
                    "variants": variants
                }
            }
        else:
            # Fall back to default variants (S, M, L, XL, XXL)
            print(f"  Using default variants (no variant string found or parsing failed)")

            variants = []
            for size in self.DEFAULT_VARIANTS:
                variant = {
                    "option1": size,
                    "inventory_quantity": self.DEFAULT_INVENTORY,
                    "inventory_management": "shopify"
                }

                if price_value:
                    variant["price"] = price_value
                if compare_value:
                    variant["compare_at_price"] = compare_value

                variants.append(variant)

            # Build product data with default options
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
                            "name": "Größe",
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
                    print(f"  Image {i+1}: {img_url.strip()}")

            if images:
                product_data["product"]["images"] = images
                print(f"  Total images: {len(images)}")

        print(f"Creating product: {research_product.title}")

        result = self._make_request("POST", "products.json", product_data)

        if result and "product" in result:
            created_product = result["product"]
            print(f"  Created Shopify product ID: {created_product['id']}")
            print(f"  Variants created: {len(created_product.get('variants', []))}")
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
