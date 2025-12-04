"""
Pinterest Campaign Creation Service for Winner Scaling Job
Creates campaigns with Pins using generated creatives
Copies settings from original campaign
"""
import os
import requests
from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import (
    WinnerProduct, WinnerCampaign, GeneratedCreative,
    WinnerScalingSettings, OriginalCampaignTargeting
)


@dataclass
class CampaignCreationResult:
    """Result of campaign creation."""
    success: bool
    campaign_id: Optional[str] = None
    ad_group_id: Optional[str] = None
    pin_ids: List[str] = None
    error_message: Optional[str] = None

    def __post_init__(self):
        if self.pin_ids is None:
            self.pin_ids = []


@dataclass
class OriginalCampaignSettings:
    """Settings copied from original Pinterest campaign."""
    # Campaign settings
    objective_type: str
    tracking_urls: Optional[Dict] = None

    # Ad Group settings
    billable_event: str = 'IMPRESSION'
    bid_strategy_type: str = 'AUTOMATIC_BID'
    targeting_spec: Optional[Dict] = None
    optimization_goal_metadata: Optional[Dict] = None
    auto_targeting_enabled: bool = True
    pacing_delivery_type: Optional[str] = None


class PinterestCampaignService:
    """Service for creating Pinterest campaigns with generated creatives."""

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
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Make a request to the Pinterest API."""
        url = f"{self.BASE_URL}/{endpoint}"

        try:
            if method == 'GET':
                response = self.session.get(url, params=params)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data)
            else:
                return None, f"Unsupported method: {method}"

            if response.status_code in [200, 201]:
                return response.json(), None
            elif response.status_code == 401:
                return None, "Unauthorized - token may be expired"
            elif response.status_code == 429:
                return None, "Rate limit exceeded"
            else:
                return None, f"API error {response.status_code}: {response.text}"

        except Exception as e:
            return None, f"Request error: {str(e)}"

    def get_campaign_details(self, ad_account_id: str, campaign_id: str) -> Optional[Dict]:
        """Get full campaign details from Pinterest API."""
        result, error = self._make_request(
            'GET',
            f'ad_accounts/{ad_account_id}/campaigns/{campaign_id}'
        )
        if error:
            print(f"      Error fetching campaign details: {error}")
            return None
        return result

    def get_ad_group_details(self, ad_account_id: str, ad_group_id: str) -> Optional[Dict]:
        """Get full ad group details from Pinterest API."""
        result, error = self._make_request(
            'GET',
            f'ad_accounts/{ad_account_id}/ad_groups/{ad_group_id}'
        )
        if error:
            print(f"      Error fetching ad group details: {error}")
            return None
        return result

    def get_ad_groups_for_campaign(self, ad_account_id: str, campaign_id: str) -> Optional[List[Dict]]:
        """Get all ad groups for a campaign."""
        result, error = self._make_request(
            'GET',
            f'ad_accounts/{ad_account_id}/ad_groups',
            params={'campaign_ids': campaign_id}
        )
        if error:
            print(f"      Error fetching ad groups: {error}")
            return None
        return result.get('items', []) if result else None

    def get_original_campaign_settings(
        self,
        ad_account_id: str,
        pinterest_campaign_id: str,
        pinterest_ad_group_id: Optional[str] = None
    ) -> Optional[OriginalCampaignSettings]:
        """
        Fetch settings from original campaign and ad group.
        These settings will be copied to the new winner scaling campaign.
        """
        # Get campaign details
        campaign = self.get_campaign_details(ad_account_id, pinterest_campaign_id)
        if not campaign:
            return None

        print(f"      Original campaign: {campaign.get('name')} (objective: {campaign.get('objective_type')})")

        # Get ad group details
        ad_group = None
        if pinterest_ad_group_id:
            ad_group = self.get_ad_group_details(ad_account_id, pinterest_ad_group_id)

        if not ad_group:
            # Try to get first ad group from campaign
            ad_groups = self.get_ad_groups_for_campaign(ad_account_id, pinterest_campaign_id)
            if ad_groups:
                ad_group = ad_groups[0]

        if not ad_group:
            print(f"      Warning: No ad group found for original campaign")
            # Return with just campaign settings
            return OriginalCampaignSettings(
                objective_type=campaign.get('objective_type', 'WEB_CONVERSION'),
                tracking_urls=campaign.get('tracking_urls')
            )

        print(f"      Original ad group: {ad_group.get('name')} (billable: {ad_group.get('billable_event')})")

        return OriginalCampaignSettings(
            objective_type=campaign.get('objective_type', 'WEB_CONVERSION'),
            tracking_urls=campaign.get('tracking_urls'),
            billable_event=ad_group.get('billable_event', 'IMPRESSION'),
            bid_strategy_type=ad_group.get('bid_strategy_type', 'AUTOMATIC_BID'),
            targeting_spec=ad_group.get('targeting_spec'),
            optimization_goal_metadata=ad_group.get('optimization_goal_metadata'),
            auto_targeting_enabled=ad_group.get('auto_targeting_enabled', True),
            pacing_delivery_type=ad_group.get('pacing_delivery_type')
        )

    def create_campaign_with_creatives(
        self,
        ad_account_id: str,
        winner: WinnerProduct,
        creatives: List[GeneratedCreative],
        creative_type: str,  # 'video' or 'image'
        link_type: str,  # 'product' or 'collection'
        shop_domain: str,
        settings: WinnerScalingSettings,
        original_settings: Optional[OriginalCampaignSettings] = None
    ) -> CampaignCreationResult:
        """
        Create a Pinterest campaign with ad group and pins.
        Copies settings from original campaign if provided.
        """
        # Build campaign name
        creative_count = len(creatives)
        creative_label = f"{creative_count}x {'Videos' if creative_type == 'video' else 'Images'}"
        link_label = "Link to Product" if link_type == 'product' else "Link to Collection"
        campaign_name = f"{winner.product_title[:50]} | {creative_label} | {link_label}"

        # Build destination URL
        if link_type == 'product':
            destination_url = f"https://{shop_domain}/products/{winner.product_handle}" if winner.product_handle else f"https://{shop_domain}"
        else:
            destination_url = f"https://{shop_domain}/collections/{winner.collection_handle}" if winner.collection_handle else f"https://{shop_domain}"

        if not original_settings:
            return CampaignCreationResult(
                success=False,
                error_message="No original campaign settings found. Cannot create campaign without reference."
            )

        # 1. Create Campaign with copied settings
        campaign_result, error = self._create_campaign_from_template(
            ad_account_id=ad_account_id,
            name=campaign_name,
            daily_budget=settings.daily_budget_per_campaign,
            original_settings=original_settings
        )

        if error:
            return CampaignCreationResult(success=False, error_message=f"Campaign creation failed: {error}")

        campaign_id = campaign_result.get('id')
        print(f"      Created campaign: {campaign_id}")

        # 2. Create Ad Group with copied settings
        ad_group_result, error = self._create_ad_group_from_template(
            ad_account_id=ad_account_id,
            campaign_id=campaign_id,
            name=f"{campaign_name} - Ad Group",
            original_settings=original_settings
        )

        if error:
            return CampaignCreationResult(
                success=False,
                campaign_id=campaign_id,
                error_message=f"Ad group creation failed: {error}"
            )

        ad_group_id = ad_group_result.get('id')
        print(f"      Created ad group: {ad_group_id}")

        # 3. Create Pins with creatives
        pin_ids = []
        for i, creative in enumerate(creatives):
            pin_result, error = self._create_pin(
                ad_account_id=ad_account_id,
                ad_group_id=ad_group_id,
                creative=creative,
                title=winner.product_title,
                destination_url=destination_url,
                index=i
            )

            if error:
                print(f"      Pin {i+1} failed: {error}")
                continue

            pin_id = pin_result.get('id')
            pin_ids.append(pin_id)
            creative.pin_id = pin_id
            print(f"      Created pin {i+1}: {pin_id}")

        return CampaignCreationResult(
            success=len(pin_ids) > 0,
            campaign_id=campaign_id,
            ad_group_id=ad_group_id,
            pin_ids=pin_ids,
            error_message=None if pin_ids else "No pins were created"
        )

    def _create_campaign_from_template(
        self,
        ad_account_id: str,
        name: str,
        daily_budget: float,
        original_settings: OriginalCampaignSettings
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Create a Pinterest campaign copying settings from original."""
        budget_micro = int(daily_budget * 1_000_000)

        campaign_data = {
            'ad_account_id': ad_account_id,
            'name': name,
            'status': 'ACTIVE',
            'objective_type': original_settings.objective_type,
            'daily_spend_cap': budget_micro,
            'is_campaign_budget_optimization': True
        }

        # Copy tracking URLs if present
        if original_settings.tracking_urls:
            campaign_data['tracking_urls'] = original_settings.tracking_urls

        data = [campaign_data]

        result, error = self._make_request(
            'POST',
            f'ad_accounts/{ad_account_id}/campaigns',
            data=data
        )

        if error:
            return None, error

        if result and 'items' in result and len(result['items']) > 0:
            item = result['items'][0]
            exceptions = item.get('exceptions', [])
            if exceptions:
                return None, f"Campaign creation error: {exceptions}"
            if 'code' in item and 'data' not in item:
                return None, f"Campaign creation error: {item}"
            return item.get('data', item), None

        return None, f"Unexpected campaign API response: {result}"

    def _create_ad_group_from_template(
        self,
        ad_account_id: str,
        campaign_id: str,
        name: str,
        original_settings: OriginalCampaignSettings
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Create a Pinterest ad group copying settings from original."""
        if not campaign_id:
            return None, "campaign_id is required but was None"

        ad_group_data = {
            'ad_account_id': ad_account_id,
            'campaign_id': campaign_id,
            'name': name,
            'status': 'ACTIVE',
            'billable_event': original_settings.billable_event,
            'bid_strategy_type': original_settings.bid_strategy_type,
            'auto_targeting_enabled': original_settings.auto_targeting_enabled
        }

        # Copy targeting spec from original
        if original_settings.targeting_spec:
            ad_group_data['targeting_spec'] = original_settings.targeting_spec

        # Copy optimization goal metadata from original (required for WEB_CONVERSION)
        if original_settings.optimization_goal_metadata:
            ad_group_data['optimization_goal_metadata'] = original_settings.optimization_goal_metadata

        # Copy pacing delivery type if present
        if original_settings.pacing_delivery_type:
            ad_group_data['pacing_delivery_type'] = original_settings.pacing_delivery_type

        data = [ad_group_data]

        result, error = self._make_request(
            'POST',
            f'ad_accounts/{ad_account_id}/ad_groups',
            data=data
        )

        if error:
            return None, error

        if result and 'items' in result and len(result['items']) > 0:
            item = result['items'][0]
            exceptions = item.get('exceptions', [])
            if exceptions:
                return None, f"Ad group creation error: {exceptions}"
            if 'code' in item and 'data' not in item:
                return None, f"Ad group creation error: {item}"
            return item.get('data', item), None

        return None, f"Unexpected ad group API response: {result}"

    def get_first_board_id(self) -> Optional[str]:
        """Get the first available board ID from the user's account."""
        result, error = self._make_request(
            'GET',
            'boards',
            params={'page_size': 1}
        )

        if error:
            print(f"      Error fetching boards: {error}")
            return None

        if result and 'items' in result and len(result['items']) > 0:
            board_id = result['items'][0].get('id')
            print(f"      Using board: {result['items'][0].get('name', 'Unknown')} ({board_id})")
            return board_id

        print("      No boards found on account")
        return None

    def _create_pin(
        self,
        ad_account_id: str,
        ad_group_id: str,
        creative: GeneratedCreative,
        title: str,
        destination_url: str,
        index: int,
        board_id: Optional[str] = None
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Create a Pinterest Pin with the generated creative."""

        # Get a board_id if not provided
        if not board_id:
            board_id = self.get_first_board_id()
            if not board_id:
                return None, "No board available - cannot create pin without a board"

        # First, create the organic pin
        if creative.creative_type == 'video':
            pin_data = {
                'title': title,
                'description': f"{title} - Jetzt entdecken!",
                'link': destination_url,
                'board_id': board_id,
                'media_source': {
                    'source_type': 'video_url',
                    'url': creative.url
                }
            }
        else:
            pin_data = {
                'title': title,
                'description': f"{title} - Jetzt entdecken!",
                'link': destination_url,
                'board_id': board_id,
                'media_source': {
                    'source_type': 'image_url',
                    'url': creative.url
                }
            }

        # Create organic pin first
        pin_result, error = self._make_request(
            'POST',
            'pins',
            data=pin_data
        )

        if error:
            return None, f"Pin creation failed: {error}"

        pin_id = pin_result.get('id')

        # Now create the ad (promoted pin)
        ad_data = {
            'ad_account_id': ad_account_id,
            'ad_group_id': ad_group_id,
            'creative_type': 'REGULAR',
            'pin_id': pin_id,
            'name': f"{title} - Ad {index + 1}",
            'status': 'ACTIVE'
        }

        ad_result, error = self._make_request(
            'POST',
            f'ad_accounts/{ad_account_id}/ads',
            data=ad_data
        )

        if error:
            return {'id': pin_id}, f"Ad creation failed: {error}"

        return {'id': pin_id, 'ad_id': ad_result.get('id')}, None

    def pause_campaign(self, ad_account_id: str, campaign_id: str) -> bool:
        """Pause a campaign."""
        data = [{
            'id': campaign_id,
            'ad_account_id': ad_account_id,
            'status': 'PAUSED'
        }]

        result, error = self._make_request(
            'PATCH',
            f'ad_accounts/{ad_account_id}/campaigns',
            data=data
        )

        return error is None
