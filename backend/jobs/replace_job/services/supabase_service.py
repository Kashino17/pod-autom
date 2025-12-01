"""
Supabase Service for Replace Job - Database operations
Updated to work with new ReBoss NextGen schema:
- shop_rules table for phase configuration
- product_sales table for sales data
- campaign_batch_assignments for collection tracking
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
        """
        Get all shops with campaign batch assignments.
        Uses the new schema with shop_rules table.
        """
        configs = []

        try:
            # Get shops with active campaign assignments
            assignments_response = self.client.table('campaign_batch_assignments').select(
                'id, campaign_id, shopify_collection_id, collection_title, batch_indices, assigned_shop'
            ).not_.is_('assigned_shop', 'null').execute()

            if not assignments_response.data:
                print("No campaign batch assignments found")
                return []

            # Group assignments by shop
            shop_assignments: Dict[str, List[dict]] = {}
            for assignment in assignments_response.data:
                shop_id = assignment.get('assigned_shop')
                if shop_id:
                    if shop_id not in shop_assignments:
                        shop_assignments[shop_id] = []
                    shop_assignments[shop_id].append(assignment)

            print(f"Found {len(shop_assignments)} shops with assignments")

            # Get shop details and rules for each shop
            for shop_id, assignments in shop_assignments.items():
                try:
                    # Get shop details
                    shop_response = self.client.table('shops').select(
                        'id, internal_name, shop_domain, access_token, is_active'
                    ).eq('id', shop_id).single().execute()

                    if not shop_response.data or not shop_response.data.get('is_active'):
                        print(f"  Shop {shop_id} not found or inactive, skipping")
                        continue

                    shop_data = shop_response.data
                    if not shop_data.get('access_token'):
                        print(f"  Shop {shop_data.get('internal_name')} has no Shopify access token")
                        continue

                    # Get shop rules
                    rules_response = self.client.table('shop_rules').select('*').eq(
                        'shop_id', shop_id
                    ).single().execute()

                    rules_data = rules_response.data if rules_response.data else {}

                    # Build initial phase rules from shop_rules
                    initial_phase_rules = {
                        'min_sales_day7_delete': rules_data.get('start_phase_replace_threshold', 0),
                        'min_sales_day7_replace': rules_data.get('start_phase_keep_threshold', 1)
                    }

                    # Build post phase rules from shop_rules
                    post_phase_rules = {
                        'avg3_ok': rules_data.get('avg3_ok', 2),
                        'avg7_ok': rules_data.get('avg7_ok', 3),
                        'avg10_ok': rules_data.get('avg10_ok', 4),
                        'avg14_ok': rules_data.get('avg14_ok', 6),
                        'min_ok_thresholds': rules_data.get('min_ok_buckets', 2)
                    }

                    # Convert assignments to collection format
                    selected_collections = []
                    for a in assignments:
                        selected_collections.append({
                            'id': a.get('shopify_collection_id'),
                            'title': a.get('collection_title', '')
                        })

                    config = ShopConfig(
                        shop_id=shop_id,
                        shop_domain=shop_data.get('shop_domain'),
                        access_token=shop_data.get('access_token'),
                        test_mode=rules_data.get('test_mode', False),
                        qk_tag=rules_data.get('qk_tag', 'QK'),
                        replace_tag_prefix=rules_data.get('replace_tag_prefix', 'replaced_'),
                        start_phase_days=rules_data.get('start_phase_days', 7),
                        nach_phase_days=rules_data.get('nach_phase_days', 14),
                        initial_phase_rules=initial_phase_rules,
                        post_phase_rules=post_phase_rules,
                        selected_collections=selected_collections,
                        maintain_positions=True,  # Always maintain positions
                        loser_threshold=rules_data.get('loser_threshold', 5)  # Products with total_sales <= this get LOSER tag
                    )

                    configs.append(config)
                    print(f"  Shop {shop_data.get('internal_name')}: {len(selected_collections)} collections")

                except Exception as e:
                    print(f"Error loading config for shop {shop_id}: {e}")
                    continue

        except Exception as e:
            print(f"Error loading shop configs: {e}")
            raise

        return configs

    def get_sales_data(self, shop_id: str, collection_id: str, product_id: str) -> Dict:
        """
        Get sales data for a product from product_sales table.
        This table is populated by the sales_tracker_job.
        """
        try:
            # Clean product ID
            if product_id.startswith('gid://'):
                product_id = product_id.split('/')[-1]

            response = self.client.table('product_sales').select('*').eq(
                'shop_id', shop_id
            ).eq(
                'collection_id', collection_id
            ).eq(
                'product_id', product_id
            ).execute()

            if response.data and len(response.data) > 0:
                return response.data[0]
            else:
                # New product - return empty data (will be picked up by sales_tracker_job)
                return {
                    'date_added_to_collection': None,
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
                # Store removal date in last_update field
                update_data['last_update'] = datetime.now(timezone.utc).isoformat()

            self.client.table('product_sales').upsert(
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
                'metadata': metadata or {},
                'started_at': datetime.now(timezone.utc).isoformat()
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
            if status in ['completed', 'completed_with_errors', 'failed']:
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
