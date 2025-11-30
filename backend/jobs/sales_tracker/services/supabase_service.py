"""
Supabase Service - Database operations for sales tracking
Replaces Firestore with Supabase for multi-tenant SaaS
"""
import os
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime
from supabase import create_client, Client

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Shop, Collection, SalesData


class SupabaseService:
    def __init__(self):
        """Initialize Supabase client."""
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

        if not supabase_url or not supabase_key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")

        self.client: Client = create_client(supabase_url, supabase_key)
        self.connected = True
        print(f"Connected to Supabase: {supabase_url}")

    def get_all_shops_with_collections(self) -> List[Tuple[Shop, List[Collection]]]:
        """
        Get all shops that have sales tracking enabled with their collections.
        Multi-tenant: Processes ALL shops in the system.
        """
        shops_with_collections = []

        try:
            # Get all shops from Supabase
            response = self.client.table('shops').select('*').execute()
            shops_data = response.data

            print(f"Found {len(shops_data)} total shops in database")

            for shop_data in shops_data:
                # Parse rules JSON
                rules = shop_data.get('rules', {})
                if isinstance(rules, str):
                    import json
                    rules = json.loads(rules)

                collections_config = rules.get('collections', {})

                # Check if collections tracking is enabled
                if not collections_config.get('enabled', False):
                    print(f"  Shop {shop_data.get('internal_name')}: Collections not enabled, skipping")
                    continue

                selected_collections = collections_config.get('selected_collections', [])
                if not selected_collections:
                    print(f"  Shop {shop_data.get('internal_name')}: No collections selected, skipping")
                    continue

                # Create Shop model
                shop = Shop(
                    id=shop_data['id'],
                    internal_name=shop_data.get('internal_name', ''),
                    shop_domain=shop_data.get('shop_domain', ''),
                    access_token=shop_data.get('access_token', ''),
                    user_id=shop_data.get('user_id', '')
                )

                # Create Collection models
                collections = []
                for coll in selected_collections:
                    collection = Collection(
                        id=str(coll.get('id', '')),
                        title=coll.get('title', ''),
                        enabled=True
                    )
                    collections.append(collection)

                shops_with_collections.append((shop, collections))
                print(f"  Shop {shop.internal_name}: {len(collections)} collections to process")

            return shops_with_collections

        except Exception as e:
            print(f"Error fetching shops: {e}")
            raise

    def get_sales_data(self, shop_id: str, collection_id: str, product_id: str) -> Optional[SalesData]:
        """Get existing sales data for a product from Supabase."""
        try:
            response = self.client.table('sales_data').select('*').eq(
                'shop_id', shop_id
            ).eq(
                'collection_id', collection_id
            ).eq(
                'product_id', product_id
            ).execute()

            if response.data and len(response.data) > 0:
                data = response.data[0]
                return SalesData(
                    product_id=data['product_id'],
                    product_title=data.get('product_title', ''),
                    total_sales=data.get('total_sales', 0.0),
                    total_quantity=data.get('total_quantity', 0),
                    sales_first_7_days=data.get('sales_first_7_days', 0),
                    sales_last_3_days=data.get('sales_last_3_days', 0),
                    sales_last_7_days=data.get('sales_last_7_days', 0),
                    sales_last_10_days=data.get('sales_last_10_days', 0),
                    sales_last_14_days=data.get('sales_last_14_days', 0),
                    last_update=datetime.fromisoformat(data['last_update'].replace('Z', '+00:00')) if data.get('last_update') else datetime.now(),
                    orders_processed=data.get('orders_processed', []),
                    date_added_to_collection=datetime.fromisoformat(data['date_added_to_collection'].replace('Z', '+00:00')) if data.get('date_added_to_collection') else None
                )
            return None

        except Exception as e:
            print(f"Error getting sales data: {e}")
            return None

    def save_sales_data(self, shop_id: str, collection_id: str, sales_data: SalesData):
        """Save or update sales data in Supabase using upsert."""
        try:
            data = {
                'shop_id': shop_id,
                'collection_id': collection_id,
                'product_id': sales_data.product_id,
                'product_title': sales_data.product_title,
                'total_sales': sales_data.total_sales,
                'total_quantity': sales_data.total_quantity,
                'sales_first_7_days': sales_data.sales_first_7_days,
                'sales_last_3_days': sales_data.sales_last_3_days,
                'sales_last_7_days': sales_data.sales_last_7_days,
                'sales_last_10_days': sales_data.sales_last_10_days,
                'sales_last_14_days': sales_data.sales_last_14_days,
                'last_update': sales_data.last_update.isoformat(),
                'orders_processed': sales_data.orders_processed,
                'date_added_to_collection': sales_data.date_added_to_collection.isoformat() if sales_data.date_added_to_collection else None
            }

            # Upsert based on unique constraint (shop_id, collection_id, product_id)
            self.client.table('sales_data').upsert(
                data,
                on_conflict='shop_id,collection_id,product_id'
            ).execute()

            print(f"  Saved sales data for product {sales_data.product_id}")

        except Exception as e:
            print(f"Error saving sales data: {e}")
            raise

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

            if status == 'completed' or status == 'failed':
                data['completed_at'] = datetime.now().isoformat()

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
            if status in ['completed', 'failed']:
                data['completed_at'] = datetime.now().isoformat()

            self.client.table('job_runs').update(data).eq('id', job_id).execute()

        except Exception as e:
            print(f"Error updating job run: {e}")
