"""
Sales Tracker Job - Main Entry Point
Migrated from Cloud Run Jobs to Render Cron Jobs
Uses AsyncIO for parallel shop processing (20+ shops)
"""
import os
import sys
import asyncio
import time
from datetime import datetime, timedelta
from typing import List, Tuple
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from models import Shop, Collection, SalesData
from services.supabase_service import SupabaseService
from services.shopify_service import ShopifyService
from services.shopify_direct_service import ShopifyDirectService


# Thread pool for running blocking Shopify API calls
executor = ThreadPoolExecutor(max_workers=5)


async def process_product(
    shop: Shop,
    collection: Collection,
    product,
    supabase_service: SupabaseService,
    shopify_direct_service: ShopifyDirectService,
    loop: asyncio.AbstractEventLoop
) -> dict:
    """Process a single product's sales data."""
    try:
        # Get existing sales data
        existing_sales = supabase_service.get_sales_data(
            shop.id, collection.id, product.id
        )

        # Determine lookback date
        if existing_sales and existing_sales.last_update:
            lookback_date = existing_sales.last_update - timedelta(days=1)
        else:
            lookback_date = datetime.now() - timedelta(days=120)

        # Date added to collection
        date_added = existing_sales.date_added_to_collection if existing_sales else datetime.now()

        # Get all-time data for time-period calculations (run in thread pool)
        all_time_lookback = datetime.now() - timedelta(days=365*2)
        all_time_data = await loop.run_in_executor(
            executor,
            lambda: shopify_direct_service.get_product_sales_comprehensive(
                product.id, all_time_lookback, date_added
            )
        )

        # Calculate final sales data
        if existing_sales:
            # Get incremental new sales
            new_sales_data = await loop.run_in_executor(
                executor,
                lambda: shopify_direct_service.get_product_sales_comprehensive(
                    product.id, lookback_date
                )
            )

            sales_data = SalesData(
                product_id=product.id,
                product_title=product.title,
                total_sales=existing_sales.total_sales + new_sales_data.total_sales,
                total_quantity=existing_sales.total_quantity + new_sales_data.total_quantity,
                sales_first_7_days=all_time_data.sales_first_7_days,
                sales_last_3_days=all_time_data.sales_last_3_days,
                sales_last_7_days=all_time_data.sales_last_7_days,
                sales_last_10_days=all_time_data.sales_last_10_days,
                sales_last_14_days=all_time_data.sales_last_14_days,
                last_update=datetime.now(),
                date_added_to_collection=existing_sales.date_added_to_collection
            )
        else:
            # First time processing
            sales_data = SalesData(
                product_id=product.id,
                product_title=product.title,
                total_sales=all_time_data.total_sales,
                total_quantity=all_time_data.total_quantity,
                sales_first_7_days=all_time_data.sales_first_7_days,
                sales_last_3_days=all_time_data.sales_last_3_days,
                sales_last_7_days=all_time_data.sales_last_7_days,
                sales_last_10_days=all_time_data.sales_last_10_days,
                sales_last_14_days=all_time_data.sales_last_14_days,
                last_update=datetime.now(),
                date_added_to_collection=datetime.now()
            )

        # Save to Supabase
        supabase_service.save_sales_data(shop.id, collection.id, sales_data)

        return {
            'success': True,
            'product_id': product.id,
            'total_sales': sales_data.total_sales,
            'total_quantity': sales_data.total_quantity
        }

    except Exception as e:
        print(f"Error processing product {product.id}: {e}")
        return {
            'success': False,
            'product_id': product.id,
            'error': str(e)
        }


async def process_collection(
    shop: Shop,
    collection: Collection,
    supabase_service: SupabaseService,
    loop: asyncio.AbstractEventLoop
) -> dict:
    """Process a single collection for a shop."""
    print(f"\n  Processing collection '{collection.title}' (ID: {collection.id})")

    shopify_service = ShopifyService(shop.shop_domain, shop.access_token)
    shopify_direct_service = ShopifyDirectService(shop.shop_domain, shop.access_token)

    # Get products in collection (blocking call)
    products = await loop.run_in_executor(
        executor,
        lambda: shopify_service.get_collection_products(collection.id)
    )

    print(f"  Found {len(products)} products in collection")

    if not products:
        return {
            'collection_id': collection.id,
            'products_processed': 0,
            'products_failed': 0
        }

    processed = 0
    failed = 0

    # Process products sequentially to respect rate limits
    for i, product in enumerate(products, 1):
        print(f"  [{i}/{len(products)}] Processing: {product.title[:50]}...")

        result = await process_product(
            shop, collection, product,
            supabase_service, shopify_direct_service, loop
        )

        if result['success']:
            processed += 1
        else:
            failed += 1

        # Rate limiting between products
        await asyncio.sleep(0.5)

    return {
        'collection_id': collection.id,
        'products_processed': processed,
        'products_failed': failed
    }


async def process_shop(
    shop: Shop,
    collections: List[Collection],
    supabase_service: SupabaseService,
    loop: asyncio.AbstractEventLoop
) -> dict:
    """Process all collections for a single shop."""
    print(f"\n{'='*60}")
    print(f"Processing shop: {shop.internal_name}")
    print(f"Domain: {shop.shop_domain}")
    print(f"Collections to process: {len(collections)}")

    if not collections:
        print(f"WARNING: No collections for shop {shop.internal_name}")
        return {
            'shop_id': shop.id,
            'shop_name': shop.internal_name,
            'success': True,
            'collections_processed': 0,
            'products_processed': 0,
            'products_failed': 0
        }

    total_products_processed = 0
    total_products_failed = 0

    # Process collections sequentially per shop
    for collection in collections:
        try:
            result = await process_collection(
                shop, collection, supabase_service, loop
            )
            total_products_processed += result['products_processed']
            total_products_failed += result['products_failed']
        except Exception as e:
            print(f"  Error processing collection {collection.id}: {e}")
            total_products_failed += 1

    return {
        'shop_id': shop.id,
        'shop_name': shop.internal_name,
        'success': True,
        'collections_processed': len(collections),
        'products_processed': total_products_processed,
        'products_failed': total_products_failed
    }


async def run_sales_tracker():
    """Main async entry point for the sales tracker job."""
    print("=" * 60)
    print("SALES TRACKER JOB - ReBoss NextGen")
    print(f"Start time: {datetime.now()}")
    print("=" * 60)

    # Initialize Supabase
    try:
        supabase_service = SupabaseService()
    except Exception as e:
        print(f"ERROR: Failed to connect to Supabase: {e}")
        sys.exit(1)

    # Log job start
    job_id = supabase_service.log_job_run(
        job_type='sales_tracker',
        status='running',
        metadata={'start_time': datetime.now().isoformat()}
    )

    # Get all shops with collections
    try:
        shops_with_collections = supabase_service.get_all_shops_with_collections()
        print(f"\nFound {len(shops_with_collections)} shops with enabled collections")
    except Exception as e:
        print(f"ERROR: Failed to fetch shops: {e}")
        supabase_service.update_job_run(
            job_id, 'failed',
            error_log=[{'error': str(e), 'phase': 'fetch_shops'}]
        )
        sys.exit(1)

    if not shops_with_collections:
        print("No shops with enabled collections found. Exiting.")
        supabase_service.update_job_run(job_id, 'completed', shops_processed=0)
        return

    # Get event loop
    loop = asyncio.get_event_loop()

    # Process shops in parallel (max 3 concurrent)
    semaphore = asyncio.Semaphore(3)

    async def process_with_semaphore(shop, collections):
        async with semaphore:
            return await process_shop(shop, collections, supabase_service, loop)

    # Create tasks for all shops
    tasks = [
        process_with_semaphore(shop, collections)
        for shop, collections in shops_with_collections
    ]

    # Run all shops in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Aggregate results
    shops_processed = 0
    shops_failed = 0
    total_products = 0
    error_log = []

    for result in results:
        if isinstance(result, Exception):
            shops_failed += 1
            error_log.append({'error': str(result)})
        elif result.get('success'):
            shops_processed += 1
            total_products += result.get('products_processed', 0)
        else:
            shops_failed += 1
            error_log.append({
                'shop': result.get('shop_name'),
                'error': result.get('error', 'Unknown error')
            })

    # Update job run status
    supabase_service.update_job_run(
        job_id,
        status='completed' if shops_failed == 0 else 'completed_with_errors',
        shops_processed=shops_processed,
        shops_failed=shops_failed,
        error_log=error_log if error_log else None,
        metadata={
            'total_products_processed': total_products,
            'end_time': datetime.now().isoformat()
        }
    )

    print("\n" + "=" * 60)
    print("SALES TRACKER JOB COMPLETED")
    print(f"End time: {datetime.now()}")
    print(f"Shops processed: {shops_processed}")
    print(f"Shops failed: {shops_failed}")
    print(f"Total products processed: {total_products}")
    print("=" * 60)


def main():
    """Entry point for the Cron Job."""
    try:
        asyncio.run(run_sales_tracker())
    except KeyboardInterrupt:
        print("\nJob interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
