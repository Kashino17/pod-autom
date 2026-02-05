"""
Product Optimize Job - Main Entry Point
Optimizes products in Shopify using ChatGPT (GPT-5) and shop-specific settings
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

from models import ShopConfig, ShopifyProduct
from services.supabase_service import SupabaseService
from services.shopify_service import ShopifyRESTClient
from services.openai_service import OpenAIService


class ProductOptimizeJob:
    """Main class for the Product Optimize Job."""

    def __init__(self):
        self.db = None
        self.openai = None
        self.metrics = {
            'start_time': datetime.now(timezone.utc),
            'shops_processed': 0,
            'products_optimized': 0,
            'products_failed': 0,
            'products_skipped': 0,
            'gpt_calls': 0,
            'errors': []
        }

    async def optimize_product(self, shopify: ShopifyRESTClient,
                                product: ShopifyProduct,
                                config: ShopConfig) -> Dict:
        """Optimize a single product using GPT and shop settings."""
        opt_config = config.optimization_config

        try:
            new_title = None
            new_description = None
            new_tags = None

            # Generate optimized title with GPT
            if opt_config.generate_optimized_title:
                print(f"    Generating title for: {product.title[:50]}...")
                new_title = self.openai.generate_optimized_title(
                    original_title=product.title,
                    product_type=product.product_type or "Dress",
                    season=opt_config.sales_text_template
                )
                if new_title:
                    self.metrics['gpt_calls'] += 1
                    print(f"    New title: {new_title}")

            # Generate optimized description with GPT
            if opt_config.generate_optimized_description:
                print(f"    Generating description...")
                new_description = self.openai.generate_optimized_description(
                    original_title=new_title or product.title,
                    original_description=product.body_html,
                    product_type=product.product_type or "Dress",
                    season=opt_config.sales_text_template
                )
                if new_description:
                    self.metrics['gpt_calls'] += 1

            # Generate tags with GPT
            if opt_config.generate_tags:
                print(f"    Generating tags...")
                new_tags = self.openai.generate_tags(
                    title=new_title or product.title,
                    description=new_description or product.body_html,
                    product_type=product.product_type or "Dress",
                    season=opt_config.sales_text_template
                )
                if new_tags:
                    self.metrics['gpt_calls'] += 1
                    print(f"    New tags: {', '.join(new_tags[:5])}...")

            # Apply all optimizations
            updated_product = shopify.optimize_product(
                product=product,
                config=opt_config,
                new_title=new_title,
                new_description=new_description,
                new_tags=new_tags
            )

            if updated_product:
                return {
                    'success': True,
                    'product_id': product.id,
                    'title': new_title or product.title,
                    'gpt_title': new_title is not None,
                    'gpt_description': new_description is not None,
                    'gpt_tags': new_tags is not None
                }
            else:
                return {
                    'success': False,
                    'product_id': product.id,
                    'title': product.title,
                    'error': 'Failed to update product in Shopify'
                }

        except Exception as e:
            print(f"    Error optimizing product {product.id}: {e}")
            return {
                'success': False,
                'product_id': product.id,
                'title': product.title,
                'error': str(e)
            }

    async def process_shop(self, config: ShopConfig) -> Dict:
        """Process a single shop - optimize products with NEW_SET tag."""
        print(f"\n{'='*60}")
        print(f"Processing shop: {config.internal_name} ({config.shop_domain})")
        print(f"Optimization Settings:")
        print(f"  - Generate Title: {config.optimization_config.generate_optimized_title}")
        print(f"  - Generate Description: {config.optimization_config.generate_optimized_description}")
        print(f"  - Generate Tags: {config.optimization_config.generate_tags}")
        print(f"  - Status after: {config.optimization_config.product_status_value}")
        print(f"  - Limit: {config.fast_fashion_limit}")
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

            # Get products with NEW_SET tag (created but not optimized)
            products = shopify.get_products_by_tag(
                tag=ShopifyRESTClient.NEW_SET_TAG,
                limit=config.fast_fashion_limit
            )

            print(f"Found {len(products)} products with NEW_SET tag to optimize")

            if not products:
                print("No products to optimize")
                return {
                    'success': True,
                    'shop_id': config.shop_id,
                    'shop_name': config.internal_name,
                    'products_optimized': 0,
                    'products_failed': 0,
                    'gpt_calls': 0,
                    'errors': []
                }

            optimized = 0
            failed = 0
            gpt_calls = 0
            errors = []

            # Process products sequentially (API rate limits + GPT costs)
            for product in products:
                print(f"\n  Processing: {product.title[:60]}...")
                result = await self.optimize_product(shopify, product, config)

                if result['success']:
                    optimized += 1
                    if result.get('gpt_title'):
                        gpt_calls += 1
                    if result.get('gpt_description'):
                        gpt_calls += 1
                    if result.get('gpt_tags'):
                        gpt_calls += 1
                    print(f"  [OK] Optimized: {result['title'][:50]}")
                else:
                    failed += 1
                    errors.append(f"{product.title[:30]}: {result.get('error', 'Unknown error')}")
                    print(f"  [FAIL] {product.title[:50]}: {result.get('error')}")

                # Small delay between products (GPT rate limiting)
                await asyncio.sleep(1.0)

            return {
                'success': True,
                'shop_id': config.shop_id,
                'shop_name': config.internal_name,
                'products_optimized': optimized,
                'products_failed': failed,
                'gpt_calls': gpt_calls,
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
PRODUCT OPTIMIZE JOB COMPLETED
{'='*60}
Duration: {duration:.2f} seconds
Shops processed: {self.metrics['shops_processed']}
Products optimized: {self.metrics['products_optimized']}
Products failed: {self.metrics['products_failed']}
Products skipped: {self.metrics['products_skipped']}
GPT API calls: {self.metrics['gpt_calls']}
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
        print("STARTING PRODUCT OPTIMIZE JOB - ReBoss NextGen")
        print(f"Time: {datetime.now(timezone.utc).isoformat()}")
        print(f"Using OpenAI Model: {OpenAIService.MODEL}")
        print("=" * 60)

        try:
            # Initialize services
            self.db = SupabaseService()
            self.openai = OpenAIService()

            # Log job start
            job_id = self.db.log_job_run(
                job_type='product_optimize_job',
                status='running',
                metadata={
                    'start_time': datetime.now(timezone.utc).isoformat(),
                    'model': OpenAIService.MODEL
                }
            )

            # Get shops with optimization settings
            shops = self.db.get_shops_for_optimization()

            if not shops:
                print("No shops found")
                self.db.update_job_run(job_id, 'completed', shops_processed=0)
                return

            print(f"Found {len(shops)} shops")

            # Process shops sequentially (to control GPT costs)
            for config in shops:
                result = await self.process_shop(config)

                if result.get('success'):
                    self.metrics['shops_processed'] += 1
                    self.metrics['products_optimized'] += result.get('products_optimized', 0)
                    self.metrics['products_failed'] += result.get('products_failed', 0)
                    self.metrics['gpt_calls'] += result.get('gpt_calls', 0)

                    if result.get('errors'):
                        self.metrics['errors'].extend(result['errors'])
                else:
                    self.metrics['errors'].append(f"Shop {result.get('shop_name')}: {result.get('error')}")

            # Build error log
            error_log = [{'error': e} for e in self.metrics['errors']] if self.metrics['errors'] else None

            # Update job run
            self.db.update_job_run(
                job_id,
                status='completed' if not error_log else 'completed_with_errors',
                shops_processed=self.metrics['shops_processed'],
                shops_failed=len(shops) - self.metrics['shops_processed'],
                error_log=error_log,
                metadata={
                    'products_optimized': self.metrics['products_optimized'],
                    'products_failed': self.metrics['products_failed'],
                    'gpt_calls': self.metrics['gpt_calls'],
                    'model': OpenAIService.MODEL,
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
        job = ProductOptimizeJob()
        asyncio.run(job.run())
    except KeyboardInterrupt:
        print("\nJob interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
