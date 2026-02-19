"""
Pinterest OAuth & API Routes
Handles Pinterest connection and pin management.
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


# =====================================================
# RESPONSE MODELS
# =====================================================

class PinterestPlatform(BaseModel):
    id: str
    platform_user_id: Optional[str] = None
    platform_username: Optional[str] = None
    ad_account_id: Optional[str] = None
    ad_account_name: Optional[str] = None
    connection_status: str = "disconnected"
    token_expires_at: Optional[str] = None
    last_sync_at: Optional[str] = None


class StatusResponse(BaseModel):
    success: bool
    connected: bool
    platform: Optional[PinterestPlatform] = None


class AdAccount(BaseModel):
    id: str
    name: str
    country: str
    currency: str


class AdAccountsResponse(BaseModel):
    success: bool
    ad_accounts: List[AdAccount]


class Board(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    privacy: str = "PUBLIC"
    pin_count: int = 0


class BoardsResponse(BaseModel):
    success: bool
    boards: List[Board]


class SelectAdAccountRequest(BaseModel):
    ad_account_id: str
    ad_account_name: str


class SuccessResponse(BaseModel):
    success: bool
    message: Optional[str] = None


# =====================================================
# STATUS ENDPOINT
# =====================================================

@router.get("/status", response_model=StatusResponse)
async def get_pinterest_status():
    """Get Pinterest connection status for the current user."""
    # TODO: Get actual status from database based on user
    # For now, return disconnected state
    return StatusResponse(
        success=True,
        connected=False,
        platform=None
    )


# =====================================================
# OAUTH ENDPOINTS
# =====================================================

@router.get("/authorize")
async def authorize_pinterest(user_id: str = Query(...)):
    """Start Pinterest OAuth flow."""
    logger.info(f"Pinterest OAuth requested for user: {user_id}")
    # TODO: Implement Pinterest OAuth
    # For now, redirect to frontend with error
    frontend_url = "http://localhost:3001"  # TODO: Use config
    return RedirectResponse(
        url=f"{frontend_url}/pinterest?error=oauth_not_implemented"
    )


@router.get("/oauth/callback")
async def pinterest_oauth_callback(code: str, state: str):
    """Handle Pinterest OAuth callback."""
    # TODO: Implement callback handling
    raise HTTPException(
        status_code=501,
        detail="Pinterest OAuth noch nicht implementiert."
    )


# =====================================================
# AD ACCOUNT ENDPOINTS
# =====================================================

@router.get("/ad-accounts", response_model=AdAccountsResponse)
async def get_ad_accounts():
    """Get available Pinterest ad accounts."""
    # TODO: Get actual ad accounts from Pinterest API
    return AdAccountsResponse(
        success=True,
        ad_accounts=[]
    )


@router.post("/select-ad-account", response_model=SuccessResponse)
async def select_ad_account(data: SelectAdAccountRequest):
    """Select a Pinterest ad account for campaigns."""
    logger.info(f"Selecting ad account: {data.ad_account_id} ({data.ad_account_name})")
    # TODO: Save selection to database
    return SuccessResponse(
        success=True,
        message=f"Ad account {data.ad_account_name} ausgewählt."
    )


# =====================================================
# BOARD ENDPOINTS
# =====================================================

@router.get("/boards", response_model=BoardsResponse)
async def get_boards():
    """Get available Pinterest boards."""
    # TODO: Get actual boards from Pinterest API
    return BoardsResponse(
        success=True,
        boards=[]
    )


# =====================================================
# DISCONNECT
# =====================================================

@router.post("/disconnect", response_model=SuccessResponse)
async def disconnect_pinterest():
    """Disconnect Pinterest account."""
    # TODO: Remove tokens from database
    logger.info("Pinterest disconnect requested")
    return SuccessResponse(
        success=True,
        message="Pinterest wurde getrennt."
    )


# =====================================================
# LEGACY ENDPOINTS (kept for compatibility)
# =====================================================

@router.get("/accounts")
async def list_pinterest_accounts():
    """List connected Pinterest accounts."""
    # TODO: Implement
    return {
        "success": True,
        "accounts": []
    }


@router.delete("/accounts/{account_id}")
async def delete_pinterest_account(account_id: str):
    """Disconnect a Pinterest account by ID."""
    # TODO: Implement
    raise HTTPException(status_code=404, detail="Account nicht gefunden.")
