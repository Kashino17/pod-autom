"""
Supabase Service for Product Creation Job - Database operations
"""
import os
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from supabase import create_client, Client

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ShopConfig, ResearchProduct


class SupabaseService:
    def __init__(self):
        """Initialize Supabase client."""
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

        if not supabase_url or not supabase_key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

        self.client: Client = create_client(supabase_url, supabase_key)
        print(f"Connected to Supabase: {supabase_url}")

    def get_shops_with_research_tables(self) -> List[ShopConfig]:
        """Get all shops that have research tables initialized."""
        configs = []

        try:
            # Get shops with research tables from registry
            registry_response = self.client.table('shop_research_tables').select(
                'shop_id, table_name'
            ).execute()

            shop_ids_with_tables = {r['shop_id']: r['table_name'] for r in registry_response.data}

            if not shop_ids_with_tables:
                print("No shops with research tables found")
                return configs

            # Get shop details
            shops_response = self.client.table('shops').select('*').in_(
                'id', list(shop_ids_with_tables.keys())
            ).execute()

            for shop_data in shops_response.data:
                shop_id = shop_data['id']

                # Get rate limits for this shop
                rate_limits = self.get_rate_limits(shop_id)

                config = ShopConfig(
                    shop_id=shop_id,
                    shop_domain=shop_data.get('shop_domain'),
                    access_token=shop_data.get('access_token'),
                    internal_name=shop_data.get('internal_name', 'Unknown'),
                    fast_fashion_limit=rate_limits.get('fast_fashion_limit', 20)
                )

                configs.append(config)
                print(f"  Shop {config.internal_name}: Limit = {config.fast_fashion_limit}")

        except Exception as e:
            print(f"Error loading shop configs: {e}")
            raise

        return configs

    def get_rate_limits(self, shop_id: str) -> Dict:
        """Get rate limits for a shop."""
        try:
            response = self.client.table('rate_limits').select('*').eq(
                'shop_id', shop_id
            ).single().execute()

            if response.data:
                return response.data
            else:
                # Return defaults if no limits set
                return {
                    'fast_fashion_limit': 20,
                    'pod_creation_limit': 10
                }

        except Exception as e:
            # Return defaults on error (including PGRST116 - no rows)
            print(f"Using default rate limits for {shop_id}: {e}")
            return {
                'fast_fashion_limit': 20,
                'pod_creation_limit': 10
            }

    def get_unsynced_products(self, shop_id: str, limit: int = 100) -> List[ResearchProduct]:
        """Get unsynced products from research table using RPC function."""
        try:
            response = self.client.rpc('get_unsynced_research_products', {
                'target_shop_id': shop_id,
                'limit_count': limit
            }).execute()

            result = response.data
            if not result.get('success'):
                print(f"Failed to get unsynced products: {result.get('error')}")
                return []

            products = []
            for row in result.get('products', []):
                try:
                    product = ResearchProduct.from_db_row(row)
                    products.append(product)
                except Exception as e:
                    print(f"Error parsing product {row.get('id')}: {e}")

            return products

        except Exception as e:
            print(f"Error getting unsynced products for {shop_id}: {e}")
            return []

    def mark_product_synced(self, shop_id: str, product_id: int) -> bool:
        """Mark a product as synced in the research table."""
        try:
            response = self.client.rpc('mark_product_synced', {
                'target_shop_id': shop_id,
                'product_id': product_id
            }).execute()

            result = response.data
            return result.get('success', False)

        except Exception as e:
            print(f"Error marking product {product_id} as synced: {e}")
            return False

    def get_unsynced_count(self, shop_id: str) -> int:
        """Get count of unsynced products for a shop."""
        try:
            response = self.client.rpc('get_unsynced_research_count', {
                'target_shop_id': shop_id
            }).execute()

            result = response.data
            if result.get('success'):
                return result.get('count', 0)
            return 0

        except Exception as e:
            print(f"Error getting unsynced count for {shop_id}: {e}")
            return 0

    def log_job_run(self, job_type: str, status: str, shops_processed: int = 0,
                    shops_failed: int = 0, error_log: List[Dict] = None,
                    metadata: Dict = None) -> str:
        """Log a job run to the job_runs table."""
        try:
            data = {
                'job_type': job_type,
                'status': status,
                'shops_processed': shops_processed,
                'shops_failed': shops_failed,
                'error_log': error_log or [],
                'metadata': metadata or {}
            }

            if status in ['completed', 'failed']:
                data['completed_at'] = datetime.now(timezone.utc).isoformat()

            response = self.client.table('job_runs').insert(data).execute()

            if response.data:
                return response.data[0]['id']
            return None

        except Exception as e:
            print(f"Error logging job run: {e}")
            return None

    def update_job_run(self, job_id: str, status: str, shops_processed: int = 0,
                       shops_failed: int = 0, error_log: List[Dict] = None,
                       metadata: Dict = None):
        """Update an existing job run."""
        try:
            data = {
                'status': status,
                'shops_processed': shops_processed,
                'shops_failed': shops_failed
            }

            if error_log is not None:
                data['error_log'] = error_log
            if metadata is not None:
                data['metadata'] = metadata
            if status in ['completed', 'failed', 'completed_with_errors']:
                data['completed_at'] = datetime.now(timezone.utc).isoformat()

            self.client.table('job_runs').update(data).eq('id', job_id).execute()

        except Exception as e:
            print(f"Error updating job run: {e}")

    def get_shop_internal_name(self, shop_id: str) -> str:
        """Get the internal name for a shop."""
        try:
            response = self.client.table('shops').select('internal_name').eq(
                'id', shop_id
            ).single().execute()

            if response.data:
                return response.data.get('internal_name', shop_id)
            return shop_id

        except Exception as e:
            print(f"Error getting shop name: {e}")
            return shop_id
