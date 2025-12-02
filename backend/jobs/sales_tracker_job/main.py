"""
Sales Tracker Job
Tracks sales data for products in collections linked to campaign batch assignments.
Runs as a scheduled Cloud Run Job.
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import List, Tuple

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import Shop, CollectionAssignment, Product, SalesData
from services import SupabaseService, ShopifyService


def process_shop(supabase: SupabaseService, shop: Shop,
                 assignments: List[CollectionAssignment]) -> Tuple[int, int, List[dict]]:
    """
    Process a single shop's sales data.
    Returns: (products_processed, products_failed, errors)
    """
    products_processed = 0
    products_failed = 0
    errors = []

    print(f"\n{'='*60}")
    print(f"Processing shop: {shop.internal_name}")
    print(f"  Domain: {shop.shop_domain}")
    print(f"  Assignments: {len(assignments)}")
    print(f"{'='*60}")

    # Initialize Shopify service for this shop
    shopify = ShopifyService(shop.shop_domain, shop.access_token)

    # Test connection
    if not shopify.test_connection():
        error_msg = f"Failed to connect to Shopify for {shop.internal_name}"
        print(f"  ERROR: {error_msg}")
        errors.append({"shop": shop.internal_name, "error": error_msg})
        return 0, 0, errors

    print(f"  Connected to Shopify successfully")

    # Get shop timezone from Shopify
    shop_timezone = shopify.get_shop_timezone()
    print(f"  Shop timezone: {shop_timezone}")

    # Get unique collections from assignments
    collection_ids = supabase.get_unique_collections(assignments)
    print(f"  Found {len(collection_ids)} unique collections to process")

    # Process each collection
    for collection_id in collection_ids:
        print(f"\n  Processing collection: {collection_id}")

        try:
            # Get products from collection
            products = shopify.get_collection_products(collection_id)
            print(f"    Found {len(products)} active products")

            if not products:
                continue

            # Process each product
            for product in products:
                try:
                    # Check if we have existing sales data
                    existing = supabase.get_sales_data(shop.id, collection_id, product.id)

                    # Current time for new products
                    now = datetime.now(timezone.utc)

                    # Determine date_added_to_collection
                    # - If existing record has it, use that
                    # - If new product (first time seeing it in this collection), use NOW
                    if existing and existing.date_added_to_collection:
                        date_added = existing.date_added_to_collection
                    else:
                        # NEW: Use current date when first tracking this product in collection
                        date_added = now
                        print(f"      [NEW] First time tracking '{product.title}' - date_added set to {now.isoformat()}")

                    # Determine date to fetch sales from
                    since_date = date_added

                    # Make timezone-aware if needed
                    if since_date.tzinfo is None:
                        since_date = since_date.replace(tzinfo=timezone.utc)

                    # Fetch comprehensive sales data with shop timezone
                    sales_data = shopify.get_product_sales_comprehensive(
                        product.id,
                        since_date,
                        date_added_to_collection=date_added,
                        shop_timezone=shop_timezone
                    )

                    # Update with product title
                    sales_data.product_title = product.title

                    # Save to Supabase
                    supabase.save_sales_data(shop.id, collection_id, sales_data)
                    products_processed += 1

                except Exception as e:
                    products_failed += 1
                    error_msg = f"Error processing product {product.id}: {str(e)}"
                    print(f"    ERROR: {error_msg}")
                    errors.append({
                        "shop": shop.internal_name,
                        "collection": collection_id,
                        "product": product.id,
                        "error": str(e)
                    })

        except Exception as e:
            error_msg = f"Error processing collection {collection_id}: {str(e)}"
            print(f"    ERROR: {error_msg}")
            errors.append({
                "shop": shop.internal_name,
                "collection": collection_id,
                "error": str(e)
            })

    print(f"\n  Shop complete: {products_processed} processed, {products_failed} failed")
    return products_processed, products_failed, errors


def main():
    """Main entry point for the sales tracker job."""
    print("="*60)
    print("SALES TRACKER JOB - Starting")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print("="*60)

    try:
        # Initialize Supabase service
        supabase = SupabaseService()

        # Log job start
        job_id = supabase.log_job_run(
            job_type='sales_tracker',
            status='running',
            metadata={'started_at': datetime.now(timezone.utc).isoformat()}
        )

        # Get all shops with campaign batch assignments
        shops_with_assignments = supabase.get_shops_with_assignments()

        if not shops_with_assignments:
            print("\nNo shops with active campaign assignments found.")
            if job_id:
                supabase.update_job_run(
                    job_id,
                    status='completed',
                    shops_processed=0,
                    shops_failed=0,
                    metadata={'message': 'No shops with assignments found'}
                )
            return

        print(f"\nFound {len(shops_with_assignments)} shops with assignments")

        # Process each shop
        total_shops_processed = 0
        total_shops_failed = 0
        total_products_processed = 0
        total_products_failed = 0
        all_errors = []

        for shop, assignments in shops_with_assignments:
            try:
                products_processed, products_failed, errors = process_shop(
                    supabase, shop, assignments
                )

                total_products_processed += products_processed
                total_products_failed += products_failed
                all_errors.extend(errors)

                if errors:
                    total_shops_failed += 1
                else:
                    total_shops_processed += 1

            except Exception as e:
                total_shops_failed += 1
                error_msg = f"Critical error processing shop {shop.internal_name}: {str(e)}"
                print(f"\nCRITICAL ERROR: {error_msg}")
                all_errors.append({
                    "shop": shop.internal_name,
                    "error": str(e),
                    "critical": True
                })

        # Log job completion
        print("\n" + "="*60)
        print("SALES TRACKER JOB - Complete")
        print(f"  Shops processed: {total_shops_processed}")
        print(f"  Shops failed: {total_shops_failed}")
        print(f"  Products processed: {total_products_processed}")
        print(f"  Products failed: {total_products_failed}")
        print(f"  Total errors: {len(all_errors)}")
        print("="*60)

        if job_id:
            supabase.update_job_run(
                job_id,
                status='completed' if total_shops_failed == 0 else 'completed_with_errors',
                shops_processed=total_shops_processed,
                shops_failed=total_shops_failed,
                error_log=all_errors if all_errors else None,
                metadata={
                    'products_processed': total_products_processed,
                    'products_failed': total_products_failed,
                    'completed_at': datetime.now(timezone.utc).isoformat()
                }
            )

    except Exception as e:
        print(f"\nFATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

        # Try to log the failure
        try:
            if 'supabase' in locals() and 'job_id' in locals() and job_id:
                supabase.update_job_run(
                    job_id,
                    status='failed',
                    error_log=[{"error": str(e), "fatal": True}]
                )
        except:
            pass

        sys.exit(1)


if __name__ == "__main__":
    main()
