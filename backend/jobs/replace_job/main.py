"""
Replace Job - Main Entry Point
Migrated from Cloud Run Jobs to Render Cron Jobs
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

from models import ShopConfig
from services.supabase_service import SupabaseService
from services.shopify_client import ShopifyGraphQLClient
from replacement_logic import ReplacementLogic


class ReplaceProductJob:
    """Main class for the Replace Product Job."""

    def __init__(self):
        self.db = None
        self.metrics = {
            'start_time': datetime.now(timezone.utc),
            'shops_processed': 0,
            'collections_processed': 0,
            'products_analyzed': 0,
            'products_kept': 0,
            'products_replaced': 0,
            'products_losers': 0,
            'positions_maintained': 0,
            'errors': []
        }

    async def process_collection(self, shopify: ShopifyGraphQLClient,
                                  replacement_logic: ReplacementLogic,
                                  collection_data: Dict,
                                  config: ShopConfig) -> Dict:
        """Process a single collection."""
        collection_id = collection_data.get('id')
        collection_title = collection_data.get('title', 'Unknown')

        print(f"\n  Processing collection: {collection_title} (ID: {collection_id})")

        try:
            # Get collection details
            collection_info = shopify.get_collection_details(collection_id)
            if not collection_info:
                raise ValueError(f"Collection {collection_id} not found")

            collection_tag = collection_info.get('tag')
            sort_order = collection_info.get('sort_order')

            print(f"  Collection tag: {collection_tag}, Sort order: {sort_order}")

            # Analyze products
            analysis_result = replacement_logic.analyze_collection_products(
                collection_id=collection_id,
                collection_tag=collection_tag
            )

            print(f"  Analysis: {analysis_result['summary']}")

            # Execute replacements if needed
            if analysis_result['to_replace']:
                replacement_result = replacement_logic.execute_replacements(
                    collection_id=collection_id,
                    collection_tag=collection_tag,
                    sort_order=sort_order,
                    analysis_result=analysis_result,
                    test_mode=config.test_mode
                )

                return {
                    'success': True,
                    'collection_id': collection_id,
                    'products_analyzed': analysis_result['total_products'],
                    'products_kept': replacement_result['kept'],
                    'products_replaced': replacement_result['replaced'],
                    'products_losers': replacement_result['losers'],
                    'positions_maintained': replacement_result.get('positions_maintained', 0)
                }
            else:
                return {
                    'success': True,
                    'collection_id': collection_id,
                    'products_analyzed': analysis_result['total_products'],
                    'products_kept': analysis_result['total_products'],
                    'products_replaced': 0,
                    'products_losers': 0,
                    'positions_maintained': 0
                }

        except Exception as e:
            print(f"  Error processing collection {collection_id}: {e}")
            return {
                'success': False,
                'collection_id': collection_id,
                'error': str(e)
            }

    async def process_shop(self, config: ShopConfig) -> Dict:
        """Process a single shop."""
        print(f"\n{'='*60}")
        print(f"Processing shop: {config.shop_id} ({config.shop_domain})")
        print(f"Test mode: {config.test_mode}")
        print(f"Maintain positions: {config.maintain_positions}")
        print(f"{'='*60}")

        try:
            # Create Shopify client
            shopify = ShopifyGraphQLClient(
                shop_domain=config.shop_domain,
                access_token=config.access_token
            )

            # Create replacement logic handler
            replacement_logic = ReplacementLogic(
                shopify_client=shopify,
                supabase_service=self.db,
                config=config
            )

            total_analyzed = 0
            total_kept = 0
            total_replaced = 0
            total_losers = 0
            total_positions = 0
            collections_processed = 0
            errors = []

            # Process each collection
            for collection_data in config.selected_collections:
                result = await self.process_collection(
                    shopify=shopify,
                    replacement_logic=replacement_logic,
                    collection_data=collection_data,
                    config=config
                )

                if result['success']:
                    collections_processed += 1
                    total_analyzed += result.get('products_analyzed', 0)
                    total_kept += result.get('products_kept', 0)
                    total_replaced += result.get('products_replaced', 0)
                    total_losers += result.get('products_losers', 0)
                    total_positions += result.get('positions_maintained', 0)
                else:
                    errors.append(f"Collection {result.get('collection_id')}: {result.get('error')}")

            return {
                'success': True,
                'shop_id': config.shop_id,
                'shop_name': self.db.get_shop_internal_name(config.shop_id),
                'collections_processed': collections_processed,
                'products_analyzed': total_analyzed,
                'products_kept': total_kept,
                'products_replaced': total_replaced,
                'products_losers': total_losers,
                'positions_maintained': total_positions,
                'errors': errors
            }

        except Exception as e:
            print(f"Error processing shop {config.shop_id}: {e}")
            return {
                'success': False,
                'shop_id': config.shop_id,
                'error': str(e)
            }

    def generate_summary(self) -> str:
        """Generate job run summary."""
        duration = (datetime.now(timezone.utc) - self.metrics['start_time']).total_seconds()

        summary = f"""
{'='*60}
REPLACE JOB COMPLETED
{'='*60}
Duration: {duration:.2f} seconds
Shops processed: {self.metrics['shops_processed']}
Collections processed: {self.metrics['collections_processed']}
Products analyzed: {self.metrics['products_analyzed']}
Products kept: {self.metrics['products_kept']}
Products replaced: {self.metrics['products_replaced']}
Products losers (tagged): {self.metrics['products_losers']}
Positions maintained: {self.metrics['positions_maintained']}
Errors: {len(self.metrics['errors'])}
"""

        if self.metrics['errors']:
            summary += "\nErrors encountered:\n"
            for error in self.metrics['errors']:
                summary += f"  - {error}\n"

        summary += "=" * 60

        return summary

    async def run(self):
        """Main job execution."""
        print("=" * 60)
        print("STARTING REPLACE PRODUCT JOB - ReBoss NextGen")
        print(f"Time: {datetime.now(timezone.utc).isoformat()}")
        print("=" * 60)

        try:
            # Initialize Supabase
            self.db = SupabaseService()

            # Log job start
            job_id = self.db.log_job_run(
                job_type='replace_job',
                status='running',
                metadata={'start_time': datetime.now(timezone.utc).isoformat()}
            )

            # Get enabled shops
            shops = self.db.get_enabled_shops()

            if not shops:
                print("No enabled shops found")
                self.db.update_job_run(job_id, 'completed', shops_processed=0)
                return

            print(f"Found {len(shops)} enabled shops")

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
                    self.metrics['collections_processed'] += result.get('collections_processed', 0)
                    self.metrics['products_analyzed'] += result.get('products_analyzed', 0)
                    self.metrics['products_kept'] += result.get('products_kept', 0)
                    self.metrics['products_replaced'] += result.get('products_replaced', 0)
                    self.metrics['products_losers'] += result.get('products_losers', 0)
                    self.metrics['positions_maintained'] += result.get('positions_maintained', 0)

                    if result.get('errors'):
                        self.metrics['errors'].extend(result['errors'])
                        error_log.extend([{'shop': result.get('shop_name'), 'error': e} for e in result['errors']])
                else:
                    self.metrics['errors'].append(f"Shop {result.get('shop_id')}: {result.get('error')}")
                    error_log.append({
                        'shop': result.get('shop_id'),
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
                    'products_analyzed': self.metrics['products_analyzed'],
                    'products_replaced': self.metrics['products_replaced'],
                    'products_losers': self.metrics['products_losers'],
                    'positions_maintained': self.metrics['positions_maintained'],
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
        job = ReplaceProductJob()
        asyncio.run(job.run())
    except KeyboardInterrupt:
        print("\nJob interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
