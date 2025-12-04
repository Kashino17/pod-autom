"""
Supabase Service for Winner Scaling Job
Handles all database operations
"""
import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import (
    WinnerScalingSettings, ShopConfig, ProductSalesData,
    WinnerProduct, WinnerCampaign, LogEntry
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

        # Get shop details with Pinterest credentials
        shops_result = self.client.table('shops').select(
            'id, internal_name, shop_domain, pinterest_access_token, pinterest_refresh_token, pinterest_account_id'
        ).in_('id', shop_ids).not_.is_('pinterest_access_token', 'null').execute()

        return [
            ShopConfig(
                shop_id=s['id'],
                internal_name=s['internal_name'],
                shop_domain=s['shop_domain'],
                pinterest_access_token=s['pinterest_access_token'],
                pinterest_refresh_token=s.get('pinterest_refresh_token'),
                pinterest_account_id=s['pinterest_account_id']
            )
            for s in shops_result.data
            if s.get('pinterest_access_token') and s.get('pinterest_account_id')
        ]

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
            video_count=d.get('video_count', 2),
            image_count=d.get('image_count', 4),
            campaigns_per_video=d.get('campaigns_per_video', 1),
            campaigns_per_image=d.get('campaigns_per_image', 2),
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
        Aggregates sales over the last 3, 7, 10, and 14 days.
        """
        now = datetime.now(timezone.utc)

        # Get sales from last 14 days
        start_date = (now - timedelta(days=14)).isoformat()

        result = self.client.table('product_sales').select(
            'product_id, collection_id, product_title, product_handle, '
            'collection_handle, shopify_image_url, quantity, sale_date, '
            'original_campaign_id'
        ).eq('shop_id', shop_id).gte('sale_date', start_date).execute()

        if not result.data:
            return []

        # Aggregate by product+collection
        products: Dict[str, ProductSalesData] = {}

        for sale in result.data:
            key = f"{sale['product_id']}_{sale['collection_id']}"

            if key not in products:
                products[key] = ProductSalesData(
                    product_id=sale['product_id'],
                    collection_id=sale['collection_id'],
                    product_title=sale.get('product_title', ''),
                    product_handle=sale.get('product_handle'),
                    collection_handle=sale.get('collection_handle'),
                    shopify_image_url=sale.get('shopify_image_url'),
                    original_campaign_id=sale.get('original_campaign_id')
                )

            # Calculate days ago
            sale_date = datetime.fromisoformat(sale['sale_date'].replace('Z', '+00:00'))
            days_ago = (now - sale_date).days
            quantity = sale.get('quantity', 1)

            # Add to appropriate buckets
            if days_ago <= 3:
                products[key].sales_3d += quantity
            if days_ago <= 7:
                products[key].sales_7d += quantity
            if days_ago <= 10:
                products[key].sales_10d += quantity
            if days_ago <= 14:
                products[key].sales_14d += quantity

        return list(products.values())

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

    def get_active_campaigns_for_winner(self, winner_id: str) -> int:
        """Get count of active campaigns for a winner product."""
        result = self.client.table('winner_campaigns').select(
            'id', count='exact'
        ).eq('winner_product_id', winner_id).eq('status', 'ACTIVE').execute()

        return result.count or 0

    def insert_winner_campaign(self, campaign: WinnerCampaign) -> str:
        """Insert a new winner campaign and return its ID."""
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

        return result.data[0]['id']

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
