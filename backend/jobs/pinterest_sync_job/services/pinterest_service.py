"""
Pinterest API Service for Pinterest Sync Job
Handles pin creation and token refresh
"""
import os
import re
import time
import requests
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ShopifyProduct, PinterestPin, SyncResult


class PinterestAPIClient:
    """Pinterest API v5 Client for creating pins."""

    BASE_URL = "https://api.pinterest.com/v5"

    # Pinterest limits
    MAX_TITLE_LENGTH = 100
    MAX_DESCRIPTION_LENGTH = 500

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

    def create_pin(self, pin: PinterestPin, board_id: str) -> Optional[Dict]:
        """Create an organic pin on a board."""
        data = {
            "board_id": board_id,
            "title": self._truncate_text(pin.title, self.MAX_TITLE_LENGTH),
            "description": self._truncate_text(pin.description, self.MAX_DESCRIPTION_LENGTH),
            "media_source": {
                "source_type": "image_url",
                "url": pin.media_source_url
            }
        }

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
