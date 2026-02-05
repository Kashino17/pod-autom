"""
POD AutoM - Designs API Routes
Manages generated designs for users.
Includes plan status, manual generation trigger, and schedule management.
"""
import os
import sys
import asyncio
from typing import Optional, List
from datetime import datetime, date, timezone

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from api.auth import get_current_user, User
from services.supabase_service import supabase_client

router = APIRouter()

# Plan definitions
PLAN_LIMITS = {
    "free": 10,
    "starter": 50,
    "pro": 200,
    "enterprise": 1000,
}

PLAN_NAMES = {
    "free": "Free",
    "starter": "Starter",
    "pro": "Pro",
    "enterprise": "Enterprise",
}


# =====================================================
# MODELS
# =====================================================

class DesignResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    niche_id: Optional[str] = None
    template_id: Optional[str] = None
    prompt_used: str
    final_prompt: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    image_path: Optional[str] = None
    slogan_text: Optional[str] = None
    language: str
    status: str
    error_message: Optional[str] = None
    generation_model: Optional[str] = None
    generation_quality: Optional[str] = None
    variables_used: Optional[dict] = None
    metadata: Optional[dict] = None
    created_at: str
    generated_at: Optional[str] = None
    updated_at: Optional[str] = None


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


class PlanStatusResponse(BaseModel):
    success: bool
    plan_type: str
    plan_name: str
    monthly_limit: int
    monthly_used: int
    monthly_remaining: int
    generation_time: str
    generation_timezone: str
    designs_per_batch: int
    next_generation_at: Optional[str] = None
    last_generation_at: Optional[str] = None
    billing_cycle_start: Optional[str] = None


class GenerateNowRequest(BaseModel):
    count: int = 1


class GenerateNowResponse(BaseModel):
    success: bool
    job_id: Optional[str] = None
    generated: int = 0
    failed: int = 0
    skipped: int = 0
    monthly_used: int = 0
    monthly_limit: int = 0
    error: Optional[str] = None


class ScheduleUpdateRequest(BaseModel):
    generation_time: Optional[str] = None  # "HH:MM"
    generation_timezone: Optional[str] = None  # IANA timezone
    designs_per_batch: Optional[int] = None  # 1-50


class GenerationJobResponse(BaseModel):
    id: str
    trigger_type: str
    designs_requested: int
    designs_completed: int
    designs_failed: int
    status: str
    started_at: str
    completed_at: Optional[str] = None


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
                user_id=d.get("user_id"),
                niche_id=d.get("niche_id"),
                template_id=d.get("template_id"),
                prompt_used=d.get("prompt_used", ""),
                final_prompt=d.get("final_prompt"),
                image_url=d.get("image_url"),
                thumbnail_url=d.get("thumbnail_url"),
                image_path=d.get("image_path"),
                slogan_text=d.get("slogan_text"),
                language=d.get("language", "en"),
                status=d.get("status", "pending"),
                error_message=d.get("error_message"),
                generation_model=d.get("generation_model"),
                generation_quality=d.get("generation_quality"),
                variables_used=d.get("variables_used"),
                metadata=d.get("metadata"),
                created_at=d.get("created_at", ""),
                generated_at=d.get("generated_at"),
                updated_at=d.get("updated_at"),
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
# PLAN STATUS & SCHEDULING
# =====================================================

def _get_billing_month_start(billing_cycle_start) -> date:
    """Calculate current billing month start."""
    if not billing_cycle_start:
        return date.today().replace(day=1)
    cycle_start = date.fromisoformat(str(billing_cycle_start))
    today = date.today()
    day_of_month = min(cycle_start.day, 28)
    try:
        this_month_start = today.replace(day=day_of_month)
    except ValueError:
        this_month_start = today.replace(day=28)
    if this_month_start > today:
        if this_month_start.month == 1:
            this_month_start = this_month_start.replace(year=this_month_start.year - 1, month=12)
        else:
            this_month_start = this_month_start.replace(month=this_month_start.month - 1)
    return this_month_start


def _calc_next_generation(gen_time: str, gen_tz: str, last_run=None) -> Optional[str]:
    """Calculate the next generation datetime as ISO string."""
    try:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(gen_tz)
        now = datetime.now(tz)
        parts = gen_time.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        
        target_today = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        # If already passed today or already ran today, schedule for tomorrow
        already_ran_today = False
        if last_run:
            try:
                last_dt = datetime.fromisoformat(str(last_run))
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)
                last_in_tz = last_dt.astimezone(tz)
                if last_in_tz.date() == now.date():
                    already_ran_today = True
            except Exception:
                pass
        
        if target_today <= now or already_ran_today:
            # Tomorrow
            from datetime import timedelta
            target_today += timedelta(days=1)
        
        return target_today.isoformat()
    except Exception:
        return None


@router.get("/plan-status", response_model=PlanStatusResponse)
async def get_plan_status(user: User = Depends(get_current_user)):
    """Get the user's plan status including limits, usage, and schedule."""
    try:
        # Get user's shop → settings
        shops = supabase_client.client.table("pod_autom_shops").select(
            "id"
        ).eq("user_id", user.id).limit(1).execute()
        
        if not shops.data:
            return PlanStatusResponse(
                success=True, plan_type="free", plan_name="Free",
                monthly_limit=10, monthly_used=0, monthly_remaining=10,
                generation_time="09:00", generation_timezone="Europe/Berlin",
                designs_per_batch=5,
            )
        
        shop_id = shops.data[0]["id"]
        settings = supabase_client.client.table("pod_autom_settings").select(
            "plan_type, monthly_design_limit, generation_time, generation_timezone, "
            "billing_cycle_start, designs_per_batch, last_generation_run"
        ).eq("shop_id", shop_id).limit(1).execute()
        
        if not settings.data:
            return PlanStatusResponse(
                success=True, plan_type="free", plan_name="Free",
                monthly_limit=10, monthly_used=0, monthly_remaining=10,
                generation_time="09:00", generation_timezone="Europe/Berlin",
                designs_per_batch=5,
            )
        
        s = settings.data[0]
        plan_type = s.get("plan_type", "free")
        monthly_limit = s.get("monthly_design_limit") or PLAN_LIMITS.get(plan_type, 10)
        gen_time = s.get("generation_time", "09:00")
        gen_tz = s.get("generation_timezone", "Europe/Berlin")
        designs_per_batch = s.get("designs_per_batch", 5)
        billing_start = s.get("billing_cycle_start")
        last_run = s.get("last_generation_run")
        
        month_start = _get_billing_month_start(billing_start)
        
        # Get monthly usage
        usage_res = supabase_client.client.table("pod_autom_monthly_usage").select(
            "designs_generated"
        ).eq("user_id", user.id).eq("month_start", month_start.isoformat()).execute()
        
        monthly_used = usage_res.data[0]["designs_generated"] if usage_res.data else 0
        
        next_gen = _calc_next_generation(gen_time, gen_tz, last_run)
        
        return PlanStatusResponse(
            success=True,
            plan_type=plan_type,
            plan_name=PLAN_NAMES.get(plan_type, "Free"),
            monthly_limit=monthly_limit,
            monthly_used=monthly_used,
            monthly_remaining=max(0, monthly_limit - monthly_used),
            generation_time=gen_time,
            generation_timezone=gen_tz,
            designs_per_batch=designs_per_batch,
            next_generation_at=next_gen,
            last_generation_at=str(last_run) if last_run else None,
            billing_cycle_start=str(billing_start) if billing_start else None,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching plan status: {e}")


@router.post("/generate-now", response_model=GenerateNowResponse)
async def generate_now(
    data: GenerateNowRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    """Manually trigger design generation. Runs in background."""
    try:
        if data.count < 1 or data.count > 50:
            raise HTTPException(status_code=400, detail="Anzahl muss zwischen 1 und 50 sein")
        
        # Check plan limits first
        shops = supabase_client.client.table("pod_autom_shops").select(
            "id"
        ).eq("user_id", user.id).limit(1).execute()
        
        if not shops.data:
            return GenerateNowResponse(success=False, error="Kein Shop verbunden")
        
        shop_id = shops.data[0]["id"]
        settings = supabase_client.client.table("pod_autom_settings").select(
            "plan_type, monthly_design_limit, billing_cycle_start"
        ).eq("shop_id", shop_id).limit(1).execute()
        
        if not settings.data:
            return GenerateNowResponse(success=False, error="Keine Einstellungen")
        
        s = settings.data[0]
        plan_type = s.get("plan_type", "free")
        monthly_limit = s.get("monthly_design_limit") or PLAN_LIMITS.get(plan_type, 10)
        billing_start = s.get("billing_cycle_start")
        month_start = _get_billing_month_start(billing_start)
        
        # Check current usage
        usage_res = supabase_client.client.table("pod_autom_monthly_usage").select(
            "designs_generated"
        ).eq("user_id", user.id).eq("month_start", month_start.isoformat()).execute()
        
        monthly_used = usage_res.data[0]["designs_generated"] if usage_res.data else 0
        remaining = monthly_limit - monthly_used
        
        if remaining <= 0:
            return GenerateNowResponse(
                success=False,
                error=f"Monatliches Limit erreicht ({monthly_used}/{monthly_limit})",
                monthly_used=monthly_used,
                monthly_limit=monthly_limit,
            )
        
        actual_count = min(data.count, remaining)
        
        # Check for active niches
        settings_res = supabase_client.client.table("pod_autom_settings").select(
            "id"
        ).eq("shop_id", shop_id).limit(1).execute()
        
        if not settings_res.data:
            return GenerateNowResponse(success=False, error="Keine Einstellungen")
        
        settings_id = settings_res.data[0]["id"]
        niches = supabase_client.client.table("pod_autom_niches").select(
            "id, niche_name"
        ).eq("settings_id", settings_id).eq(
            "auto_generate", True
        ).eq("is_active", True).execute()
        
        if not niches.data:
            return GenerateNowResponse(
                success=False, error="Keine Nischen mit Auto-Generierung aktiviert"
            )
        
        # Create job record
        job = supabase_client.client.table("pod_autom_generation_jobs").insert({
            "user_id": user.id,
            "trigger_type": "manual",
            "designs_requested": actual_count,
            "status": "running",
        }).execute()
        job_id = job.data[0]["id"]
        
        # Run generation in background
        async def _run_generation():
            try:
                from jobs.generate_designs import generate_manual
                result = await generate_manual(user.id, actual_count)
                
                # Update job with final status
                supabase_client.client.table("pod_autom_generation_jobs").update({
                    "status": "completed",
                    "designs_completed": result.get("generated", 0),
                    "designs_failed": result.get("failed", 0),
                    "completed_at": datetime.now(tz=None).isoformat(),
                }).eq("id", job_id).execute()
            except Exception as e:
                supabase_client.client.table("pod_autom_generation_jobs").update({
                    "status": "failed",
                    "error_message": str(e),
                    "completed_at": datetime.now(tz=None).isoformat(),
                }).eq("id", job_id).execute()
        
        background_tasks.add_task(asyncio.ensure_future, _run_generation())
        
        return GenerateNowResponse(
            success=True,
            job_id=job_id,
            generated=0,  # Still running
            monthly_used=monthly_used,
            monthly_limit=monthly_limit,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


@router.put("/schedule")
async def update_schedule(
    data: ScheduleUpdateRequest,
    user: User = Depends(get_current_user),
):
    """Update the user's generation schedule."""
    try:
        shops = supabase_client.client.table("pod_autom_shops").select(
            "id"
        ).eq("user_id", user.id).limit(1).execute()
        
        if not shops.data:
            raise HTTPException(status_code=404, detail="Kein Shop verbunden")
        
        shop_id = shops.data[0]["id"]
        
        update_data = {}
        if data.generation_time is not None:
            # Validate HH:MM format
            parts = data.generation_time.split(":")
            if len(parts) != 2 or not (0 <= int(parts[0]) <= 23) or not (0 <= int(parts[1]) <= 59):
                raise HTTPException(status_code=400, detail="Ungültiges Zeitformat. Nutze HH:MM (z.B. 09:00)")
            update_data["generation_time"] = data.generation_time
        
        if data.generation_timezone is not None:
            try:
                from zoneinfo import ZoneInfo
                ZoneInfo(data.generation_timezone)
            except Exception:
                raise HTTPException(status_code=400, detail="Ungültige Zeitzone")
            update_data["generation_timezone"] = data.generation_timezone
        
        if data.designs_per_batch is not None:
            if data.designs_per_batch < 1 or data.designs_per_batch > 50:
                raise HTTPException(status_code=400, detail="Designs pro Batch muss zwischen 1 und 50 sein")
            update_data["designs_per_batch"] = data.designs_per_batch
        
        if not update_data:
            return {"success": True, "message": "Nichts zu aktualisieren"}
        
        supabase_client.client.table("pod_autom_settings").update(
            update_data
        ).eq("shop_id", shop_id).execute()
        
        return {"success": True, "message": "Zeitplan aktualisiert", "updated": update_data}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


@router.get("/jobs")
async def list_generation_jobs(
    user: User = Depends(get_current_user),
    limit: int = Query(10, ge=1, le=50),
):
    """Get recent generation job history."""
    try:
        result = supabase_client.client.table("pod_autom_generation_jobs").select(
            "*"
        ).eq("user_id", user.id).order(
            "started_at", desc=True
        ).limit(limit).execute()
        
        return {"success": True, "jobs": result.data or []}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


@router.get("/jobs/{job_id}")
async def get_generation_job(
    job_id: str,
    user: User = Depends(get_current_user),
):
    """Get a specific generation job status (for polling progress)."""
    try:
        result = supabase_client.client.table("pod_autom_generation_jobs").select(
            "*"
        ).eq("id", job_id).eq("user_id", user.id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Job nicht gefunden")
        
        return {"success": True, "job": result.data[0]}
        
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
