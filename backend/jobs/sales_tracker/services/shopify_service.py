"""
Shopify Service - Basic Shopify API operations
"""
import requests
import time
import certifi
from typing import List
from datetime import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Product


class ShopifyService:
    def __init__(self, shop_domain: str, access_token: str):
        self.shop_domain = shop_domain
        self.access_token = access_token
        self.api_version = "2024-04"
        self.rest_url = f"https://{shop_domain}/admin/api/{self.api_version}"
        self.headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }

    def get_collection_products(self, collection_id: str) -> List[Product]:
        """Get all products from a collection using REST API with pagination."""
        products = []
        next_page_url = f"{self.rest_url}/collections/{collection_id}/products.json?limit=250"

        try:
            while next_page_url:
                response = requests.get(
                    next_page_url,
                    headers=self.headers,
                    timeout=30,
                    verify=certifi.where()
                )

                if response.status_code == 200:
                    data = response.json()
                    products_data = data.get('products', [])

                    for product_data in products_data:
                        product = Product(
                            id=str(product_data['id']),
                            title=product_data['title'],
                            handle=product_data['handle'],
                            created_at=datetime.fromisoformat(
                                product_data['created_at'].replace('Z', '+00:00')
                            ),
                            updated_at=datetime.fromisoformat(
                                product_data['updated_at'].replace('Z', '+00:00')
                            ),
                            variants=product_data.get('variants', [])
                        )
                        products.append(product)

                    # Check for pagination via Link header
                    link_header = response.headers.get('Link', '')
                    if 'rel="next"' in link_header:
                        # Extract next page URL
                        for part in link_header.split(','):
                            if 'rel="next"' in part:
                                next_page_url = part.split('<')[1].split('>')[0]
                                break
                    else:
                        next_page_url = None
                elif response.status_code == 429:
                    print(f"Rate limit hit, waiting 2 seconds...")
                    time.sleep(2)
                    continue
                else:
                    print(f"Error fetching products: {response.status_code} - {response.text}")
                    break

                # Rate limiting
                time.sleep(0.5)

            return products

        except Exception as e:
            print(f"Error fetching collection products: {e}")
            return []

    def test_connection(self) -> bool:
        """Test if the Shopify connection works."""
        try:
            url = f"{self.rest_url}/shop.json"
            response = requests.get(
                url,
                headers=self.headers,
                timeout=10,
                verify=certifi.where()
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False
