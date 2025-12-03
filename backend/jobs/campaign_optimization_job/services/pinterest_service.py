"""
Pinterest API Service for Campaign Optimization Job
Handles Analytics retrieval and Campaign budget/status updates
"""
import os
import requests
from typing import Dict, Optional, List
from datetime import datetime, timedelta

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import CampaignMetrics


class PinterestAPIClient:
    """Pinterest API v5 client for campaign optimization."""

    BASE_URL = "https://api.pinterest.com/v5"

    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        })

    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Dict = None,
        data: Dict = None
    ) -> Optional[Dict]:
        """Make a request to the Pinterest API."""
        url = f"{self.BASE_URL}/{endpoint}"

        try:
            if method == 'GET':
                response = self.session.get(url, params=params)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                print(f"Pinterest API 401 Unauthorized - token may be expired")
                return None
            else:
                print(f"Pinterest API error {response.status_code}: {response.text}")
                return None

        except Exception as e:
            print(f"Pinterest API request error: {e}")
            return None

    def get_campaign_analytics(
        self,
        ad_account_id: str,
        campaign_id: str,
        days: int = 7
    ) -> CampaignMetrics:
        """
        Get campaign analytics from Pinterest.

        Pinterest API: GET /v5/ad_accounts/{ad_account_id}/campaigns/analytics

        Args:
            ad_account_id: Pinterest ad account ID
            campaign_id: Pinterest campaign ID
            days: Number of days to look back

        Returns:
            CampaignMetrics with spend, checkouts, roas
        """
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

        params = {
            'campaign_ids': campaign_id,
            'start_date': start_date,
            'end_date': end_date,
            'columns': 'SPEND_IN_MICRO_DOLLAR,TOTAL_CONVERSIONS,TOTAL_CONVERSIONS_VALUE_IN_MICRO_DOLLAR',
            'granularity': 'TOTAL'
        }

        result = self._make_request(
            'GET',
            f'ad_accounts/{ad_account_id}/campaigns/analytics',
            params=params
        )

        if result and len(result) > 0:
            data = result[0]

            spend_micro = data.get('SPEND_IN_MICRO_DOLLAR', 0) or 0
            spend = spend_micro / 1_000_000  # Micro dollars to dollars/euros

            checkouts = data.get('TOTAL_CONVERSIONS', 0) or 0

            # Calculate ROAS (Return on Ad Spend)
            conversion_value_micro = data.get('TOTAL_CONVERSIONS_VALUE_IN_MICRO_DOLLAR', 0) or 0
            conversion_value = conversion_value_micro / 1_000_000

            roas = conversion_value / spend if spend > 0 else 0

            return CampaignMetrics(
                spend=round(spend, 2),
                checkouts=int(checkouts),
                roas=round(roas, 2)
            )

        return CampaignMetrics()

    def get_campaign_analytics_multi_range(
        self,
        ad_account_id: str,
        campaign_id: str,
        time_ranges: List[int] = None
    ) -> Dict[int, CampaignMetrics]:
        """
        Get campaign analytics for multiple time ranges.

        Args:
            ad_account_id: Pinterest ad account ID
            campaign_id: Pinterest campaign ID
            time_ranges: List of days to fetch (e.g., [1, 3, 7, 14])

        Returns:
            Dict mapping time_range to CampaignMetrics
        """
        if time_ranges is None:
            time_ranges = [1, 3, 7, 14]

        results = {}

        for days in time_ranges:
            metrics = self.get_campaign_analytics(ad_account_id, campaign_id, days)
            results[days] = metrics

        return results

    def update_campaign_budget(
        self,
        ad_account_id: str,
        campaign_id: str,
        new_budget: float
    ) -> bool:
        """
        Update the daily budget of a campaign.

        Pinterest API: PATCH /v5/ad_accounts/{ad_account_id}/campaigns
        Budget is in micro-currency (1€ = 1,000,000 micro)

        Args:
            ad_account_id: Pinterest ad account ID
            campaign_id: Pinterest campaign ID
            new_budget: New daily budget in euros

        Returns:
            True if successful
        """
        # Convert euros to micro-currency
        budget_micro = int(new_budget * 1_000_000)

        data = [{
            'id': campaign_id,
            'daily_spend_cap': budget_micro
        }]

        result = self._make_request(
            'PATCH',
            f'ad_accounts/{ad_account_id}/campaigns',
            data=data
        )

        if result:
            print(f"  [Pinterest] Updated campaign {campaign_id} budget to €{new_budget}")
            return True

        return False

    def update_campaign_status(
        self,
        ad_account_id: str,
        campaign_id: str,
        status: str
    ) -> bool:
        """
        Update the status of a campaign.

        Args:
            ad_account_id: Pinterest ad account ID
            campaign_id: Pinterest campaign ID
            status: New status ('ACTIVE' or 'PAUSED')

        Returns:
            True if successful
        """
        if status not in ['ACTIVE', 'PAUSED']:
            print(f"Invalid status: {status}")
            return False

        data = [{
            'id': campaign_id,
            'status': status
        }]

        result = self._make_request(
            'PATCH',
            f'ad_accounts/{ad_account_id}/campaigns',
            data=data
        )

        if result:
            print(f"  [Pinterest] Updated campaign {campaign_id} status to {status}")
            return True

        return False

    def get_campaign_info(
        self,
        ad_account_id: str,
        campaign_id: str
    ) -> Optional[Dict]:
        """
        Get current campaign information.

        Args:
            ad_account_id: Pinterest ad account ID
            campaign_id: Pinterest campaign ID

        Returns:
            Campaign info dict or None
        """
        result = self._make_request(
            'GET',
            f'ad_accounts/{ad_account_id}/campaigns/{campaign_id}'
        )

        if result:
            return {
                'id': result.get('id'),
                'name': result.get('name'),
                'status': result.get('status'),
                'daily_spend_cap': result.get('daily_spend_cap', 0) / 1_000_000,
                'lifetime_spend_cap': result.get('lifetime_spend_cap', 0) / 1_000_000,
                'objective_type': result.get('objective_type')
            }

        return None

    def refresh_access_token(self) -> Optional[Dict]:
        """
        Refresh the access token using the refresh token.

        Returns:
            Dict with new tokens or None if failed
        """
        if not self.refresh_token:
            print("No refresh token available")
            return None

        app_id = os.environ.get('PINTEREST_APP_ID')
        app_secret = os.environ.get('PINTEREST_APP_SECRET')

        if not app_id or not app_secret:
            print("PINTEREST_APP_ID and PINTEREST_APP_SECRET must be set")
            return None

        try:
            import base64
            credentials = base64.b64encode(f"{app_id}:{app_secret}".encode()).decode()

            response = requests.post(
                'https://api.pinterest.com/v5/oauth/token',
                headers={
                    'Authorization': f'Basic {credentials}',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': self.refresh_token
                }
            )

            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get('access_token')
                self.session.headers.update({
                    'Authorization': f'Bearer {self.access_token}'
                })

                return {
                    'access_token': data.get('access_token'),
                    'refresh_token': data.get('refresh_token'),
                    'expires_in': data.get('expires_in')
                }
            else:
                print(f"Token refresh failed: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            print(f"Token refresh error: {e}")
            return None
