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
        self.metrics = {
            'start_time': datetime.now(timezone.utc),
            'shops_processed': 0,
            'products_created': 0,
            'products_failed': 0,
            'products_skipped': 0,
            'errors': []
        }

    async def create_product(self, shopify: ShopifyRESTClient,
                             research_product: ResearchProduct,
                             shop_id: str) -> Dict:
        """Create a single product in Shopify and mark as synced."""
        try:
            # Create product in Shopify
            created_product = shopify.create_product(research_product)

            if created_product:
                # Mark product as synced in database
                sync_success = self.db.mark_product_synced(shop_id, research_product.id)

                if sync_success:
                    return {
                        'success': True,
                        'research_id': research_product.id,
                        'shopify_id': created_product.get('id'),
                        'title': research_product.title
                    }
                else:
                    # Product created but not marked as synced
                    return {
                        'success': True,
                        'research_id': research_product.id,
                        'shopify_id': created_product.get('id'),
                        'title': research_product.title,
                        'warning': 'Product created but sync status not updated'
                    }
            else:
                return {
                    'success': False,
                    'research_id': research_product.id,
                    'title': research_product.title,
                    'error': 'Failed to create product in Shopify'
                }

        except Exception as e:
            print(f"  Error creating product {research_product.id}: {e}")
            return {
                'success': False,
                'research_id': research_product.id,
                'title': research_product.title,
                'error': str(e)
            }

    async def process_shop(self, config: ShopConfig) -> Dict:
        """Process a single shop - create products from research table."""
        print(f"\n{'='*60}")
        print(f"Processing shop: {config.internal_name} ({config.shop_domain})")
        print(f"Fast Fashion Limit: {config.fast_fashion_limit}")
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

            # Get unsynced products from research table
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
                result = await self.create_product(shopify, product, config.shop_id)

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
        print("STARTING PRODUCT CREATION JOB - ReBoss NextGen")
        print(f"Time: {datetime.now(timezone.utc).isoformat()}")
        print("=" * 60)

        try:
            # Initialize Supabase
            self.db = SupabaseService()

            # Log job start
            job_id = self.db.log_job_run(
                job_type='product_creation_job',
                status='running',
                metadata={'start_time': datetime.now(timezone.utc).isoformat()}
            )

            # Get shops with research tables
            shops = self.db.get_shops_with_research_tables()

            if not shops:
                print("No shops with research tables found")
                self.db.update_job_run(job_id, 'completed', shops_processed=0)
                return

            print(f"Found {len(shops)} shops with research tables")

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
                    self.metrics['products_created'] += result.get('products_created', 0)
                    self.metrics['products_failed'] += result.get('products_failed', 0)
                    self.metrics['products_skipped'] += result.get('products_skipped', 0)

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
