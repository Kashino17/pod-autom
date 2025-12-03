"""
Pinterest Campaign Optimization Job
Automatically optimizes Pinterest campaign budgets based on user-defined rules
"""
import os
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional
from dotenv import load_dotenv

from models import (
    ShopPinterestConfig, OptimizationSettings, OptimizationRule,
    Campaign, CampaignMetrics, OptimizationResult, JobMetrics
)
from rule_engine import evaluate_conditions, find_matching_rule, explain_evaluation
from services.supabase_service import SupabaseService
from services.pinterest_service import PinterestAPIClient


# Load environment variables
load_dotenv()


class PinterestCampaignOptimizationJob:
    """Main job class for Pinterest campaign optimization."""

    def __init__(self):
        self.db = SupabaseService()
        self.job_metrics = JobMetrics()
        self.job_id: Optional[str] = None

    async def run(self):
        """Main entry point for the job."""
        print("=" * 60)
        print("PINTEREST CAMPAIGN OPTIMIZATION JOB")
        print(f"Started at: {datetime.now(timezone.utc).isoformat()}")
        print("=" * 60)

        # Log job start
        self.job_id = self.db.log_job_run(
            job_type='pinterest_campaign_optimization',
            status='running',
            metadata={'started_at': datetime.now(timezone.utc).isoformat()}
        )

        try:
            # Get all shops with optimization enabled
            shops = self.db.get_shops_with_optimization_enabled()

            if not shops:
                print("No shops with optimization enabled")
                self._finish_job('completed')
                return

            print(f"\nFound {len(shops)} shops with optimization enabled")

            # Process shops with concurrency limit
            semaphore = asyncio.Semaphore(10)

            tasks = [
                self._process_shop_with_semaphore(shop, semaphore)
                for shop in shops
            ]

            await asyncio.gather(*tasks, return_exceptions=True)

            # Finish job
            status = 'completed' if self.job_metrics.shops_failed == 0 else 'completed_with_errors'
            self._finish_job(status)

        except Exception as e:
            print(f"Job failed with error: {e}")
            self.job_metrics.errors.append({
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            self._finish_job('failed')
            raise

    async def _process_shop_with_semaphore(
        self,
        shop: ShopPinterestConfig,
        semaphore: asyncio.Semaphore
    ):
        """Process a shop with semaphore for concurrency control."""
        async with semaphore:
            await self._process_shop(shop)

    async def _process_shop(self, shop: ShopPinterestConfig):
        """Process a single shop."""
        print(f"\n{'='*40}")
        print(f"Processing shop: {shop.internal_name}")
        print(f"{'='*40}")

        try:
            # Get optimization settings
            settings = self.db.get_optimization_settings(shop.shop_id)

            if not settings:
                print(f"  No optimization settings found for shop")
                return

            if not settings.is_enabled:
                print(f"  Optimization disabled for shop")
                return

            # Get optimization rules
            rules = self.db.get_optimization_rules(shop.shop_id)

            if not rules:
                print(f"  No optimization rules found")
                return

            print(f"  Found {len(rules)} active rules")

            # Initialize Pinterest client
            pinterest = PinterestAPIClient(
                access_token=shop.pinterest_access_token,
                refresh_token=shop.pinterest_refresh_token
            )

            # Get campaigns to process
            if settings.test_mode_enabled:
                # Test mode: only process test campaign
                if not settings.test_campaign_id:
                    print(f"  Test mode enabled but no test campaign selected")
                    return

                test_campaign = self.db.get_campaign_by_id(settings.test_campaign_id)
                if not test_campaign:
                    print(f"  Test campaign not found")
                    return

                campaigns = [test_campaign]
                print(f"  TEST MODE: Processing only test campaign '{test_campaign.name}'")
            else:
                # Normal mode: process all active campaigns
                campaigns = self.db.get_active_campaigns(shop.shop_id)

            if not campaigns:
                print(f"  No campaigns to process")
                return

            print(f"  Processing {len(campaigns)} campaigns")

            # Process each campaign
            for campaign in campaigns:
                await self._process_campaign(
                    shop=shop,
                    campaign=campaign,
                    rules=rules,
                    settings=settings,
                    pinterest=pinterest
                )

            self.job_metrics.shops_processed += 1

        except Exception as e:
            print(f"  Error processing shop {shop.internal_name}: {e}")
            self.job_metrics.shops_failed += 1
            self.job_metrics.errors.append({
                'shop_id': shop.shop_id,
                'shop_name': shop.internal_name,
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            })

    async def _process_campaign(
        self,
        shop: ShopPinterestConfig,
        campaign: Campaign,
        rules: List[OptimizationRule],
        settings: OptimizationSettings,
        pinterest: PinterestAPIClient
    ):
        """Process a single campaign against rules."""
        print(f"\n  Campaign: {campaign.name}")
        print(f"    Current budget: €{campaign.daily_budget}")

        self.job_metrics.campaigns_evaluated += 1

        # Get metrics
        if settings.test_mode_enabled and settings.test_metrics:
            # Use manual test metrics
            metrics = settings.test_metrics
            print(f"    Using TEST metrics: spend=€{metrics.get('spend', 0)}, "
                  f"checkouts={metrics.get('checkouts', 0)}, roas={metrics.get('roas', 0)}")
        else:
            # Get real metrics from Pinterest
            # Get metrics for all possible time ranges
            time_ranges = set()
            for rule in rules:
                for cond in rule.conditions:
                    time_ranges.add(cond.time_range_days)

            if not time_ranges:
                time_ranges = {7}

            # For simplicity, get the max time range
            max_days = max(time_ranges)
            campaign_metrics = pinterest.get_campaign_analytics(
                ad_account_id=shop.pinterest_account_id,
                campaign_id=campaign.pinterest_campaign_id,
                days=max_days
            )
            metrics = campaign_metrics.to_dict()
            print(f"    Real metrics (last {max_days} days): spend=€{metrics.get('spend', 0)}, "
                  f"checkouts={metrics.get('checkouts', 0)}, roas={metrics.get('roas', 0)}")

        # Find matching rule
        matching_rule = find_matching_rule(rules, metrics)

        if not matching_rule:
            print(f"    No rule matched - no action taken")
            return

        print(f"    Matched rule: '{matching_rule.name}' (priority {matching_rule.priority})")

        # Execute action
        result = await self._execute_action(
            shop=shop,
            campaign=campaign,
            rule=matching_rule,
            metrics=metrics,
            pinterest=pinterest,
            is_test=settings.test_mode_enabled
        )

        # Log the result
        self.db.log_optimization_action(
            shop_id=shop.shop_id,
            campaign_id=campaign.id,
            rule_id=matching_rule.id,
            old_budget=result.old_budget,
            new_budget=result.new_budget,
            action_taken=result.action_taken,
            metrics_snapshot=result.metrics_snapshot,
            is_test_run=result.is_test_run,
            test_metrics=settings.test_metrics if settings.test_mode_enabled else None,
            old_status=result.old_status,
            new_status=result.new_status,
            error_message=result.error_message
        )

        if result.action_taken not in ['skipped', 'failed']:
            self.job_metrics.actions_taken += 1

    async def _execute_action(
        self,
        shop: ShopPinterestConfig,
        campaign: Campaign,
        rule: OptimizationRule,
        metrics: Dict,
        pinterest: PinterestAPIClient,
        is_test: bool
    ) -> OptimizationResult:
        """Execute the optimization action."""
        result = OptimizationResult(
            campaign_id=campaign.id,
            rule_id=rule.id,
            action_taken='skipped',
            old_budget=campaign.daily_budget,
            new_budget=campaign.daily_budget,
            metrics_snapshot=metrics,
            is_test_run=is_test
        )

        action_type = rule.action_type

        if action_type == 'pause':
            # Pause the campaign
            result.old_status = campaign.status
            result.new_status = 'PAUSED'

            success = pinterest.update_campaign_status(
                ad_account_id=shop.pinterest_account_id,
                campaign_id=campaign.pinterest_campaign_id,
                status='PAUSED'
            )

            if success:
                result.action_taken = 'paused'
                self.db.update_campaign_status_in_db(campaign.id, 'PAUSED')
                print(f"    ACTION: Paused campaign")
            else:
                result.action_taken = 'failed'
                result.error_message = 'Failed to pause campaign on Pinterest'
                print(f"    ACTION FAILED: Could not pause campaign")

        elif action_type == 'scale_down':
            # Calculate new budget
            if rule.action_unit == 'percent':
                reduction = campaign.daily_budget * (rule.action_value / 100)
            else:
                reduction = rule.action_value

            new_budget = max(campaign.daily_budget - reduction, rule.min_budget)
            new_budget = round(new_budget, 2)

            if new_budget == campaign.daily_budget:
                print(f"    ACTION: No change (already at minimum €{rule.min_budget})")
                return result

            result.new_budget = new_budget

            success = pinterest.update_campaign_budget(
                ad_account_id=shop.pinterest_account_id,
                campaign_id=campaign.pinterest_campaign_id,
                new_budget=new_budget
            )

            if success:
                result.action_taken = 'scaled_down'
                self.db.update_campaign_budget_in_db(campaign.id, new_budget)
                print(f"    ACTION: Reduced budget €{campaign.daily_budget} → €{new_budget}")
            else:
                result.action_taken = 'failed'
                result.error_message = 'Failed to update budget on Pinterest'
                print(f"    ACTION FAILED: Could not update budget")

        elif action_type == 'scale_up':
            # Calculate new budget
            if rule.action_unit == 'percent':
                increase = campaign.daily_budget * (rule.action_value / 100)
            else:
                increase = rule.action_value

            new_budget = min(campaign.daily_budget + increase, rule.max_budget)
            new_budget = round(new_budget, 2)

            if new_budget == campaign.daily_budget:
                print(f"    ACTION: No change (already at maximum €{rule.max_budget})")
                return result

            result.new_budget = new_budget

            success = pinterest.update_campaign_budget(
                ad_account_id=shop.pinterest_account_id,
                campaign_id=campaign.pinterest_campaign_id,
                new_budget=new_budget
            )

            if success:
                result.action_taken = 'scaled_up'
                self.db.update_campaign_budget_in_db(campaign.id, new_budget)
                print(f"    ACTION: Increased budget €{campaign.daily_budget} → €{new_budget}")
            else:
                result.action_taken = 'failed'
                result.error_message = 'Failed to update budget on Pinterest'
                print(f"    ACTION FAILED: Could not update budget")

        return result

    def _finish_job(self, status: str):
        """Finish the job and log final status."""
        print(f"\n{'='*60}")
        print("JOB SUMMARY")
        print(f"{'='*60}")
        print(f"Status: {status}")
        print(f"Shops processed: {self.job_metrics.shops_processed}")
        print(f"Shops failed: {self.job_metrics.shops_failed}")
        print(f"Campaigns evaluated: {self.job_metrics.campaigns_evaluated}")
        print(f"Actions taken: {self.job_metrics.actions_taken}")
        print(f"Errors: {len(self.job_metrics.errors)}")

        if self.job_id:
            self.db.update_job_run(
                job_id=self.job_id,
                status=status,
                shops_processed=self.job_metrics.shops_processed,
                shops_failed=self.job_metrics.shops_failed,
                error_log=self.job_metrics.errors if self.job_metrics.errors else None,
                metadata={
                    'campaigns_evaluated': self.job_metrics.campaigns_evaluated,
                    'actions_taken': self.job_metrics.actions_taken
                }
            )


async def main():
    """Entry point for the job."""
    job = PinterestCampaignOptimizationJob()
    await job.run()


if __name__ == '__main__':
    asyncio.run(main())
