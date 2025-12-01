"""
Shopify Service for Sales Tracker Job
Fetches products and sales data from Shopify
"""
import time
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Product, SalesData


class ShopifyService:
    """Shopify REST API Client for Sales Tracking."""

    def __init__(self, shop_domain: str, access_token: str):
        self.shop_domain = shop_domain
        self.access_token = access_token
        self.api_version = "2024-04"
        self.base_url = f"https://{shop_domain}/admin/api/{self.api_version}"
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

    def _make_request(self, method: str, endpoint: str, params: Dict = None,
                       full_url: str = None) -> tuple[Optional[Dict], Optional[str]]:
        """Make HTTP request with error handling.
        Returns: (json_response, next_page_url)
        """
        self._rate_limit()

        url = full_url if full_url else f"{self.base_url}/{endpoint}"
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                if method == "GET":
                    response = requests.get(url, headers=self.headers, params=params if not full_url else None, timeout=60)
                else:
                    raise ValueError(f"Unsupported method: {method}")

                self.last_request_time = time.time()

                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 2))
                    print(f"    Rate limited, waiting {retry_after} seconds...")
                    time.sleep(retry_after)
                    retry_count += 1
                    continue

                if response.status_code >= 400:
                    print(f"    API Error {response.status_code}: {response.text[:200]}")
                    if response.status_code in [500, 502, 503, 504]:
                        retry_count += 1
                        time.sleep(2 ** retry_count)
                        continue
                    return None, None

                # Parse Link header for cursor-based pagination
                next_url = None
                link_header = response.headers.get('Link', '')
                if link_header:
                    for link in link_header.split(','):
                        if 'rel="next"' in link:
                            # Extract URL between < and >
                            start = link.find('<') + 1
                            end = link.find('>')
                            if start > 0 and end > start:
                                next_url = link[start:end]
                                break

                return response.json(), next_url

            except requests.exceptions.RequestException as e:
                retry_count += 1
                if retry_count >= max_retries:
                    print(f"    Request failed after {max_retries} retries: {e}")
                    return None, None
                time.sleep(2 ** retry_count)

        return None, None

    def test_connection(self) -> bool:
        """Test connection to Shopify store."""
        result, _ = self._make_request("GET", "shop.json")
        return result is not None

    def get_shop_timezone(self) -> str:
        """Get shop timezone from Shopify API."""
        result, _ = self._make_request("GET", "shop.json")
        if result and 'shop' in result:
            return result['shop'].get('iana_timezone', 'Europe/Berlin')
        return 'Europe/Berlin'  # Fallback

    def get_collection_products(self, collection_id: str) -> List[Product]:
        """Get all products from a collection."""
        products = []

        result, _ = self._make_request("GET", f"collections/{collection_id}/products.json", {'limit': 250})

        if result and 'products' in result:
            for product_data in result['products']:
                if product_data.get('status') == 'active':
                    try:
                        product = Product(
                            id=str(product_data['id']),
                            title=product_data['title'],
                            handle=product_data['handle'],
                            created_at=datetime.fromisoformat(product_data['created_at'].replace('Z', '+00:00')),
                            updated_at=datetime.fromisoformat(product_data['updated_at'].replace('Z', '+00:00')),
                            variants=product_data.get('variants', [])
                        )
                        products.append(product)
                    except Exception as e:
                        print(f"    Error parsing product: {e}")

        return products

    def get_product_sales_comprehensive(self, product_id: str, since_date: datetime,
                                         date_added_to_collection: datetime = None,
                                         shop_timezone: str = 'Europe/Berlin') -> SalesData:
        """Get comprehensive sales data for a product.

        Args:
            product_id: Shopify product ID
            since_date: Earliest date to fetch orders from
            date_added_to_collection: When product was added to collection (for first 7 days calc)
            shop_timezone: IANA timezone string (e.g., 'Europe/Berlin')
        """
        total_sales = 0.0
        total_quantity = 0
        processed_orders = set()
        processed_line_items = set()

        # For tracking order dates with quantities
        all_order_dates_with_quantities = []

        print(f"    Fetching orders for product {product_id} since {since_date.date()}")

        # Fetch all orders since the date using cursor-based pagination
        params = {
            'status': 'any',
            'limit': 250,
            'created_at_min': since_date.strftime("%Y-%m-%dT%H:%M:%S-00:00")
        }

        next_url = None
        is_first_request = True

        while True:
            if is_first_request:
                result, next_url = self._make_request("GET", "orders.json", params)
                is_first_request = False
            else:
                result, next_url = self._make_request("GET", "", full_url=next_url)

            if not result or 'orders' not in result:
                break

            orders = result.get('orders', [])
            if not orders:
                break

            for order in orders:
                order_id = order.get('id')
                if order_id in processed_orders:
                    continue

                processed_orders.add(order_id)

                for line_item in order.get('line_items', []):
                    line_item_id = line_item.get('id')
                    if line_item_id in processed_line_items:
                        continue

                    if str(line_item.get('product_id')) == product_id:
                        quantity = line_item.get('quantity', 0)
                        price = float(line_item.get('price', 0))
                        order_created = order.get('created_at', '')

                        # Parse order date
                        try:
                            order_date = datetime.fromisoformat(order_created.replace('Z', '+00:00'))
                            all_order_dates_with_quantities.append((order_date, quantity))
                        except:
                            pass

                        processed_line_items.add(line_item_id)
                        total_quantity += quantity
                        total_sales += (price * quantity)

            # If no next page, stop
            if not next_url:
                break

        # Calculate time-based metrics using shop timezone
        sales_first_7_days = 0
        sales_last_3_days = 0
        sales_last_7_days = 0
        sales_last_10_days = 0
        sales_last_14_days = 0

        # Use shop timezone for all date calculations
        try:
            shop_tz = ZoneInfo(shop_timezone)
        except Exception:
            shop_tz = ZoneInfo('Europe/Berlin')

        now = datetime.now(shop_tz)

        # "Last X days" should EXCLUDE today
        # End of yesterday = today at 00:00:00 minus 1 microsecond
        end_of_yesterday = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(microseconds=1)
        start_of_yesterday = end_of_yesterday.replace(hour=0, minute=0, second=0, microsecond=0)

        # Last X days = from (yesterday - X + 1 days) at 00:00 to yesterday at 23:59:59
        # Last 3 days: yesterday, day before yesterday, day before that
        cutoff_3 = start_of_yesterday - timedelta(days=2)   # 3 days total including yesterday
        cutoff_7 = start_of_yesterday - timedelta(days=6)   # 7 days total
        cutoff_10 = start_of_yesterday - timedelta(days=9)  # 10 days total
        cutoff_14 = start_of_yesterday - timedelta(days=13) # 14 days total

        if all_order_dates_with_quantities:
            # Sort by date
            all_order_dates_with_quantities.sort(key=lambda x: x[0])

            # First 7 days calculation
            if date_added_to_collection:
                first_date = date_added_to_collection
                if first_date.tzinfo is None:
                    first_date = first_date.replace(tzinfo=shop_tz)
                else:
                    first_date = first_date.astimezone(shop_tz)
                cutoff_date_first = first_date + timedelta(days=7)

                for order_date, quantity in all_order_dates_with_quantities:
                    order_date_local = order_date.astimezone(shop_tz)
                    if first_date <= order_date_local <= cutoff_date_first:
                        sales_first_7_days += quantity
            else:
                # Fallback: from oldest order
                first_order_date = all_order_dates_with_quantities[0][0].astimezone(shop_tz)
                cutoff_date_first = first_order_date + timedelta(days=7)

                for order_date, quantity in all_order_dates_with_quantities:
                    order_date_local = order_date.astimezone(shop_tz)
                    if order_date_local <= cutoff_date_first:
                        sales_first_7_days += quantity

            # Last X days calculations - only count orders up to end of yesterday
            for order_date, quantity in all_order_dates_with_quantities:
                order_date_local = order_date.astimezone(shop_tz)

                # Only count if order is before end of yesterday (exclude today)
                if order_date_local <= end_of_yesterday:
                    if order_date_local >= cutoff_3:
                        sales_last_3_days += quantity
                    if order_date_local >= cutoff_7:
                        sales_last_7_days += quantity
                    if order_date_local >= cutoff_10:
                        sales_last_10_days += quantity
                    if order_date_local >= cutoff_14:
                        sales_last_14_days += quantity

        print(f"    Found {len(processed_orders)} orders, {total_quantity} items, ${total_sales:.2f} total")
        print(f"    Last 3/7/10/14 days: {sales_last_3_days}/{sales_last_7_days}/{sales_last_10_days}/{sales_last_14_days}")

        return SalesData(
            product_id=product_id,
            product_title="",
            total_sales=total_sales,
            total_quantity=total_quantity,
            sales_first_7_days=sales_first_7_days,
            sales_last_3_days=sales_last_3_days,
            sales_last_7_days=sales_last_7_days,
            sales_last_10_days=sales_last_10_days,
            sales_last_14_days=sales_last_14_days,
            last_update=datetime.now(shop_tz),
            date_added_to_collection=date_added_to_collection
        )
