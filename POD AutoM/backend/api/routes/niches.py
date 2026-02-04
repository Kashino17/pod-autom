"""
Niches API Routes
Manage user niches for product generation.
"""
import os
import sys
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from api.auth import get_current_user, User
from services.supabase_service import supabase_client

router = APIRouter()


class NicheCreate(BaseModel):
    niche_name: str


class NicheUpdate(BaseModel):
    niche_name: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None


class NicheResponse(BaseModel):
    id: str
    niche_name: str
    niche_slug: Optional[str]
    is_active: bool
    priority: int
    total_products: int
    total_sales: int
    total_revenue: float
    created_at: str


@router.get("/{settings_id}")
async def list_niches(
    settings_id: str,
    user: User = Depends(get_current_user)
):
    """Get all niches for a settings entry."""
    niches = await supabase_client.get_niches(settings_id)
    return {
        "success": True,
        "niches": niches
    }


@router.post("/{settings_id}")
async def create_niche(
    settings_id: str,
    data: NicheCreate,
    user: User = Depends(get_current_user)
):
    """Create a new niche."""
    # Check subscription limits
    limits = await supabase_client.get_subscription_limits(user.id)
    current_niches = await supabase_client.get_niches(settings_id)
    
    if len(current_niches) >= limits["max_niches"]:
        raise HTTPException(
            status_code=403,
            detail=f"Nischen-Limit erreicht ({limits['max_niches']}). Bitte Abo upgraden."
        )
    
    # Check for duplicate
    existing = [n for n in current_niches if n["niche_name"].lower() == data.niche_name.lower()]
    if existing:
        raise HTTPException(status_code=400, detail="Diese Nische existiert bereits.")
    
    niche = await supabase_client.create_niche(settings_id, data.niche_name)
    if not niche:
        raise HTTPException(status_code=500, detail="Fehler beim Erstellen der Nische.")
    
    return {
        "success": True,
        "niche": niche
    }


@router.put("/{settings_id}/{niche_id}")
async def update_niche(
    settings_id: str,
    niche_id: str,
    data: NicheUpdate,
    user: User = Depends(get_current_user)
):
    """Update a niche."""
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Änderungen angegeben.")
    
    niche = await supabase_client.update_niche(niche_id, update_data)
    if not niche:
        raise HTTPException(status_code=404, detail="Nische nicht gefunden.")
    
    return {
        "success": True,
        "niche": niche
    }


@router.delete("/{settings_id}/{niche_id}")
async def delete_niche(
    settings_id: str,
    niche_id: str,
    user: User = Depends(get_current_user)
):
    """Delete a niche."""
    success = await supabase_client.delete_niche(niche_id)
    if not success:
        raise HTTPException(status_code=404, detail="Nische nicht gefunden.")
    
    return {
        "success": True,
        "message": "Nische gelöscht."
    }


@router.post("/{settings_id}/{niche_id}/generate")
async def trigger_generation(
    settings_id: str,
    niche_id: str,
    count: int = 1,
    user: User = Depends(get_current_user)
):
    """Trigger product generation for a niche."""
    # TODO: Implement - queue products for generation
    raise HTTPException(
        status_code=501,
        detail="Produkt-Generierung noch nicht implementiert."
    )
