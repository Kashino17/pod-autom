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


    # =====================================================
    # USER PROFILE MANAGEMENT
    # =====================================================

    async def get_user_profile(self, user_id: str) -> Optional[dict]:
        """Get user profile by ID."""
        try:
            result = self.client.table("pod_autom_profiles").select("*").eq(
                "id", user_id
            ).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return None

    async def create_user_profile(self, user_id: str, email: Optional[str] = None) -> Optional[dict]:
        """Create a new user profile."""
        try:
            data = {
                "id": user_id,
                "email": email,
                "role": "user",
                "verification_status": "pending",
                "onboarding_completed": False
            }
            result = self.client.table("pod_autom_profiles").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating user profile: {e}")
            return None

    async def update_user_profile(self, user_id: str, data: dict) -> bool:
        """Update user profile. Creates profile if it doesn't exist."""
        try:
            # First check if profile exists
            existing = await self.get_user_profile(user_id)

            if existing:
                # Update existing profile
                self.client.table("pod_autom_profiles").update(data).eq(
                    "id", user_id
                ).execute()
            else:
                # Create new profile with the data
                create_data = {
                    "id": user_id,
                    "role": "user",
                    "verification_status": "pending",
                    "onboarding_completed": False,
                    **data
                }
                self.client.table("pod_autom_profiles").insert(create_data).execute()

            return True
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            return False

    async def complete_user_onboarding(self, user_id: str, shopify_domain: str) -> bool:
        """Mark user onboarding as complete and save Shopify domain."""
        try:
            data = {
                "shopify_domain": shopify_domain,
                "onboarding_completed": True,
                "onboarding_completed_at": datetime.now(timezone.utc).isoformat()
            }
            self.client.table("pod_autom_profiles").update(data).eq(
                "id", user_id
            ).execute()
            return True
        except Exception as e:
            logger.error(f"Error completing onboarding: {e}")
            return False

    # =====================================================
    # ADMIN FUNCTIONS
    # =====================================================

    async def get_admin_users(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> dict:
        """Get paginated list of users for admin panel."""
        try:
            # Build query - show users who have submitted a shopify_domain
            query = self.client.table("pod_autom_profiles").select(
                "*", count="exact"
            ).eq("role", "user").not_.is_("shopify_domain", "null")

            # Apply filters
            if status:
                query = query.eq("verification_status", status)

            if search:
                query = query.or_(
                    f"email.ilike.%{search}%,full_name.ilike.%{search}%,shopify_domain.ilike.%{search}%"
                )

            # Pagination
            offset = (page - 1) * page_size
            query = query.range(offset, offset + page_size - 1)
            query = query.order("created_at", desc=True)

            result = query.execute()

            # Add computed fields
            users = []
            for user in (result.data or []):
                # Check if domain changed after install link was set
                domain_changed_flag = False
                if user.get("shopify_domain_previous") and user.get("shopify_domain_changed_at"):
                    install_link_time = user.get("install_link_created_at")
                    if not install_link_time or user["shopify_domain_changed_at"] > install_link_time:
                        domain_changed_flag = True

                user["domain_changed_flag"] = domain_changed_flag

                # Get shop connection status
                shop_result = self.client.table("pod_autom_shops").select(
                    "connection_status"
                ).eq("user_id", user["id"]).limit(1).execute()
                user["shop_connection_status"] = shop_result.data[0]["connection_status"] if shop_result.data else None

                users.append(user)

            return {
                "users": users,
                "total": result.count or 0
            }
        except Exception as e:
            logger.error(f"Error getting admin users: {e}")
            return {"users": [], "total": 0}

    async def set_user_install_link(self, user_id: str, install_link: str) -> bool:
        """Set install link for user and mark as verified."""
        try:
            data = {
                "shopify_install_link": install_link,
                "install_link_created_at": datetime.now(timezone.utc).isoformat(),
                "verification_status": "verified"
            }
            self.client.table("pod_autom_profiles").update(data).eq(
                "id", user_id
            ).execute()
            return True
        except Exception as e:
            logger.error(f"Error setting install link: {e}")
            return False

    async def update_user_verification(self, user_id: str, status: str) -> bool:
        """Update user verification status."""
        try:
            self.client.table("pod_autom_profiles").update({
                "verification_status": status
            }).eq("id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating verification: {e}")
            return False

    async def confirm_domain_change(self, user_id: str) -> bool:
        """Clear the domain change flag for a user."""
        try:
            self.client.table("pod_autom_profiles").update({
                "shopify_domain_previous": None,
                "shopify_domain_changed_at": None
            }).eq("id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error confirming domain change: {e}")
            return False

    async def get_admin_stats(self) -> dict:
        """Get statistics for admin dashboard."""
        try:
            # Count users by status - pending users who have submitted a domain
            pending_result = self.client.table("pod_autom_profiles").select(
                "id", count="exact"
            ).eq("role", "user").eq("verification_status", "pending").not_.is_(
                "shopify_domain", "null"
            ).execute()

            verified_result = self.client.table("pod_autom_profiles").select(
                "id", count="exact"
            ).eq("role", "user").eq("verification_status", "verified").execute()

            total_result = self.client.table("pod_autom_profiles").select(
                "id", count="exact"
            ).eq("role", "user").execute()

            # Count connected shops
            shops_result = self.client.table("pod_autom_shops").select(
                "id", count="exact"
            ).eq("connection_status", "connected").execute()

            return {
                "pending_users": pending_result.count or 0,
                "verified_users": verified_result.count or 0,
                "total_users": total_result.count or 0,
                "connected_shops": shops_result.count or 0
            }
        except Exception as e:
            logger.error(f"Error getting admin stats: {e}")
            return {
                "pending_users": 0,
                "verified_users": 0,
                "total_users": 0,
                "connected_shops": 0
            }

    # =====================================================
    # PENDING INSTALLATIONS
    # =====================================================

    async def create_pending_installation(self, user_id: str, shop_domain: str) -> bool:
        """Create a pending installation record."""
        try:
            data = {
                "user_id": user_id,
                "shop_domain": shop_domain,
                "status": "pending"
            }
            self.client.table("pod_autom_pending_installations").upsert(
                data, on_conflict="user_id,shop_domain"
            ).execute()
            return True
        except Exception as e:
            logger.error(f"Error creating pending installation: {e}")
            return False

    async def get_pending_installation_by_shop(self, shop_domain: str) -> Optional[dict]:
        """Get pending installation by shop domain."""
        try:
            result = self.client.table("pod_autom_pending_installations").select(
                "*"
            ).eq("shop_domain", shop_domain).eq("status", "pending").order(
                "created_at", desc=True
            ).limit(1).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting pending installation: {e}")
            return None

    async def complete_pending_installation(self, user_id: str, shop_domain: str) -> bool:
        """Mark a pending installation as completed."""
        try:
            self.client.table("pod_autom_pending_installations").update({
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }).eq("user_id", user_id).eq("shop_domain", shop_domain).execute()
            return True
        except Exception as e:
            logger.error(f"Error completing pending installation: {e}")
            return False


# Singleton instance
supabase_client = SupabaseService()
