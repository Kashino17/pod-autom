"""
Product Creation Job
Automatically generates products for all active shops and niches.

Flow:
1. Get all active shops with active subscriptions
2. For each shop, get active niches
3. For each niche, generate products up to the daily limit
4. Generate design with GPT Image
5. Create mockups for different product types
6. Generate title and description
7. Create product in Shopify
8. Save to database

Runs every 6 hours via Render Cron.
"""
import os
import sys
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# Add parent directories to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from config import settings
from services.supabase_service import supabase_client
from services.openai_service import generate_design_image, generate_product_title, generate_product_description, generate_tags
from services.mockup_service import create_mockup, create_all_mockups
from services.shopify_service import ShopifyService

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("ProductCreationJob")


class ProductCreationJob:
    """Main job class for product creation."""
    
    def __init__(self):
        self.metrics = {
            "start_time": None,
            "end_time": None,
            "shops_processed": 0,
            "niches_processed": 0,
            "products_created": 0,
            "products_failed": 0,
            "errors": []
        }
    
    async def run(self):
        """Main entry point for the job."""
        self.metrics["start_time"] = datetime.now(timezone.utc)
        logger.info("=" * 60)
        logger.info("🚀 Starting Product Creation Job")
        logger.info("=" * 60)
        
        try:
            # Get all active shops
            shops = await self.get_active_shops()
            logger.info(f"Found {len(shops)} active shops")
            
            for shop in shops:
                await self.process_shop(shop)
            
        except Exception as e:
            logger.error(f"Job failed with error: {e}", exc_info=True)
            self.metrics["errors"].append(str(e))
        
        finally:
            self.metrics["end_time"] = datetime.now(timezone.utc)
            self.log_metrics()
    
    async def get_active_shops(self) -> List[Dict]:
        """Get all shops with active subscriptions."""
        # Get shops that are connected and have active settings
        result = supabase_client.client.table("pod_autom_shops").select(
            "*, pod_autom_settings(*), pod_autom_subscriptions!inner(*)"
        ).eq(
            "connection_status", "connected"
        ).eq(
            "pod_autom_subscriptions.status", "active"
        ).execute()
        
        return result.data or []
    
    async def process_shop(self, shop: Dict):
        """Process a single shop - generate products for all active niches."""
        shop_id = shop["id"]
        shop_domain = shop["shop_domain"]
        settings_data = shop.get("pod_autom_settings")
        subscription = shop.get("pod_autom_subscriptions")
        
        if not settings_data:
            logger.warning(f"Shop {shop_domain} has no settings, skipping")
            return
        
        if not settings_data.get("enabled", True):
            logger.info(f"Shop {shop_domain} is disabled, skipping")
            return
        
        settings_id = settings_data["id"]
        
        logger.info(f"\n📦 Processing shop: {shop_domain}")
        self.metrics["shops_processed"] += 1
        
        # Get subscription limits
        tier = subscription.get("tier", "basis") if subscription else "basis"
        limits = self.get_tier_limits(tier)
        
        # Check daily limit
        daily_count = settings_data.get("daily_creation_count", 0)
        daily_limit = settings_data.get("creation_limit", limits["daily_products"])
        
        if daily_count >= daily_limit:
            logger.info(f"Shop {shop_domain} reached daily limit ({daily_count}/{daily_limit})")
            return
        
        remaining = daily_limit - daily_count
        
        # Get active niches
        niches = await self.get_active_niches(settings_id)
        logger.info(f"Found {len(niches)} active niches")
        
        # Initialize Shopify client
        shopify = ShopifyService(shop_domain, shop.get("access_token"))
        
        # Process each niche
        products_created = 0
        for niche in niches:
            if products_created >= remaining:
                break
            
            try:
                created = await self.process_niche(
                    shop=shop,
                    settings=settings_data,
                    niche=niche,
                    shopify=shopify,
                    max_products=min(3, remaining - products_created)  # Max 3 per niche per run
                )
                products_created += created
            except Exception as e:
                logger.error(f"Error processing niche {niche['niche_name']}: {e}")
                self.metrics["errors"].append(f"Niche {niche['niche_name']}: {e}")
        
        # Update daily count
        await self.update_daily_count(settings_id, daily_count + products_created)
    
    async def get_active_niches(self, settings_id: str) -> List[Dict]:
        """Get active niches for a settings entry."""
        result = supabase_client.client.table("pod_autom_niches").select("*").eq(
            "settings_id", settings_id
        ).eq(
            "is_active", True
        ).order("priority", desc=True).execute()
        
        return result.data or []
    
    async def process_niche(
        self,
        shop: Dict,
        settings: Dict,
        niche: Dict,
        shopify: ShopifyService,
        max_products: int = 1
    ) -> int:
        """Process a single niche - generate products."""
        niche_name = niche["niche_name"]
        niche_id = niche["id"]
        
        logger.info(f"  🏷️  Processing niche: {niche_name}")
        self.metrics["niches_processed"] += 1
        
        products_created = 0
        
        for i in range(max_products):
            try:
                product = await self.create_product(
                    shop=shop,
                    settings=settings,
                    niche=niche,
                    shopify=shopify
                )
                
                if product:
                    products_created += 1
                    self.metrics["products_created"] += 1
                    logger.info(f"    ✅ Created product: {product.get('title', 'Unknown')}")
                
            except Exception as e:
                logger.error(f"    ❌ Failed to create product: {e}")
                self.metrics["products_failed"] += 1
                self.metrics["errors"].append(str(e))
        
        return products_created
    
    async def create_product(
        self,
        shop: Dict,
        settings: Dict,
        niche: Dict,
        shopify: ShopifyService
    ) -> Optional[Dict]:
        """Create a single product - full pipeline."""
        niche_name = niche["niche_name"]
        shop_id = shop["id"]
        
        # 1. Generate design
        logger.info(f"    🎨 Generating design for {niche_name}...")
        design_result = await generate_design_image(
            niche=niche_name,
            style="minimalist"  # TODO: Get from settings/prompts
        )
        design_url = design_result["image_url"]
        design_prompt = design_result["prompt"]
        
        # 2. Create mockups
        logger.info(f"    👕 Creating mockups...")
        mockups = await create_all_mockups(
            design_url=design_url,
            product_types=["t-shirt"],
            colors=["black", "white"]
        )
        
        # 3. Generate title
        logger.info(f"    📝 Generating title...")
        title = await generate_product_title(
            niche=niche_name,
            design_description=design_prompt,
            product_type="T-Shirt"
        )
        
        # 4. Generate description
        logger.info(f"    📄 Generating description...")
        description = await generate_product_description(
            niche=niche_name,
            design_description=design_prompt,
            product_type="T-Shirt"
        )
        
        # 5. Generate tags
        tags = await generate_tags(niche_name, title)
        
        # 6. Create in Shopify
        logger.info(f"    🛒 Creating Shopify product...")
        shopify_product = await shopify.create_product(
            title=title,
            description=description,
            images=[design_url] + list(mockups.values()),
            tags=tags,
            product_type="T-Shirt",
            vendor=settings.get("default_vendor", "POD AutoM"),
            price=settings.get("default_price", 29.99)
        )
        
        if not shopify_product:
            raise Exception("Shopify product creation failed")
        
        # 7. Save to database
        product_data = {
            "shop_id": shop_id,
            "niche_id": niche["id"],
            "shopify_product_id": str(shopify_product.get("id")),
            "shopify_handle": shopify_product.get("handle"),
            "title": title,
            "description": description,
            "generated_image_url": design_url,
            "generated_title": title,
            "generated_description": description,
            "prompt_used": design_prompt,
            "price": settings.get("default_price", 29.99),
            "status": "published",
            "publish_status": "active",
            "phase": "start_phase",
            "phase_start_date": datetime.now(timezone.utc).isoformat(),
            "published_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase_client.client.table("pod_autom_products").insert(product_data).execute()
        
        # Update niche product count
        await self.increment_niche_products(niche["id"])
        
        return result.data[0] if result.data else None
    
    async def increment_niche_products(self, niche_id: str):
        """Increment the product count for a niche."""
        supabase_client.client.rpc(
            "increment_niche_products",
            {"niche_id": niche_id}
        ).execute()
    
    async def update_daily_count(self, settings_id: str, new_count: int):
        """Update the daily creation count."""
        supabase_client.client.table("pod_autom_settings").update({
            "daily_creation_count": new_count
        }).eq("id", settings_id).execute()
    
    def get_tier_limits(self, tier: str) -> Dict:
        """Get limits for a subscription tier."""
        limits = {
            "basis": {"daily_products": 5, "max_niches": 5},
            "premium": {"daily_products": 20, "max_niches": 15},
            "vip": {"daily_products": 100, "max_niches": 999}
        }
        return limits.get(tier, limits["basis"])
    
    def log_metrics(self):
        """Log job metrics."""
        duration = (self.metrics["end_time"] - self.metrics["start_time"]).total_seconds()
        
        logger.info("\n" + "=" * 60)
        logger.info("📊 Job Metrics")
        logger.info("=" * 60)
        logger.info(f"Duration: {duration:.2f}s")
        logger.info(f"Shops processed: {self.metrics['shops_processed']}")
        logger.info(f"Niches processed: {self.metrics['niches_processed']}")
        logger.info(f"Products created: {self.metrics['products_created']}")
        logger.info(f"Products failed: {self.metrics['products_failed']}")
        
        if self.metrics["errors"]:
            logger.info(f"Errors ({len(self.metrics['errors'])}):")
            for error in self.metrics["errors"][:5]:
                logger.info(f"  - {error}")
        
        logger.info("=" * 60)


async def main():
    """Entry point for the cron job."""
    job = ProductCreationJob()
    await job.run()


if __name__ == "__main__":
    asyncio.run(main())
