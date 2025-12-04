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
    WinnerScalingSettings, OriginalCampaignTargeting, PinterestSettings
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

    def _build_product_url(
        self,
        shop_domain: str,
        product_handle: str,
        url_prefix: str = ''
    ) -> str:
        """Build product URL with optional prefix.

        If url_prefix is set, use it as the base domain.
        Otherwise fallback to shop_domain (myshopify.com domain).
        """
        print(f"      [DEBUG] _build_product_url: url_prefix='{url_prefix}', shop_domain='{shop_domain}', handle='{product_handle}'")

        if url_prefix:
            # Clean up the prefix
            prefix = url_prefix.strip().rstrip('/')

            # Check if url_prefix is a full URL with protocol
            if prefix.startswith('http://') or prefix.startswith('https://'):
                url = f"{prefix}/products/{product_handle}"
                print(f"      [DEBUG] Using url_prefix with protocol: {url}")
                return url
            elif '.' in prefix:
                # It's a domain without protocol (e.g., "dresswithsoul.com")
                url = f"https://{prefix}/products/{product_handle}"
                print(f"      [DEBUG] Using url_prefix as domain: {url}")
                return url

        # Fallback to shop_domain (only if no url_prefix)
        url = f"https://{shop_domain}/products/{product_handle}"
        print(f"      [DEBUG] Fallback to shop_domain: {url}")
        return url

    def _build_collection_url(
        self,
        shop_domain: str,
        collection_handle: str,
        position_in_collection: int,
        products_per_page: int,
        url_prefix: str = ''
    ) -> str:
        """Build collection URL with page parameter based on product position.

        If url_prefix is set, use it as the base domain.
        Otherwise fallback to shop_domain (myshopify.com domain).
        """
        print(f"      [DEBUG] _build_collection_url: url_prefix='{url_prefix}', shop_domain='{shop_domain}', handle='{collection_handle}'")

        if url_prefix:
            # Clean up the prefix
            prefix = url_prefix.strip().rstrip('/')

            # Check if url_prefix is a full URL with protocol
            if prefix.startswith('http://') or prefix.startswith('https://'):
                base_url = prefix
                print(f"      [DEBUG] Using url_prefix with protocol: {base_url}")
            elif '.' in prefix:
                # It's a domain without protocol (e.g., "dresswithsoul.com")
                base_url = f"https://{prefix}"
                print(f"      [DEBUG] Using url_prefix as domain: {base_url}")
            else:
                base_url = f"https://{shop_domain}"
                print(f"      [DEBUG] url_prefix invalid, fallback to shop_domain: {base_url}")
        else:
            base_url = f"https://{shop_domain}"
            print(f"      [DEBUG] No url_prefix, using shop_domain: {base_url}")

        # Calculate page number (1-indexed)
        page = (position_in_collection // products_per_page) + 1

        url = f"{base_url}/collections/{collection_handle}"
        if page > 1:
            url = f"{url}?page={page}"
        return url

    def create_campaign_with_creatives(
        self,
        ad_account_id: str,
        winner: WinnerProduct,
        creatives: List[GeneratedCreative],
        creative_type: str,  # 'video' or 'image'
        link_type: str,  # 'product' or 'collection'
        shop_domain: str,
        settings: WinnerScalingSettings,
        original_settings: Optional[OriginalCampaignSettings] = None,
        pinterest_settings: Optional[PinterestSettings] = None,
        position_in_collection: int = 0
    ) -> CampaignCreationResult:
        """
        Create a Pinterest campaign with ad group and pins.
        Copies settings from original campaign if provided.
        Creates pins for both product and collection links if enabled.
        """
        # Get Pinterest settings values
        url_prefix = pinterest_settings.url_prefix if pinterest_settings else ''
        products_per_page = pinterest_settings.products_per_page if pinterest_settings else 10
        default_board_id = pinterest_settings.default_board_id if pinterest_settings else None

        print(f"      [DEBUG] Pinterest Settings - url_prefix: '{url_prefix}', products_per_page: {products_per_page}, board_id: {default_board_id}")

        # Build campaign name
        creative_count = len(creatives)
        creative_label = f"{creative_count}x {'Videos' if creative_type == 'video' else 'Images'}"
        link_label = "Link to Product" if link_type == 'product' else "Link to Collection"
        campaign_name = f"{winner.product_title[:50]} | {creative_label} | {link_label}"

        # Build destination URL based on link type
        if link_type == 'product':
            if not winner.product_handle:
                return CampaignCreationResult(
                    success=False,
                    error_message="No product_handle available for product link"
                )
            destination_url = self._build_product_url(shop_domain, winner.product_handle, url_prefix)
        else:
            if not winner.collection_handle:
                return CampaignCreationResult(
                    success=False,
                    error_message="No collection_handle available for collection link"
                )
            destination_url = self._build_collection_url(
                shop_domain, winner.collection_handle,
                position_in_collection, products_per_page, url_prefix
            )

        print(f"      Destination URL: {destination_url}")

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
                index=i,
                board_id=default_board_id,
                cover_image_url=winner.shopify_image_url
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

    def _upload_video_to_pinterest(self, video_url: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Upload a video to Pinterest Media API using multipart upload and wait for processing.

        Pinterest requires videos to be uploaded in parts for larger files.
        The flow is:
        1. Register upload to get media_id and upload parameters
        2. Upload video in chunks using multipart upload
        3. Poll for processing status

        Returns:
            Tuple of (media_id, error_message)
        """
        import time
        import hashlib
        import base64
        import math

        # Step 1: Download video first to get file size
        try:
            print(f"      Downloading video from storage...")
            video_response = requests.get(video_url, timeout=120)
            video_response.raise_for_status()
            video_bytes = video_response.content
            file_size = len(video_bytes)
            print(f"      Video size: {file_size / 1024 / 1024:.2f} MB")
        except Exception as e:
            return None, f"Video download error: {str(e)}"

        # Step 2: Register the video upload with file size
        # Pinterest uses this to determine upload_url and upload_parameters
        register_data = {
            'media_type': 'video'
        }

        register_result, error = self._make_request(
            'POST',
            'media',
            data=register_data
        )

        if error:
            return None, f"Video registration failed: {error}"

        media_id = register_result.get('media_id')
        upload_url = register_result.get('upload_url')
        upload_parameters = register_result.get('upload_parameters', {})

        if not media_id or not upload_url:
            return None, f"Invalid media registration response: {register_result}"

        print(f"      Registered video upload, media_id: {media_id}")

        # Step 3: Upload video using multipart form upload
        # Pinterest's upload_url expects a multipart form with the video file
        try:
            # Pinterest S3 upload requires specific form fields from upload_parameters
            # plus the 'file' field with the actual video

            # Build multipart form data
            from requests_toolbelt import MultipartEncoder

            # Create form fields from upload_parameters
            form_fields = {}
            for key, value in upload_parameters.items():
                form_fields[key] = value

            # Add the file as the last field (required by S3)
            form_fields['file'] = ('video.mp4', video_bytes, 'video/mp4')

            encoder = MultipartEncoder(fields=form_fields)

            upload_response = requests.post(
                upload_url,
                data=encoder,
                headers={'Content-Type': encoder.content_type},
                timeout=300
            )

            if upload_response.status_code not in [200, 201, 204]:
                return None, f"Video upload failed: {upload_response.status_code} - {upload_response.text}"

            print(f"      Video uploaded to Pinterest successfully")

        except ImportError:
            # Fallback without requests_toolbelt - use standard multipart
            try:
                files = {'file': ('video.mp4', video_bytes, 'video/mp4')}
                data = upload_parameters

                upload_response = requests.post(
                    upload_url,
                    files=files,
                    data=data,
                    timeout=300
                )

                if upload_response.status_code not in [200, 201, 204]:
                    return None, f"Video upload failed: {upload_response.status_code} - {upload_response.text}"

                print(f"      Video uploaded to Pinterest successfully")

            except Exception as e:
                return None, f"Video upload error: {str(e)}"

        except Exception as e:
            return None, f"Video upload error: {str(e)}"

        # Step 4: Poll for processing status
        max_wait = 300  # 5 minutes
        poll_interval = 10
        elapsed = 0

        while elapsed < max_wait:
            status_result, error = self._make_request(
                'GET',
                f'media/{media_id}'
            )

            if error:
                return None, f"Video status check failed: {error}"

            status = status_result.get('status')
            print(f"      Video processing status: {status} ({elapsed}s)")

            if status == 'succeeded':
                return media_id, None
            elif status == 'failed':
                return None, f"Video processing failed: {status_result}"

            time.sleep(poll_interval)
            elapsed += poll_interval

        return None, f"Video processing timed out after {max_wait}s"

    def _create_pin(
        self,
        ad_account_id: str,
        ad_group_id: str,
        creative: GeneratedCreative,
        title: str,
        destination_url: str,
        index: int,
        board_id: Optional[str] = None,
        cover_image_url: Optional[str] = None
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """Create a Pinterest Pin with the generated creative."""

        # Get a board_id if not provided
        if not board_id:
            board_id = self.get_first_board_id()
            if not board_id:
                return None, "No board available - cannot create pin without a board"

        # First, create the organic pin
        if creative.creative_type == 'video':
            # For videos, we need to upload first and get a media_id
            media_id, error = self._upload_video_to_pinterest(creative.url)
            if error:
                return None, f"Video upload failed: {error}"

            pin_data = {
                'title': title,
                'description': f"{title} - Jetzt entdecken!",
                'link': destination_url,
                'board_id': board_id,
                'media_source': {
                    'source_type': 'video_id',
                    'media_id': media_id,
                    'cover_image_url': cover_image_url
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

        # Determine ad creative type based on pin media type
        # VIDEO for video pins, REGULAR for image pins
        ad_creative_type = 'VIDEO' if creative.creative_type == 'video' else 'REGULAR'

        # For video pins, wait for Pinterest to transcode before creating ad
        # Pinterest needs time to process the video after pin creation
        if creative.creative_type == 'video':
            import time
            print(f"      Waiting for video pin transcoding...")
            time.sleep(15)  # Initial wait

        # Now create the ad (promoted pin) - API expects an array
        # For video pins, retry if transcoding is not complete
        max_retries = 5 if creative.creative_type == 'video' else 1
        retry_delay = 10

        for attempt in range(max_retries):
            ad_data = [{
                'ad_account_id': ad_account_id,
                'ad_group_id': ad_group_id,
                'creative_type': ad_creative_type,
                'pin_id': pin_id,
                'name': f"{title} - Ad {index + 1}",
                'status': 'ACTIVE'
            }]

            ad_result, error = self._make_request(
                'POST',
                f'ad_accounts/{ad_account_id}/ads',
                data=ad_data
            )

            if error:
                return {'id': pin_id}, f"Ad creation failed: {error}"

            # Extract ad ID from array response
            if ad_result and 'items' in ad_result and len(ad_result['items']) > 0:
                item = ad_result['items'][0]
                exceptions = item.get('exceptions', [])

                # Check for transcoding error (code 2945)
                if exceptions:
                    error_code = exceptions[0].get('code') if exceptions else None
                    if error_code == 2945 and attempt < max_retries - 1:
                        # Video still transcoding, wait and retry
                        import time
                        print(f"      Video still transcoding, retrying in {retry_delay}s... (attempt {attempt + 2}/{max_retries})")
                        time.sleep(retry_delay)
                        continue
                    return {'id': pin_id}, f"Ad creation error: {exceptions}"

                ad_id = item.get('data', item).get('id') if isinstance(item.get('data', item), dict) else item.get('id')
                return {'id': pin_id, 'ad_id': ad_id}, None

            return {'id': pin_id}, f"Unexpected ad API response: {ad_result}"

        return {'id': pin_id}, f"Ad creation failed after {max_retries} retries - video transcoding timeout"

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
