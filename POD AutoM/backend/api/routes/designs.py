"""
POD AutoM - Designs API Routes
Manages generated designs for users.
"""
import os
import sys
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from api.auth import get_current_user, User
from services.supabase_service import supabase_client

router = APIRouter()


# =====================================================
# MODELS
# =====================================================

class DesignResponse(BaseModel):
    id: str
    niche_id: Optional[str]
    prompt_used: str
    final_prompt: Optional[str]
    image_url: Optional[str]
    thumbnail_url: Optional[str]
    slogan_text: Optional[str]
    language: str
    status: str
    generation_model: Optional[str]
    created_at: str
    generated_at: Optional[str]


class DesignListResponse(BaseModel):
    success: bool
    designs: List[DesignResponse]
    total: int
    page: int
    per_page: int


class DesignStatsResponse(BaseModel):
    success: bool
    total_designs: int
    ready_designs: int
    generating: int
    failed: int
    today_generated: int
    daily_limit: int


class PromptTemplateCreate(BaseModel):
    niche_id: str
    name: str
    prompt_template: str
    style_hints: Optional[str] = None
    variables: Optional[dict] = None


class PromptTemplateResponse(BaseModel):
    id: str
    niche_id: str
    name: str
    prompt_template: str
    style_hints: Optional[str]
    variables: Optional[dict]
    is_active: bool
    created_at: str


# =====================================================
# DESIGN ROUTES
# =====================================================

@router.get("/", response_model=DesignListResponse)
async def list_designs(
    user: User = Depends(get_current_user),
    status: Optional[str] = Query(None, description="Filter by status: pending, generating, ready, failed"),
    niche_id: Optional[str] = Query(None, description="Filter by niche"),
    language: Optional[str] = Query(None, description="Filter by language: en, de"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """
    Get all designs for the current user.
    Supports filtering by status, niche, and language.
    """
    try:
        # Build query
        query = supabase_client.client.table("pod_autom_designs").select(
            "*", count="exact"
        ).eq("user_id", user.id)
        
        # Apply filters
        if status:
            query = query.eq("status", status)
        if niche_id:
            query = query.eq("niche_id", niche_id)
        if language:
            query = query.eq("language", language)
        
        # Pagination
        offset = (page - 1) * per_page
        query = query.order("created_at", desc=True).range(offset, offset + per_page - 1)
        
        result = query.execute()
        
        designs = []
        for d in result.data:
            designs.append(DesignResponse(
                id=d["id"],
                niche_id=d.get("niche_id"),
                prompt_used=d.get("prompt_used", ""),
                final_prompt=d.get("final_prompt"),
                image_url=d.get("image_url"),
                thumbnail_url=d.get("thumbnail_url"),
                slogan_text=d.get("slogan_text"),
                language=d.get("language", "en"),
                status=d.get("status", "pending"),
                generation_model=d.get("generation_model"),
                created_at=d.get("created_at", ""),
                generated_at=d.get("generated_at"),
            ))
        
        return DesignListResponse(
            success=True,
            designs=designs,
            total=result.count or len(designs),
            page=page,
            per_page=per_page,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching designs: {e}")


@router.get("/stats", response_model=DesignStatsResponse)
async def get_design_stats(user: User = Depends(get_current_user)):
    """Get design generation statistics for the current user."""
    try:
        # Get all designs count by status
        all_designs = supabase_client.client.table("pod_autom_designs").select(
            "status", count="exact"
        ).eq("user_id", user.id).execute()
        
        total = all_designs.count or 0
        
        # Count by status
        ready = supabase_client.client.table("pod_autom_designs").select(
            "id", count="exact"
        ).eq("user_id", user.id).eq("status", "ready").execute()
        
        generating = supabase_client.client.table("pod_autom_designs").select(
            "id", count="exact"
        ).eq("user_id", user.id).eq("status", "generating").execute()
        
        failed = supabase_client.client.table("pod_autom_designs").select(
            "id", count="exact"
        ).eq("user_id", user.id).eq("status", "failed").execute()
        
        # Today's stats
        from datetime import date
        today = date.today().isoformat()
        today_stats = supabase_client.client.table("pod_autom_generation_stats").select(
            "designs_generated"
        ).eq("user_id", user.id).eq("date", today).execute()
        
        today_generated = 0
        if today_stats.data:
            today_generated = today_stats.data[0].get("designs_generated", 0)
        
        # Get user's daily limit (from any niche)
        niches = supabase_client.client.table("pod_autom_niches").select(
            "daily_limit"
        ).eq("user_id", user.id).limit(1).execute()
        
        daily_limit = 5  # Default
        if niches.data:
            daily_limit = niches.data[0].get("daily_limit", 5)
        
        return DesignStatsResponse(
            success=True,
            total_designs=total,
            ready_designs=ready.count or 0,
            generating=generating.count or 0,
            failed=failed.count or 0,
            today_generated=today_generated,
            daily_limit=daily_limit,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {e}")


@router.get("/{design_id}")
async def get_design(design_id: str, user: User = Depends(get_current_user)):
    """Get a specific design by ID."""
    try:
        result = supabase_client.client.table("pod_autom_designs").select(
            "*"
        ).eq("id", design_id).eq("user_id", user.id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Design nicht gefunden")
        
        return {"success": True, "design": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


@router.get("/{design_id}/download")
async def download_design(design_id: str, user: User = Depends(get_current_user)):
    """Redirect to the design image URL for download."""
    try:
        result = supabase_client.client.table("pod_autom_designs").select(
            "image_url, status"
        ).eq("id", design_id).eq("user_id", user.id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Design nicht gefunden")
        
        design = result.data[0]
        
        if design["status"] != "ready":
            raise HTTPException(status_code=400, detail="Design noch nicht fertig")
        
        if not design.get("image_url"):
            raise HTTPException(status_code=404, detail="Bild-URL nicht verfügbar")
        
        return RedirectResponse(url=design["image_url"])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


@router.delete("/{design_id}")
async def delete_design(design_id: str, user: User = Depends(get_current_user)):
    """Delete a design (or archive it)."""
    try:
        # First check ownership
        existing = supabase_client.client.table("pod_autom_designs").select(
            "id, image_path"
        ).eq("id", design_id).eq("user_id", user.id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Design nicht gefunden")
        
        # Archive instead of delete (safer)
        supabase_client.client.table("pod_autom_designs").update({
            "status": "archived"
        }).eq("id", design_id).execute()
        
        return {"success": True, "message": "Design archiviert"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


# =====================================================
# PROMPT TEMPLATE ROUTES
# =====================================================

@router.get("/templates/")
async def list_prompt_templates(
    user: User = Depends(get_current_user),
    niche_id: Optional[str] = None,
):
    """Get all prompt templates for the user."""
    try:
        query = supabase_client.client.table("pod_autom_prompt_templates").select(
            "*"
        ).eq("user_id", user.id)
        
        if niche_id:
            query = query.eq("niche_id", niche_id)
        
        result = query.order("created_at", desc=True).execute()
        
        return {"success": True, "templates": result.data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


@router.post("/templates/")
async def create_prompt_template(
    data: PromptTemplateCreate,
    user: User = Depends(get_current_user),
):
    """Create a new prompt template."""
    try:
        template_data = {
            "user_id": user.id,
            "niche_id": data.niche_id,
            "name": data.name,
            "prompt_template": data.prompt_template,
            "style_hints": data.style_hints,
            "variables": data.variables or {},
            "is_active": True,
        }
        
        result = supabase_client.client.table("pod_autom_prompt_templates").insert(
            template_data
        ).execute()
        
        return {"success": True, "template": result.data[0]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


@router.put("/templates/{template_id}")
async def update_prompt_template(
    template_id: str,
    data: PromptTemplateCreate,
    user: User = Depends(get_current_user),
):
    """Update a prompt template."""
    try:
        # Check ownership
        existing = supabase_client.client.table("pod_autom_prompt_templates").select(
            "id"
        ).eq("id", template_id).eq("user_id", user.id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Template nicht gefunden")
        
        update_data = {
            "name": data.name,
            "prompt_template": data.prompt_template,
            "style_hints": data.style_hints,
            "variables": data.variables or {},
        }
        
        result = supabase_client.client.table("pod_autom_prompt_templates").update(
            update_data
        ).eq("id", template_id).execute()
        
        return {"success": True, "template": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


@router.delete("/templates/{template_id}")
async def delete_prompt_template(
    template_id: str,
    user: User = Depends(get_current_user),
):
    """Delete a prompt template."""
    try:
        result = supabase_client.client.table("pod_autom_prompt_templates").delete().eq(
            "id", template_id
        ).eq("user_id", user.id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Template nicht gefunden")
        
        return {"success": True, "message": "Template gelöscht"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")
