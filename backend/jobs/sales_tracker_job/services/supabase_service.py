"""
Supabase Service for Sales Tracker Job
Handles shop configurations, collection assignments, and sales data storage
"""
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
from supabase import create_client, Client

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Shop, CollectionAssignment, SalesData


class SupabaseService:
    """Supabase client for Sales Tracker Job."""

    def __init__(self):
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_KEY')

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.client: Client = create_client(url, key)

    def get_shops_with_assignments(self) -> List[Tuple[Shop, List[CollectionAssignment]]]:
        """Get all shops that have active campaign batch assignments."""
        shops_with_assignments = []

        try:
            # Get all unique shops from campaign_batch_assignments
            assignments_response = self.client.table('campaign_batch_assignments').select(
                'id, campaign_id, shopify_collection_id, collection_title, batch_indices, assigned_shop, ad_channel'
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

            # Get shop details for each shop
            for shop_id, assignments in shop_assignments.items():
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

                shop = Shop(
                    id=shop_id,
                    internal_name=shop_data.get('internal_name', ''),
                    shop_domain=shop_data.get('shop_domain', ''),
                    access_token=shop_data.get('access_token', '')
                )

                # Convert assignments to CollectionAssignment objects
                collection_assignments = []
                for a in assignments:
                    collection_assignments.append(CollectionAssignment(
                        id=a.get('id'),
                        campaign_id=a.get('campaign_id'),
                        shopify_collection_id=a.get('shopify_collection_id'),
                        collection_title=a.get('collection_title', ''),
                        batch_indices=a.get('batch_indices', []),
                        assigned_shop=a.get('assigned_shop', ''),
                        ad_channel=a.get('ad_channel', 'pinterest')
                    ))

                shops_with_assignments.append((shop, collection_assignments))

            return shops_with_assignments

        except Exception as e:
            print(f"Error getting shops with assignments: {e}")
            return []

    def get_unique_collections(self, assignments: List[CollectionAssignment]) -> List[str]:
        """Get unique collection IDs from assignments."""
        collection_ids = set()
        for assignment in assignments:
            collection_ids.add(assignment.shopify_collection_id)
        return list(collection_ids)

    def get_sales_data(self, shop_id: str, collection_id: str, product_id: str) -> Optional[SalesData]:
        """Get existing sales data for a product."""
        try:
            result = self.client.table('product_sales').select('*').eq(
                'shop_id', shop_id
            ).eq('collection_id', collection_id).eq('product_id', product_id).execute()

            if result.data and len(result.data) > 0:
                data = result.data[0]
                return SalesData(
                    product_id=data.get('product_id'),
                    product_title=data.get('product_title', ''),
                    total_sales=float(data.get('total_sales', 0)),
                    total_quantity=int(data.get('total_quantity', 0)),
                    sales_first_7_days=int(data.get('sales_first_7_days', 0)),
                    sales_last_3_days=int(data.get('sales_last_3_days', 0)),
                    sales_last_7_days=int(data.get('sales_last_7_days', 0)),
                    sales_last_10_days=int(data.get('sales_last_10_days', 0)),
                    sales_last_14_days=int(data.get('sales_last_14_days', 0)),
                    last_update=datetime.fromisoformat(data.get('last_update').replace('Z', '+00:00')) if data.get('last_update') else None,
                    date_added_to_collection=datetime.fromisoformat(data.get('date_added_to_collection').replace('Z', '+00:00')) if data.get('date_added_to_collection') else None
                )
            return None
        except Exception as e:
            print(f"Error getting sales data: {e}")
            return None

    def save_sales_data(self, shop_id: str, collection_id: str, sales_data: SalesData):
        """Save or update sales data for a product."""
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
                'last_update': datetime.now(timezone.utc).isoformat()
            }

            if sales_data.date_added_to_collection:
                data['date_added_to_collection'] = sales_data.date_added_to_collection.isoformat()

            self.client.table('product_sales').upsert(
                data, on_conflict='shop_id,collection_id,product_id'
            ).execute()

        except Exception as e:
            print(f"Error saving sales data: {e}")

    def log_job_run(self, job_type: str, status: str, metadata: Dict = None) -> Optional[str]:
        """Log job run start."""
        try:
            result = self.client.table('job_runs').insert({
                'job_type': job_type,
                'status': status,
                'started_at': datetime.now(timezone.utc).isoformat(),
                'metadata': metadata or {}
            }).execute()

            if result.data:
                return result.data[0].get('id')
            return None
        except Exception as e:
            print(f"Error logging job run: {e}")
            return None

    def update_job_run(self, job_id: str, status: str,
                       shops_processed: int = 0, shops_failed: int = 0,
                       error_log: List[Dict] = None, metadata: Dict = None):
        """Update job run status."""
        try:
            update_data = {
                'status': status,
                'completed_at': datetime.now(timezone.utc).isoformat(),
                'shops_processed': shops_processed,
                'shops_failed': shops_failed
            }

            if error_log:
                update_data['error_log'] = error_log

            if metadata:
                update_data['metadata'] = metadata

            self.client.table('job_runs').update(update_data).eq('id', job_id).execute()
        except Exception as e:
            print(f"Error updating job run: {e}")
