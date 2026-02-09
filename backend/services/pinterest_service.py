"""
Pinterest Service
Handles Pinterest API interactions for pins and boards.
"""
import os
import sys
from typing import Optional, List, Dict
import logging
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

logger = logging.getLogger(__name__)

# Pinterest API Base URL
API_BASE = "https://api.pinterest.com/v5"


class PinterestService:
    """Service class for Pinterest API operations."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Make a request to Pinterest API."""
        url = f"{API_BASE}/{endpoint}"
        
        async with httpx.AsyncClient() as client:
            try:
                if method == "GET":
                    response = await client.get(url, headers=self.headers)
                elif method == "POST":
                    response = await client.post(url, headers=self.headers, json=data)
                elif method == "PATCH":
                    response = await client.patch(url, headers=self.headers, json=data)
                elif method == "DELETE":
                    response = await client.delete(url, headers=self.headers)
                else:
                    raise ValueError(f"Unknown method: {method}")
                
                response.raise_for_status()
                return response.json() if response.content else None
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Pinterest API error: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Pinterest request failed: {e}")
                raise
    
    # =====================================================
    # USER INFO
    # =====================================================
    
    async def get_user_account(self) -> Dict:
        """Get the authenticated user's account info."""
        result = await self._request("GET", "user_account")
        return result or {}
    
    # =====================================================
    # BOARDS
    # =====================================================
    
    async def get_boards(self) -> List[Dict]:
        """Get all boards for the user."""
        result = await self._request("GET", "boards")
        return result.get("items", []) if result else []
    
    async def create_board(
        self,
        name: str,
        description: str = "",
        privacy: str = "PUBLIC"
    ) -> Optional[Dict]:
        """Create a new board."""
        data = {
            "name": name,
            "description": description,
            "privacy": privacy
        }
        return await self._request("POST", "boards", data)
    
    async def get_board(self, board_id: str) -> Optional[Dict]:
        """Get a specific board."""
        return await self._request("GET", f"boards/{board_id}")
    
    # =====================================================
    # PINS
    # =====================================================
    
    async def create_pin(
        self,
        board_id: str,
        title: str,
        description: str,
        link: str,
        media_url: str,
        alt_text: str = None
    ) -> Optional[Dict]:
        """
        Create a pin on a board.
        
        Args:
            board_id: Target board ID
            title: Pin title
            description: Pin description
            link: URL the pin links to
            media_url: URL of the image
            alt_text: Alternative text for the image
        
        Returns:
            Created pin data
        """
        data = {
            "board_id": board_id,
            "title": title[:100],  # Pinterest limit
            "description": description[:500],  # Pinterest limit
            "link": link,
            "media_source": {
                "source_type": "image_url",
                "url": media_url
            }
        }
        
        if alt_text:
            data["alt_text"] = alt_text[:500]
        
        return await self._request("POST", "pins", data)
    
    async def get_pin(self, pin_id: str) -> Optional[Dict]:
        """Get a specific pin."""
        return await self._request("GET", f"pins/{pin_id}")
    
    async def delete_pin(self, pin_id: str) -> bool:
        """Delete a pin."""
        try:
            await self._request("DELETE", f"pins/{pin_id}")
            return True
        except Exception:
            return False
    
    async def get_board_pins(self, board_id: str, limit: int = 25) -> List[Dict]:
        """Get pins from a board."""
        result = await self._request("GET", f"boards/{board_id}/pins?page_size={limit}")
        return result.get("items", []) if result else []
    
    # =====================================================
    # ANALYTICS (requires Business account)
    # =====================================================
    
    async def get_pin_analytics(
        self,
        pin_id: str,
        start_date: str,
        end_date: str,
        metric_types: List[str] = None
    ) -> Optional[Dict]:
        """Get analytics for a pin."""
        if metric_types is None:
            metric_types = ["IMPRESSION", "OUTBOUND_CLICK", "PIN_CLICK", "SAVE"]
        
        metrics = ",".join(metric_types)
        endpoint = f"pins/{pin_id}/analytics?start_date={start_date}&end_date={end_date}&metric_types={metrics}"
        
        return await self._request("GET", endpoint)
    
    # =====================================================
    # ADS (requires Ads account)
    # =====================================================
    
    async def get_ad_accounts(self) -> List[Dict]:
        """Get ad accounts for the user."""
        result = await self._request("GET", "ad_accounts")
        return result.get("items", []) if result else []
    
    async def create_campaign(
        self,
        ad_account_id: str,
        name: str,
        daily_spend_cap: int,  # In micro currency (e.g., cents * 1000000)
        objective_type: str = "AWARENESS"
    ) -> Optional[Dict]:
        """Create an ad campaign."""
        data = {
            "ad_account_id": ad_account_id,
            "name": name,
            "status": "ACTIVE",
            "daily_spend_cap": daily_spend_cap,
            "objective_type": objective_type
        }
        return await self._request("POST", f"ad_accounts/{ad_account_id}/campaigns", data)


# =====================================================
# OAUTH HELPERS
# =====================================================

async def exchange_code_for_token(code: str, redirect_uri: str) -> Optional[Dict]:
    """Exchange authorization code for access token."""
    url = "https://api.pinterest.com/v5/oauth/token"
    
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri
    }
    
    # Basic auth with client credentials
    import base64
    credentials = f"{settings.PINTEREST_CLIENT_ID}:{settings.PINTEREST_CLIENT_SECRET}"
    auth_header = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, data=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Pinterest token exchange failed: {e}")
            return None


async def refresh_access_token(refresh_token: str) -> Optional[Dict]:
    """Refresh an expired access token."""
    url = "https://api.pinterest.com/v5/oauth/token"
    
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    }
    
    import base64
    credentials = f"{settings.PINTEREST_CLIENT_ID}:{settings.PINTEREST_CLIENT_SECRET}"
    auth_header = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, data=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Pinterest token refresh failed: {e}")
            return None
