"""
Pinterest API Service for Pinterest Sync Job
Handles pin creation, token refresh, and image processing
"""
import os
import re
import time
import requests
import base64
import tempfile
from io import BytesIO
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("WARNING: Pillow not installed. Image resizing will be skipped.")

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ShopifyProduct, PinterestPin, SyncResult


class PinterestAPIClient:
    """Pinterest API v5 Client for creating pins."""

    BASE_URL = "https://api.pinterest.com/v5"

    # Pinterest limits
    MAX_TITLE_LENGTH = 100
    MAX_DESCRIPTION_LENGTH = 500

    # Pinterest optimal image size (2:3 ratio)
    PIN_WIDTH = 1000
    PIN_HEIGHT = 1500

    def __init__(self, access_token: str, refresh_token: Optional[str] = None,
                 expires_at: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.expires_at = expires_at
        self.last_request_time = 0
        self.min_request_interval = 0.5  # Pinterest rate limits

        # App credentials for token refresh
        self.app_id = os.environ.get('PINTEREST_APP_ID', '')
        self.app_secret = os.environ.get('PINTEREST_APP_SECRET', '')

    @property
    def headers(self) -> Dict:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def _rate_limit(self):
        """Implement rate limiting."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)

    def is_token_expired(self) -> bool:
        """Check if the access token is expired."""
        if not self.expires_at:
            return False

        try:
            expiry = datetime.fromisoformat(self.expires_at.replace('Z', '+00:00'))
            # Consider expired if less than 5 minutes remaining
            return datetime.now(timezone.utc) >= (expiry - timedelta(minutes=5))
        except:
            return False

    def refresh_access_token(self) -> Optional[Dict]:
        """Refresh the Pinterest access token."""
        if not self.refresh_token or not self.app_id or not self.app_secret:
            print("Cannot refresh token: missing refresh_token or app credentials")
            return None

        try:
            response = requests.post(
                f"{self.BASE_URL}/oauth/token",
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': self.refresh_token
                },
                auth=(self.app_id, self.app_secret),
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )

            if response.ok:
                tokens = response.json()
                self.access_token = tokens.get('access_token')

                if tokens.get('refresh_token'):
                    self.refresh_token = tokens.get('refresh_token')

                expires_in = tokens.get('expires_in', 3600)
                self.expires_at = (
                    datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                ).isoformat()

                print("  Pinterest token refreshed successfully")
                return {
                    'access_token': self.access_token,
                    'refresh_token': self.refresh_token,
                    'expires_at': self.expires_at
                }
            else:
                print(f"  Failed to refresh token: {response.status_code} - {response.text[:200]}")
                return None

        except Exception as e:
            print(f"  Error refreshing token: {e}")
            return None

    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Optional[Dict]:
        """Make HTTP request with error handling."""
        self._rate_limit()

        url = f"{self.BASE_URL}/{endpoint}"
        max_retries = 3
        retry_count = 0

        while retry_count < max_retries:
            try:
                if method == "GET":
                    response = requests.get(url, headers=self.headers, timeout=30)
                elif method == "POST":
                    response = requests.post(url, headers=self.headers, json=data, timeout=30)
                elif method == "DELETE":
                    response = requests.delete(url, headers=self.headers, timeout=30)
                else:
                    raise ValueError(f"Unsupported method: {method}")

                self.last_request_time = time.time()

                if response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 5))
                    print(f"    Pinterest rate limited, waiting {retry_after}s...")
                    time.sleep(retry_after)
                    retry_count += 1
                    continue

                if response.status_code == 401:
                    # Token might be expired, try refresh
                    if self.refresh_token:
                        print("    Token expired, attempting refresh...")
                        new_tokens = self.refresh_access_token()
                        if new_tokens:
                            retry_count += 1
                            continue
                    return None

                if response.status_code >= 400:
                    print(f"    Pinterest API Error {response.status_code}: {response.text}")
                    if response.status_code in [500, 502, 503, 504]:
                        retry_count += 1
                        time.sleep(2 ** retry_count)
                        continue
                    return None

                return response.json()

            except requests.exceptions.RequestException as e:
                retry_count += 1
                if retry_count >= max_retries:
                    print(f"    Request failed after {max_retries} retries: {e}")
                    return None
                time.sleep(2 ** retry_count)

        return None

    def test_connection(self) -> bool:
        """Test connection to Pinterest API."""
        result = self._make_request("GET", "user_account")
        return result is not None

    def get_boards(self) -> List[Dict]:
        """Get user's boards."""
        boards = []
        bookmark = None

        print("  Fetching Pinterest boards...")

        while True:
            endpoint = "boards?page_size=100"
            if bookmark:
                endpoint += f"&bookmark={bookmark}"

            result = self._make_request("GET", endpoint)
            if not result:
                print("  [WARNING] Failed to fetch boards from Pinterest API")
                print("  This might be due to missing 'boards:read' scope in the access token")
                break

            items = result.get('items', [])
            print(f"  Found {len(items)} boards in this page")

            for board in items:
                print(f"    - {board.get('name')} (ID: {board.get('id')})")

            boards.extend(items)
            bookmark = result.get('bookmark')
            if not bookmark:
                break

        print(f"  Total boards found: {len(boards)}")
        return boards

    def _clean_html(self, text: str) -> str:
        """Remove HTML tags from text."""
        if not text:
            return ''
        return re.sub(r'<[^>]+>', '', text).strip()

    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text to max length, trying to break at word boundary."""
        if not text or len(text) <= max_length:
            return text or ''

        # Try to break at word boundary
        truncated = text[:max_length]
        last_space = truncated.rfind(' ')
        if last_space > max_length * 0.7:  # Only if we don't lose too much
            truncated = truncated[:last_space]

        return truncated.rstrip() + '...'

    def _download_and_resize_image(self, image_url: str) -> Optional[str]:
        """
        Download image from URL and resize to Pinterest optimal format (1000x1500px).
        Returns base64 encoded image string or None on failure.

        The image is cropped/fitted to 2:3 ratio (Pinterest optimal).
        """
        if not PIL_AVAILABLE:
            return None

        try:
            # Download image
            response = requests.get(image_url, timeout=30)
            if not response.ok:
                print(f"    Failed to download image: {response.status_code}")
                return None

            # Open image
            img = Image.open(BytesIO(response.content))

            # Convert to RGB if necessary (handle RGBA, P mode etc.)
            if img.mode in ('RGBA', 'P', 'LA'):
                # Create white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Calculate target dimensions maintaining aspect ratio
            # Pinterest prefers 2:3 ratio (1000x1500)
            target_ratio = self.PIN_WIDTH / self.PIN_HEIGHT  # 0.667

            orig_width, orig_height = img.size
            orig_ratio = orig_width / orig_height

            if orig_ratio > target_ratio:
                # Image is wider - crop sides
                new_width = int(orig_height * target_ratio)
                offset = (orig_width - new_width) // 2
                img = img.crop((offset, 0, offset + new_width, orig_height))
            elif orig_ratio < target_ratio:
                # Image is taller - crop top/bottom
                new_height = int(orig_width / target_ratio)
                offset = (orig_height - new_height) // 2
                img = img.crop((0, offset, orig_width, offset + new_height))

            # Resize to target dimensions
            img = img.resize((self.PIN_WIDTH, self.PIN_HEIGHT), Image.Resampling.LANCZOS)

            # Save to buffer as JPEG
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=90, optimize=True)
            buffer.seek(0)

            # Encode as base64
            return base64.b64encode(buffer.read()).decode('utf-8')

        except Exception as e:
            print(f"    Error processing image: {e}")
            return None

    def create_pin(self, pin: PinterestPin, board_id: str) -> Optional[Dict]:
        """Create an organic pin on a board with resized image."""
        # Try to resize image to Pinterest optimal format (1000x1500)
        resized_image_b64 = self._download_and_resize_image(pin.media_source_url)

        if resized_image_b64:
            # Use base64 encoded resized image
            data = {
                "board_id": board_id,
                "title": self._truncate_text(pin.title, self.MAX_TITLE_LENGTH),
                "description": self._truncate_text(pin.description, self.MAX_DESCRIPTION_LENGTH),
                "media_source": {
                    "source_type": "image_base64",
                    "content_type": "image/jpeg",
                    "data": resized_image_b64
                }
            }
            print(f"        Using resized image (1000x1500)")
        else:
            # Fallback to original URL if resizing fails
            data = {
                "board_id": board_id,
                "title": self._truncate_text(pin.title, self.MAX_TITLE_LENGTH),
                "description": self._truncate_text(pin.description, self.MAX_DESCRIPTION_LENGTH),
                "media_source": {
                    "source_type": "image_url",
                    "url": pin.media_source_url
                }
            }
            print(f"        Using original image URL (resize failed)")

        # Only add link if it's not empty
        if pin.link:
            data["link"] = pin.link

        result = self._make_request("POST", "pins", data)
        return result

    def create_product_pin(self, product: ShopifyProduct, board_id: str,
                           product_url: str) -> SyncResult:
        """Create a pin from a Shopify product.

        Uses the original Shopify product title and description,
        only cleaning HTML and truncating to Pinterest limits.
        """
        if not product.primary_image_url:
            return SyncResult(
                success=False,
                shopify_product_id=product.id,
                error="Product has no images"
            )

        # Use original Shopify title (truncate if needed)
        title = self._truncate_text(product.title, self.MAX_TITLE_LENGTH)

        # Use original Shopify description (clean HTML, truncate if needed)
        description = self._clean_html(product.description)
        description = self._truncate_text(description, self.MAX_DESCRIPTION_LENGTH)

        pin = PinterestPin(
            title=title,
            description=description,
            link=product_url if product_url else '',
            media_source_url=product.primary_image_url
        )

        result = self.create_pin(pin, board_id)

        if result and result.get('id'):
            return SyncResult(
                success=True,
                shopify_product_id=product.id,
                pinterest_pin_id=result.get('id')
            )
        else:
            return SyncResult(
                success=False,
                shopify_product_id=product.id,
                error="Failed to create pin"
            )

    def get_ad_accounts(self) -> List[Dict]:
        """Get user's ad accounts."""
        result = self._make_request("GET", "ad_accounts")
        return result.get('items', []) if result else []

    def get_campaigns(self, ad_account_id: str) -> List[Dict]:
        """Get campaigns for an ad account."""
        result = self._make_request("GET", f"ad_accounts/{ad_account_id}/campaigns")
        return result.get('items', []) if result else []

    def get_ad_groups(self, ad_account_id: str, campaign_id: str) -> List[Dict]:
        """Get ad groups for a campaign."""
        result = self._make_request(
            "GET",
            f"ad_accounts/{ad_account_id}/ad_groups?campaign_ids={campaign_id}"
        )
        return result.get('items', []) if result else []

    def create_ad_group(self, ad_account_id: str, campaign_id: str, name: str,
                        budget_in_micro_currency: int = 1000000) -> Optional[Dict]:
        """
        Create an ad group within a campaign.

        Args:
            ad_account_id: Pinterest ad account ID
            campaign_id: Pinterest campaign ID
            name: Name for the ad group
            budget_in_micro_currency: Budget in micro currency (1000000 = 1 EUR/USD)

        Returns:
            Created ad group data or None
        """
        data = {
            "ad_account_id": ad_account_id,
            "campaign_id": campaign_id,
            "name": name,
            "status": "ACTIVE",
            "budget_in_micro_currency": budget_in_micro_currency,
            "bid_strategy_type": "AUTOMATIC_BID",
            "billable_event": "CLICKTHROUGH"
        }

        result = self._make_request("POST", f"ad_accounts/{ad_account_id}/ad_groups", data)
        return result

    def create_ad(self, ad_account_id: str, ad_group_id: str, pin_id: str,
                  name: str) -> Optional[Dict]:
        """
        Create a promoted pin (ad) from an organic pin.

        Args:
            ad_account_id: Pinterest ad account ID
            ad_group_id: Pinterest ad group ID
            pin_id: The organic pin ID to promote
            name: Name for the ad

        Returns:
            Created ad data or None
        """
        # Pinterest API expects an array of ad objects
        # Required fields: ad_group_id, creative_type, pin_id
        # Optional: name, status
        data = [
            {
                "ad_group_id": ad_group_id,
                "creative_type": "REGULAR",
                "pin_id": pin_id,
                "name": name,
                "status": "ACTIVE"
            }
        ]

        result = self._make_request("POST", f"ad_accounts/{ad_account_id}/ads", data)

        # API returns {"items": [...]} - extract first item
        if result and 'items' in result and len(result['items']) > 0:
            return result['items'][0]
        return result

    def get_or_create_ad_group_for_campaign(self, ad_account_id: str,
                                             pinterest_campaign_id: str,
                                             campaign_name: str) -> Optional[str]:
        """
        Get existing ad group for campaign or create one if none exists.

        Returns ad_group_id or None.
        """
        # First try to get existing ad groups
        ad_groups = self.get_ad_groups(ad_account_id, pinterest_campaign_id)

        if ad_groups:
            # Use first active ad group
            for ag in ad_groups:
                if ag.get('status') == 'ACTIVE':
                    print(f"        Using existing ad group: {ag.get('name')} ({ag.get('id')})")
                    return ag.get('id')

            # If no active, use first one
            print(f"        Using existing ad group: {ad_groups[0].get('name')} ({ad_groups[0].get('id')})")
            return ad_groups[0].get('id')

        # No ad groups exist, create one
        print(f"        Creating new ad group for campaign...")
        new_ad_group = self.create_ad_group(
            ad_account_id=ad_account_id,
            campaign_id=pinterest_campaign_id,
            name=f"{campaign_name} - Auto Generated"
        )

        if new_ad_group and new_ad_group.get('id'):
            print(f"        Created ad group: {new_ad_group.get('id')}")
            return new_ad_group.get('id')

        print(f"        Failed to create ad group")
        return None
