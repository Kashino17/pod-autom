"""
Shopify OAuth & API Routes
Handles shop connection and Shopify API interactions.
"""
import os
import sys
import secrets
import hashlib
import base64
import hmac
from urllib.parse import urlencode, parse_qs
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import settings
from api.auth import get_current_user, User
from services.supabase_service import supabase_client

router = APIRouter()


# =====================================================
# MODELS
# =====================================================

class ShopConnectRequest(BaseModel):
    shop_domain: str  # e.g., "mystore.myshopify.com"


class ShopResponse(BaseModel):
    id: str
    shop_domain: str
    shop_name: Optional[str]
    connection_status: str
    last_sync_at: Optional[str]


# =====================================================
# OAUTH HELPERS
# =====================================================

def generate_nonce() -> str:
    """Generate a random nonce for OAuth state."""
    return secrets.token_urlsafe(32)


def verify_hmac(query_params: dict, secret: str) -> bool:
    """Verify Shopify's HMAC signature."""
    hmac_param = query_params.pop("hmac", [None])[0]
    if not hmac_param:
        return False
    
    # Sort and encode remaining params
    sorted_params = "&".join(
        f"{key}={value[0]}" 
        for key, value in sorted(query_params.items())
        if key != "hmac"
    )
    
    # Calculate HMAC
    calculated_hmac = hmac.new(
        secret.encode("utf-8"),
        sorted_params.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(calculated_hmac, hmac_param)


# =====================================================
# ROUTES
# =====================================================

@router.get("/install")
async def get_install_link(
    user_id: str = Query(None),
    shop: str = Query(None)
):
    """
    Get the Shopify App install link for Managed Installation.
    For Unlisted Apps: Uses the install URL that triggers OAuth.
    
    Usage: Redirect users to /api/shopify/install?user_id=xxx&shop=mystore.myshopify.com
    """
    if not settings.SHOPIFY_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Shopify App nicht konfiguriert."
        )
    
    # Clean shop domain if provided
    shop_domain = None
    if shop:
        shop_domain = shop.strip().lower()
        if not shop_domain.endswith(".myshopify.com"):
            if "." not in shop_domain:
                shop_domain = f"{shop_domain}.myshopify.com"
    
    # Generate state with user_id encoded
    state = generate_nonce()
    
    # Store state in database
    if user_id:
        try:
            await supabase_client.store_oauth_state(
                user_id=user_id,
                state=state,
                shop_domain=shop_domain or "pending",
                provider="shopify"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Fehler: {e}")
    
    # Build OAuth URL
    params = {
        "client_id": settings.SHOPIFY_CLIENT_ID,
        "scope": settings.SHOPIFY_SCOPES,
        "redirect_uri": settings.SHOPIFY_REDIRECT_URI,
        "state": state,
    }
    
    if shop_domain:
        # Direct to specific shop
        auth_url = f"https://{shop_domain}/admin/oauth/authorize?{urlencode(params)}"
        return RedirectResponse(url=auth_url)
    else:
        # Return install URL for user to enter shop manually
        # This is the Managed Installation URL format
        install_url = f"https://admin.shopify.com/oauth/install_custom_app?client_id={settings.SHOPIFY_CLIENT_ID}"
        return {
            "success": True,
            "install_url": install_url,
            "message": "Öffne diesen Link und wähle deinen Shop aus.",
            "state": state
        }


@router.post("/oauth/start")
async def start_oauth(
    request: ShopConnectRequest,
    user: User = Depends(get_current_user)
):
    """
    Start Shopify OAuth flow.
    Returns the authorization URL to redirect the user to.
    """
    if not settings.SHOPIFY_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Shopify App nicht konfiguriert. Bitte SHOPIFY_CLIENT_ID setzen."
        )
    
    shop_domain = request.shop_domain.strip().lower()
    
    # Ensure .myshopify.com suffix
    if not shop_domain.endswith(".myshopify.com"):
        if "." not in shop_domain:
            shop_domain = f"{shop_domain}.myshopify.com"
        else:
            raise HTTPException(
                status_code=400,
                detail="Ungültige Shop-Domain. Bitte das Format 'shop-name.myshopify.com' verwenden."
            )
    
    # Generate state (nonce) for CSRF protection
    state = generate_nonce()
    
    # Store state in database for verification
    try:
        await supabase_client.store_oauth_state(
            user_id=user.id,
            state=state,
            shop_domain=shop_domain,
            provider="shopify"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Speichern des OAuth-Status: {e}")
    
    # Build authorization URL
    params = {
        "client_id": settings.SHOPIFY_CLIENT_ID,
        "scope": settings.SHOPIFY_SCOPES,
        "redirect_uri": settings.SHOPIFY_REDIRECT_URI,
        "state": state,
        "grant_options[]": "per-user"  # Request online access token
    }
    
    auth_url = f"https://{shop_domain}/admin/oauth/authorize?{urlencode(params)}"
    
    return {
        "success": True,
        "auth_url": auth_url,
        "shop_domain": shop_domain
    }


@router.get("/oauth/callback")
async def oauth_callback(
    request: Request,
    code: str = Query(...),
    shop: str = Query(...),
    state: str = Query(...),
    hmac: str = Query(None),
    timestamp: str = Query(None)
):
    """
    Handle Shopify OAuth callback.
    Exchanges authorization code for access token.
    """
    if not settings.SHOPIFY_CLIENT_ID or not settings.SHOPIFY_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Shopify App nicht konfiguriert.")
    
    # Verify state and get user info
    oauth_state = await supabase_client.verify_oauth_state(state, "shopify")
    if not oauth_state:
        raise HTTPException(status_code=400, detail="Ungültiger oder abgelaufener OAuth-Status.")
    
    user_id = oauth_state["user_id"]
    
    # Exchange code for access token
    token_url = f"https://{shop}/admin/oauth/access_token"
    payload = {
        "client_id": settings.SHOPIFY_CLIENT_ID,
        "client_secret": settings.SHOPIFY_CLIENT_SECRET,
        "code": code
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(token_url, json=payload)
            response.raise_for_status()
            token_data = response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Fehler beim Token-Austausch: {e.response.text}"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Verbindungsfehler: {e}")
    
    access_token = token_data.get("access_token")
    scope = token_data.get("scope")
    
    if not access_token:
        raise HTTPException(status_code=400, detail="Kein Access Token erhalten.")
    
    # Get shop info from Shopify
    shop_info = await get_shop_info(shop, access_token)
    
    # Save shop to database
    try:
        shop_data = await supabase_client.save_shop(
            user_id=user_id,
            shop_domain=shop,
            access_token=access_token,
            scopes=scope,
            shop_name=shop_info.get("name"),
            shop_email=shop_info.get("email"),
            shop_currency=shop_info.get("currency"),
            shopify_shop_id=str(shop_info.get("id"))
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Speichern: {e}")
    
    # Delete used OAuth state
    await supabase_client.delete_oauth_state(state)
    
    # Redirect to frontend with success
    redirect_url = f"{settings.FRONTEND_URL}/dashboard?shop_connected=true&shop={shop}"
    return RedirectResponse(url=redirect_url)


@router.get("/shops")
async def list_shops(user: User = Depends(get_current_user)):
    """Get all connected shops for the current user."""
    shops = await supabase_client.get_user_shops(user.id)
    return {
        "success": True,
        "shops": shops
    }


@router.get("/shops/{shop_id}")
async def get_shop(shop_id: str, user: User = Depends(get_current_user)):
    """Get a specific shop by ID."""
    shop = await supabase_client.get_shop(shop_id, user.id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop nicht gefunden.")
    return {
        "success": True,
        "shop": shop
    }


@router.delete("/shops/{shop_id}")
async def disconnect_shop(shop_id: str, user: User = Depends(get_current_user)):
    """Disconnect a shop."""
    success = await supabase_client.delete_shop(shop_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Shop nicht gefunden.")
    return {
        "success": True,
        "message": "Shop erfolgreich getrennt."
    }


@router.post("/shops/{shop_id}/sync")
async def sync_shop(shop_id: str, user: User = Depends(get_current_user)):
    """Manually trigger a sync for a shop."""
    shop = await supabase_client.get_shop(shop_id, user.id)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop nicht gefunden.")
    
    # TODO: Trigger actual sync job
    # For now, just update last_sync_at
    await supabase_client.update_shop_sync(shop_id)
    
    return {
        "success": True,
        "message": "Sync gestartet."
    }


# =====================================================
# HELPER FUNCTIONS
# =====================================================

async def get_shop_info(shop_domain: str, access_token: str) -> dict:
    """Fetch shop information from Shopify API."""
    url = f"https://{shop_domain}/admin/api/2026-01/shop.json"
    headers = {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data.get("shop", {})
        except Exception as e:
            return {}
