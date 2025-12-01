"""
Supabase Service for Pinterest Sync Job
Handles shop configurations, Pinterest auth, and campaign assignments
"""
import os
from typing import Dict, List, Optional
from datetime import datetime, timezone
from supabase import create_client, Client

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ShopPinterestConfig, PinterestCampaign


class SupabaseService:
    """Supabase client for Pinterest Sync Job."""

    def __init__(self):
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_KEY')

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.client: Client = create_client(url, key)

    def get_shops_with_pinterest(self) -> List[ShopPinterestConfig]:
        """Get all shops with active Pinterest connection."""
        shops = []

        try:
            # Get shops with active Pinterest auth
            query = """
            SELECT
                s.id as shop_id,
                s.internal_name,
                s.shop_domain,
                s.access_token,
                pa.access_token as pinterest_access_token,
                pa.refresh_token as pinterest_refresh_token,
                pa.expires_at as pinterest_expires_at,
                pa.pinterest_user_id,
                paa.pinterest_account_id,
                ps.url_prefix,
                ps.global_batch_size
            FROM shops s
            INNER JOIN pinterest_auth pa ON s.id = pa.shop_id
            LEFT JOIN pinterest_ad_accounts paa ON s.id = paa.shop_id AND paa.is_selected = true
            LEFT JOIN pinterest_settings ps ON s.id = ps.shop_id
            WHERE s.is_active = true
              AND pa.is_connected = true
              AND pa.access_token IS NOT NULL
            """

            # Use simple queries since RPC might not exist
            # Get shops with Pinterest auth
            auth_response = self.client.table('pinterest_auth').select(
                'shop_id, access_token, refresh_token, expires_at, pinterest_user_id'
            ).eq('is_connected', True).not_.is_('access_token', 'null').execute()

            if not auth_response.data:
                print("No shops with Pinterest connected")
                return []

            for auth in auth_response.data:
                shop_id = auth['shop_id']

                # Get shop details
                shop_response = self.client.table('shops').select(
                    'id, internal_name, shop_domain, access_token, is_active'
                ).eq('id', shop_id).single().execute()

                if not shop_response.data or not shop_response.data.get('is_active'):
                    continue

                shop = shop_response.data

                if not shop.get('access_token'):
                    print(f"  Shop {shop.get('internal_name')} has no Shopify access token")
                    continue

                # Get selected ad account
                ad_account_response = self.client.table('pinterest_ad_accounts').select(
                    'pinterest_account_id'
                ).eq('shop_id', shop_id).eq('is_selected', True).execute()

                pinterest_account_id = None
                if ad_account_response.data:
                    pinterest_account_id = ad_account_response.data[0].get('pinterest_account_id')

                # Get Pinterest settings
                settings_response = self.client.table('pinterest_settings').select(
                    'url_prefix, global_batch_size, default_board_id'
                ).eq('shop_id', shop_id).execute()

                url_prefix = ''
                global_batch_size = 50
                default_board_id = None
                if settings_response.data:
                    url_prefix = settings_response.data[0].get('url_prefix') or ''
                    global_batch_size = settings_response.data[0].get('global_batch_size') or 50
                    default_board_id = settings_response.data[0].get('default_board_id')

                config = ShopPinterestConfig(
                    shop_id=shop_id,
                    internal_name=shop.get('internal_name', ''),
                    shop_domain=shop.get('shop_domain', ''),
                    access_token=shop.get('access_token', ''),
                    pinterest_access_token=auth.get('access_token', ''),
                    pinterest_refresh_token=auth.get('refresh_token'),
                    pinterest_expires_at=auth.get('expires_at'),
                    pinterest_user_id=auth.get('pinterest_user_id'),
                    pinterest_account_id=pinterest_account_id,
                    url_prefix=url_prefix,
                    global_batch_size=global_batch_size,
                    default_board_id=default_board_id
                )

                shops.append(config)

            return shops

        except Exception as e:
            print(f"Error getting shops with Pinterest: {e}")
            return []

    def get_campaigns_with_assignments(self, shop_id: str) -> List[PinterestCampaign]:
        """Get Pinterest campaigns with batch assignments for a shop."""
        campaigns = []

        try:
            # Get campaigns for shop
            campaign_response = self.client.table('pinterest_campaigns').select(
                'id, pinterest_campaign_id, name, status, ad_account_id, daily_budget'
            ).eq('shop_id', shop_id).execute()

            if not campaign_response.data:
                return []

            for campaign_data in campaign_response.data:
                campaign_id = campaign_data['id']

                # Get batch assignments for this campaign
                assignments_response = self.client.table('campaign_batch_assignments').select(
                    'collection_id, batch_indices'
                ).eq('campaign_id', campaign_id).execute()

                batch_assignments = []
                if assignments_response.data:
                    for assignment in assignments_response.data:
                        collection_id = assignment['collection_id']
                        batch_indices = assignment.get('batch_indices', [])

                        # Get collection info
                        collection_response = self.client.table('shopify_collections').select(
                            'shopify_id, title'
                        ).eq('id', collection_id).single().execute()

                        if collection_response.data:
                            batch_assignments.append({
                                'collection_id': collection_id,
                                'collection_shopify_id': collection_response.data.get('shopify_id'),
                                'collection_title': collection_response.data.get('title'),
                                'batch_indices': batch_indices
                            })

                campaign = PinterestCampaign(
                    id=campaign_id,
                    pinterest_campaign_id=campaign_data.get('pinterest_campaign_id'),
                    name=campaign_data.get('name'),
                    status=campaign_data.get('status', 'ACTIVE'),
                    ad_account_id=campaign_data.get('ad_account_id'),
                    daily_budget=campaign_data.get('daily_budget'),
                    batch_assignments=batch_assignments
                )

                campaigns.append(campaign)

            return campaigns

        except Exception as e:
            print(f"Error getting campaigns: {e}")
            return []

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

    def log_sync_result(self, shop_id: str, campaign_id: str,
                        shopify_product_id: str, pinterest_pin_id: Optional[str],
                        success: bool, error: Optional[str] = None):
        """Log individual product sync result."""
        try:
            self.client.table('pinterest_sync_log').insert({
                'shop_id': shop_id,
                'campaign_id': campaign_id,
                'shopify_product_id': shopify_product_id,
                'pinterest_pin_id': pinterest_pin_id,
                'success': success,
                'error': error,
                'synced_at': datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            # Sync log table might not exist, just print
            print(f"Could not log sync result: {e}")

    def update_pinterest_tokens(self, shop_id: str, access_token: str,
                                 refresh_token: Optional[str], expires_at: Optional[str]):
        """Update Pinterest tokens after refresh."""
        try:
            update_data = {
                'access_token': access_token,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }

            if refresh_token:
                update_data['refresh_token'] = refresh_token

            if expires_at:
                update_data['expires_at'] = expires_at

            self.client.table('pinterest_auth').update(update_data).eq('shop_id', shop_id).execute()

        except Exception as e:
            print(f"Error updating Pinterest tokens: {e}")
