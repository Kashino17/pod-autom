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
                # Only select columns that are guaranteed to exist
                url_prefix = ''
                global_batch_size = 50
                default_board_id = None
                products_per_page = 10

                try:
                    settings_response = self.client.table('pinterest_settings').select(
                        'url_prefix, global_batch_size'
                    ).eq('shop_id', shop_id).execute()

                    if settings_response.data:
                        url_prefix = settings_response.data[0].get('url_prefix') or ''
                        global_batch_size = settings_response.data[0].get('global_batch_size') or 50

                    # Try to get optional columns separately (they may not exist yet)
                    try:
                        optional_response = self.client.table('pinterest_settings').select(
                            'default_board_id, products_per_page'
                        ).eq('shop_id', shop_id).execute()

                        if optional_response.data:
                            default_board_id = optional_response.data[0].get('default_board_id')
                            products_per_page = optional_response.data[0].get('products_per_page') or 10
                    except Exception:
                        # Columns don't exist yet, use defaults
                        pass

                except Exception as e:
                    print(f"  Warning: Could not load pinterest_settings: {e}")

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
                    default_board_id=default_board_id,
                    products_per_page=products_per_page
                )

                shops.append(config)

            return shops

        except Exception as e:
            print(f"Error getting shops with Pinterest: {e}")
            return []

    def get_campaigns_with_assignments(self, shop_id: str) -> List[PinterestCampaign]:
        """Get Pinterest campaigns that have batch assignments for a shop.

        IMPORTANT: Only returns campaigns that have entries in campaign_batch_assignments.
        Campaigns without assignments are NOT returned.
        """
        campaigns = []

        try:
            # CHANGED: Start from campaign_batch_assignments and JOIN to pinterest_campaigns
            # This way we ONLY get campaigns that have assignments
            assignments_response = self.client.table('campaign_batch_assignments').select(
                '''
                id,
                campaign_id,
                shopify_collection_id,
                collection_title,
                batch_indices,
                pinterest_campaigns!inner(
                    id,
                    pinterest_campaign_id,
                    name,
                    status,
                    ad_account_id,
                    daily_budget,
                    shop_id
                )
                '''
            ).execute()

            if not assignments_response.data:
                print(f"  No batch assignments found in campaign_batch_assignments")
                return []

            # Filter by shop_id and group by campaign
            campaign_map = {}  # campaign_id -> {campaign_data, assignments}

            for assignment in assignments_response.data:
                campaign_data = assignment.get('pinterest_campaigns')
                if not campaign_data:
                    continue

                # Filter by shop_id
                if campaign_data.get('shop_id') != shop_id:
                    continue

                campaign_id = campaign_data.get('id')

                # Initialize campaign entry if not exists
                if campaign_id not in campaign_map:
                    campaign_map[campaign_id] = {
                        'campaign_data': campaign_data,
                        'assignments': []
                    }

                # Add assignment
                shopify_collection_id = assignment.get('shopify_collection_id')
                if shopify_collection_id:
                    campaign_map[campaign_id]['assignments'].append({
                        'collection_shopify_id': shopify_collection_id,
                        'collection_title': assignment.get('collection_title', ''),
                        'batch_indices': assignment.get('batch_indices', [])
                    })

            print(f"  Found {len(campaign_map)} campaigns with assignments")

            # Build campaign objects
            for campaign_id, data in campaign_map.items():
                campaign_data = data['campaign_data']

                campaign = PinterestCampaign(
                    id=campaign_id,
                    pinterest_campaign_id=campaign_data.get('pinterest_campaign_id'),
                    name=campaign_data.get('name'),
                    status=campaign_data.get('status', 'ACTIVE'),
                    ad_account_id=campaign_data.get('ad_account_id'),
                    daily_budget=campaign_data.get('daily_budget'),
                    batch_assignments=data['assignments']
                )

                campaigns.append(campaign)

            return campaigns

        except Exception as e:
            print(f"Error getting campaigns with assignments: {e}")
            import traceback
            traceback.print_exc()
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
                        pinterest_board_id: Optional[str], success: bool,
                        error: Optional[str] = None,
                        pinterest_ad_id: Optional[str] = None,
                        pinterest_ad_group_id: Optional[str] = None):
        """Log individual product sync result to pinterest_sync_log table."""
        try:
            data = {
                'shop_id': shop_id,
                'campaign_id': campaign_id,
                'shopify_product_id': shopify_product_id,
                'pinterest_pin_id': pinterest_pin_id,
                'pinterest_board_id': pinterest_board_id,
                'status': 'active' if success else 'failed',
                'success': success,
                'error': error,
                'synced_at': datetime.now(timezone.utc).isoformat()
            }

            # Add ad info if provided (for campaign linking)
            if pinterest_ad_id:
                data['pinterest_ad_id'] = pinterest_ad_id
            if pinterest_ad_group_id:
                data['pinterest_ad_group_id'] = pinterest_ad_group_id

            self.client.table('pinterest_sync_log').upsert(
                data, on_conflict='shop_id,campaign_id,shopify_product_id'
            ).execute()
        except Exception as e:
            print(f"    [WARNING] Failed to log sync result: {e}")

    def is_product_already_synced(self, shop_id: str, campaign_id: str,
                                   shopify_product_id: str) -> bool:
        """Check if a product has already been synced to this campaign."""
        try:
            result = self.client.table('pinterest_sync_log').select(
                'id, status'
            ).eq('shop_id', shop_id).eq(
                'campaign_id', campaign_id
            ).eq('shopify_product_id', shopify_product_id).eq(
                'status', 'active'
            ).execute()

            return len(result.data) > 0
        except Exception as e:
            print(f"    [WARNING] Failed to check sync status: {e}")
            return False

    def get_synced_products_for_campaign(self, shop_id: str, campaign_id: str) -> List[Dict]:
        """Get all synced products for a campaign."""
        try:
            result = self.client.table('pinterest_sync_log').select(
                'id, shopify_product_id, pinterest_pin_id, pinterest_board_id, status, synced_at'
            ).eq('shop_id', shop_id).eq('campaign_id', campaign_id).execute()

            return result.data or []
        except Exception as e:
            print(f"Error getting synced products: {e}")
            return []

    def mark_pin_as_replaced(self, shop_id: str, campaign_id: str,
                              shopify_product_id: str) -> Optional[str]:
        """Mark a pin as replaced and return the pinterest_pin_id for deactivation."""
        try:
            # First get the pin ID
            result = self.client.table('pinterest_sync_log').select(
                'pinterest_pin_id'
            ).eq('shop_id', shop_id).eq(
                'campaign_id', campaign_id
            ).eq('shopify_product_id', shopify_product_id).eq(
                'status', 'active'
            ).execute()

            if not result.data:
                return None

            pin_id = result.data[0].get('pinterest_pin_id')

            # Update status to replaced
            self.client.table('pinterest_sync_log').update({
                'status': 'replaced',
                'replaced_at': datetime.now(timezone.utc).isoformat()
            }).eq('shop_id', shop_id).eq(
                'campaign_id', campaign_id
            ).eq('shopify_product_id', shopify_product_id).execute()

            return pin_id
        except Exception as e:
            print(f"Error marking pin as replaced: {e}")
            return None

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

    def get_active_syncs_for_campaign(self, shop_id: str, campaign_id: str) -> List[Dict]:
        """Get all active synced products for a campaign.

        Returns products that have status='active' - these are the products
        currently advertised on Pinterest for this campaign.
        """
        try:
            result = self.client.table('pinterest_sync_log').select(
                'shopify_product_id, pinterest_ad_id, pinterest_pin_id'
            ).eq('shop_id', shop_id).eq(
                'campaign_id', campaign_id
            ).eq('status', 'active').execute()

            return result.data or []
        except Exception as e:
            print(f"Error getting active syncs for campaign: {e}")
            return []

    def mark_sync_as_paused(self, shop_id: str, campaign_id: str,
                            shopify_product_id: str) -> bool:
        """Mark a sync record as paused.

        Called when a product is removed from the campaign batches
        (replaced by replace_job) and its Pinterest ad should be paused.
        """
        try:
            self.client.table('pinterest_sync_log').update({
                'status': 'paused',
                'paused_at': datetime.now(timezone.utc).isoformat()
            }).eq('shop_id', shop_id).eq(
                'campaign_id', campaign_id
            ).eq('shopify_product_id', shopify_product_id).execute()

            return True
        except Exception as e:
            print(f"Error marking sync as paused: {e}")
            return False

    def sync_campaign_status_from_pinterest(self, shop_id: str,
                                             pinterest_campaigns: List[Dict]) -> int:
        """Sync campaign status from Pinterest API to our database.

        This ensures we use the current status from Pinterest, not stale data.
        Updates existing campaigns and optionally creates new ones.

        Args:
            shop_id: The shop UUID
            pinterest_campaigns: List of campaigns from Pinterest API

        Returns:
            Number of campaigns updated
        """
        updated_count = 0

        try:
            for p_campaign in pinterest_campaigns:
                pinterest_campaign_id = p_campaign.get('id')
                status = p_campaign.get('status', 'ACTIVE')
                name = p_campaign.get('name', '')

                if not pinterest_campaign_id:
                    continue

                # Try to update existing campaign
                try:
                    result = self.client.table('pinterest_campaigns').update({
                        'status': status,
                        'name': name,
                        'synced_at': datetime.now(timezone.utc).isoformat()
                    }).eq('shop_id', shop_id).eq(
                        'pinterest_campaign_id', pinterest_campaign_id
                    ).execute()

                    if result.data:
                        updated_count += 1
                except Exception as e:
                    # Campaign might not exist in our DB yet, that's OK
                    pass

            return updated_count

        except Exception as e:
            print(f"Error syncing campaign status from Pinterest: {e}")
            return 0
