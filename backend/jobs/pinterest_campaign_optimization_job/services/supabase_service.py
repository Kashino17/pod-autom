"""
Supabase Service for Pinterest Campaign Optimization Job
Handles all database operations for Pinterest optimization rules, settings, and logging
"""
import os
from typing import List, Dict, Optional
from datetime import datetime, timezone
from supabase import create_client, Client

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import (
    OptimizationRule, OptimizationSettings, Campaign,
    ShopPinterestConfig, OptimizationResult
)


class SupabaseService:
    """Supabase client for Pinterest Campaign Optimization Job."""

    def __init__(self):
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_KEY')

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.client: Client = create_client(url, key)

    def get_shops_with_optimization_enabled(self) -> List[ShopPinterestConfig]:
        """Get all shops with optimization enabled and valid Pinterest connection."""
        shops = []

        try:
            # Get shops with optimization enabled
            settings_response = self.client.table('pinterest_campaign_optimization_settings').select(
                'shop_id'
            ).eq('is_enabled', True).execute()

            if not settings_response.data:
                print("No shops with optimization enabled")
                return []

            shop_ids = [s['shop_id'] for s in settings_response.data]

            for shop_id in shop_ids:
                try:
                    # Get shop details
                    shop_response = self.client.table('shops').select(
                        'id, internal_name, is_active'
                    ).eq('id', shop_id).single().execute()

                    if not shop_response.data or not shop_response.data.get('is_active'):
                        continue

                    # Get Pinterest auth
                    auth_response = self.client.table('pinterest_auth').select(
                        'access_token, refresh_token'
                    ).eq('shop_id', shop_id).eq('is_connected', True).execute()

                    if not auth_response.data:
                        print(f"  Shop {shop_response.data.get('internal_name')} has no Pinterest connection")
                        continue

                    # Get selected ad account
                    ad_account_response = self.client.table('pinterest_ad_accounts').select(
                        'pinterest_account_id'
                    ).eq('shop_id', shop_id).eq('is_selected', True).execute()

                    if not ad_account_response.data:
                        print(f"  Shop {shop_response.data.get('internal_name')} has no selected ad account")
                        continue

                    config = ShopPinterestConfig(
                        shop_id=shop_id,
                        internal_name=shop_response.data.get('internal_name', ''),
                        pinterest_access_token=auth_response.data[0].get('access_token', ''),
                        pinterest_refresh_token=auth_response.data[0].get('refresh_token'),
                        pinterest_account_id=ad_account_response.data[0].get('pinterest_account_id', '')
                    )

                    shops.append(config)
                    print(f"  Shop {config.internal_name}: optimization enabled")

                except Exception as e:
                    print(f"Error loading shop {shop_id}: {e}")
                    continue

            return shops

        except Exception as e:
            print(f"Error getting shops with optimization: {e}")
            return []

    def get_optimization_settings(self, shop_id: str) -> Optional[OptimizationSettings]:
        """Get optimization settings for a shop."""
        try:
            response = self.client.table('pinterest_campaign_optimization_settings').select(
                '*'
            ).eq('shop_id', shop_id).execute()

            if response.data:
                return OptimizationSettings.from_db_row(response.data[0])

            return None

        except Exception as e:
            print(f"Error getting optimization settings: {e}")
            return None

    def get_optimization_rules(self, shop_id: str) -> List[OptimizationRule]:
        """Get all optimization rules for a shop."""
        rules = []

        try:
            response = self.client.table('pinterest_campaign_optimization_rules').select(
                '*'
            ).eq('shop_id', shop_id).eq('is_enabled', True).order(
                'priority', desc=True
            ).execute()

            if response.data:
                for row in response.data:
                    rules.append(OptimizationRule.from_db_row(row))

            return rules

        except Exception as e:
            print(f"Error getting optimization rules: {e}")
            return []

    def get_active_campaigns(self, shop_id: str) -> List[Campaign]:
        """Get all active Pinterest campaigns for a shop."""
        campaigns = []

        try:
            response = self.client.table('pinterest_campaigns').select(
                'id, pinterest_campaign_id, name, status, daily_budget, ad_account_id, shop_id'
            ).eq('shop_id', shop_id).eq('status', 'ACTIVE').execute()

            if response.data:
                for row in response.data:
                    campaigns.append(Campaign.from_db_row(row))

            return campaigns

        except Exception as e:
            print(f"Error getting campaigns: {e}")
            return []

    def get_campaign_by_id(self, campaign_id: str) -> Optional[Campaign]:
        """Get a specific campaign by internal ID."""
        try:
            response = self.client.table('pinterest_campaigns').select(
                'id, pinterest_campaign_id, name, status, daily_budget, ad_account_id, shop_id'
            ).eq('id', campaign_id).single().execute()

            if response.data:
                return Campaign.from_db_row(response.data)

            return None

        except Exception as e:
            print(f"Error getting campaign {campaign_id}: {e}")
            return None

    def log_optimization_action(
        self,
        shop_id: str,
        campaign_id: str,
        rule_id: str,
        old_budget: float,
        new_budget: float,
        action_taken: str,
        metrics_snapshot: Dict,
        is_test_run: bool = False,
        test_metrics: Dict = None,
        old_status: str = None,
        new_status: str = None,
        error_message: str = None
    ) -> Optional[str]:
        """Log an optimization action."""
        try:
            data = {
                'shop_id': shop_id,
                'campaign_id': campaign_id,
                'rule_id': rule_id,
                'old_budget': old_budget,
                'new_budget': new_budget,
                'action_taken': action_taken,
                'metrics_snapshot': metrics_snapshot,
                'is_test_run': is_test_run,
                'executed_at': datetime.now(timezone.utc).isoformat()
            }

            if test_metrics:
                data['test_metrics'] = test_metrics

            if old_status:
                data['old_status'] = old_status

            if new_status:
                data['new_status'] = new_status

            if error_message:
                data['error_message'] = error_message

            result = self.client.table('pinterest_campaign_optimization_log').insert(data).execute()

            if result.data:
                return result.data[0].get('id')

            return None

        except Exception as e:
            print(f"Error logging optimization action: {e}")
            return None

    def update_campaign_budget_in_db(self, campaign_id: str, new_budget: float) -> bool:
        """Update campaign budget in database after Pinterest update."""
        try:
            self.client.table('pinterest_campaigns').update({
                'daily_budget': new_budget
            }).eq('id', campaign_id).execute()

            return True

        except Exception as e:
            print(f"Error updating campaign budget in DB: {e}")
            return False

    def update_campaign_status_in_db(self, campaign_id: str, new_status: str) -> bool:
        """Update campaign status in database after Pinterest update."""
        try:
            self.client.table('pinterest_campaigns').update({
                'status': new_status
            }).eq('id', campaign_id).execute()

            return True

        except Exception as e:
            print(f"Error updating campaign status in DB: {e}")
            return False

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

    def update_job_run(
        self,
        job_id: str,
        status: str,
        shops_processed: int = 0,
        shops_failed: int = 0,
        error_log: List[Dict] = None,
        metadata: Dict = None
    ):
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

    def update_pinterest_tokens(
        self,
        shop_id: str,
        access_token: str,
        refresh_token: Optional[str],
        expires_at: Optional[str]
    ):
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

    # ===== Pinterest Sync Cleanup Methods =====

    def get_all_synced_campaigns(self, shop_id: str) -> List[Dict]:
        """
        Get all campaigns that were created via Pinterest Sync for a shop.
        These are campaigns in pinterest_campaigns that have entries in pinterest_sync_log.
        """
        try:
            # Get campaigns from pinterest_campaigns table
            response = self.client.table('pinterest_campaigns').select(
                'id, pinterest_campaign_id, name, status, shop_id'
            ).eq('shop_id', shop_id).execute()

            return response.data or []

        except Exception as e:
            print(f"Error getting synced campaigns: {e}")
            return []

    def get_sync_log_entries_for_campaign(self, campaign_id: str) -> List[Dict]:
        """Get all pinterest_sync_log entries for a campaign."""
        try:
            response = self.client.table('pinterest_sync_log').select(
                'id, shopify_product_id, status'
            ).eq('campaign_id', campaign_id).execute()

            return response.data or []

        except Exception as e:
            print(f"Error getting sync log entries: {e}")
            return []

    def get_batch_assignments_for_campaign(self, campaign_id: str) -> List[Dict]:
        """
        Get all campaign_batch_assignments entries for a campaign.
        Returns list of assignments with collection_id info.
        """
        try:
            result = self.client.table('campaign_batch_assignments').select(
                'id, shopify_collection_id, assigned_shop'
            ).eq('campaign_id', campaign_id).execute()

            return result.data or []

        except Exception as e:
            print(f"Error getting batch assignments: {e}")
            return []

    def delete_batch_assignments_for_campaign(self, campaign_id: str) -> int:
        """
        Delete all campaign_batch_assignments entries for a campaign.
        This removes the Kampagnen-Kollektions Verknüpfung.
        Returns the number of deleted entries.
        """
        try:
            # First get the count
            count_response = self.client.table('campaign_batch_assignments').select(
                'id'
            ).eq('campaign_id', campaign_id).execute()

            count = len(count_response.data) if count_response.data else 0

            if count > 0:
                self.client.table('campaign_batch_assignments').delete().eq(
                    'campaign_id', campaign_id
                ).execute()

            return count

        except Exception as e:
            print(f"Error deleting batch assignments: {e}")
            return 0

    def delete_product_sales_for_collections(self, shop_id: str, collection_ids: List[str]) -> int:
        """
        Delete product_sales entries for specific collections.

        Args:
            shop_id: The shop ID
            collection_ids: List of collection IDs to delete sales for

        Returns the number of deleted entries.
        """
        if not collection_ids:
            return 0

        try:
            # Count before deletion
            count_response = self.client.table('product_sales').select(
                'id'
            ).eq('shop_id', shop_id).in_('collection_id', collection_ids).execute()

            count = len(count_response.data) if count_response.data else 0

            if count > 0:
                # Delete product_sales entries for these collections
                self.client.table('product_sales').delete().eq(
                    'shop_id', shop_id
                ).in_('collection_id', collection_ids).execute()

            return count

        except Exception as e:
            print(f"Error deleting product sales: {e}")
            return 0

    def cleanup_paused_campaign_sync(self, shop_id: str, campaign_id: str, campaign_name: str) -> Dict:
        """
        Full cleanup when a campaign is paused:
        1. Get collection IDs from campaign_batch_assignments
        2. Delete product_sales entries for those collections
        3. Delete campaign_batch_assignments entries

        NOTE: pinterest_sync_log entries are NOT deleted - they serve as history.

        Returns dict with counts of deleted items.
        """
        result = {
            'batch_assignments_deleted': 0,
            'product_sales_deleted': 0
        }

        try:
            # First get the batch assignments to find collection IDs
            assignments = self.get_batch_assignments_for_campaign(campaign_id)

            if assignments:
                # Extract unique collection IDs
                collection_ids = list(set(
                    a['shopify_collection_id']
                    for a in assignments
                    if a.get('shopify_collection_id')
                ))

                # Delete product_sales for these collections
                if collection_ids:
                    result['product_sales_deleted'] = self.delete_product_sales_for_collections(
                        shop_id, collection_ids
                    )

            # Delete campaign_batch_assignments
            result['batch_assignments_deleted'] = self.delete_batch_assignments_for_campaign(campaign_id)

            if result['batch_assignments_deleted'] > 0 or result['product_sales_deleted'] > 0:
                print(f"    Cleaned up campaign '{campaign_name}': "
                      f"{result['batch_assignments_deleted']} batch assignments, "
                      f"{result['product_sales_deleted']} product sales")

            return result

        except Exception as e:
            print(f"Error cleaning up paused campaign: {e}")
            return result

    # ===== Campaign Sync Methods =====

    def get_ad_account_for_shop(self, shop_id: str) -> Optional[Dict]:
        """Get the selected ad account for a shop."""
        try:
            result = self.client.table('pinterest_ad_accounts').select(
                'id, pinterest_account_id'
            ).eq('shop_id', shop_id).eq('is_selected', True).execute()

            if result.data:
                return result.data[0]
            return None

        except Exception as e:
            print(f"Error getting ad account: {e}")
            return None

    def sync_campaigns_from_pinterest(
        self,
        shop_id: str,
        ad_account_uuid: str,
        campaigns: List[Dict]
    ) -> int:
        """
        Sync campaigns from Pinterest API to database.
        Only syncs ACTIVE campaigns.

        Args:
            shop_id: Internal shop ID
            ad_account_uuid: Internal ad account UUID
            campaigns: List of campaigns from Pinterest API

        Returns:
            Number of campaigns synced
        """
        synced_count = 0

        try:
            for campaign in campaigns:
                # Only sync ACTIVE campaigns
                status = campaign.get('status', 'UNKNOWN')
                if status != 'ACTIVE':
                    continue

                campaign_id = campaign.get('id')

                # Get daily spend cap (budget) - convert from micro-currency
                daily_spend_cap = campaign.get('daily_spend_cap', 0)
                if daily_spend_cap:
                    daily_budget = daily_spend_cap / 1_000_000
                else:
                    daily_budget = 0

                # Upsert campaign
                self.client.table('pinterest_campaigns').upsert({
                    'shop_id': shop_id,
                    'pinterest_campaign_id': campaign_id,
                    'ad_account_id': ad_account_uuid,
                    'name': campaign.get('name', 'Unnamed Campaign'),
                    'status': status,
                    'daily_budget': daily_budget
                }, on_conflict='shop_id,pinterest_campaign_id').execute()

                synced_count += 1

            return synced_count

        except Exception as e:
            print(f"Error syncing campaigns: {e}")
            return synced_count
