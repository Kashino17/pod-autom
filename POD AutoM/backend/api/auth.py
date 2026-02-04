"""
Authentication Middleware
Verifies Supabase JWT tokens and extracts user info.
"""
import os
import sys
from typing import Optional
from datetime import datetime, timezone

from fastapi import HTTPException, Depends, Header
from pydantic import BaseModel
import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings


class User(BaseModel):
    """Authenticated user model."""
    id: str
    email: Optional[str] = None
    role: str = "authenticated"
    

async def get_current_user(
    authorization: str = Header(None, alias="Authorization")
) -> User:
    """
    Extract and verify user from Supabase JWT token.
    
    Usage:
        @router.get("/protected")
        async def protected_route(user: User = Depends(get_current_user)):
            return {"user_id": user.id}
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header fehlt.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Ungültiges Authorization-Format. Erwartet: 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = parts[1]
    
    # Verify token with Supabase
    user_data = await verify_supabase_token(token)
    if not user_data:
        raise HTTPException(
            status_code=401,
            detail="Ungültiger oder abgelaufener Token.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return User(
        id=user_data.get("sub") or user_data.get("id"),
        email=user_data.get("email"),
        role=user_data.get("role", "authenticated")
    )


async def get_optional_user(
    authorization: str = Header(None, alias="Authorization")
) -> Optional[User]:
    """
    Same as get_current_user but returns None instead of raising exception.
    Useful for routes that work with or without authentication.
    """
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


async def verify_supabase_token(token: str) -> Optional[dict]:
    """
    Verify a Supabase JWT token by calling the /auth/v1/user endpoint.
    Returns user data if valid, None if invalid.
    """
    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.SUPABASE_ANON_KEY
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception:
            return None


def require_subscription(min_tier: str = "basis"):
    """
    Dependency that checks if user has required subscription tier.
    
    Usage:
        @router.post("/premium-feature")
        async def premium_feature(
            user: User = Depends(get_current_user),
            _: None = Depends(require_subscription("premium"))
        ):
            ...
    """
    tier_levels = {"basis": 1, "premium": 2, "vip": 3}
    
    async def check_subscription(user: User = Depends(get_current_user)):
        # TODO: Fetch subscription from database
        # For now, allow all authenticated users
        user_tier = "vip"  # Placeholder
        
        if tier_levels.get(user_tier, 0) < tier_levels.get(min_tier, 1):
            raise HTTPException(
                status_code=403,
                detail=f"Diese Funktion erfordert mindestens {min_tier.title()}-Abo."
            )
        
        return None
    
    return check_subscription
