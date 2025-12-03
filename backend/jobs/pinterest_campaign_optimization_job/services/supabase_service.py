"""
Supabase Service for Campaign Optimization Job
Handles all database operations for optimization rules, settings, and logging
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
    """Supabase client for Campaign Optimization Job."""

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
                'daily_budget': new_budget,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', campaign_id).execute()

            return True

        except Exception as e:
            print(f"Error updating campaign budget in DB: {e}")
            return False

    def update_campaign_status_in_db(self, campaign_id: str, new_status: str) -> bool:
        """Update campaign status in database after Pinterest update."""
        try:
            self.client.table('pinterest_campaigns').update({
                'status': new_status,
                'updated_at': datetime.now(timezone.utc).isoformat()
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
