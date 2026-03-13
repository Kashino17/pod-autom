"""
Go-Live Checklist Route
Returns the completion status of setup tasks for the Go-Live checklist.
"""
import os
import sys
import logging

from fastapi import APIRouter, Depends

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from api.auth import get_current_user, User
from services.supabase_service import supabase_client

logger = logging.getLogger(__name__)

router = APIRouter()


def _safe_count(table: str, filters: dict) -> int:
    """Count rows matching filters, return 0 on error."""
    try:
        query = supabase_client.client.table(table).select("id", count="exact")
        for key, val in filters.items():
            query = query.eq(key, val)
        result = query.execute()
        return result.count or 0
    except Exception:
        return 0


def _safe_select(table: str, columns: str, filters: dict) -> list:
    """Select rows matching filters, return [] on error."""
    try:
        query = supabase_client.client.table(table).select(columns)
        for key, val in filters.items():
            query = query.eq(key, val)
        result = query.execute()
        return result.data or []
    except Exception:
        return []


@router.get("")
async def get_go_live_checklist(user: User = Depends(get_current_user)):
    """Get the Go-Live checklist status for the current user."""
    uid = user.id

    # 1. Shop connected?
    shops = _safe_select("pod_autom_shops", "id, connection_status", {"user_id": uid})
    has_shop = any(s.get("connection_status") == "connected" for s in shops)

    # 2. Subscription active? (not free)
    subs = _safe_select(
        "pod_autom_subscriptions",
        "tier, status",
        {"user_id": uid},
    )
    sub = subs[0] if subs else None
    has_subscription = bool(
        sub
        and sub.get("status") == "active"
        and sub.get("tier") not in (None, "free")
    )

    # 3. Niches created?
    # Resolve: user → shop → settings → niches/prompts
    settings_id = None
    if shops:
        shop_id = shops[0]["id"]
        settings_rows = _safe_select("pod_autom_settings", "id", {"shop_id": shop_id})
        settings_id = settings_rows[0]["id"] if settings_rows else None
    niche_count = 0
    if settings_id:
        niche_count = _safe_count("pod_autom_niches", {"settings_id": settings_id})

    # 4. Design prompts configured?
    # Either custom prompts exist OR user completed onboarding (chose "Standard prompts")
    prompt_count = 0
    if settings_id:
        prompt_count = _safe_count("pod_autom_prompts", {"settings_id": settings_id})
    onboarding_done = False
    try:
        profile = _safe_select("pod_autom_profiles", "onboarding_completed", {"id": uid})
        onboarding_done = bool(profile and profile[0].get("onboarding_completed"))
    except Exception:
        pass
    has_prompts = prompt_count > 0 or onboarding_done

    # 5. First design generated?
    designs = _safe_select("pod_autom_designs", "id", {"user_id": uid})
    # Filter to only ready designs
    design_count = 0
    if designs:
        ready = _safe_select("pod_autom_designs", "id", {"user_id": uid})
        # Check for at least one ready/generated design
        try:
            result = supabase_client.client.table("pod_autom_designs").select(
                "id", count="exact"
            ).eq("user_id", uid).eq("status", "ready").execute()
            design_count = result.count or 0
        except Exception:
            design_count = 0

    # 6. Catalog products activated?
    activated_count = 0
    try:
        result = supabase_client.client.table("pod_autom_activated_products").select(
            "id", count="exact"
        ).eq("user_id", uid).execute()
        activated_count = result.count or 0
    except Exception:
        activated_count = 0

    # 7. Products created in shop?
    created_count = 0
    try:
        result = supabase_client.client.table("pod_autom_created_products").select(
            "id", count="exact"
        ).eq("user_id", uid).in_("status", ["created", "published"]).execute()
        created_count = result.count or 0
    except Exception:
        created_count = 0

    # 8. Pinterest connected?
    pinterest_rows = _safe_select(
        "pod_autom_ad_platforms", "connection_status", {"user_id": uid, "platform": "pinterest"}
    )
    has_pinterest = any(r.get("connection_status") == "connected" for r in pinterest_rows)

    # 9. Meta connected?
    meta_rows = _safe_select(
        "pod_autom_ad_platforms", "connection_status", {"user_id": uid, "platform": "meta"}
    )
    has_meta = any(r.get("connection_status") == "connected" for r in meta_rows)

    # 10. First campaign created?
    campaign_count = 0
    try:
        result = supabase_client.client.table("pod_autom_campaigns").select(
            "id", count="exact"
        ).eq("user_id", uid).execute()
        campaign_count = result.count or 0
    except Exception:
        campaign_count = 0

    tasks = [
        {
            "id": "shop",
            "title": "Shop verknüpfen",
            "description": "Verbinde deinen Shoporu-Shop",
            "completed": has_shop,
            "link": "/dashboard",
        },
        {
            "id": "subscription",
            "title": "Abo auswählen",
            "description": "Wähle einen passenden Plan",
            "completed": has_subscription,
            "link": "/dashboard/plan",
        },
        {
            "id": "niches",
            "title": "Nischen einrichten",
            "description": "Mindestens eine Nische erstellen",
            "completed": niche_count > 0,
            "link": "/dashboard/niches",
        },
        {
            "id": "prompts",
            "title": "Design-Prompts konfigurieren",
            "description": "KI-Prompts für die Design-Generierung",
            "completed": has_prompts,
            "link": "/dashboard/prompts",
        },
        {
            "id": "designs",
            "title": "Erstes Design generieren",
            "description": "Ein Design per KI erstellen lassen",
            "completed": design_count > 0,
            "link": "/dashboard/designs",
        },
        {
            "id": "catalog",
            "title": "Produktkatalog aktivieren",
            "description": "Mindestens ein Katalogprodukt aktivieren",
            "completed": activated_count > 0,
            "link": "/dashboard/products",
        },
        {
            "id": "products",
            "title": "Erstes Produkt erstellen",
            "description": "Ein Produkt im Shop veröffentlichen",
            "completed": created_count > 0,
            "link": "/dashboard/my-products",
        },
        {
            "id": "pinterest",
            "title": "Pinterest verbinden",
            "description": "Pinterest-Konto für Kampagnen verknüpfen",
            "completed": has_pinterest,
            "link": "/dashboard/pinterest-campaigns",
        },
        {
            "id": "meta",
            "title": "Meta verbinden",
            "description": "Meta/Facebook-Konto verknüpfen",
            "completed": has_meta,
            "link": "/dashboard/meta-campaigns",
        },
        {
            "id": "campaigns",
            "title": "Erste Kampagne starten",
            "description": "Eine Werbekampagne erstellen",
            "completed": campaign_count > 0,
            "link": "/dashboard/pinterest-campaigns",
        },
    ]

    completed_count = sum(1 for t in tasks if t["completed"])

    return {
        "success": True,
        "tasks": tasks,
        "completedCount": completed_count,
        "totalCount": len(tasks),
    }
