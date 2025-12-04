"""
Winner Scaling Job
Automatically identifies winner products and creates campaigns with AI-generated creatives

Features:
- 4-Bucket sales threshold system for winner identification
- AI image generation via DALL-E 3 (GPT-Image)
- AI video generation via Google Veo 3.1
- Pinterest campaign creation with targeting copy
- A/B testing with Product vs Collection links
- Automatic campaign refill when user pauses campaigns

Version: 1.0.0
"""
import os
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional
from dotenv import load_dotenv

from models import (
    ShopConfig, WinnerScalingSettings, ProductSalesData,
    WinnerProduct, WinnerCampaign, GeneratedCreative,
    JobMetrics, LogEntry
)
from services.supabase_service import SupabaseService
from services.ai_creative_service import AICreativeService
from services.pinterest_campaign_service import PinterestCampaignService


# Load environment variables
load_dotenv()


class WinnerScalingJob:
    """Main job class for winner scaling automation."""

    def __init__(self):
        self.db = SupabaseService()
        self.ai_service = AICreativeService()
        self.job_metrics = JobMetrics()
        self.job_id: Optional[str] = None

    async def run(self):
        """Main entry point for the job."""
        print("=" * 60)
        print("WINNER SCALING JOB")
        print(f"Started at: {datetime.now(timezone.utc).isoformat()}")
        print("=" * 60)

        # Log job start
        self.job_id = self.db.log_job_run(
            job_type='winner_scaling',
            status='running',
            metadata={'started_at': datetime.now(timezone.utc).isoformat()}
        )

        # Log job start to winner_scaling_log
        self.db.log_action(LogEntry(
            shop_id='system',
            action_type='job_started',
            details={'job_id': self.job_id}
        ))

        try:
            # Get all shops with winner scaling enabled
            shops = self.db.get_shops_with_winner_scaling_enabled()

            if not shops:
                print("No shops with winner scaling enabled")
                self._finish_job('completed')
                return

            print(f"\nFound {len(shops)} shops with winner scaling enabled")

            # Process shops with concurrency limit
            semaphore = asyncio.Semaphore(5)

            tasks = [
                self._process_shop_with_semaphore(shop, semaphore)
                for shop in shops
            ]

            await asyncio.gather(*tasks, return_exceptions=True)

            # Log job completion
            self.db.log_action(LogEntry(
                shop_id='system',
                action_type='job_completed',
                details={
                    'winners_identified': self.job_metrics.winners_identified,
                    'campaigns_created': self.job_metrics.campaigns_created,
                    'creatives_generated': self.job_metrics.creatives_generated
                }
            ))

            # Finish job
            status = 'completed' if self.job_metrics.shops_failed == 0 else 'completed_with_errors'
            self._finish_job(status)

        except Exception as e:
            print(f"Job failed with error: {e}")
            self.job_metrics.errors.append({
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            self._finish_job('failed')
            raise

    async def _process_shop_with_semaphore(
        self,
        shop: ShopConfig,
        semaphore: asyncio.Semaphore
    ):
        """Process a shop with semaphore for concurrency control."""
        async with semaphore:
            await self._process_shop(shop)

    async def _process_shop(self, shop: ShopConfig):
        """Process a single shop."""
        print(f"\n{'='*40}")
        print(f"Processing shop: {shop.internal_name}")
        print(f"{'='*40}")

        try:
            # Get winner scaling settings
            settings = self.db.get_winner_scaling_settings(shop.shop_id)

            if not settings or not settings.is_enabled:
                print(f"  Winner scaling disabled for shop")
                return

            if not settings.pinterest_enabled:
                print(f"  Pinterest disabled in settings")
                return

            # Get products with sales data
            products = self.db.get_products_with_sales(shop.shop_id)

            if not products:
                print(f"  No products with sales data found")
                return

            print(f"  Found {len(products)} products with recent sales")

            # Get existing winners
            existing_winners = self.db.get_existing_winners(shop.shop_id)

            # Initialize Pinterest service
            pinterest = PinterestCampaignService(
                access_token=shop.pinterest_access_token,
                refresh_token=shop.pinterest_refresh_token
            )

            # Process each product
            for product in products:
                await self._process_product(
                    shop=shop,
                    product=product,
                    settings=settings,
                    existing_winners=existing_winners,
                    pinterest=pinterest
                )

            self.job_metrics.shops_processed += 1

        except Exception as e:
            print(f"  Error processing shop {shop.internal_name}: {e}")
            self.job_metrics.shops_failed += 1
            self.job_metrics.errors.append({
                'shop_id': shop.shop_id,
                'shop_name': shop.internal_name,
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            })

            # Log error
            self.db.log_action(LogEntry(
                shop_id=shop.shop_id,
                action_type='error',
                details={'error_message': str(e)}
            ))

    async def _process_product(
        self,
        shop: ShopConfig,
        product: ProductSalesData,
        settings: WinnerScalingSettings,
        existing_winners: Dict[str, WinnerProduct],
        pinterest: PinterestCampaignService
    ):
        """Process a single product for winner identification and campaign creation."""

        # Check if product qualifies as winner
        buckets_passed = product.calculate_buckets_passed(settings)

        if not product.is_winner(settings):
            return  # Not a winner, skip

        key = f"{product.product_id}_{product.collection_id}"
        existing_winner = existing_winners.get(key)

        if existing_winner:
            # Update sales snapshot
            self.db.update_winner_product_sales(
                winner_id=existing_winner.id,
                product=product,
                buckets_passed=buckets_passed
            )

            if not existing_winner.is_active:
                return  # Winner is deactivated, skip

            winner_id = existing_winner.id
            winner = existing_winner
            print(f"\n  Existing winner: {product.product_title}")
        else:
            # Insert new winner
            winner_id = self.db.insert_winner_product(
                shop_id=shop.shop_id,
                product=product,
                buckets_passed=buckets_passed
            )

            winner = WinnerProduct(
                id=winner_id,
                shop_id=shop.shop_id,
                product_id=product.product_id,
                collection_id=product.collection_id,
                product_title=product.product_title,
                product_handle=product.product_handle,
                collection_handle=product.collection_handle,
                shopify_image_url=product.shopify_image_url,
                sales_3d=product.sales_3d,
                sales_7d=product.sales_7d,
                sales_10d=product.sales_10d,
                sales_14d=product.sales_14d,
                buckets_passed=buckets_passed,
                original_campaign_id=product.original_campaign_id
            )

            self.job_metrics.winners_identified += 1
            print(f"\n  NEW Winner: {product.product_title} ({buckets_passed}/4 buckets)")

            # Log winner identification
            self.db.log_action(LogEntry(
                shop_id=shop.shop_id,
                winner_product_id=winner_id,
                action_type='winner_identified',
                details={
                    'product_title': product.product_title,
                    'buckets_passed': buckets_passed,
                    'sales_3d': product.sales_3d,
                    'sales_7d': product.sales_7d,
                    'sales_10d': product.sales_10d,
                    'sales_14d': product.sales_14d
                }
            ))

        # Check if we need more campaigns
        active_campaigns = self.db.get_active_campaigns_for_winner(winner_id)
        campaigns_needed = settings.max_campaigns_per_winner - active_campaigns

        if campaigns_needed <= 0:
            print(f"    Already at max campaigns ({active_campaigns}/{settings.max_campaigns_per_winner})")
            return

        print(f"    Need {campaigns_needed} more campaigns (current: {active_campaigns})")

        # Get targeting from original campaign if available
        targeting = None
        if winner.original_campaign_id:
            targeting = pinterest.get_campaign_targeting(
                ad_account_id=shop.pinterest_account_id,
                campaign_id=winner.original_campaign_id
            )

        # Create campaigns with generated creatives
        await self._create_campaigns_for_winner(
            shop=shop,
            winner=winner,
            settings=settings,
            pinterest=pinterest,
            targeting=targeting,
            campaigns_needed=campaigns_needed
        )

    async def _create_campaigns_for_winner(
        self,
        shop: ShopConfig,
        winner: WinnerProduct,
        settings: WinnerScalingSettings,
        pinterest: PinterestCampaignService,
        targeting,
        campaigns_needed: int
    ):
        """Create campaigns with AI-generated creatives for a winner product."""

        campaigns_created = 0

        # Determine which creatives to generate
        # Priority: Videos first (they take longer but have higher engagement)

        # Video campaigns
        if settings.video_count > 0 and campaigns_created < campaigns_needed:
            print(f"    Generating {settings.video_count} videos...")

            video_result = await self.ai_service.generate_videos(
                product_title=winner.product_title,
                product_image_url=winner.shopify_image_url,
                count=settings.video_count
            )

            if video_result.api_limit_reached:
                self.job_metrics.api_limits_hit += 1
                self.db.log_action(LogEntry(
                    shop_id=shop.shop_id,
                    winner_product_id=winner.id,
                    action_type='api_limit_reached',
                    details={'api': 'veo-3.1', 'error': video_result.error_message}
                ))
                print(f"    API limit reached for video generation")

            if video_result.creatives:
                self.job_metrics.creatives_generated += len(video_result.creatives)

                # Create campaigns with videos
                campaigns_created += await self._create_campaigns_with_creatives(
                    shop=shop,
                    winner=winner,
                    creatives=video_result.creatives,
                    creative_type='video',
                    settings=settings,
                    pinterest=pinterest,
                    targeting=targeting,
                    max_campaigns=campaigns_needed - campaigns_created
                )

        # Image campaigns
        if settings.image_count > 0 and campaigns_created < campaigns_needed:
            print(f"    Generating {settings.image_count} images...")

            image_result = await self.ai_service.generate_images(
                product_title=winner.product_title,
                product_image_url=winner.shopify_image_url,
                count=settings.image_count
            )

            if image_result.api_limit_reached:
                self.job_metrics.api_limits_hit += 1
                self.db.log_action(LogEntry(
                    shop_id=shop.shop_id,
                    winner_product_id=winner.id,
                    action_type='api_limit_reached',
                    details={'api': 'dalle-3', 'error': image_result.error_message}
                ))
                print(f"    API limit reached for image generation")

            if image_result.creatives:
                self.job_metrics.creatives_generated += len(image_result.creatives)

                # Create campaigns with images
                campaigns_created += await self._create_campaigns_with_creatives(
                    shop=shop,
                    winner=winner,
                    creatives=image_result.creatives,
                    creative_type='image',
                    settings=settings,
                    pinterest=pinterest,
                    targeting=targeting,
                    max_campaigns=campaigns_needed - campaigns_created
                )

        print(f"    Created {campaigns_created} campaigns for this winner")

    async def _create_campaigns_with_creatives(
        self,
        shop: ShopConfig,
        winner: WinnerProduct,
        creatives: List[GeneratedCreative],
        creative_type: str,
        settings: WinnerScalingSettings,
        pinterest: PinterestCampaignService,
        targeting,
        max_campaigns: int
    ) -> int:
        """Create Pinterest campaigns with the given creatives."""

        campaigns_created = 0

        # Determine link types (A/B test if both enabled)
        link_types = []
        if settings.link_to_product:
            link_types.append('product')
        if settings.link_to_collection:
            link_types.append('collection')

        if not link_types:
            link_types = ['product']  # Default fallback

        # Create campaigns for each link type
        for link_type in link_types:
            if campaigns_created >= max_campaigns:
                break

            # Create campaign
            result = pinterest.create_campaign_with_creatives(
                ad_account_id=shop.pinterest_account_id,
                winner=winner,
                creatives=creatives,
                creative_type=creative_type,
                link_type=link_type,
                shop_domain=shop.shop_domain,
                settings=settings,
                targeting=targeting
            )

            if result.success:
                # Save campaign to database
                campaign = WinnerCampaign(
                    shop_id=shop.shop_id,
                    winner_product_id=winner.id,
                    pinterest_campaign_id=result.campaign_id,
                    pinterest_ad_group_id=result.ad_group_id,
                    campaign_name=f"{winner.product_title[:50]} | {len(creatives)}x {creative_type.title()}s | Link to {link_type.title()}",
                    creative_type=creative_type,
                    creative_count=len(creatives),
                    link_type=link_type,
                    status='ACTIVE',
                    generated_assets=creatives
                )

                campaign_id = self.db.insert_winner_campaign(campaign)

                # Log campaign creation
                self.db.log_action(LogEntry(
                    shop_id=shop.shop_id,
                    winner_product_id=winner.id,
                    action_type='campaign_created',
                    details={
                        'campaign_name': campaign.campaign_name,
                        'creative_type': creative_type,
                        'link_type': link_type,
                        'pinterest_campaign_id': result.campaign_id,
                        'pins_created': len(result.pin_ids)
                    }
                ))

                campaigns_created += 1
                self.job_metrics.campaigns_created += 1

                print(f"      Campaign created: {campaign.campaign_name}")

            else:
                print(f"      Campaign creation failed: {result.error_message}")
                self.db.log_action(LogEntry(
                    shop_id=shop.shop_id,
                    winner_product_id=winner.id,
                    action_type='error',
                    details={
                        'error_message': result.error_message,
                        'creative_type': creative_type,
                        'link_type': link_type
                    }
                ))

        return campaigns_created

    def _finish_job(self, status: str):
        """Finish the job and log final status."""
        print(f"\n{'='*60}")
        print("JOB SUMMARY")
        print(f"{'='*60}")
        print(f"Status: {status}")
        print(f"Shops processed: {self.job_metrics.shops_processed}")
        print(f"Shops failed: {self.job_metrics.shops_failed}")
        print(f"Winners identified: {self.job_metrics.winners_identified}")
        print(f"Campaigns created: {self.job_metrics.campaigns_created}")
        print(f"Creatives generated: {self.job_metrics.creatives_generated}")
        print(f"API limits hit: {self.job_metrics.api_limits_hit}")
        print(f"Errors: {len(self.job_metrics.errors)}")

        if self.job_id:
            self.db.update_job_run(
                job_id=self.job_id,
                status=status,
                shops_processed=self.job_metrics.shops_processed,
                shops_failed=self.job_metrics.shops_failed,
                error_log=self.job_metrics.errors if self.job_metrics.errors else None,
                metadata={
                    'winners_identified': self.job_metrics.winners_identified,
                    'campaigns_created': self.job_metrics.campaigns_created,
                    'creatives_generated': self.job_metrics.creatives_generated,
                    'api_limits_hit': self.job_metrics.api_limits_hit
                }
            )


async def main():
    """Entry point for the job."""
    job = WinnerScalingJob()
    await job.run()


if __name__ == '__main__':
    asyncio.run(main())
