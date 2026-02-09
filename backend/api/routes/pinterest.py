"""
Pinterest OAuth & API Routes
Handles Pinterest connection and pin management.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class PinterestConnectRequest(BaseModel):
    """Request to start Pinterest OAuth."""
    pass  # No params needed, just trigger OAuth


@router.post("/oauth/start")
async def start_pinterest_oauth():
    """Start Pinterest OAuth flow."""
    # TODO: Implement Pinterest OAuth
    raise HTTPException(
        status_code=501,
        detail="Pinterest OAuth noch nicht implementiert."
    )


@router.get("/oauth/callback")
async def pinterest_oauth_callback(code: str, state: str):
    """Handle Pinterest OAuth callback."""
    # TODO: Implement callback handling
    raise HTTPException(
        status_code=501,
        detail="Pinterest OAuth noch nicht implementiert."
    )


@router.get("/accounts")
async def list_pinterest_accounts():
    """List connected Pinterest accounts."""
    # TODO: Implement
    return {
        "success": True,
        "accounts": []
    }


@router.delete("/accounts/{account_id}")
async def disconnect_pinterest(account_id: str):
    """Disconnect a Pinterest account."""
    # TODO: Implement
    raise HTTPException(status_code=404, detail="Account nicht gefunden.")
