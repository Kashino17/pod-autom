"""
Admin API Routes
Handles admin panel functionality for user verification and management.
"""
import os
import sys
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import settings
from api.auth import get_current_user, User
from services.supabase_service import supabase_client

router = APIRouter()


# =====================================================
# MODELS
# =====================================================

class UserProfile(BaseModel):
    id: str
    email: Optional[str]
    full_name: Optional[str]
    role: str
    verification_status: str
    shopify_domain: Optional[str]
    shopify_domain_previous: Optional[str]
    shopify_domain_changed_at: Optional[str]
    shopify_install_link: Optional[str]
    install_link_created_at: Optional[str]
    onboarding_completed: bool
    onboarding_completed_at: Optional[str]
    created_at: str
    updated_at: str
    domain_changed_flag: Optional[bool] = False
    shop_connection_status: Optional[str] = None


class UpdateInstallLinkRequest(BaseModel):
    install_link: str


class UpdateVerificationRequest(BaseModel):
    verification_status: str  # 'pending', 'verified', 'rejected'


class UpdateProfileRequest(BaseModel):
    shopify_domain: Optional[str] = None
    full_name: Optional[str] = None


class PaginatedUsersResponse(BaseModel):
    success: bool
    users: List[UserProfile]
    total: int
    page: int
    page_size: int
    total_pages: int


# =====================================================
# ADMIN CHECK DEPENDENCY
# =====================================================

async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Check if the current user is an admin."""
    profile = await supabase_client.get_user_profile(user.id)

    if not profile or profile.get('role') != 'admin':
        raise HTTPException(
            status_code=403,
            detail="Zugriff verweigert. Admin-Berechtigung erforderlich."
        )

    return user


# =====================================================
# ADMIN ROUTES
# =====================================================

@router.get("/users", response_model=PaginatedUsersResponse)
async def get_pending_users(
    admin: User = Depends(require_admin),
    status: Optional[str] = Query(None, description="Filter by verification_status"),
    search: Optional[str] = Query(None, description="Search by email or name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    Get paginated list of users for admin panel.
    Can filter by verification status and search.
    """
    result = await supabase_client.get_admin_users(
        status=status,
        search=search,
        page=page,
        page_size=page_size
    )

    return {
        "success": True,
        "users": result["users"],
        "total": result["total"],
        "page": page,
        "page_size": page_size,
        "total_pages": (result["total"] + page_size - 1) // page_size
    }


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: str,
    admin: User = Depends(require_admin)
):
    """Get detailed user profile for admin."""
    profile = await supabase_client.get_user_profile(user_id)

    if not profile:
        raise HTTPException(status_code=404, detail="User nicht gefunden.")

    return {
        "success": True,
        "user": profile
    }


@router.put("/users/{user_id}/install-link")
async def update_install_link(
    user_id: str,
    request: UpdateInstallLinkRequest,
    admin: User = Depends(require_admin)
):
    """
    Set the Shopify install link for a user.
    This also sets verification_status to 'verified'.
    """
    success = await supabase_client.set_user_install_link(
        user_id=user_id,
        install_link=request.install_link
    )

    if not success:
        raise HTTPException(status_code=500, detail="Fehler beim Speichern des Install-Links.")

    return {
        "success": True,
        "message": "Install-Link gespeichert und User verifiziert."
    }


@router.put("/users/{user_id}/verification")
async def update_verification_status(
    user_id: str,
    request: UpdateVerificationRequest,
    admin: User = Depends(require_admin)
):
    """Update user's verification status."""
    if request.verification_status not in ['pending', 'verified', 'rejected']:
        raise HTTPException(status_code=400, detail="Ungültiger Status.")

    success = await supabase_client.update_user_verification(
        user_id=user_id,
        status=request.verification_status
    )

    if not success:
        raise HTTPException(status_code=500, detail="Fehler beim Aktualisieren des Status.")

    return {
        "success": True,
        "message": f"Status auf '{request.verification_status}' geändert."
    }


@router.post("/users/{user_id}/confirm-domain-change")
async def confirm_domain_change(
    user_id: str,
    admin: User = Depends(require_admin)
):
    """Confirm and clear the domain change flag for a user."""
    success = await supabase_client.confirm_domain_change(user_id)

    if not success:
        raise HTTPException(status_code=500, detail="Fehler beim Bestätigen der Domain-Änderung.")

    return {
        "success": True,
        "message": "Domain-Änderung bestätigt."
    }


@router.get("/stats")
async def get_admin_stats(admin: User = Depends(require_admin)):
    """Get statistics for admin dashboard."""
    stats = await supabase_client.get_admin_stats()

    return {
        "success": True,
        "stats": stats
    }


# =====================================================
# USER PROFILE ROUTES (for regular users)
# =====================================================

@router.get("/profile")
async def get_own_profile(user: User = Depends(get_current_user)):
    """Get the current user's profile."""
    profile = await supabase_client.get_user_profile(user.id)

    if not profile:
        # Create profile if it doesn't exist
        profile = await supabase_client.create_user_profile(user.id, user.email)

    return {
        "success": True,
        "profile": profile
    }


@router.put("/profile")
async def update_own_profile(
    request: UpdateProfileRequest,
    user: User = Depends(get_current_user)
):
    """Update the current user's profile."""
    update_data = {}

    if request.shopify_domain is not None:
        update_data["shopify_domain"] = request.shopify_domain
        # When user submits a domain, set verification_status to pending
        update_data["verification_status"] = "pending"

    if request.full_name is not None:
        update_data["full_name"] = request.full_name

    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Daten zum Aktualisieren.")

    success = await supabase_client.update_user_profile(user.id, update_data)

    if not success:
        raise HTTPException(status_code=500, detail="Fehler beim Aktualisieren des Profils.")

    return {
        "success": True,
        "message": "Profil aktualisiert."
    }


@router.post("/profile/complete-onboarding")
async def complete_onboarding(
    request: UpdateProfileRequest,
    user: User = Depends(get_current_user)
):
    """Mark onboarding as completed and save Shopify domain."""
    if not request.shopify_domain:
        raise HTTPException(status_code=400, detail="Shopify Domain ist erforderlich.")

    success = await supabase_client.complete_user_onboarding(
        user_id=user.id,
        shopify_domain=request.shopify_domain
    )

    if not success:
        raise HTTPException(status_code=500, detail="Fehler beim Abschließen des Onboardings.")

    return {
        "success": True,
        "message": "Onboarding abgeschlossen. Bitte warte auf die Verifizierung."
    }


# =====================================================
# INSTALLATION FLOW
# =====================================================

@router.post("/profile/start-installation")
async def start_installation(user: User = Depends(get_current_user)):
    """
    Called when user clicks the install button.
    Creates a pending installation record so the callback can link the shop.
    """
    profile = await supabase_client.get_user_profile(user.id)

    if not profile:
        raise HTTPException(status_code=404, detail="Profil nicht gefunden.")

    if profile.get('verification_status') != 'verified':
        raise HTTPException(status_code=403, detail="Account noch nicht verifiziert.")

    if not profile.get('shopify_install_link'):
        raise HTTPException(status_code=400, detail="Kein Install-Link vorhanden.")

    shop_domain = profile.get('shopify_domain')
    if not shop_domain:
        raise HTTPException(status_code=400, detail="Keine Shopify Domain hinterlegt.")

    # Create pending installation record
    await supabase_client.create_pending_installation(user.id, shop_domain)

    return {
        "success": True,
        "install_link": profile.get('shopify_install_link'),
        "shop_domain": shop_domain
    }
