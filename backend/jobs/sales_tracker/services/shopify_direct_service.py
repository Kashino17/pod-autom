"""
Shopify Direct Service - Comprehensive sales data retrieval
Uses multiple strategies to ensure complete order coverage
"""
import requests
import time
import certifi
from datetime import datetime, timedelta
from typing import List, Dict, Any, Set, Tuple

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import SalesData


class ShopifyDirectService:
    def __init__(self, shop_domain: str, access_token: str):
        self.shop_domain = shop_domain
        self.access_token = access_token
        self.api_version = "2024-04"
        self.rest_url = f"https://{shop_domain}/admin/api/{self.api_version}"
        self.headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }

    def get_product_sales_comprehensive(
        self,
        product_id: str,
        since_date: datetime,
        date_added_to_collection: datetime = None
    ) -> SalesData:
        """
        Get comprehensive sales data using multiple strategies.
        Strategy 1: Direct order search with product filter
        Strategy 2: Full order scan (up to 100 pages)
        Strategy 3: GraphQL query for better coverage
        """
        total_sales = 0.0
        total_quantity = 0
        processed_orders: Set[int] = set()
        processed_line_items: Set[int] = set()

        # Track orders with dates for time-period calculations
        all_order_dates_with_quantities: List[Tuple[datetime, int]] = []

        print(f"\n=== SALES SEARCH FOR PRODUCT {product_id} ===")
        print(f"Since date: {since_date}")

        # Strategy 1: Direct order search
        print("\n--- Strategy 1: Direct product search ---")
        found_strategy1 = self._search_orders_rest(
            product_id, since_date, processed_orders, processed_line_items,
            all_order_dates_with_quantities
        )
        total_quantity += found_strategy1['quantity']
        total_sales += found_strategy1['sales']
        print(f"Strategy 1 found: {found_strategy1['count']} line items")

        # Strategy 2: Full order scan
        print("\n--- Strategy 2: Full order scan ---")
        found_strategy2 = self._scan_all_orders(
            product_id, since_date, processed_orders, processed_line_items,
            all_order_dates_with_quantities, max_pages=100
        )
        total_quantity += found_strategy2['quantity']
        total_sales += found_strategy2['sales']
        print(f"Strategy 2 found additional: {found_strategy2['count']} line items")

        # Strategy 3: GraphQL search
        print("\n--- Strategy 3: GraphQL search ---")
        found_strategy3 = self._search_orders_graphql(
            product_id, since_date, processed_orders, processed_line_items,
            all_order_dates_with_quantities
        )
        total_quantity += found_strategy3['quantity']
        total_sales += found_strategy3['sales']
        print(f"Strategy 3 found additional: {found_strategy3['count']} line items")

        # Calculate time-period metrics
        metrics = self._calculate_time_metrics(
            all_order_dates_with_quantities,
            date_added_to_collection
        )

        print(f"\n=== FINAL RESULTS ===")
        print(f"Total unique orders: {len(processed_orders)}")
        print(f"Total line items: {len(processed_line_items)}")
        print(f"Total quantity: {total_quantity}")
        print(f"Total sales: ${total_sales:.2f}")
        print(f"Sales first 7 days: {metrics['first_7']}")
        print(f"Sales last 3/7/10/14 days: {metrics['last_3']}/{metrics['last_7']}/{metrics['last_10']}/{metrics['last_14']}")

        return SalesData(
            product_id=product_id,
            product_title="",
            total_sales=total_sales,
            total_quantity=total_quantity,
            sales_first_7_days=metrics['first_7'],
            sales_last_3_days=metrics['last_3'],
            sales_last_7_days=metrics['last_7'],
            sales_last_10_days=metrics['last_10'],
            sales_last_14_days=metrics['last_14'],
            last_update=datetime.now()
        )

    def _search_orders_rest(
        self,
        product_id: str,
        since_date: datetime,
        processed_orders: Set[int],
        processed_line_items: Set[int],
        order_dates: List[Tuple[datetime, int]]
    ) -> Dict[str, Any]:
        """Search orders using REST API."""
        result = {'quantity': 0, 'sales': 0.0, 'count': 0}
        url = f"{self.rest_url}/orders.json"
        page = 1

        while True:
            params = {
                'status': 'any',
                'limit': 250,
                'page': page,
                'created_at_min': since_date.strftime("%Y-%m-%dT%H:%M:%S-05:00")
            }

            try:
                response = requests.get(
                    url, params=params, headers=self.headers,
                    timeout=60, verify=certifi.where()
                )

                if response.status_code == 429:
                    print("Rate limit hit, waiting 2 seconds...")
                    time.sleep(2)
                    continue
                elif response.status_code != 200:
                    print(f"Error: {response.status_code}")
                    break

                orders = response.json().get('orders', [])
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

                            # Parse order date
                            try:
                                order_date = datetime.fromisoformat(
                                    order.get('created_at', '').replace('Z', '+00:00')
                                )
                                order_dates.append((order_date, quantity))
                            except:
                                pass

                            processed_line_items.add(line_item_id)
                            result['quantity'] += quantity
                            result['sales'] += (price * quantity)
                            result['count'] += 1

                page += 1
                time.sleep(0.2)

            except Exception as e:
                print(f"Error in REST search: {e}")
                break

        return result

    def _scan_all_orders(
        self,
        product_id: str,
        since_date: datetime,
        processed_orders: Set[int],
        processed_line_items: Set[int],
        order_dates: List[Tuple[datetime, int]],
        max_pages: int = 100
    ) -> Dict[str, Any]:
        """Scan all orders to find additional matches."""
        result = {'quantity': 0, 'sales': 0.0, 'count': 0}
        url = f"{self.rest_url}/orders.json"
        page = 1
        pages_processed = 0

        while pages_processed < max_pages:
            params = {
                'status': 'any',
                'limit': 250,
                'page': page,
                'created_at_min': since_date.strftime("%Y-%m-%dT%H:%M:%S-05:00")
            }

            try:
                response = requests.get(
                    url, params=params, headers=self.headers,
                    timeout=60, verify=certifi.where()
                )

                if response.status_code == 429:
                    time.sleep(2)
                    continue
                elif response.status_code != 200:
                    break

                orders = response.json().get('orders', [])
                if not orders:
                    break

                for order in orders:
                    for line_item in order.get('line_items', []):
                        line_item_id = line_item.get('id')
                        if line_item_id in processed_line_items:
                            continue

                        if str(line_item.get('product_id')) == product_id:
                            quantity = line_item.get('quantity', 0)
                            price = float(line_item.get('price', 0))
                            order_id = order.get('id')

                            try:
                                order_date = datetime.fromisoformat(
                                    order.get('created_at', '').replace('Z', '+00:00')
                                )
                                order_dates.append((order_date, quantity))
                            except:
                                pass

                            if order_id not in processed_orders:
                                processed_orders.add(order_id)

                            processed_line_items.add(line_item_id)
                            result['quantity'] += quantity
                            result['sales'] += (price * quantity)
                            result['count'] += 1

                page += 1
                pages_processed += 1

                if pages_processed % 20 == 0:
                    print(f"  Processed {pages_processed} pages...")

                time.sleep(0.2)

            except Exception as e:
                print(f"Error in full scan: {e}")
                break

        return result

    def _search_orders_graphql(
        self,
        product_id: str,
        since_date: datetime,
        processed_orders: Set[int],
        processed_line_items: Set[int],
        order_dates: List[Tuple[datetime, int]]
    ) -> Dict[str, Any]:
        """Search orders using GraphQL API for better coverage."""
        result = {'quantity': 0, 'sales': 0.0, 'count': 0}
        graphql_url = f"https://{self.shop_domain}/admin/api/{self.api_version}/graphql.json"

        query = """
        query getProductOrders($productQuery: String!, $cursor: String) {
            orders(first: 50, after: $cursor, query: $productQuery) {
                edges {
                    cursor
                    node {
                        id
                        name
                        createdAt
                        lineItems(first: 100) {
                            edges {
                                node {
                                    id
                                    quantity
                                    product {
                                        id
                                    }
                                    originalTotalSet {
                                        shopMoney {
                                            amount
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                }
            }
        }
        """

        gid_product = f"gid://shopify/Product/{product_id}"
        cursor = None
        has_next_page = True

        while has_next_page:
            variables = {
                "productQuery": f"product_id:{product_id} created_at:>={since_date.strftime('%Y-%m-%d')}",
                "cursor": cursor
            }

            try:
                response = requests.post(
                    graphql_url,
                    json={"query": query, "variables": variables},
                    headers=self.headers,
                    timeout=60,
                    verify=certifi.where()
                )

                if response.status_code == 429:
                    time.sleep(2)
                    continue
                elif response.status_code != 200:
                    break

                data = response.json()

                if "data" not in data or "orders" not in data["data"]:
                    break

                orders = data["data"]["orders"]["edges"]

                for order_edge in orders:
                    order = order_edge["node"]
                    order_gid = order["id"]
                    order_id = int(order_gid.split('/')[-1])

                    if order_id in processed_orders:
                        continue

                    for line_item_edge in order["lineItems"]["edges"]:
                        line_item = line_item_edge["node"]
                        line_item_gid = line_item["id"]
                        line_item_id = int(line_item_gid.split('/')[-1])

                        if line_item_id in processed_line_items:
                            continue

                        product_gid = line_item.get("product", {}).get("id", "")
                        if product_gid == gid_product:
                            quantity = line_item["quantity"]
                            total_amount = float(
                                line_item["originalTotalSet"]["shopMoney"]["amount"]
                            )
                            price = total_amount / quantity if quantity > 0 else 0

                            try:
                                order_date = datetime.fromisoformat(
                                    order.get("createdAt", "").replace('Z', '+00:00')
                                )
                                order_dates.append((order_date, quantity))
                            except:
                                pass

                            processed_line_items.add(line_item_id)
                            result['quantity'] += quantity
                            result['sales'] += total_amount
                            result['count'] += 1

                has_next_page = data["data"]["orders"]["pageInfo"]["hasNextPage"]
                if has_next_page and orders:
                    cursor = orders[-1]["cursor"]
                else:
                    has_next_page = False

                time.sleep(0.2)

            except Exception as e:
                print(f"Error in GraphQL search: {e}")
                break

        return result

    def _calculate_time_metrics(
        self,
        order_dates: List[Tuple[datetime, int]],
        date_added_to_collection: datetime = None
    ) -> Dict[str, int]:
        """Calculate time-period sales metrics."""
        metrics = {
            'first_7': 0,
            'last_3': 0,
            'last_7': 0,
            'last_10': 0,
            'last_14': 0
        }

        if not order_dates:
            return metrics

        # Sort by date
        order_dates.sort(key=lambda x: x[0])

        # First 7 days calculation
        if date_added_to_collection:
            first_date = date_added_to_collection
            if first_date.tzinfo is None and order_dates[0][0].tzinfo is not None:
                first_date = first_date.replace(tzinfo=order_dates[0][0].tzinfo)
            cutoff_first = first_date + timedelta(days=7)

            for order_date, quantity in order_dates:
                if first_date <= order_date <= cutoff_first:
                    metrics['first_7'] += quantity
        else:
            # Fallback: use first order date
            first_order_date = order_dates[0][0]
            cutoff_first = first_order_date + timedelta(days=7)

            for order_date, quantity in order_dates:
                if order_date <= cutoff_first:
                    metrics['first_7'] += quantity

        # Last X days from now
        now = datetime.now(order_dates[0][0].tzinfo) if order_dates[0][0].tzinfo else datetime.now()
        cutoff_3 = now - timedelta(days=3)
        cutoff_7 = now - timedelta(days=7)
        cutoff_10 = now - timedelta(days=10)
        cutoff_14 = now - timedelta(days=14)

        for order_date, quantity in order_dates:
            if order_date >= cutoff_3:
                metrics['last_3'] += quantity
            if order_date >= cutoff_7:
                metrics['last_7'] += quantity
            if order_date >= cutoff_10:
                metrics['last_10'] += quantity
            if order_date >= cutoff_14:
                metrics['last_14'] += quantity

        return metrics
