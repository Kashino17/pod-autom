"""
Pinterest Campaign Creation Service for Winner Scaling Job
Creates campaigns with Pins using generated creatives
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

    def create_campaign_with_creatives(
        self,
        ad_account_id: str,
        winner: WinnerProduct,
        creatives: List[GeneratedCreative],
        creative_type: str,  # 'video' or 'image'
        link_type: str,  # 'product' or 'collection'
        shop_domain: str,
        settings: WinnerScalingSettings,
        targeting: Optional[OriginalCampaignTargeting] = None
    ) -> CampaignCreationResult:
        """
        Create a Pinterest campaign with ad group and pins.

        Args:
            ad_account_id: Pinterest ad account ID
            winner: Winner product info
            creatives: List of generated creative assets
            creative_type: 'video' or 'image'
            link_type: 'product' or 'collection'
            shop_domain: Shop domain for building product/collection URLs
            settings: Winner scaling settings
            targeting: Optional targeting to copy from original campaign

        Returns:
            CampaignCreationResult with campaign, ad group, and pin IDs
        """
        # Build campaign name
        # Format: "Produktname | 2x Videos | Link to Product"
        creative_count = len(creatives)
        creative_label = f"{creative_count}x {'Videos' if creative_type == 'video' else 'Images'}"
        link_label = "Link to Product" if link_type == 'product' else "Link to Collection"
        campaign_name = f"{winner.product_title[:50]} | {creative_label} | {link_label}"

        # Build destination URL
        if link_type == 'product':
            destination_url = f"https://{shop_domain}/products/{winner.product_handle}" if winner.product_handle else f"https://{shop_domain}"
        else:
            destination_url = f"https://{shop_domain}/collections/{winner.collection_handle}" if winner.collection_handle else f"https://{shop_domain}"

        # 0. Get conversion tag ID (required for WEB_CONVERSION campaigns)
        conversion_tag_id = self.get_conversion_tag_id(ad_account_id)
        if not conversion_tag_id:
            return CampaignCreationResult(
                success=False,
                error_message="No conversion tag found. Please set up a Pinterest conversion tag in your ad account."
            )

        # 1. Create Campaign
        campaign_result, error = self._create_campaign(
            ad_account_id=ad_account_id,
            name=campaign_name,
            daily_budget=settings.daily_budget_per_campaign
        )

        if error:
            return CampaignCreationResult(success=False, error_message=f"Campaign creation failed: {error}")

        campaign_id = campaign_result.get('id')
        print(f"      Created campaign: {campaign_id}")

        # 2. Create Ad Group with conversion tracking
        ad_group_result, error = self._create_ad_group(
            ad_account_id=ad_account_id,
            campaign_id=campaign_id,
            name=f"{campaign_name} - Ad Group",
            conversion_tag_id=conversion_tag_id,
            targeting=targeting
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

    def get_conversion_tag_id(self, ad_account_id: str) -> Optional[str]:
        """
        Get the first active conversion tag ID for the ad account.
        Required for WEB_CONVERSION campaigns.
        """
        result, error = self._make_request(
            'GET',
            f'ad_accounts/{ad_account_id}/conversion_tags'
        )

        if error:
            print(f"      Error fetching conversion tags: {error}")
            return None

        if result and 'items' in result:
            # Find first active tag
            for tag in result['items']:
                if tag.get('status') == 'ACTIVE':
                    tag_id = tag.get('id')
                    print(f"      Found conversion tag: {tag_id} ({tag.get('name', 'unnamed')})")
                    return tag_id

            # If no active tag, return first tag
            if result['items']:
                tag_id = result['items'][0].get('id')
                print(f"      Using conversion tag: {tag_id}")
                return tag_id

        print("      No conversion tags found for this ad account")
        return None

    def _create_campaign(
        self,
        ad_account_id: str,
        name: str,
        daily_budget: float
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Create a Pinterest campaign."""
        # Convert budget to micro-currency
        budget_micro = int(daily_budget * 1_000_000)

        # Pinterest API expects an array of campaigns
        # WEB_CONVERSION objective for e-commerce conversion tracking
        data = [{
            'ad_account_id': ad_account_id,
            'name': name,
            'status': 'ACTIVE',
            'objective_type': 'WEB_CONVERSION',  # For e-commerce checkout conversions
            'daily_spend_cap': budget_micro,
            'is_campaign_budget_optimization': True
        }]

        result, error = self._make_request(
            'POST',
            f'ad_accounts/{ad_account_id}/campaigns',
            data=data
        )

        # Handle error from request
        if error:
            return None, error

        # API returns {"items": [...]} - extract first item
        if result and 'items' in result and len(result['items']) > 0:
            item = result['items'][0]
            # Check if the item contains errors (non-empty exceptions list or error code)
            exceptions = item.get('exceptions', [])
            if exceptions:  # Only error if exceptions list is non-empty
                return None, f"Campaign creation error: {exceptions}"
            if 'code' in item and 'data' not in item:  # Error response format
                return None, f"Campaign creation error: {item}"
            # Success - extract data if wrapped, otherwise use item directly
            campaign_data = item.get('data', item)
            return campaign_data, None

        # Unexpected response format
        return None, f"Unexpected campaign API response: {result}"

    def _create_ad_group(
        self,
        ad_account_id: str,
        campaign_id: str,
        name: str,
        conversion_tag_id: str,
        targeting: Optional[OriginalCampaignTargeting] = None
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Create a Pinterest ad group for WEB_CONVERSION campaigns."""
        # Validate required fields
        if not campaign_id:
            return None, "campaign_id is required but was None"
        if not conversion_tag_id:
            return None, "conversion_tag_id is required for WEB_CONVERSION campaigns"

        # Use targeting from original campaign or defaults
        if targeting:
            geo_targets = targeting.target_locations
        else:
            geo_targets = ['DE']  # Default to Germany

        # Pinterest API expects an array of ad groups
        # For WEB_CONVERSION: billable_event must be IMPRESSION, and optimization_goal_metadata is required
        data = [{
            'ad_account_id': ad_account_id,
            'campaign_id': campaign_id,
            'name': name,
            'status': 'ACTIVE',
            'billable_event': 'IMPRESSION',  # Required for WEB_CONVERSION campaigns
            'auto_targeting_enabled': True,  # Let Pinterest optimize
            'targeting_spec': {
                'GEO': geo_targets,
                'LOCALE': ['de-DE']  # German locale
            },
            'bid_strategy_type': 'AUTOMATIC_BID',  # Let Pinterest set bids
            'optimization_goal_metadata': {
                'conversion_tag_v3_goal_metadata': {
                    'attribution_windows': {
                        'click_window_days': 30,
                        'engagement_window_days': 30,
                        'view_window_days': 1
                    },
                    'conversion_event': 'CHECKOUT',  # Optimize for purchases
                    'conversion_tag_id': conversion_tag_id,
                    'cpa_goal_value_in_micro_currency': None,  # No CPA goal, use automatic
                    'is_roas_optimized': False,
                    'learning_mode_type': 'ACTIVE'
                }
            }
        }]

        result, error = self._make_request(
            'POST',
            f'ad_accounts/{ad_account_id}/ad_groups',
            data=data
        )

        # Handle error from request
        if error:
            return None, error

        # API returns {"items": [...]} - extract first item
        if result and 'items' in result and len(result['items']) > 0:
            item = result['items'][0]
            # Check if the item contains errors (non-empty exceptions list or error code)
            exceptions = item.get('exceptions', [])
            if exceptions:  # Only error if exceptions list is non-empty
                return None, f"Ad group creation error: {exceptions}"
            if 'code' in item and 'data' not in item:  # Error response format
                return None, f"Ad group creation error: {item}"
            # Success - extract data if wrapped, otherwise use item directly
            ad_group_data = item.get('data', item)
            return ad_group_data, None

        # Unexpected response format
        return None, f"Unexpected ad group API response: {result}"

    def _create_pin(
        self,
        ad_account_id: str,
        ad_group_id: str,
        creative: GeneratedCreative,
        title: str,
        destination_url: str,
        index: int
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Create a Pinterest Pin with the generated creative."""

        # First, create the organic pin
        if creative.creative_type == 'video':
            pin_data = {
                'title': title,
                'description': f"{title} - Jetzt entdecken!",
                'link': destination_url,
                'board_id': None,  # Will be set to default board
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
                'board_id': None,
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
            # Still return the pin ID even if ad creation fails
            return {'id': pin_id}, f"Ad creation failed: {error}"

        return {'id': pin_id, 'ad_id': ad_result.get('id')}, None

    def get_campaign_targeting(self, ad_account_id: str, campaign_id: str) -> Optional[OriginalCampaignTargeting]:
        """
        Get targeting settings from an existing campaign to copy.

        Args:
            ad_account_id: Pinterest ad account ID
            campaign_id: Campaign ID to copy targeting from

        Returns:
            OriginalCampaignTargeting or None if failed
        """
        try:
            # Get ad groups for the campaign
            result, error = self._make_request(
                'GET',
                f'ad_accounts/{ad_account_id}/ad_groups',
                params={'campaign_ids': campaign_id}
            )

            if error or not result or not result.get('items'):
                return None

            # Get first ad group's targeting
            ad_group = result['items'][0]
            targeting_spec = ad_group.get('targeting_spec', {})

            return OriginalCampaignTargeting(
                target_locations=targeting_spec.get('GEO', ['DE']),
                age_group=targeting_spec.get('AGE_BUCKET', ['ALL'])[0] if targeting_spec.get('AGE_BUCKET') else 'ALL',
                gender=targeting_spec.get('GENDER', [None])[0] if targeting_spec.get('GENDER') else None,
                interests=targeting_spec.get('INTEREST', []),
                keywords=targeting_spec.get('KEYWORD', [])
            )

        except Exception as e:
            print(f"Error getting campaign targeting: {e}")
            return None

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
