"""
Supabase Service
Handles all database operations for POD AutoM.
"""
import os
import sys
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import logging

from supabase import create_client, Client

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

logger = logging.getLogger(__name__)


class SupabaseService:
    """Service class for Supabase operations."""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        )
    
    # =====================================================
    # OAUTH STATE MANAGEMENT
    # =====================================================
    
    async def store_oauth_state(
        self,
        user_id: str,
        state: str,
        shop_domain: str,
        provider: str = "shopify"
    ) -> dict:
        """Store OAuth state for CSRF protection."""
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        
        data = {
            "user_id": user_id,
            "state": state,
            "shop_domain": shop_domain,
            "provider": provider,
            "expires_at": expires_at.isoformat()
        }
        
        result = self.client.table("pod_autom_oauth_states").insert(data).execute()
        return result.data[0] if result.data else None
    
    async def verify_oauth_state(self, state: str, provider: str = "shopify") -> Optional[dict]:
        """Verify OAuth state and return associated data if valid."""
        result = self.client.table("pod_autom_oauth_states").select("*").eq(
            "state", state
        ).eq("provider", provider).execute()
        
        if not result.data:
            return None
        
        oauth_state = result.data[0]
        
        # Check expiration
        expires_at = datetime.fromisoformat(oauth_state["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expires_at:
            # Delete expired state
            await self.delete_oauth_state(state)
            return None
        
        return oauth_state
    
    async def delete_oauth_state(self, state: str) -> bool:
        """Delete an OAuth state entry."""
        try:
            self.client.table("pod_autom_oauth_states").delete().eq("state", state).execute()
            return True
        except Exception:
            return False
    
    # =====================================================
    # SHOP MANAGEMENT
    # =====================================================
    
    async def save_shop(
        self,
        user_id: str,
        shop_domain: str,
        access_token: str,
        scopes: str,
        shop_name: Optional[str] = None,
        shop_email: Optional[str] = None,
        shop_currency: Optional[str] = "EUR",
        shopify_shop_id: Optional[str] = None
    ) -> dict:
        """Save or update a connected shop."""
        data = {
            "user_id": user_id,
            "shop_domain": shop_domain,
            "access_token": access_token,  # TODO: Encrypt this!
            "scopes": scopes,
            "shop_name": shop_name,
            "shop_email": shop_email,
            "shop_currency": shop_currency or "EUR",
            "shopify_shop_id": shopify_shop_id,
            "connection_status": "connected",
            "last_sync_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert: Update if exists, insert if not
        result = self.client.table("pod_autom_shops").upsert(
            data,
            on_conflict="user_id,shop_domain"
        ).execute()
        
        return result.data[0] if result.data else None
    
    async def get_user_shops(self, user_id: str) -> List[dict]:
        """Get all shops for a user."""
        result = self.client.table("pod_autom_shops").select(
            "id, shop_domain, shop_name, connection_status, last_sync_at, created_at"
        ).eq("user_id", user_id).order("created_at", desc=True).execute()
        
        return result.data or []
    
    async def get_shop(self, shop_id: str, user_id: str) -> Optional[dict]:
        """Get a specific shop by ID, ensuring it belongs to the user."""
        result = self.client.table("pod_autom_shops").select("*").eq(
            "id", shop_id
        ).eq("user_id", user_id).execute()
        
        return result.data[0] if result.data else None
    
    async def get_shop_with_token(self, shop_id: str, user_id: str) -> Optional[dict]:
        """Get shop including access token (for API calls)."""
        return await self.get_shop(shop_id, user_id)
    
    async def delete_shop(self, shop_id: str, user_id: str) -> bool:
        """Delete a shop connection."""
        try:
            # First verify ownership
            shop = await self.get_shop(shop_id, user_id)
            if not shop:
                return False
            
            self.client.table("pod_autom_shops").delete().eq("id", shop_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting shop: {e}")
            return False
    
    async def update_shop_sync(self, shop_id: str) -> bool:
        """Update last sync timestamp."""
        try:
            self.client.table("pod_autom_shops").update({
                "last_sync_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", shop_id).execute()
            return True
        except Exception:
            return False
    
    # =====================================================
    # SETTINGS MANAGEMENT
    # =====================================================
    
    async def get_settings(self, shop_id: str) -> Optional[dict]:
        """Get settings for a shop (auto-created by trigger)."""
        result = self.client.table("pod_autom_settings").select("*").eq(
            "shop_id", shop_id
        ).execute()
        
        return result.data[0] if result.data else None
    
    async def update_settings(self, settings_id: str, data: dict) -> Optional[dict]:
        """Update settings."""
        result = self.client.table("pod_autom_settings").update(data).eq(
            "id", settings_id
        ).execute()
        
        return result.data[0] if result.data else None
    
    # =====================================================
    # NICHES MANAGEMENT
    # =====================================================
    
    async def get_niches(self, settings_id: str) -> List[dict]:
        """Get all niches for a settings entry."""
        result = self.client.table("pod_autom_niches").select("*").eq(
            "settings_id", settings_id
        ).order("created_at", desc=True).execute()
        
        return result.data or []
    
    async def create_niche(self, settings_id: str, niche_name: str) -> dict:
        """Create a new niche."""
        data = {
            "settings_id": settings_id,
            "niche_name": niche_name,
            "is_active": True
        }
        
        result = self.client.table("pod_autom_niches").insert(data).execute()
        return result.data[0] if result.data else None
    
    async def update_niche(self, niche_id: str, data: dict) -> Optional[dict]:
        """Update a niche."""
        result = self.client.table("pod_autom_niches").update(data).eq(
            "id", niche_id
        ).execute()
        
        return result.data[0] if result.data else None
    
    async def delete_niche(self, niche_id: str) -> bool:
        """Delete a niche."""
        try:
            self.client.table("pod_autom_niches").delete().eq("id", niche_id).execute()
            return True
        except Exception:
            return False
    
    # =====================================================
    # SUBSCRIPTION MANAGEMENT
    # =====================================================
    
    async def get_subscription(self, user_id: str) -> Optional[dict]:
        """Get user's subscription."""
        result = self.client.table("pod_autom_subscriptions").select("*").eq(
            "user_id", user_id
        ).execute()
        
        return result.data[0] if result.data else None
    
    async def get_subscription_limits(self, user_id: str) -> dict:
        """Get subscription limits for a user."""
        subscription = await self.get_subscription(user_id)
        
        # Default limits for each tier
        limits = {
            "basis": {"max_niches": 5, "max_products_per_month": 100},
            "premium": {"max_niches": 15, "max_products_per_month": 500},
            "vip": {"max_niches": float("inf"), "max_products_per_month": float("inf")}
        }
        
        if not subscription or subscription.get("status") != "active":
            # No active subscription - use free tier limits
            return {"max_niches": 1, "max_products_per_month": 10}
        
        tier = subscription.get("tier", "basis")
        return limits.get(tier, limits["basis"])


# Singleton instance
supabase_client = SupabaseService()
