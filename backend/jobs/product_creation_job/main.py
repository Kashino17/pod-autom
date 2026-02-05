"""
Product Creation Job - Main Entry Point
Creates products in Shopify from Fast Fashion research tables
Uses AsyncIO for parallel shop processing
"""
import os
import sys
import asyncio
from datetime import datetime, timezone
from typing import Dict, List

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from models import ShopConfig, ResearchProduct
from services.supabase_service import SupabaseService
from services.shopify_service import ShopifyRESTClient


class ProductCreationJob:
    """Main class for the Product Creation Job."""

    def __init__(self):
        self.db = None
        self.process_reboss = os.getenv('PROCESS_REBOSS_SHOPS', 'true').lower() == 'true'
        self.process_pod_autom = os.getenv('PROCESS_POD_AUTOM_SHOPS', 'true').lower() == 'true'
        self.metrics = {
            'start_time': datetime.now(timezone.utc),
            'shops_processed': 0,
            'products_created': 0,
            'products_failed': 0,
            'products_skipped': 0,
            'reboss_created': 0,
            'pod_autom_created': 0,
            'errors': []
        }

    async def create_product(self, shopify: ShopifyRESTClient,
                             research_product: ResearchProduct,
                             config: ShopConfig) -> Dict:
        """Create a single product in Shopify and mark as synced."""
        try:
            # Create product in Shopify
            created_product = shopify.create_product(research_product)

            if created_product:
                shopify_id = created_product.get('id')

                # Mark product as synced based on shop type
                if config.shop_type == 'pod_autom':
                    sync_success = self.db.mark_pod_product_synced(
                        str(research_product.id),
                        str(shopify_id) if shopify_id else None
                    )
                else:
                    sync_success = self.db.mark_product_synced(config.shop_id, research_product.id)

                if sync_success:
                    return {
                        'success': True,
                        'research_id': research_product.id,
                        'shopify_id': shopify_id,
                        'title': research_product.title,
                        'shop_type': config.shop_type
                    }
                else:
                    # Product created but not marked as synced
                    return {
                        'success': True,
                        'research_id': research_product.id,
                        'shopify_id': shopify_id,
                        'title': research_product.title,
                        'shop_type': config.shop_type,
                        'warning': 'Product created but sync status not updated'
                    }
            else:
                # Mark as failed for POD AutoM
                if config.shop_type == 'pod_autom':
                    self.db.update_pod_product_status(
                        str(research_product.id),
                        'failed',
                        'Failed to create product in Shopify'
                    )
                return {
                    'success': False,
                    'research_id': research_product.id,
                    'title': research_product.title,
                    'shop_type': config.shop_type,
                    'error': 'Failed to create product in Shopify'
                }

        except Exception as e:
            print(f"  Error creating product {research_product.id}: {e}")
            # Mark as failed for POD AutoM
            if config.shop_type == 'pod_autom':
                self.db.update_pod_product_status(
                    str(research_product.id),
                    'failed',
                    str(e)
                )
            return {
                'success': False,
                'research_id': research_product.id,
                'title': research_product.title,
                'shop_type': config.shop_type,
                'error': str(e)
            }

    async def process_shop(self, config: ShopConfig) -> Dict:
        """Process a single shop - create products from research table or POD queue."""
        shop_type_label = 'POD AutoM' if config.shop_type == 'pod_autom' else 'ReBoss'
        print(f"\n{'='*60}")
        print(f"Processing {shop_type_label} shop: {config.internal_name} ({config.shop_domain})")
        print(f"Creation Limit: {config.fast_fashion_limit}")
        print(f"{'='*60}")

        try:
            # Create Shopify client
            shopify = ShopifyRESTClient(
                shop_domain=config.shop_domain,
                access_token=config.access_token
            )

            # Test connection
            if not shopify.test_connection():
                raise ValueError(f"Cannot connect to Shopify store: {config.shop_domain}")

            # Get unsynced products based on shop type
            if config.shop_type == 'pod_autom' and config.settings_id:
                unsynced_products = self.db.get_pod_autom_unsynced_products(
                    settings_id=config.settings_id,
                    limit=config.fast_fashion_limit
                )
                total_unsynced = len(unsynced_products)  # POD AutoM doesn't have separate count
            else:
                unsynced_products = self.db.get_unsynced_products(
                    shop_id=config.shop_id,
                    limit=config.fast_fashion_limit
                )
                total_unsynced = self.db.get_unsynced_count(config.shop_id)

            print(f"Found {total_unsynced} total unsynced products")
            print(f"Processing {len(unsynced_products)} products (limit: {config.fast_fashion_limit})")

            if not unsynced_products:
                print("No unsynced products to process")
                return {
                    'success': True,
                    'shop_id': config.shop_id,
                    'shop_name': config.internal_name,
                    'products_created': 0,
                    'products_failed': 0,
                    'products_skipped': 0,
                    'total_unsynced': 0,
                    'errors': []
                }

            created = 0
            failed = 0
            errors = []

            # Process products sequentially (Shopify rate limits)
            for product in unsynced_products:
                result = await self.create_product(shopify, product, config)

                if result['success']:
                    created += 1
                    print(f"  [OK] {result['title']} (Shopify ID: {result.get('shopify_id')})")
                    if result.get('warning'):
                        print(f"       Warning: {result['warning']}")
                else:
                    failed += 1
                    errors.append(f"{result['title']}: {result.get('error', 'Unknown error')}")
                    print(f"  [FAIL] {result['title']}: {result.get('error')}")

                # Small delay between products
                await asyncio.sleep(0.5)

            return {
                'success': True,
                'shop_id': config.shop_id,
                'shop_name': config.internal_name,
                'shop_type': config.shop_type,
                'products_created': created,
                'products_failed': failed,
                'products_skipped': 0,
                'total_unsynced': total_unsynced,
                'remaining_unsynced': total_unsynced - created,
                'errors': errors
            }

        except Exception as e:
            print(f"Error processing shop {config.shop_id}: {e}")
            return {
                'success': False,
                'shop_id': config.shop_id,
                'shop_name': config.internal_name,
                'shop_type': config.shop_type,
                'error': str(e)
            }

    def generate_summary(self) -> str:
        """Generate job run summary."""
        duration = (datetime.now(timezone.utc) - self.metrics['start_time']).total_seconds()

        summary = f"""
{'='*60}
PRODUCT CREATION JOB COMPLETED
{'='*60}
Duration: {duration:.2f} seconds
Shops processed: {self.metrics['shops_processed']}
Products created: {self.metrics['products_created']}
  - ReBoss: {self.metrics['reboss_created']}
  - POD AutoM: {self.metrics['pod_autom_created']}
Products failed: {self.metrics['products_failed']}
Products skipped: {self.metrics['products_skipped']}
Errors: {len(self.metrics['errors'])}
"""

        if self.metrics['errors']:
            summary += "\nErrors encountered:\n"
            for error in self.metrics['errors'][:10]:  # Show first 10 errors
                summary += f"  - {error}\n"
            if len(self.metrics['errors']) > 10:
                summary += f"  ... and {len(self.metrics['errors']) - 10} more\n"

        summary += "=" * 60

        return summary

    async def run(self):
        """Main job execution."""
        print("=" * 60)
        print("STARTING PRODUCT CREATION JOB - ReBoss NextGen + POD AutoM")
        print(f"Time: {datetime.now(timezone.utc).isoformat()}")
        print(f"Process ReBoss: {self.process_reboss} | Process POD AutoM: {self.process_pod_autom}")
        print("=" * 60)

        try:
            # Initialize Supabase
            self.db = SupabaseService()

            # Log job start
            job_id = self.db.log_job_run(
                job_type='product_creation_job',
                status='running',
                metadata={
                    'start_time': datetime.now(timezone.utc).isoformat(),
                    'process_reboss': self.process_reboss,
                    'process_pod_autom': self.process_pod_autom
                }
            )

            # Collect shops from enabled sources
            shops = []

            # Get ReBoss shops with research tables
            if self.process_reboss:
                print("\n--- Fetching ReBoss Shops ---")
                reboss_shops = self.db.get_shops_with_research_tables()
                print(f"Found {len(reboss_shops)} ReBoss shops with research tables")
                shops.extend(reboss_shops)

            # Get POD AutoM shops
            if self.process_pod_autom:
                print("\n--- Fetching POD AutoM Shops ---")
                pod_shops = self.db.get_pod_autom_shops()
                print(f"Found {len(pod_shops)} POD AutoM shops")
                shops.extend(pod_shops)

            if not shops:
                print("No shops found to process")
                self.db.update_job_run(job_id, 'completed', shops_processed=0)
                return

            print(f"\nTotal shops to process: {len(shops)}")

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
                    created = result.get('products_created', 0)
                    self.metrics['products_created'] += created
                    self.metrics['products_failed'] += result.get('products_failed', 0)
                    self.metrics['products_skipped'] += result.get('products_skipped', 0)

                    # Track by shop type
                    if result.get('shop_type') == 'pod_autom':
                        self.metrics['pod_autom_created'] += created
                    else:
                        self.metrics['reboss_created'] += created

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
            self.db.update_job_run(
                job_id,
                status='completed' if not error_log else 'completed_with_errors',
                shops_processed=self.metrics['shops_processed'],
                shops_failed=len(shops) - self.metrics['shops_processed'],
                error_log=error_log if error_log else None,
                metadata={
                    'products_created': self.metrics['products_created'],
                    'reboss_created': self.metrics['reboss_created'],
                    'pod_autom_created': self.metrics['pod_autom_created'],
                    'products_failed': self.metrics['products_failed'],
                    'products_skipped': self.metrics['products_skipped'],
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
        job = ProductCreationJob()
        asyncio.run(job.run())
    except KeyboardInterrupt:
        print("\nJob interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
