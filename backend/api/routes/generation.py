"""
Generation API Routes
GPT Image generation and content creation.
"""
import os
import sys
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from api.auth import get_current_user, User
from config import settings

router = APIRouter()


class DesignGenerateRequest(BaseModel):
    niche: str
    style: Optional[str] = "minimalist"
    prompt_override: Optional[str] = None


class ContentGenerateRequest(BaseModel):
    niche: str
    design_description: str
    product_type: str = "T-Shirt"


class DesignResponse(BaseModel):
    success: bool
    image_url: Optional[str] = None
    prompt_used: Optional[str] = None
    error: Optional[str] = None


@router.post("/design")
async def generate_design(
    data: DesignGenerateRequest,
    user: User = Depends(get_current_user)
) -> DesignResponse:
    """
    Generate a t-shirt design using GPT Image.
    Returns the URL to the generated image.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API nicht konfiguriert. Bitte OPENAI_API_KEY setzen."
        )
    
    try:
        from services.openai_service import generate_design_image
        
        result = await generate_design_image(
            niche=data.niche,
            style=data.style,
            prompt_override=data.prompt_override
        )
        
        return DesignResponse(
            success=True,
            image_url=result["image_url"],
            prompt_used=result["prompt"]
        )
    except Exception as e:
        return DesignResponse(
            success=False,
            error=str(e)
        )


@router.post("/title")
async def generate_title(
    data: ContentGenerateRequest,
    user: User = Depends(get_current_user)
):
    """Generate a product title using GPT."""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API nicht konfiguriert."
        )
    
    try:
        from services.openai_service import generate_product_title
        
        title = await generate_product_title(
            niche=data.niche,
            design_description=data.design_description,
            product_type=data.product_type
        )
        
        return {
            "success": True,
            "title": title
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/description")
async def generate_description(
    data: ContentGenerateRequest,
    user: User = Depends(get_current_user)
):
    """Generate a product description using GPT."""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API nicht konfiguriert."
        )
    
    try:
        from services.openai_service import generate_product_description
        
        description = await generate_product_description(
            niche=data.niche,
            design_description=data.design_description,
            product_type=data.product_type
        )
        
        return {
            "success": True,
            "description": description
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mockup")
async def generate_mockup(
    design_url: str,
    product_type: str = "t-shirt",
    color: str = "black",
    user: User = Depends(get_current_user)
):
    """
    Place a design on a product mockup.
    Returns the mockup image URL.
    """
    try:
        from services.mockup_service import create_mockup
        
        mockup_url = await create_mockup(
            design_url=design_url,
            product_type=product_type,
            color=color
        )
        
        return {
            "success": True,
            "mockup_url": mockup_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full-product")
async def generate_full_product(
    niche: str,
    product_type: str = "T-Shirt",
    style: str = "minimalist",
    user: User = Depends(get_current_user)
):
    """
    Generate a complete product:
    1. Design image
    2. Mockup
    3. Title
    4. Description
    
    Returns all generated content.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API nicht konfiguriert."
        )
    
    # TODO: Implement full pipeline
    raise HTTPException(
        status_code=501,
        detail="Vollständige Produkt-Generierung noch nicht implementiert."
    )
