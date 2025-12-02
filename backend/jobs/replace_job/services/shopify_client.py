"""
Shopify GraphQL Client - API operations for product replacement
"""
import time
import requests
from typing import Dict, List, Optional, Tuple


class ShopifyGraphQLClient:
    """GraphQL Client for Shopify API with reordering support."""

    def __init__(self, shop_domain: str, access_token: str):
        self.shop_domain = shop_domain
        self.access_token = access_token
        self.endpoint = f"https://{shop_domain}/admin/api/2024-04/graphql.json"
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

    def execute(self, query: str, variables: Dict = None) -> Dict:
        """Execute GraphQL query with error handling and retry logic."""
        self._rate_limit()

        payload = {"query": query}
        if variables:
            payload["variables"] = variables

        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                response = requests.post(
                    self.endpoint,
                    json=payload,
                    headers=self.headers,
                    timeout=30
                )
                self.last_request_time = time.time()

                data = response.json()

                # Handle throttling
                if "errors" in data:
                    for error in data["errors"]:
                        if "Throttled" in str(error):
                            wait_time = 2 ** retry_count
                            print(f"API throttled, waiting {wait_time} seconds...")
                            time.sleep(wait_time)
                            retry_count += 1
                            continue

                    raise Exception(f"GraphQL errors: {data['errors']}")

                return data.get("data", {})

            except requests.exceptions.RequestException as e:
                retry_count += 1
                if retry_count >= max_retries:
                    print(f"Request failed after {max_retries} retries: {e}")
                    raise

                wait_time = 2 ** retry_count
                print(f"Request failed, retrying in {wait_time} seconds...")
                time.sleep(wait_time)

    def get_collection_details(self, collection_id: str) -> Optional[Dict]:
        """Get collection details including tag rules and sort order."""
        query = """
        query getCollectionDetails($id: ID!) {
            collection(id: $id) {
                ... on Collection {
                    id
                    title
                    sortOrder
                    ruleSet {
                        rules {
                            column
                            relation
                            condition
                        }
                    }
                }
            }
        }
        """

        collection_gid = f"gid://shopify/Collection/{collection_id}"
        result = self.execute(query, {"id": collection_gid})

        collection = result.get("collection")
        if not collection:
            return None

        # Extract tag from rules
        tag = None
        rules = collection.get("ruleSet", {}).get("rules", [])
        for rule in rules:
            if (rule.get("column") == "TAG" and
                rule.get("relation") == "EQUALS"):
                tag = rule.get("condition")
                break

        return {
            "id": collection_id,
            "title": collection.get("title"),
            "sort_order": collection.get("sortOrder"),
            "tag": tag
        }

    def get_products_by_tag(self, tag: str, limit: int = 250) -> List[Dict]:
        """Get all products with a specific tag."""
        products = []
        cursor = None

        while len(products) < limit:
            query = """
            query getProductsByTag($query: String!, $first: Int!, $after: String) {
                products(first: $first, query: $query, after: $after) {
                    edges {
                        node {
                            id
                            title
                            tags
                            createdAt
                            status
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                    }
                }
            }
            """

            variables = {
                "query": f"tag:{tag} AND status:active",
                "first": min(250, limit - len(products)),
                "after": cursor
            }

            result = self.execute(query, variables)
            edges = result.get("products", {}).get("edges", [])

            for edge in edges:
                products.append(edge["node"])

            page_info = result.get("products", {}).get("pageInfo", {})
            if not page_info.get("hasNextPage") or not edges:
                break

            cursor = edges[-1]["cursor"]

        return products

    def get_collection_products_with_positions(self, collection_id: str) -> List[Tuple[str, int]]:
        """
        Get products in a collection with their current positions.
        Returns list of (product_gid, position).
        """
        products_with_positions = []
        cursor = None
        position = 0

        collection_gid = f"gid://shopify/Collection/{collection_id}"

        while True:
            query = """
            query getCollectionProducts($id: ID!, $first: Int!, $after: String) {
                collection(id: $id) {
                    products(first: $first, sortKey: COLLECTION_DEFAULT, after: $after) {
                        edges {
                            node {
                                id
                            }
                            cursor
                        }
                        pageInfo {
                            hasNextPage
                        }
                    }
                }
            }
            """

            variables = {
                "id": collection_gid,
                "first": 50,
                "after": cursor
            }

            result = self.execute(query, variables)
            collection = result.get("collection", {})

            if not collection:
                print(f"No collection found for ID {collection_gid}")
                break

            edges = collection.get("products", {}).get("edges", [])

            for edge in edges:
                products_with_positions.append((edge["node"]["id"], position))
                position += 1

            page_info = collection.get("products", {}).get("pageInfo", {})
            if not page_info.get("hasNextPage") or not edges:
                break

            cursor = edges[-1]["cursor"]

        return products_with_positions

    def reorder_collection_products(self, collection_id: str, moves: List[Dict]) -> bool:
        """
        Reorder products in a collection.

        Args:
            collection_id: Collection ID
            moves: List of moves with format [{"id": "gid://...", "newPosition": "0"}]

        Returns:
            bool: True if successful
        """
        if not moves:
            print("No moves to execute")
            return True

        collection_gid = f"gid://shopify/Collection/{collection_id}"

        mutation = """
        mutation reorderCollectionProducts($id: ID!, $moves: [MoveInput!]!) {
            collectionReorderProducts(id: $id, moves: $moves) {
                job {
                    id
                    done
                }
                userErrors {
                    field
                    message
                }
            }
        }
        """

        variables = {
            "id": collection_gid,
            "moves": moves
        }

        print(f"Executing reorder with {len(moves)} moves")

        result = self.execute(mutation, variables)
        reorder_result = result.get("collectionReorderProducts", {})

        user_errors = reorder_result.get("userErrors", [])
        if user_errors:
            print(f"Reorder failed with errors: {user_errors}")
            return False

        job = reorder_result.get("job", {})
        if job:
            print(f"Reorder job created: {job.get('id')}")
            return True

        return False

    def update_product_tags(self, product_id: str, tags: List[str]) -> bool:
        """Update product tags."""
        if not product_id.startswith("gid://"):
            product_id = f"gid://shopify/Product/{product_id}"

        print(f"Updating tags for product {product_id}: {tags}")

        mutation = """
        mutation updateProductTags($input: ProductInput!) {
            productUpdate(input: $input) {
                product {
                    id
                    tags
                }
                userErrors {
                    field
                    message
                }
            }
        }
        """

        # Shopify expects tags as comma-separated string
        tags_string = ", ".join(tags) if isinstance(tags, list) else tags

        variables = {
            "input": {
                "id": product_id,
                "tags": tags_string
            }
        }

        result = self.execute(mutation, variables)
        update_result = result.get("productUpdate", {})

        user_errors = update_result.get("userErrors", [])
        if user_errors:
            print(f"Failed to update tags for {product_id}: {user_errors}")
            return False

        return True

    def set_product_inventory_zero(self, product_id: str) -> bool:
        """Set all inventory levels for a product to 0.

        This is used for LOSER products that should no longer be sold.
        The product remains ACTIVE but with 0 stock.
        """
        if not product_id.startswith("gid://"):
            product_id = f"gid://shopify/Product/{product_id}"

        # First, get all variants and their inventory items
        query = """
        query getProductInventory($id: ID!) {
            product(id: $id) {
                variants(first: 100) {
                    edges {
                        node {
                            id
                            inventoryItem {
                                id
                                inventoryLevels(first: 10) {
                                    edges {
                                        node {
                                            id
                                            location {
                                                id
                                            }
                                            quantities(names: ["available"]) {
                                                name
                                                quantity
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        """

        result = self.execute(query, {"id": product_id})
        product = result.get("product")

        if not product:
            print(f"Product {product_id} not found")
            return False

        variants = product.get("variants", {}).get("edges", [])
        all_success = True

        for variant_edge in variants:
            variant = variant_edge.get("node", {})
            inventory_item = variant.get("inventoryItem", {})
            inventory_levels = inventory_item.get("inventoryLevels", {}).get("edges", [])

            for level_edge in inventory_levels:
                level = level_edge.get("node", {})
                location_id = level.get("location", {}).get("id")
                inventory_item_id = inventory_item.get("id")

                if location_id and inventory_item_id:
                    # Get current quantity
                    current_qty = 0
                    quantities = level.get("quantities", [])
                    for q in quantities:
                        if q.get("name") == "available":
                            current_qty = q.get("quantity", 0)
                            break

                    if current_qty > 0:
                        # Set to 0 using the new API
                        success = self._set_inventory_to_zero(
                            inventory_item_id,
                            location_id
                        )
                        if not success:
                            all_success = False

        return all_success

    def _set_inventory_to_zero(self, inventory_item_id: str, location_id: str) -> bool:
        """Set inventory to zero using the new inventorySetQuantities mutation."""
        mutation = """
        mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
            inventorySetQuantities(input: $input) {
                inventoryAdjustmentGroup {
                    createdAt
                    reason
                }
                userErrors {
                    field
                    message
                }
            }
        }
        """

        variables = {
            "input": {
                "name": "available",
                "reason": "correction",
                "quantities": [
                    {
                        "inventoryItemId": inventory_item_id,
                        "locationId": location_id,
                        "quantity": 0
                    }
                ]
            }
        }

        try:
            result = self.execute(mutation, variables)
            set_result = result.get("inventorySetQuantities", {})

            user_errors = set_result.get("userErrors", [])
            if user_errors:
                print(f"Failed to set inventory to 0: {user_errors}")
                return False

            return True
        except Exception as e:
            print(f"Error setting inventory to 0: {e}")
            return False
