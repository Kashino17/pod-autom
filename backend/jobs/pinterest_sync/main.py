"""
Pinterest Sync Job
Creates Pinterest pins for newly created products.

Flow:
1. Get products that don't have Pinterest pins yet
2. For each product, create a pin on the user's Pinterest board
3. Track pin creation in database

Runs every 4 hours via Render Cron.
"""
import os
import sys
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from config import settings
from services.supabase_service import supabase_client
from services.pinterest_service import PinterestService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("PinterestSyncJob")


class PinterestSyncJob:
    """Job to sync products to Pinterest as pins."""
    
    def __init__(self):
        self.metrics = {
            "start_time": None,
            "end_time": None,
            "pins_created": 0,
            "pins_failed": 0,
            "errors": []
        }
    
    async def run(self):
        """Main entry point."""
        self.metrics["start_time"] = datetime.now(timezone.utc)
        logger.info("=" * 60)
        logger.info("📌 Starting Pinterest Sync Job")
        logger.info("=" * 60)
        
        try:
            # Get all users with Pinterest connected
            users = await self.get_users_with_pinterest()
            logger.info(f"Found {len(users)} users with Pinterest")
            
            for user_data in users:
                await self.process_user(user_data)
        
        except Exception as e:
            logger.error(f"Job failed: {e}", exc_info=True)
            self.metrics["errors"].append(str(e))
        
        finally:
            self.metrics["end_time"] = datetime.now(timezone.utc)
            self.log_metrics()
    
    async def get_users_with_pinterest(self) -> List[Dict]:
        """Get users who have Pinterest connected."""
        result = supabase_client.client.table("pod_autom_ad_platforms").select(
            "*, auth.users!inner(id, email)"
        ).eq(
            "platform", "pinterest"
        ).eq(
            "connection_status", "connected"
        ).execute()
        
        return result.data or []
    
    async def process_user(self, platform_data: Dict):
        """Process Pinterest sync for a user."""
        user_id = platform_data["user_id"]
        access_token = platform_data.get("access_token")
        
        if not access_token:
            logger.warning(f"User {user_id} has no Pinterest access token")
            return
        
        logger.info(f"\n👤 Processing user: {user_id}")
        
        # Initialize Pinterest client
        pinterest = PinterestService(access_token)
        
        # Get products without Pinterest pins
        products = await self.get_products_without_pins(user_id)
        logger.info(f"Found {len(products)} products without pins")
        
        for product in products[:10]:  # Max 10 per run per user
            try:
                await self.create_pin(pinterest, product, platform_data)
                self.metrics["pins_created"] += 1
            except Exception as e:
                logger.error(f"Failed to create pin: {e}")
                self.metrics["pins_failed"] += 1
                self.metrics["errors"].append(str(e))
    
    async def get_products_without_pins(self, user_id: str) -> List[Dict]:
        """Get products that don't have Pinterest pins yet."""
        # Get products from shops owned by this user
        # that are published but don't have pinterest_pin_id
        result = supabase_client.client.table("pod_autom_products").select(
            "*, pod_autom_shops!inner(user_id)"
        ).eq(
            "pod_autom_shops.user_id", user_id
        ).eq(
            "status", "published"
        ).is_(
            "pinterest_pin_id", "null"
        ).limit(20).execute()
        
        return result.data or []
    
    async def create_pin(
        self,
        pinterest: "PinterestService",
        product: Dict,
        platform_data: Dict
    ):
        """Create a Pinterest pin for a product."""
        board_id = platform_data.get("ad_account_id")  # Using ad_account_id to store default board
        
        if not board_id:
            logger.warning("No Pinterest board configured")
            return
        
        # Create pin
        pin_data = await pinterest.create_pin(
            board_id=board_id,
            title=product["title"],
            description=product.get("description", "")[:500],  # Pinterest limit
            link=f"https://shop.example.com/products/{product.get('shopify_handle', '')}",
            media_url=product.get("generated_image_url")
        )
        
        if pin_data:
            # Update product with pin ID
            supabase_client.client.table("pod_autom_products").update({
                "pinterest_pin_id": pin_data.get("id")
            }).eq("id", product["id"]).execute()
            
            logger.info(f"  ✅ Created pin for: {product['title']}")
    
    def log_metrics(self):
        """Log job metrics."""
        duration = (self.metrics["end_time"] - self.metrics["start_time"]).total_seconds()
        
        logger.info("\n" + "=" * 60)
        logger.info("📊 Pinterest Sync Metrics")
        logger.info("=" * 60)
        logger.info(f"Duration: {duration:.2f}s")
        logger.info(f"Pins created: {self.metrics['pins_created']}")
        logger.info(f"Pins failed: {self.metrics['pins_failed']}")
        logger.info("=" * 60)


async def main():
    job = PinterestSyncJob()
    await job.run()


if __name__ == "__main__":
    asyncio.run(main())
