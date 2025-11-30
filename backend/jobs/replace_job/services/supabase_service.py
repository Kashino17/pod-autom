"""
Supabase Service for Replace Job - Database operations
"""
import os
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from supabase import create_client, Client

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ShopConfig


class SupabaseService:
    def __init__(self):
        """Initialize Supabase client."""
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

        if not supabase_url or not supabase_key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

        self.client: Client = create_client(supabase_url, supabase_key)
        print(f"Connected to Supabase: {supabase_url}")

    def get_enabled_shops(self) -> List[ShopConfig]:
        """Get all shops with enabled collections for replacement."""
        configs = []

        try:
            response = self.client.table('shops').select('*').execute()
            shops_data = response.data

            print(f"Found {len(shops_data)} total shops")

            for data in shops_data:
                rules = data.get('rules', {})
                if isinstance(rules, str):
                    rules = json.loads(rules)

                # Check if collections are enabled
                collections_config = rules.get('collections', {})
                if not collections_config.get('enabled', False):
                    print(f"  Shop {data.get('internal_name')}: Collections disabled")
                    continue

                selected_collections = collections_config.get('selected_collections', [])
                if not selected_collections:
                    print(f"  Shop {data.get('internal_name')}: No collections selected")
                    continue

                # Extract configuration
                general = rules.get('general', {})
                phase_timeline = rules.get('phase_timeline', {})
                initial_phase = rules.get('initial_phase', {})
                post_phase = rules.get('post_phase', {})

                # Set defaults for post_phase
                if not post_phase.get('avg3_ok'):
                    post_phase['avg3_ok'] = 5
                if not post_phase.get('avg7_ok'):
                    post_phase['avg7_ok'] = 6
                if not post_phase.get('avg10_ok'):
                    post_phase['avg10_ok'] = 10
                if not post_phase.get('avg14_ok'):
                    post_phase['avg14_ok'] = 14
                if not post_phase.get('min_ok_thresholds'):
                    post_phase['min_ok_thresholds'] = 2

                config = ShopConfig(
                    shop_id=data['id'],
                    shop_domain=data.get('shop_domain'),
                    access_token=data.get('access_token'),
                    test_mode=general.get('test_mode', False),
                    qk_tag=general.get('qk_tag', 'QK'),
                    replace_tag_prefix=general.get('replace_tag_prefix', 'replaced_'),
                    start_phase_days=phase_timeline.get('start_phase_days', 7),
                    nach_phase_days=phase_timeline.get('nach_phase_days', 14),
                    initial_phase_rules=initial_phase,
                    post_phase_rules=post_phase,
                    selected_collections=selected_collections,
                    maintain_positions=collections_config.get('maintain_positions', True)
                )

                configs.append(config)
                print(f"  Shop {data.get('internal_name')}: {len(selected_collections)} collections")

        except Exception as e:
            print(f"Error loading shop configs: {e}")
            raise

        return configs

    def get_sales_data(self, shop_id: str, collection_id: str, product_id: str) -> Dict:
        """Get sales data for a product from sales_data table."""
        try:
            # Clean product ID
            if product_id.startswith('gid://'):
                product_id = product_id.split('/')[-1]

            response = self.client.table('sales_data').select('*').eq(
                'shop_id', shop_id
            ).eq(
                'collection_id', collection_id
            ).eq(
                'product_id', product_id
            ).execute()

            if response.data and len(response.data) > 0:
                return response.data[0]
            else:
                # New product - initialize with empty data
                return {
                    'date_added_to_collection': datetime.now(timezone.utc).isoformat(),
                    'sales_first_7_days': 0,
                    'sales_last_3_days': 0,
                    'sales_last_7_days': 0,
                    'sales_last_10_days': 0,
                    'sales_last_14_days': 0
                }

        except Exception as e:
            print(f"Error getting sales data for {product_id}: {e}")
            return {}

    def update_collection_tracking(self, shop_id: str, collection_id: str,
                                   product_id: str, added: datetime = None,
                                   removed: datetime = None):
        """Update tracking data for a product in a collection."""
        try:
            if product_id.startswith('gid://'):
                product_id = product_id.split('/')[-1]

            update_data = {
                'shop_id': shop_id,
                'collection_id': collection_id,
                'product_id': product_id
            }

            if added:
                update_data['date_added_to_collection'] = added.isoformat()
            if removed:
                # Store removal date in metadata or a separate field
                update_data['last_update'] = datetime.now(timezone.utc).isoformat()

            self.client.table('sales_data').upsert(
                update_data,
                on_conflict='shop_id,collection_id,product_id'
            ).execute()

        except Exception as e:
            print(f"Error updating tracking for {product_id}: {e}")

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
            if status in ['completed', 'failed']:
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
