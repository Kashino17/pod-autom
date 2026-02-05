"""
Supabase Service for Winner Scaling Job
Handles all database operations
"""
import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from supabase import create_client, Client

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import (
    WinnerScalingSettings, ShopConfig, ProductSalesData,
    WinnerProduct, WinnerCampaign, LogEntry, PinterestSettings
)


class SupabaseService:
    """Database service for winner scaling operations."""

    def __init__(self):
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

        self.client: Client = create_client(supabase_url, supabase_key)

    def get_shops_with_winner_scaling_enabled(self) -> List[ShopConfig]:
        """Get all shops that have winner scaling enabled."""
        # First get shops with winner scaling enabled
        settings_result = self.client.table('winner_scaling_settings').select(
            'shop_id'
        ).eq('is_enabled', True).execute()

        if not settings_result.data:
            return []

        shop_ids = [s['shop_id'] for s in settings_result.data]

        # Get shop details including Shopify access token
        shops_result = self.client.table('shops').select(
            'id, internal_name, shop_domain, access_token'
        ).in_('id', shop_ids).execute()

        if not shops_result.data:
            return []

        # Get Pinterest credentials from pinterest_auth table
        pinterest_result = self.client.table('pinterest_auth').select(
            'shop_id, access_token, refresh_token'
        ).in_('shop_id', shop_ids).eq('is_connected', True).execute()

        # Get Pinterest ad accounts
        ad_accounts_result = self.client.table('pinterest_ad_accounts').select(
            'shop_id, pinterest_account_id'
        ).in_('shop_id', shop_ids).eq('is_selected', True).execute()

        # Get Pinterest settings
        pinterest_settings_result = self.client.table('pinterest_settings').select(
            'shop_id, url_prefix, default_board_id, products_per_page'
        ).in_('shop_id', shop_ids).execute()

        # Build lookup maps
        pinterest_by_shop = {p['shop_id']: p for p in pinterest_result.data or []}
        ad_account_by_shop = {a['shop_id']: a for a in ad_accounts_result.data or []}
        pinterest_settings_by_shop = {p['shop_id']: p for p in pinterest_settings_result.data or []}

        shops = []
        for s in shops_result.data:
            shop_id = s['id']
            pinterest = pinterest_by_shop.get(shop_id)
            ad_account = ad_account_by_shop.get(shop_id)
            p_settings = pinterest_settings_by_shop.get(shop_id)

            # Only include shops with both Pinterest auth and selected ad account
            if pinterest and pinterest.get('access_token') and ad_account:
                # Build PinterestSettings if available
                pinterest_settings = None
                if p_settings:
                    pinterest_settings = PinterestSettings(
                        url_prefix=p_settings.get('url_prefix') or '',
                        default_board_id=p_settings.get('default_board_id'),
                        products_per_page=p_settings.get('products_per_page') or 10
                    )

                shops.append(ShopConfig(
                    shop_id=shop_id,
                    internal_name=s['internal_name'],
                    shop_domain=s['shop_domain'],
                    pinterest_access_token=pinterest['access_token'],
                    pinterest_refresh_token=pinterest.get('refresh_token'),
                    pinterest_account_id=ad_account['pinterest_account_id'],
                    shopify_access_token=s.get('access_token'),
                    pinterest_settings=pinterest_settings,
                    shop_type='reboss'
                ))

        return shops

    def get_pod_autom_shops_with_winner_scaling(self) -> List[ShopConfig]:
        """Get POD AutoM shops that have winner scaling enabled."""
        shops = []

        try:
            # Get POD AutoM shops that are connected
            shops_response = self.client.table('pod_autom_shops').select(
                'id, internal_name, shop_domain, access_token'
            ).eq('connection_status', 'connected').execute()

            if not shops_response.data:
                print("No active POD AutoM shops found")
                return []

            for shop_data in shops_response.data:
                shop_id = shop_data['id']

                if not shop_data.get('access_token'):
                    continue

                # Get POD AutoM settings
                settings_response = self.client.table('pod_autom_settings').select('*').eq(
                    'shop_id', shop_id
                ).execute()

                if not settings_response.data:
                    continue

                settings = settings_response.data[0]

                # Check if winner scaling is enabled for this POD shop
                if not settings.get('winner_scaling_enabled', False):
                    continue

                # Check if Pinterest is configured
                pinterest_access_token = settings.get('pinterest_access_token')
                pinterest_account_id = settings.get('pinterest_account_id')

                if not pinterest_access_token or not pinterest_account_id:
                    print(f"  POD Shop {shop_data.get('internal_name')} missing Pinterest config for winner scaling")
                    continue

                # Build Pinterest settings
                pinterest_settings = PinterestSettings(
                    url_prefix=settings.get('url_prefix', ''),
                    default_board_id=settings.get('default_board_id'),
                    products_per_page=settings.get('products_per_page', 10)
                )

                shops.append(ShopConfig(
                    shop_id=shop_id,
                    internal_name=shop_data.get('internal_name', 'POD Shop'),
                    shop_domain=shop_data.get('shop_domain', ''),
                    pinterest_access_token=pinterest_access_token,
                    pinterest_refresh_token=settings.get('pinterest_refresh_token'),
                    pinterest_account_id=pinterest_account_id,
                    shopify_access_token=shop_data.get('access_token'),
                    pinterest_settings=pinterest_settings,
                    shop_type='pod_autom',
                    settings_id=settings.get('id')
                ))

            return shops

        except Exception as e:
            print(f"Error getting POD AutoM shops with winner scaling: {e}")
            return []

    def get_winner_scaling_settings(self, shop_id: str) -> Optional[WinnerScalingSettings]:
        """Get winner scaling settings for a shop."""
        result = self.client.table('winner_scaling_settings').select('*').eq(
            'shop_id', shop_id
        ).single().execute()

        if not result.data:
            return None

        d = result.data
        return WinnerScalingSettings(
            shop_id=d['shop_id'],
            is_enabled=d.get('is_enabled', False),
            sales_threshold_3d=d.get('sales_threshold_3d', 5),
            sales_threshold_7d=d.get('sales_threshold_7d', 10),
            sales_threshold_10d=d.get('sales_threshold_10d', 15),
            sales_threshold_14d=d.get('sales_threshold_14d', 20),
            min_buckets_required=d.get('min_buckets_required', 3),
            max_campaigns_per_winner=d.get('max_campaigns_per_winner', 4),
            # AI Creative Settings - Video (Veo 3.1)
            video_enabled=d.get('video_enabled', True),
            max_campaigns_per_winner_video=d.get('max_campaigns_per_winner_video', 2),
            video_count=d.get('video_count', 2),
            campaigns_per_video=d.get('campaigns_per_video', 1),
            # AI Creative Settings - Image (GPT-Image)
            image_enabled=d.get('image_enabled', True),
            max_campaigns_per_winner_image=d.get('max_campaigns_per_winner_image', 4),
            image_count=d.get('image_count', 4),
            campaigns_per_image=d.get('campaigns_per_image', 2),
            # Custom prompts
            video_prompt=d.get('video_prompt'),
            image_prompt=d.get('image_prompt'),
            link_to_product=d.get('link_to_product', True),
            link_to_collection=d.get('link_to_collection', True),
            daily_budget_per_campaign=float(d.get('daily_budget_per_campaign', 10)),
            pinterest_enabled=d.get('pinterest_enabled', True),
            meta_enabled=d.get('meta_enabled', False),
            google_enabled=d.get('google_enabled', False)
        )

    def get_products_with_sales(self, shop_id: str) -> List[ProductSalesData]:
        """
        Get products with their sales data from product_sales table.
        The product_sales table has pre-aggregated rolling sales buckets.
        Also enriches with product/collection handles from pinterest_sync_log.
        """
        # Query the product_sales table which has pre-computed rolling sales
        result = self.client.table('product_sales').select(
            'product_id, collection_id, product_title, '
            'sales_last_3_days, sales_last_7_days, sales_last_10_days, sales_last_14_days'
        ).eq('shop_id', shop_id).execute()

        if not result.data:
            return []

        # Get campaign info from pinterest_sync_log for each product
        # Note: pinterest_sync_log only has: shopify_product_id, campaign_id, pinterest_ad_group_id
        # Handles and position must come from other sources
        product_ids = [row['product_id'] for row in result.data]
        sync_log_result = self.client.table('pinterest_sync_log').select(
            'shopify_product_id, campaign_id, pinterest_ad_group_id'
        ).eq('shop_id', shop_id).in_(
            'shopify_product_id', product_ids
        ).eq('status', 'active').execute()

        # Build lookup map keyed by product_id
        sync_log_by_product = {}
        for s in sync_log_result.data or []:
            product_id = s['shopify_product_id']
            if product_id not in sync_log_by_product:
                sync_log_by_product[product_id] = s

        products = []
        for row in result.data:
            # Only include products that have at least some sales
            if (row.get('sales_last_3_days', 0) > 0 or
                row.get('sales_last_7_days', 0) > 0 or
                row.get('sales_last_10_days', 0) > 0 or
                row.get('sales_last_14_days', 0) > 0):

                # Get sync log data for campaign info
                sync_data = sync_log_by_product.get(row['product_id'], {})

                # For now, use product_id as handle (will need Shopify API for real handles)
                # Format: product_id is typically numeric, handle would be the URL slug
                product_handle = row['product_id']
                collection_handle = row['collection_id']

                products.append(ProductSalesData(
                    product_id=row['product_id'],
                    collection_id=row['collection_id'],
                    product_title=row.get('product_title', ''),
                    product_handle=product_handle,
                    collection_handle=collection_handle,
                    shopify_image_url=None,
                    original_campaign_id=sync_data.get('campaign_id'),
                    sales_3d=row.get('sales_last_3_days', 0) or 0,
                    sales_7d=row.get('sales_last_7_days', 0) or 0,
                    sales_10d=row.get('sales_last_10_days', 0) or 0,
                    sales_14d=row.get('sales_last_14_days', 0) or 0,
                    position_in_collection=0
                ))

        return products

    def get_existing_winners(self, shop_id: str) -> Dict[str, WinnerProduct]:
        """Get all existing winner products for a shop, keyed by product_id_collection_id."""
        result = self.client.table('winner_products').select('*').eq(
            'shop_id', shop_id
        ).execute()

        winners = {}
        for w in result.data or []:
            key = f"{w['product_id']}_{w['collection_id']}"
            winners[key] = WinnerProduct(
                id=w['id'],
                shop_id=w['shop_id'],
                product_id=w['product_id'],
                collection_id=w['collection_id'],
                product_title=w.get('product_title', ''),
                product_handle=w.get('product_handle'),
                collection_handle=w.get('collection_handle'),
                shopify_image_url=w.get('shopify_image_url'),
                identified_at=w.get('identified_at'),
                is_active=w.get('is_active', True),
                sales_3d=w.get('sales_3d', 0),
                sales_7d=w.get('sales_7d', 0),
                sales_10d=w.get('sales_10d', 0),
                sales_14d=w.get('sales_14d', 0),
                buckets_passed=w.get('buckets_passed', 0),
                original_campaign_id=w.get('original_campaign_id')
            )
        return winners

    def insert_winner_product(self, shop_id: str, product: ProductSalesData, buckets_passed: int) -> str:
        """Insert a new winner product and return its ID."""
        result = self.client.table('winner_products').insert({
            'shop_id': shop_id,
            'product_id': product.product_id,
            'collection_id': product.collection_id,
            'product_title': product.product_title,
            'product_handle': product.product_handle,
            'collection_handle': product.collection_handle,
            'shopify_image_url': product.shopify_image_url,
            'is_active': True,
            'sales_3d': product.sales_3d,
            'sales_7d': product.sales_7d,
            'sales_10d': product.sales_10d,
            'sales_14d': product.sales_14d,
            'buckets_passed': buckets_passed,
            'original_campaign_id': product.original_campaign_id
        }).execute()

        return result.data[0]['id']

    def update_winner_product_sales(self, winner_id: str, product: ProductSalesData, buckets_passed: int):
        """Update sales snapshot for an existing winner."""
        self.client.table('winner_products').update({
            'sales_3d': product.sales_3d,
            'sales_7d': product.sales_7d,
            'sales_10d': product.sales_10d,
            'sales_14d': product.sales_14d,
            'buckets_passed': buckets_passed
        }).eq('id', winner_id).execute()

    def winner_exists(self, winner_id: str) -> bool:
        """Check if a winner product exists in the database."""
        result = self.client.table('winner_products').select(
            'id', count='exact'
        ).eq('id', winner_id).execute()
        return (result.count or 0) > 0

    def get_active_campaigns_for_winner(self, winner_id: str) -> int:
        """Get count of active campaigns for a winner product."""
        result = self.client.table('winner_campaigns').select(
            'id', count='exact'
        ).eq('winner_product_id', winner_id).eq('status', 'ACTIVE').execute()

        return result.count or 0

    def get_active_campaigns_for_winner_by_type(self, winner_id: str) -> Dict[str, int]:
        """
        Get count of active campaigns for a winner product, separated by creative type.

        Returns:
            Dict with 'video' and 'image' counts
        """
        result = self.client.table('winner_campaigns').select(
            'creative_type'
        ).eq('winner_product_id', winner_id).eq('status', 'ACTIVE').execute()

        counts = {'video': 0, 'image': 0}
        for campaign in result.data or []:
            creative_type = campaign.get('creative_type', '').lower()
            if creative_type in counts:
                counts[creative_type] += 1

        return counts

    def get_winner_campaigns(self, winner_id: str) -> List[Dict[str, Any]]:
        """
        Get all campaigns for a winner product.

        Returns:
            List of campaign dicts with id, pinterest_campaign_id, status, creative_type
        """
        result = self.client.table('winner_campaigns').select(
            'id, pinterest_campaign_id, pinterest_ad_group_id, status, creative_type, campaign_name'
        ).eq('winner_product_id', winner_id).execute()

        return result.data or []

    def update_campaign_status(self, campaign_id: str, new_status: str):
        """
        Update the status of a winner campaign in the database.

        Args:
            campaign_id: Our internal campaign UUID
            new_status: New status ('ACTIVE', 'PAUSED', 'ARCHIVED', etc.)
        """
        self.client.table('winner_campaigns').update({
            'status': new_status
        }).eq('id', campaign_id).execute()

    def insert_winner_campaign(self, campaign: WinnerCampaign) -> str:
        """Insert a new winner campaign and return its ID.

        Also inserts into pinterest_campaigns table with campaign_type='winner_campaign'
        so it can be managed by the Campaign Optimization Job.
        """
        result = self.client.table('winner_campaigns').insert({
            'shop_id': campaign.shop_id,
            'winner_product_id': campaign.winner_product_id,
            'pinterest_campaign_id': campaign.pinterest_campaign_id,
            'pinterest_ad_group_id': campaign.pinterest_ad_group_id,
            'campaign_name': campaign.campaign_name,
            'creative_type': campaign.creative_type,
            'creative_count': campaign.creative_count,
            'link_type': campaign.link_type,
            'status': campaign.status,
            'generated_assets': [
                {'url': a.url, 'type': a.creative_type, 'pin_id': a.pin_id}
                for a in campaign.generated_assets
            ] if campaign.generated_assets else None
        }).execute()

        winner_campaign_id = result.data[0]['id']

        # Also insert into pinterest_campaigns for Campaign Optimization Job
        # Get the ad_account_uuid from pinterest_ad_accounts
        try:
            ad_account_result = self.client.table('pinterest_ad_accounts').select(
                'id'
            ).eq('shop_id', campaign.shop_id).eq('is_selected', True).single().execute()

            if ad_account_result.data:
                ad_account_uuid = ad_account_result.data['id']

                # Insert/update in pinterest_campaigns with campaign_type='winner_campaign'
                self.client.table('pinterest_campaigns').upsert({
                    'shop_id': campaign.shop_id,
                    'pinterest_campaign_id': campaign.pinterest_campaign_id,
                    'ad_account_id': ad_account_uuid,
                    'name': campaign.campaign_name,
                    'status': campaign.status,
                    'daily_budget': campaign.daily_budget,
                    'campaign_type': 'winner_campaign'
                }, on_conflict='shop_id,pinterest_campaign_id').execute()

        except Exception as e:
            print(f"Warning: Could not insert winner campaign into pinterest_campaigns: {e}")

        return winner_campaign_id

    def log_action(self, entry: LogEntry):
        """Log an action to the winner_scaling_log table."""
        # shop_id must be a valid UUID or None (for system-level logs)
        shop_id = entry.shop_id if entry.shop_id and entry.shop_id != 'system' else None

        self.client.table('winner_scaling_log').insert({
            'shop_id': shop_id,
            'winner_product_id': entry.winner_product_id,
            'action_type': entry.action_type,
            'details': entry.details
        }).execute()

    def log_job_run(self, job_type: str, status: str, metadata: Dict = None) -> str:
        """Log a job run start."""
        result = self.client.table('job_runs').insert({
            'job_type': job_type,
            'status': status,
            'metadata': metadata or {}
        }).execute()
        return result.data[0]['id']

    def update_job_run(
        self,
        job_id: str,
        status: str,
        shops_processed: int = 0,
        shops_failed: int = 0,
        error_log: List[Dict] = None,
        metadata: Dict = None
    ):
        """Update a job run with final status."""
        update_data = {
            'status': status,
            'shops_processed': shops_processed,
            'shops_failed': shops_failed,
            'completed_at': datetime.now(timezone.utc).isoformat()
        }
        if error_log:
            update_data['error_log'] = error_log
        if metadata:
            update_data['metadata'] = metadata

        self.client.table('job_runs').update(update_data).eq('id', job_id).execute()

    def get_original_pinterest_campaign_for_product(
        self,
        shop_id: str,
        shopify_product_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Find the original Pinterest campaign that contains this product.
        Uses pinterest_sync_log to find campaign_id, then pinterest_campaigns for details.

        Returns dict with:
            - pinterest_campaign_id: The Pinterest API campaign ID
            - pinterest_ad_group_id: The Pinterest API ad group ID
            - campaign_uuid: Our internal campaign UUID
        """
        # First, find the campaign from pinterest_sync_log
        sync_result = self.client.table('pinterest_sync_log').select(
            'campaign_id, pinterest_ad_group_id'
        ).eq('shop_id', shop_id).eq(
            'shopify_product_id', shopify_product_id
        ).eq('status', 'active').order(
            'synced_at', desc=True
        ).limit(1).execute()

        if not sync_result.data or not sync_result.data[0].get('campaign_id'):
            return None

        campaign_uuid = sync_result.data[0]['campaign_id']
        pinterest_ad_group_id = sync_result.data[0].get('pinterest_ad_group_id')

        # Now get the Pinterest campaign ID from pinterest_campaigns table
        campaign_result = self.client.table('pinterest_campaigns').select(
            'pinterest_campaign_id'
        ).eq('id', campaign_uuid).single().execute()

        if not campaign_result.data:
            return None

        return {
            'pinterest_campaign_id': campaign_result.data['pinterest_campaign_id'],
            'pinterest_ad_group_id': pinterest_ad_group_id,
            'campaign_uuid': campaign_uuid
        }
