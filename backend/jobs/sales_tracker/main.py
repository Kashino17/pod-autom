"""
Sales Tracker Job
Tracks orders from Shopify and updates product analytics.

Flow:
1. Get all connected shops
2. For each shop, fetch new orders from Shopify
3. Match orders to POD AutoM products
4. Update sales and revenue metrics
5. Detect potential winners based on performance

Runs every hour via Render Cron.
"""
import os
import sys
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from config import settings
from services.supabase_service import supabase_client
from services.shopify_service import ShopifyService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("SalesTrackerJob")


class SalesTrackerJob:
    """Job to track sales and update analytics."""
    
    def __init__(self):
        self.metrics = {
            "start_time": None,
            "end_time": None,
            "shops_processed": 0,
            "orders_processed": 0,
            "revenue_tracked": Decimal("0"),
            "errors": []
        }
    
    async def run(self):
        """Main entry point."""
        self.metrics["start_time"] = datetime.now(timezone.utc)
        logger.info("=" * 60)
        logger.info("💰 Starting Sales Tracker Job")
        logger.info("=" * 60)
        
        try:
            shops = await self.get_connected_shops()
            logger.info(f"Found {len(shops)} connected shops")
            
            for shop in shops:
                await self.process_shop(shop)
        
        except Exception as e:
            logger.error(f"Job failed: {e}", exc_info=True)
            self.metrics["errors"].append(str(e))
        
        finally:
            self.metrics["end_time"] = datetime.now(timezone.utc)
            self.log_metrics()
    
    async def get_connected_shops(self) -> List[Dict]:
        """Get all connected shops."""
        result = supabase_client.client.table("pod_autom_shops").select("*").eq(
            "connection_status", "connected"
        ).execute()
        
        return result.data or []
    
    async def process_shop(self, shop: Dict):
        """Process orders for a shop."""
        shop_id = shop["id"]
        shop_domain = shop["shop_domain"]
        access_token = shop.get("access_token")
        
        if not access_token:
            logger.warning(f"Shop {shop_domain} has no access token")
            return
        
        logger.info(f"\n🏪 Processing shop: {shop_domain}")
        self.metrics["shops_processed"] += 1
        
        # Initialize Shopify client
        shopify = ShopifyService(shop_domain, access_token)
        
        # Get last sync time or default to 24 hours ago
        last_sync = shop.get("last_sync_at")
        if last_sync:
            since_date = datetime.fromisoformat(last_sync.replace("Z", "+00:00"))
        else:
            since_date = datetime.now(timezone.utc) - timedelta(hours=24)
        
        # Fetch orders
        try:
            orders = await shopify.get_orders(status="any", limit=50)
            logger.info(f"  Found {len(orders)} recent orders")
            
            for order in orders:
                await self.process_order(shop_id, order)
            
            # Update last sync time
            await self.update_shop_sync(shop_id)
            
        except Exception as e:
            logger.error(f"  Error fetching orders: {e}")
            self.metrics["errors"].append(f"Shop {shop_domain}: {e}")
    
    async def process_order(self, shop_id: str, order: Dict):
        """Process a single order."""
        order_id = order.get("id")
        financial_status = order.get("financial_status")
        
        # Only count paid orders
        if financial_status not in ["paid", "partially_paid"]:
            return
        
        self.metrics["orders_processed"] += 1
        
        # Process each line item
        for item in order.get("line_items", []):
            product_id = str(item.get("product_id"))
            quantity = item.get("quantity", 1)
            price = Decimal(str(item.get("price", "0")))
            total = price * quantity
            
            # Find matching POD AutoM product
            product = await self.find_product(shop_id, product_id)
            
            if product:
                await self.update_product_sales(
                    product_id=product["id"],
                    niche_id=product.get("niche_id"),
                    quantity=quantity,
                    revenue=float(total)
                )
                
                self.metrics["revenue_tracked"] += total
                logger.info(f"    💵 Tracked sale: {item.get('title', 'Unknown')} - €{total:.2f}")
    
    async def find_product(self, shop_id: str, shopify_product_id: str) -> Optional[Dict]:
        """Find a POD AutoM product by Shopify product ID."""
        result = supabase_client.client.table("pod_autom_products").select("*").eq(
            "shop_id", shop_id
        ).eq(
            "shopify_product_id", shopify_product_id
        ).execute()
        
        return result.data[0] if result.data else None
    
    async def update_product_sales(
        self,
        product_id: str,
        niche_id: Optional[str],
        quantity: int,
        revenue: float
    ):
        """Update sales metrics for a product."""
        # Update product
        supabase_client.client.rpc(
            "increment_product_sales",
            {
                "p_product_id": product_id,
                "p_quantity": quantity,
                "p_revenue": revenue
            }
        ).execute()
        
        # Update niche if exists
        if niche_id:
            supabase_client.client.rpc(
                "increment_niche_sales",
                {
                    "p_niche_id": niche_id,
                    "p_quantity": quantity,
                    "p_revenue": revenue
                }
            ).execute()
    
    async def update_shop_sync(self, shop_id: str):
        """Update shop's last sync timestamp."""
        supabase_client.client.table("pod_autom_shops").update({
            "last_sync_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", shop_id).execute()
    
    def log_metrics(self):
        """Log job metrics."""
        duration = (self.metrics["end_time"] - self.metrics["start_time"]).total_seconds()
        
        logger.info("\n" + "=" * 60)
        logger.info("📊 Sales Tracker Metrics")
        logger.info("=" * 60)
        logger.info(f"Duration: {duration:.2f}s")
        logger.info(f"Shops processed: {self.metrics['shops_processed']}")
        logger.info(f"Orders processed: {self.metrics['orders_processed']}")
        logger.info(f"Revenue tracked: €{self.metrics['revenue_tracked']:.2f}")
        logger.info("=" * 60)


async def main():
    job = SalesTrackerJob()
    await job.run()


if __name__ == "__main__":
    asyncio.run(main())
