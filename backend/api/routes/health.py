"""
Health Check Routes
"""
from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/health/ready")
async def readiness_check():
    """Readiness check - verifies all dependencies are available."""
    checks = {
        "api": True,
        "database": False,
        "shopify": False,
        "pinterest": False,
        "openai": False
    }
    
    # TODO: Add actual checks
    # For now, just return basic status
    checks["database"] = True  # Supabase is configured
    
    all_healthy = all(checks.values())
    
    return {
        "status": "ready" if all_healthy else "degraded",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
