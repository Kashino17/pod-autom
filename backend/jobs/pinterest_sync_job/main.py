"""
Pinterest Sync Job - Main Entry Point
Syncs products from Shopify collections to Pinterest as pins
Uses AsyncIO for parallel shop processing
"""
import os
import sys
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from models import ShopPinterestConfig, PinterestCampaign, SyncResult
from services.supabase_service import SupabaseService
from services.shopify_service import ShopifyRESTClient
from services.pinterest_service import PinterestAPIClient


class PinterestSyncJob:
    """Main class for the Pinterest Sync Job."""

    def __init__(self):
        self.db: Optional[SupabaseService] = None
        self.metrics = {
            'start_time': datetime.now(timezone.utc),
            'shops_processed': 0,
            'campaigns_processed': 0,
            'pins_created': 0,
            'pins_failed': 0,
            'ads_paused': 0,
            'ads_pause_failed': 0,
            'errors': []
        }

    async def sync_campaign_products(self, shopify: ShopifyRESTClient,
                                      pinterest: PinterestAPIClient,
                                      campaign: PinterestCampaign,
                                      config: ShopPinterestConfig,
                                      board_id: str) -> Dict:
        """Sync products from campaign's assigned batches to Pinterest."""
        print(f"\n  Campaign: {campaign.name} ({campaign.status})")

        if campaign.status != 'ACTIVE':
            print(f"    Skipping - campaign not active")
            return {'synced': 0, 'failed': 0, 'skipped': 1}

        if not campaign.batch_assignments:
            print(f"    No batch assignments for this campaign")
            return {'synced': 0, 'failed': 0, 'skipped': 0}

        # Get or create ad group for this campaign
        ad_group_id = None
        if config.pinterest_account_id and campaign.pinterest_campaign_id:
            ad_group_id = pinterest.get_or_create_ad_group_for_campaign(
                ad_account_id=config.pinterest_account_id,
                pinterest_campaign_id=campaign.pinterest_campaign_id,
                campaign_name=campaign.name
            )
            if not ad_group_id:
                print(f"    [WARNING] Could not get/create ad group - pins will not be added to campaign")

        synced = 0
        failed = 0
        current_product_ids = set()  # Track all products currently in batches

        for assignment in campaign.batch_assignments:
            collection_shopify_id = assignment.get('collection_shopify_id')
            collection_title = assignment.get('collection_title')
            batch_indices = assignment.get('batch_indices', [])

            print(f"    Collection: {collection_title}")
            print(f"    Batches: {batch_indices}")

            for batch_index in batch_indices:
                # Get products for this batch
                products = shopify.get_products_batch(
                    collection_id=collection_shopify_id,
                    batch_index=batch_index,
                    batch_size=config.global_batch_size
                )

                print(f"      Batch {batch_index}: {len(products)} products")

                for product_idx_in_batch, product in enumerate(products):
                    # Track this product as currently in batches
                    current_product_ids.add(str(product.id))

                    # Check if product is already synced to this campaign
                    if self.db.is_product_already_synced(
                        shop_id=config.shop_id,
                        campaign_id=campaign.id,
                        shopify_product_id=str(product.id)
                    ):
                        print(f"        [SKIP] {product.title[:40]}... (already synced)")
                        continue

                    # Calculate global product index in collection
                    # batch_index * batch_size + position_in_batch
                    product_index_in_collection = (batch_index * config.global_batch_size) + product_idx_in_batch

                    # Generate collection page URL
                    collection_url = shopify.get_collection_page_url(
                        collection_id=collection_shopify_id,
                        product_index=product_index_in_collection,
                        products_per_page=config.products_per_page,
                        url_prefix=config.url_prefix
                    )

                    # Fallback to product URL if collection URL failed
                    if not collection_url:
                        collection_url = shopify.get_product_url(
                            handle=product.handle,
                            url_prefix=config.url_prefix
                        )
                        print(f"        [WARN] Using product URL fallback")

                    # Create pin with collection URL
                    result = pinterest.create_product_pin(
                        product=product,
                        board_id=board_id,
                        product_url=collection_url
                    )

                    if result.success:
                        synced += 1
                        print(f"        [OK] {product.title[:40]}... -> Pin {result.pinterest_pin_id}")

                        # Create promoted pin (ad) to add to campaign
                        ad_id = None
                        if ad_group_id and config.pinterest_account_id:
                            ad_result = pinterest.create_ad(
                                ad_account_id=config.pinterest_account_id,
                                ad_group_id=ad_group_id,
                                pin_id=result.pinterest_pin_id,
                                name=f"{product.title[:50]} - Ad"
                            )
                            if ad_result and ad_result.get('id'):
                                ad_id = ad_result.get('id')
                                print(f"        [AD] Added to campaign -> Ad {ad_id}")
                            else:
                                print(f"        [WARN] Pin created but failed to add to campaign")

                        # Log sync result with ad info for future deactivation
                        self.db.log_sync_result(
                            shop_id=config.shop_id,
                            campaign_id=campaign.id,
                            shopify_product_id=str(product.id),
                            pinterest_pin_id=result.pinterest_pin_id,
                            pinterest_board_id=board_id,
                            success=True,
                            pinterest_ad_id=ad_id,
                            pinterest_ad_group_id=ad_group_id
                        )
                    else:
                        failed += 1
                        print(f"        [FAIL] {product.title[:40]}...: {result.error}")

                        self.db.log_sync_result(
                            shop_id=config.shop_id,
                            campaign_id=campaign.id,
                            shopify_product_id=str(product.id),
                            pinterest_pin_id=None,
                            pinterest_board_id=board_id,
                            success=False,
                            error=result.error
                        )

                    # Rate limit between pins
                    await asyncio.sleep(0.5)

        return {'synced': synced, 'failed': failed, 'skipped': 0, 'current_product_ids': current_product_ids}

    async def pause_removed_product_ads(self, pinterest: PinterestAPIClient,
                                         campaign: PinterestCampaign,
                                         config: ShopPinterestConfig,
                                         current_product_ids: set) -> Dict:
        """Pause ads for products that are no longer in the campaign batches.

        This detects products that were replaced (by replace_job) and pauses
        their Pinterest ads to stop spending on products no longer in collection.
        """
        print(f"\n    Checking for removed products to pause...")

        # Get all active syncs for this campaign
        active_syncs = self.db.get_active_syncs_for_campaign(
            shop_id=config.shop_id,
            campaign_id=campaign.id
        )

        if not active_syncs:
            print(f"    No active syncs found for campaign")
            return {'ads_paused': 0, 'ads_pause_failed': 0}

        # Find products that are in DB but not in current batches
        synced_product_ids = {sync['shopify_product_id'] for sync in active_syncs}
        removed_product_ids = synced_product_ids - current_product_ids

        if not removed_product_ids:
            print(f"    No removed products to pause")
            return {'ads_paused': 0, 'ads_pause_failed': 0}

        print(f"    Found {len(removed_product_ids)} products to pause")

        ads_paused = 0
        ads_pause_failed = 0

        for sync in active_syncs:
            if sync['shopify_product_id'] in removed_product_ids:
                ad_id = sync.get('pinterest_ad_id')

                if not ad_id:
                    # No ad to pause (only pin, no campaign link)
                    print(f"      [SKIP] Product {sync['shopify_product_id']} has no ad")
                    # Still mark as paused in DB since product is removed
                    self.db.mark_sync_as_paused(
                        shop_id=config.shop_id,
                        campaign_id=campaign.id,
                        shopify_product_id=sync['shopify_product_id']
                    )
                    continue

                # Pause the ad via Pinterest API
                success = pinterest.pause_ad(
                    ad_account_id=config.pinterest_account_id,
                    ad_id=ad_id
                )

                if success:
                    # Mark sync as paused in DB
                    self.db.mark_sync_as_paused(
                        shop_id=config.shop_id,
                        campaign_id=campaign.id,
                        shopify_product_id=sync['shopify_product_id']
                    )
                    ads_paused += 1
                    print(f"      [PAUSED] Ad {ad_id} for product {sync['shopify_product_id']}")
                else:
                    ads_pause_failed += 1
                    print(f"      [ERROR] Failed to pause ad {ad_id}")

                # Rate limit
                await asyncio.sleep(0.3)

        return {'ads_paused': ads_paused, 'ads_pause_failed': ads_pause_failed}

    async def process_shop(self, config: ShopPinterestConfig) -> Dict:
        """Process a single shop - sync products to Pinterest."""
        print(f"\n{'='*60}")
        print(f"Processing shop: {config.internal_name} ({config.shop_domain})")
        print(f"Pinterest User: {config.pinterest_user_id}")
        print(f"Ad Account: {config.pinterest_account_id}")
        print(f"{'='*60}")

        try:
            # Create Shopify client
            shopify = ShopifyRESTClient(
                shop_domain=config.shop_domain,
                access_token=config.access_token
            )

            if not shopify.test_connection():
                raise ValueError(f"Cannot connect to Shopify: {config.shop_domain}")

            # Create Pinterest client
            pinterest = PinterestAPIClient(
                access_token=config.pinterest_access_token,
                refresh_token=config.pinterest_refresh_token,
                expires_at=config.pinterest_expires_at
            )

            # Check if token needs refresh
            if pinterest.is_token_expired():
                new_tokens = pinterest.refresh_access_token()
                if new_tokens:
                    self.db.update_pinterest_tokens(
                        shop_id=config.shop_id,
                        access_token=new_tokens['access_token'],
                        refresh_token=new_tokens.get('refresh_token'),
                        expires_at=new_tokens.get('expires_at')
                    )

            if not pinterest.test_connection():
                raise ValueError("Cannot connect to Pinterest API")

            # Get board ID - prefer configured default_board_id
            board_id = config.default_board_id

            if board_id:
                print(f"\nUsing configured default board: {board_id}")
            else:
                # Fallback: Get boards from API
                boards = pinterest.get_boards()
                if not boards:
                    # Skip this shop - no boards available
                    print(f"  [SKIP] No Pinterest boards found for {config.internal_name}")
                    print(f"  Please create a board on Pinterest or set default_board_id in pinterest_settings")
                    return {
                        'success': True,  # Not an error, just skipped
                        'shop_id': config.shop_id,
                        'shop_name': config.internal_name,
                        'campaigns_processed': 0,
                        'pins_created': 0,
                        'pins_failed': 0,
                        'errors': [],
                        'skipped': True,
                        'skip_reason': 'No Pinterest boards found'
                    }

                # Use first board
                default_board = boards[0]
                board_id = default_board.get('id')
                print(f"\nUsing board: {default_board.get('name')} ({board_id})")

            # Get campaigns with batch assignments
            campaigns = self.db.get_campaigns_with_assignments(config.shop_id)
            print(f"\nFound {len(campaigns)} campaigns with assignments")

            if not campaigns:
                print("No campaigns with batch assignments found")
                return {
                    'success': True,
                    'shop_id': config.shop_id,
                    'shop_name': config.internal_name,
                    'campaigns_processed': 0,
                    'pins_created': 0,
                    'pins_failed': 0,
                    'errors': []
                }

            total_synced = 0
            total_failed = 0
            total_ads_paused = 0
            total_ads_pause_failed = 0
            campaigns_processed = 0
            errors = []

            for campaign in campaigns:
                # Phase 1: Sync new products
                result = await self.sync_campaign_products(
                    shopify=shopify,
                    pinterest=pinterest,
                    campaign=campaign,
                    config=config,
                    board_id=board_id
                )

                total_synced += result['synced']
                total_failed += result['failed']

                if result['synced'] > 0 or result['failed'] > 0:
                    campaigns_processed += 1

                # Phase 2: Pause ads for removed products
                if config.pinterest_account_id and campaign.status == 'ACTIVE':
                    pause_result = await self.pause_removed_product_ads(
                        pinterest=pinterest,
                        campaign=campaign,
                        config=config,
                        current_product_ids=result.get('current_product_ids', set())
                    )
                    total_ads_paused += pause_result['ads_paused']
                    total_ads_pause_failed += pause_result['ads_pause_failed']

            return {
                'success': True,
                'shop_id': config.shop_id,
                'shop_name': config.internal_name,
                'campaigns_processed': campaigns_processed,
                'pins_created': total_synced,
                'pins_failed': total_failed,
                'ads_paused': total_ads_paused,
                'ads_pause_failed': total_ads_pause_failed,
                'errors': errors
            }

        except Exception as e:
            print(f"Error processing shop {config.shop_id}: {e}")
            return {
                'success': False,
                'shop_id': config.shop_id,
                'shop_name': config.internal_name,
                'error': str(e)
            }

    def generate_summary(self) -> str:
        """Generate job run summary."""
        duration = (datetime.now(timezone.utc) - self.metrics['start_time']).total_seconds()

        summary = f"""
{'='*60}
PINTEREST SYNC JOB COMPLETED
{'='*60}
Duration: {duration:.2f} seconds
Shops processed: {self.metrics['shops_processed']}
Campaigns processed: {self.metrics['campaigns_processed']}
Pins created: {self.metrics['pins_created']}
Pins failed: {self.metrics['pins_failed']}
Ads paused: {self.metrics['ads_paused']}
Ads pause failed: {self.metrics['ads_pause_failed']}
Errors: {len(self.metrics['errors'])}
"""

        if self.metrics['errors']:
            summary += "\nErrors encountered:\n"
            for error in self.metrics['errors'][:10]:
                summary += f"  - {error}\n"
            if len(self.metrics['errors']) > 10:
                summary += f"  ... and {len(self.metrics['errors']) - 10} more\n"

        summary += "=" * 60

        return summary

    async def run(self):
        """Main job execution."""
        print("=" * 60)
        print("STARTING PINTEREST SYNC JOB - ReBoss NextGen")
        print(f"Time: {datetime.now(timezone.utc).isoformat()}")
        print("=" * 60)

        try:
            # Initialize Supabase
            self.db = SupabaseService()

            # Log job start
            job_id = self.db.log_job_run(
                job_type='pinterest_sync_job',
                status='running',
                metadata={'start_time': datetime.now(timezone.utc).isoformat()}
            )

            # Get shops with Pinterest connected
            shops = self.db.get_shops_with_pinterest()

            if not shops:
                print("No shops with Pinterest connected found")
                if job_id:
                    self.db.update_job_run(job_id, 'completed', shops_processed=0)
                return

            print(f"Found {len(shops)} shops with Pinterest connected")

            # Process shops with concurrency limit
            semaphore = asyncio.Semaphore(2)  # Max 2 shops at once

            async def process_with_semaphore(config):
                async with semaphore:
                    return await self.process_shop(config)

            tasks = [process_with_semaphore(config) for config in shops]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Aggregate results
            error_log = []

            for result in results:
                if isinstance(result, Exception):
                    self.metrics['errors'].append(str(result))
                    error_log.append({'error': str(result)})
                elif result.get('success'):
                    self.metrics['shops_processed'] += 1
                    self.metrics['campaigns_processed'] += result.get('campaigns_processed', 0)
                    self.metrics['pins_created'] += result.get('pins_created', 0)
                    self.metrics['pins_failed'] += result.get('pins_failed', 0)
                    self.metrics['ads_paused'] += result.get('ads_paused', 0)
                    self.metrics['ads_pause_failed'] += result.get('ads_pause_failed', 0)

                    if result.get('errors'):
                        self.metrics['errors'].extend(result['errors'])
                        error_log.extend([
                            {'shop': result.get('shop_name'), 'error': e}
                            for e in result['errors']
                        ])
                else:
                    self.metrics['errors'].append(f"Shop {result.get('shop_id')}: {result.get('error')}")
                    error_log.append({
                        'shop': result.get('shop_name') or result.get('shop_id'),
                        'error': result.get('error')
                    })

            # Update job run
            if job_id:
                self.db.update_job_run(
                    job_id,
                    status='completed' if not error_log else 'partial',
                    shops_processed=self.metrics['shops_processed'],
                    shops_failed=len(shops) - self.metrics['shops_processed'],
                    error_log=error_log if error_log else None,
                    metadata={
                        'campaigns_processed': self.metrics['campaigns_processed'],
                        'pins_created': self.metrics['pins_created'],
                        'pins_failed': self.metrics['pins_failed'],
                        'ads_paused': self.metrics['ads_paused'],
                        'ads_pause_failed': self.metrics['ads_pause_failed'],
                        'end_time': datetime.now(timezone.utc).isoformat()
                    }
                )

            # Print summary
            summary = self.generate_summary()
            print(summary)

            if self.metrics['errors']:
                sys.exit(1)

        except Exception as e:
            print(f"Fatal error in job execution: {e}")
            raise


def main():
    """Entry point for the Cron Job."""
    try:
        job = PinterestSyncJob()
        asyncio.run(job.run())
    except KeyboardInterrupt:
        print("\nJob interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
