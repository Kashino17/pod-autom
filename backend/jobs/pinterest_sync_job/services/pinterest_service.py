"""
Pinterest API Service for Pinterest Sync Job
Handles pin creation and token refresh
Uses GPT-5.1 for optimized pin descriptions
"""
import os
import time
import requests
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ShopifyProduct, PinterestPin, SyncResult
from services.openai_service import OpenAIService


class PinterestAPIClient:
    """Pinterest API v5 Client for creating pins."""

    BASE_URL = "https://api.pinterest.com/v5"

    def __init__(self, access_token: str, refresh_token: Optional[str] = None,
                 expires_at: Optional[str] = None, use_gpt: bool = True):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.expires_at = expires_at
        self.last_request_time = 0
        self.min_request_interval = 0.5  # Pinterest rate limits

        # App credentials for token refresh
        self.app_id = os.environ.get('PINTEREST_APP_ID', '')
        self.app_secret = os.environ.get('PINTEREST_APP_SECRET', '')

        # GPT-5.1 Service for optimized descriptions
        self.use_gpt = use_gpt
        self.openai_service = OpenAIService() if use_gpt else None

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
                    print(f"    Pinterest API Error {response.status_code}: {response.text[:200]}")
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

    def create_pin(self, pin: PinterestPin, board_id: str) -> Optional[Dict]:
        """Create an organic pin on a board.

        This creates a regular pin (not an ad pin).
        For Shopping Ads, pins are created through the Ads API.
        """
        data = {
            "board_id": board_id,
            "title": pin.title[:100],  # Pinterest max title length
            "description": pin.description[:500] if pin.description else '',
            "link": pin.link,
            "media_source": {
                "source_type": "image_url",
                "url": pin.media_source_url
            }
        }

        result = self._make_request("POST", "pins", data)
        return result

    def create_product_pin(self, product: ShopifyProduct, board_id: str,
                           product_url: str) -> SyncResult:
        """Create a pin from a Shopify product using GPT-5.1 for descriptions."""
        if not product.primary_image_url:
            return SyncResult(
                success=False,
                shopify_product_id=product.id,
                error="Product has no images"
            )

        # Use GPT-5.1 to generate optimized description
        description = None
        title = product.title[:100]

        if self.use_gpt and self.openai_service:
            # Try to generate optimized description with GPT-5.1
            gpt_description = self.openai_service.generate_pin_description(
                product_title=product.title,
                product_description=product.description,
                product_tags=product.tags
            )
            if gpt_description:
                description = gpt_description
                print(f"        [GPT-5.1] Generated optimized description")

            # Optionally optimize title too
            gpt_title = self.openai_service.generate_pin_title(product.title)
            if gpt_title:
                title = gpt_title

        # Fallback: Clean up description manually (remove HTML)
        if not description:
            description = product.description
            if description:
                import re
                description = re.sub(r'<[^>]+>', '', description)
                description = description[:500]

        pin = PinterestPin(
            title=title,
            description=description or '',
            link=product_url,
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

    def create_ad_pin(self, ad_account_id: str, product: ShopifyProduct,
                      product_url: str) -> SyncResult:
        """Create a product pin for advertising.

        Note: For Shopping Ads, you typically need to:
        1. Have a product catalog synced
        2. Create a campaign with shopping objective
        3. Create ad groups targeting the catalog

        This creates a simple promoted pin for now.
        """
        if not product.primary_image_url:
            return SyncResult(
                success=False,
                shopify_product_id=product.id,
                error="Product has no images"
            )

        # Clean description
        description = product.description or ''
        if description:
            import re
            description = re.sub(r'<[^>]+>', '', description)
            description = description[:500]

        # Create pin for ads
        data = {
            "ad_account_id": ad_account_id,
            "title": product.title[:100],
            "description": description,
            "link": product_url,
            "media_source": {
                "source_type": "image_url",
                "url": product.primary_image_url
            }
        }

        result = self._make_request("POST", f"ad_accounts/{ad_account_id}/pins", data)

        if result and result.get('id'):
            return SyncResult(
                success=True,
                shopify_product_id=product.id,
                pinterest_pin_id=result.get('id')
            )
        else:
            # Try creating as organic pin if ad pin fails
            print(f"    Ad pin creation failed, this may require catalog setup")
            return SyncResult(
                success=False,
                shopify_product_id=product.id,
                error="Ad pin creation requires catalog setup"
            )

    def get_campaigns(self, ad_account_id: str) -> List[Dict]:
        """Get campaigns for an ad account."""
        result = self._make_request("GET", f"ad_accounts/{ad_account_id}/campaigns")
        return result.get('items', []) if result else []
