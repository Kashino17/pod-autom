"""
Shopify Service
Handles all Shopify API interactions.
"""
import os
import sys
from typing import Optional, List, Dict, Any
import logging
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

logger = logging.getLogger(__name__)

# Shopify API Version
API_VERSION = "2026-01"


class ShopifyService:
    """Service class for Shopify API operations."""
    
    def __init__(self, shop_domain: str, access_token: str):
        self.shop_domain = shop_domain
        self.access_token = access_token
        self.base_url = f"https://{shop_domain}/admin/api/{API_VERSION}"
        self.headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Make a request to Shopify API."""
        url = f"{self.base_url}/{endpoint}"
        
        async with httpx.AsyncClient() as client:
            try:
                if method == "GET":
                    response = await client.get(url, headers=self.headers)
                elif method == "POST":
                    response = await client.post(url, headers=self.headers, json=data)
                elif method == "PUT":
                    response = await client.put(url, headers=self.headers, json=data)
                elif method == "DELETE":
                    response = await client.delete(url, headers=self.headers)
                else:
                    raise ValueError(f"Unknown method: {method}")
                
                response.raise_for_status()
                return response.json() if response.content else None
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Shopify API error: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Shopify request failed: {e}")
                raise
    
    # =====================================================
    # SHOP INFO
    # =====================================================
    
    async def get_shop(self) -> Dict:
        """Get shop information."""
        result = await self._request("GET", "shop.json")
        return result.get("shop", {}) if result else {}
    
    # =====================================================
    # PRODUCTS
    # =====================================================
    
    async def create_product(
        self,
        title: str,
        description: str,
        images: List[str],
        tags: List[str] = None,
        product_type: str = "T-Shirt",
        vendor: str = "POD AutoM",
        price: float = 29.99,
        compare_at_price: float = None,
        variants: List[Dict] = None
    ) -> Optional[Dict]:
        """
        Create a product in Shopify.
        
        Args:
            title: Product title
            description: Product description (HTML)
            images: List of image URLs
            tags: List of tags
            product_type: Product type
            vendor: Vendor name
            price: Base price
            compare_at_price: Original price (for sale display)
            variants: List of variant dictionaries
        
        Returns:
            Created product data or None on failure
        """
        # Build image objects
        image_objects = [{"src": url} for url in images if url]
        
        # Build variants (default: single variant)
        if not variants:
            variants = [{
                "price": str(price),
                "compare_at_price": str(compare_at_price) if compare_at_price else None,
                "inventory_management": "shopify",
                "inventory_policy": "deny",
                "requires_shipping": True,
                "taxable": True
            }]
        
        product_data = {
            "product": {
                "title": title,
                "body_html": description,
                "vendor": vendor,
                "product_type": product_type,
                "tags": ", ".join(tags) if tags else "",
                "status": "active",
                "images": image_objects,
                "variants": variants
            }
        }
        
        result = await self._request("POST", "products.json", product_data)
        return result.get("product") if result else None
    
    async def update_product(self, product_id: str, data: Dict) -> Optional[Dict]:
        """Update a product."""
        product_data = {"product": data}
        result = await self._request("PUT", f"products/{product_id}.json", product_data)
        return result.get("product") if result else None
    
    async def get_product(self, product_id: str) -> Optional[Dict]:
        """Get a single product."""
        result = await self._request("GET", f"products/{product_id}.json")
        return result.get("product") if result else None
    
    async def get_products(
        self,
        limit: int = 50,
        status: str = None,
        collection_id: str = None
    ) -> List[Dict]:
        """Get products with optional filters."""
        params = [f"limit={limit}"]
        if status:
            params.append(f"status={status}")
        if collection_id:
            params.append(f"collection_id={collection_id}")
        
        query = "&".join(params)
        result = await self._request("GET", f"products.json?{query}")
        return result.get("products", []) if result else []
    
    async def delete_product(self, product_id: str) -> bool:
        """Delete a product."""
        try:
            await self._request("DELETE", f"products/{product_id}.json")
            return True
        except Exception:
            return False
    
    # =====================================================
    # COLLECTIONS
    # =====================================================
    
    async def get_collections(self) -> List[Dict]:
        """Get all custom collections."""
        result = await self._request("GET", "custom_collections.json")
        return result.get("custom_collections", []) if result else []
    
    async def add_product_to_collection(
        self,
        product_id: str,
        collection_id: str
    ) -> bool:
        """Add a product to a collection."""
        data = {
            "collect": {
                "product_id": product_id,
                "collection_id": collection_id
            }
        }
        try:
            await self._request("POST", "collects.json", data)
            return True
        except Exception:
            return False
    
    # =====================================================
    # ORDERS
    # =====================================================
    
    async def get_orders(
        self,
        status: str = "any",
        limit: int = 50,
        since_id: str = None
    ) -> List[Dict]:
        """Get orders."""
        params = [f"limit={limit}", f"status={status}"]
        if since_id:
            params.append(f"since_id={since_id}")
        
        query = "&".join(params)
        result = await self._request("GET", f"orders.json?{query}")
        return result.get("orders", []) if result else []
    
    # =====================================================
    # INVENTORY
    # =====================================================
    
    async def get_inventory_levels(self, inventory_item_ids: List[str]) -> List[Dict]:
        """Get inventory levels for items."""
        ids = ",".join(inventory_item_ids)
        result = await self._request("GET", f"inventory_levels.json?inventory_item_ids={ids}")
        return result.get("inventory_levels", []) if result else []
    
    async def set_inventory_level(
        self,
        inventory_item_id: str,
        location_id: str,
        available: int
    ) -> bool:
        """Set inventory level for an item at a location."""
        data = {
            "location_id": location_id,
            "inventory_item_id": inventory_item_id,
            "available": available
        }
        try:
            await self._request("POST", "inventory_levels/set.json", data)
            return True
        except Exception:
            return False
    
    # =====================================================
    # IMAGES
    # =====================================================
    
    async def add_product_image(
        self,
        product_id: str,
        image_url: str,
        position: int = None
    ) -> Optional[Dict]:
        """Add an image to a product."""
        data = {
            "image": {
                "src": image_url
            }
        }
        if position:
            data["image"]["position"] = position
        
        result = await self._request("POST", f"products/{product_id}/images.json", data)
        return result.get("image") if result else None


# =====================================================
# HELPER FUNCTIONS
# =====================================================

async def get_shopify_service_for_shop(shop_id: str, user_id: str) -> Optional[ShopifyService]:
    """Get a ShopifyService instance for a shop."""
    from services.supabase_service import supabase_client
    
    shop = await supabase_client.get_shop_with_token(shop_id, user_id)
    if not shop or not shop.get("access_token"):
        return None
    
    return ShopifyService(shop["shop_domain"], shop["access_token"])
