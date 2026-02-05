#!/usr/bin/env python3
"""
POD AutoM Product Creation Test Script

This script tests the POD AutoM product creation pipeline without
actually creating products in Shopify (dry-run mode by default).

Usage:
    # Dry run (no Shopify calls)
    python test_pod_autom.py

    # Live run (creates real products)
    python test_pod_autom.py --live

    # Insert test data only
    python test_pod_autom.py --insert-only

    # Clean up test data
    python test_pod_autom.py --cleanup
"""
import os
import sys
import argparse
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from supabase import create_client, Client

# Test data
TEST_USER_ID = os.getenv('TEST_USER_ID')  # Set this in .env
TEST_SHOP_DOMAIN = os.getenv('TEST_SHOP_DOMAIN', 'test-shop.myshopify.com')
TEST_SHOP_TOKEN = os.getenv('TEST_SHOP_TOKEN', '')


def get_supabase() -> Client:
    """Get Supabase client."""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')
    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    return create_client(url, key)


def insert_test_data(db: Client):
    """Insert test data for POD AutoM testing."""
    print("\n" + "=" * 60)
    print("INSERTING TEST DATA")
    print("=" * 60)

    if not TEST_USER_ID:
        print("ERROR: Set TEST_USER_ID in .env file")
        print("You can find your user ID in Supabase: auth.users table")
        sys.exit(1)

    try:
        # 1. Create test shop
        print("\n1. Creating test shop...")
        shop_result = db.table('pod_autom_shops').insert({
            'user_id': TEST_USER_ID,
            'shop_domain': TEST_SHOP_DOMAIN,
            'internal_name': 'POD Test Shop',
            'access_token': TEST_SHOP_TOKEN,
            'connection_status': 'connected'
        }).execute()

        shop_id = shop_result.data[0]['id']
        print(f"   Shop created: {shop_id}")

        # 2. Settings are auto-created via trigger, but let's verify
        print("\n2. Verifying settings...")
        settings_result = db.table('pod_autom_settings').select('*').eq(
            'shop_id', shop_id
        ).execute()

        if settings_result.data:
            settings_id = settings_result.data[0]['id']
            print(f"   Settings found: {settings_id}")

            # Enable and set creation limit
            db.table('pod_autom_settings').update({
                'enabled': True,
                'creation_limit': 10,
                'auto_publish': True
            }).eq('id', settings_id).execute()
            print("   Settings updated: enabled=True, limit=10")
        else:
            print("   ERROR: Settings not auto-created. Creating manually...")
            settings_result = db.table('pod_autom_settings').insert({
                'shop_id': shop_id,
                'enabled': True,
                'creation_limit': 10
            }).execute()
            settings_id = settings_result.data[0]['id']
            print(f"   Settings created: {settings_id}")

        # 3. Create test niche
        print("\n3. Creating test niche...")
        niche_result = db.table('pod_autom_niches').insert({
            'settings_id': settings_id,
            'niche_name': 'Test Niche - Motivational',
            'is_active': True
        }).execute()

        niche_id = niche_result.data[0]['id']
        print(f"   Niche created: {niche_id}")

        # 4. Create test products in queue
        print("\n4. Creating test products in queue...")
        test_products = [
            {
                'shop_id': shop_id,
                'settings_id': settings_id,
                'niche_id': niche_id,
                'niche': 'Motivational',
                'title': 'Never Give Up T-Shirt',
                'description': 'Ein motivierendes T-Shirt fuer Champions.',
                'price': 29.99,
                'compare_price': 39.99,
                'image_url': 'https://via.placeholder.com/800x800/000000/FFFFFF?text=Never+Give+Up',
                'images': ['https://via.placeholder.com/800x800/000000/FFFFFF?text=Never+Give+Up'],
                'variants': [
                    {'size': 'S', 'color': 'Black'},
                    {'size': 'M', 'color': 'Black'},
                    {'size': 'L', 'color': 'Black'},
                    {'size': 'XL', 'color': 'Black'}
                ],
                'status': 'pending'
            },
            {
                'shop_id': shop_id,
                'settings_id': settings_id,
                'niche_id': niche_id,
                'niche': 'Motivational',
                'title': 'Dream Big T-Shirt',
                'description': 'Traeume gross und erreiche deine Ziele.',
                'price': 29.99,
                'compare_price': 39.99,
                'image_url': 'https://via.placeholder.com/800x800/1a1a2e/FFFFFF?text=Dream+Big',
                'images': ['https://via.placeholder.com/800x800/1a1a2e/FFFFFF?text=Dream+Big'],
                'variants': [
                    {'size': 'S', 'color': 'Navy'},
                    {'size': 'M', 'color': 'Navy'},
                    {'size': 'L', 'color': 'Navy'}
                ],
                'status': 'pending'
            },
            {
                'shop_id': shop_id,
                'settings_id': settings_id,
                'niche_id': niche_id,
                'niche': 'Motivational',
                'title': 'Hustle Mode T-Shirt',
                'description': 'Fuer alle Hustler da draussen.',
                'price': 29.99,
                'compare_price': 39.99,
                'image_url': 'https://via.placeholder.com/800x800/333333/FFFFFF?text=Hustle+Mode',
                'images': ['https://via.placeholder.com/800x800/333333/FFFFFF?text=Hustle+Mode'],
                'variants': [
                    {'size': 'M', 'color': 'Gray'},
                    {'size': 'L', 'color': 'Gray'},
                    {'size': 'XL', 'color': 'Gray'}
                ],
                'status': 'pending'
            }
        ]

        for product in test_products:
            result = db.table('pod_autom_product_queue').insert(product).execute()
            print(f"   Created: {product['title']} (ID: {result.data[0]['id']})")

        print("\n" + "=" * 60)
        print("TEST DATA INSERTED SUCCESSFULLY")
        print("=" * 60)
        print(f"\nShop ID: {shop_id}")
        print(f"Settings ID: {settings_id}")
        print(f"Niche ID: {niche_id}")
        print(f"Products in queue: {len(test_products)}")

        return shop_id, settings_id

    except Exception as e:
        print(f"\nERROR inserting test data: {e}")
        raise


def cleanup_test_data(db: Client):
    """Clean up test data."""
    print("\n" + "=" * 60)
    print("CLEANING UP TEST DATA")
    print("=" * 60)

    try:
        # Find test shop
        shop_result = db.table('pod_autom_shops').select('id').eq(
            'internal_name', 'POD Test Shop'
        ).execute()

        if shop_result.data:
            shop_id = shop_result.data[0]['id']
            print(f"\nFound test shop: {shop_id}")

            # Delete queue items
            queue_result = db.table('pod_autom_product_queue').delete().eq(
                'shop_id', shop_id
            ).execute()
            print(f"Deleted queue items")

            # Delete shop (cascades to settings, niches)
            db.table('pod_autom_shops').delete().eq('id', shop_id).execute()
            print(f"Deleted shop and related data")

            print("\n" + "=" * 60)
            print("CLEANUP COMPLETED")
            print("=" * 60)
        else:
            print("No test shop found to clean up")

    except Exception as e:
        print(f"\nERROR during cleanup: {e}")


def check_pod_autom_tables(db: Client):
    """Check if POD AutoM tables exist."""
    print("\n" + "=" * 60)
    print("CHECKING DATABASE TABLES")
    print("=" * 60)

    tables = [
        'pod_autom_shops',
        'pod_autom_settings',
        'pod_autom_niches',
        'pod_autom_prompts',
        'pod_autom_product_queue',
        'pod_autom_products',
        'pod_autom_subscriptions'
    ]

    missing = []
    for table in tables:
        try:
            db.table(table).select('id').limit(1).execute()
            print(f"  [OK] {table}")
        except Exception as e:
            if 'does not exist' in str(e) or '42P01' in str(e):
                print(f"  [MISSING] {table}")
                missing.append(table)
            else:
                print(f"  [ERROR] {table}: {e}")

    if missing:
        print(f"\n⚠️  Missing tables: {', '.join(missing)}")
        print("   Run the SQL migrations first!")
        return False

    print("\n✓ All required tables exist")
    return True


def run_dry_test(db: Client):
    """Run a dry test without Shopify calls."""
    print("\n" + "=" * 60)
    print("DRY RUN TEST")
    print("=" * 60)

    # Check tables
    if not check_pod_autom_tables(db):
        sys.exit(1)

    # Get POD AutoM shops
    print("\nFetching POD AutoM shops...")
    shops_result = db.table('pod_autom_shops').select(
        '*, pod_autom_settings(*)'
    ).eq('connection_status', 'connected').execute()

    if not shops_result.data:
        print("No connected POD AutoM shops found")
        print("\nRun with --insert-only to create test data first")
        return

    print(f"Found {len(shops_result.data)} connected shops:")
    for shop in shops_result.data:
        settings = shop.get('pod_autom_settings', [])
        if isinstance(settings, list):
            settings = settings[0] if settings else {}

        print(f"\n  Shop: {shop.get('internal_name')}")
        print(f"  Domain: {shop.get('shop_domain')}")
        print(f"  Settings ID: {settings.get('id')}")
        print(f"  Enabled: {settings.get('enabled')}")
        print(f"  Creation Limit: {settings.get('creation_limit')}")

        if settings.get('id'):
            # Get queue items
            queue_result = db.table('pod_autom_product_queue').select(
                'id, title, status, niche'
            ).eq('settings_id', settings['id']).eq('status', 'pending').execute()

            print(f"  Pending products: {len(queue_result.data)}")
            for item in queue_result.data[:5]:
                print(f"    - {item['title']} [{item['niche']}]")

    print("\n" + "=" * 60)
    print("DRY RUN COMPLETE")
    print("=" * 60)
    print("\nTo run actual product creation: python test_pod_autom.py --live")


def run_live_test():
    """Run the actual product creation job."""
    print("\n" + "=" * 60)
    print("LIVE TEST - CREATING PRODUCTS IN SHOPIFY")
    print("=" * 60)

    # Set environment to only process POD AutoM
    os.environ['PROCESS_REBOSS_SHOPS'] = 'false'
    os.environ['PROCESS_POD_AUTOM_SHOPS'] = 'true'

    # Import and run the job
    from main import ProductCreationJob
    import asyncio

    job = ProductCreationJob()
    asyncio.run(job.run())


def main():
    parser = argparse.ArgumentParser(description='POD AutoM Product Creation Test')
    parser.add_argument('--live', action='store_true', help='Run live test with Shopify')
    parser.add_argument('--insert-only', action='store_true', help='Only insert test data')
    parser.add_argument('--cleanup', action='store_true', help='Clean up test data')
    parser.add_argument('--check-tables', action='store_true', help='Only check database tables')

    args = parser.parse_args()

    db = get_supabase()

    if args.check_tables:
        check_pod_autom_tables(db)
    elif args.cleanup:
        cleanup_test_data(db)
    elif args.insert_only:
        insert_test_data(db)
    elif args.live:
        run_live_test()
    else:
        run_dry_test(db)


if __name__ == "__main__":
    main()
