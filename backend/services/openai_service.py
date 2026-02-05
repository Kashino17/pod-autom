"""
OpenAI Service
Handles GPT Image generation and text generation.
"""
import os
import sys
from typing import Optional
import logging

from openai import AsyncOpenAI

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None


# =====================================================
# DESIGN PROMPTS
# =====================================================

DEFAULT_DESIGN_PROMPT = """Create a high-quality t-shirt design for the "{niche}" niche.

Style: {style}
Requirements:
- Clean, professional design suitable for printing
- No text or typography (unless specifically requested)
- High contrast that works on both light and dark fabric
- Centered composition
- Modern, trendy aesthetic
- Appeal to the target audience interested in {niche}

The design should be visually striking and marketable."""

STYLE_MODIFIERS = {
    "minimalist": "Simple, clean lines with minimal elements. Use negative space effectively.",
    "bold": "Strong, impactful design with bold shapes and high contrast.",
    "vintage": "Retro aesthetic with distressed textures and classic typography.",
    "artistic": "Creative, artistic interpretation with unique visual elements.",
    "geometric": "Clean geometric shapes and patterns.",
    "illustrative": "Detailed illustration style with artistic flair."
}


# =====================================================
# IMAGE GENERATION
# =====================================================

async def generate_design_image(
    niche: str,
    style: str = "minimalist",
    prompt_override: Optional[str] = None
) -> dict:
    """
    Generate a t-shirt design using GPT Image (DALL-E).
    
    Args:
        niche: The product niche (e.g., "Fitness", "Gaming")
        style: Design style (minimalist, bold, vintage, etc.)
        prompt_override: Optional custom prompt to use instead of default
    
    Returns:
        dict with "image_url" and "prompt" keys
    """
    if not client:
        raise ValueError("OpenAI client not initialized. Check OPENAI_API_KEY.")
    
    # Build prompt
    if prompt_override:
        prompt = prompt_override
    else:
        style_modifier = STYLE_MODIFIERS.get(style, STYLE_MODIFIERS["minimalist"])
        prompt = DEFAULT_DESIGN_PROMPT.format(niche=niche, style=style_modifier)
    
    logger.info(f"Generating design for niche: {niche}, style: {style}")
    
    try:
        response = await client.images.generate(
            model=settings.OPENAI_IMAGE_MODEL,  # "gpt-image-1" or "dall-e-3"
            prompt=prompt,
            size="1024x1024",
            quality=settings.OPENAI_IMAGE_QUALITY,  # "high"
            n=1
        )
        
        image_url = response.data[0].url
        
        logger.info(f"Design generated successfully: {image_url[:50]}...")
        
        return {
            "image_url": image_url,
            "prompt": prompt
        }
        
    except Exception as e:
        logger.error(f"Error generating design: {e}")
        raise


# =====================================================
# TEXT GENERATION
# =====================================================

async def generate_product_title(
    niche: str,
    design_description: str,
    product_type: str = "T-Shirt"
) -> str:
    """
    Generate a product title using GPT.
    
    Returns:
        Product title string (max 70 characters for SEO)
    """
    if not client:
        raise ValueError("OpenAI client not initialized.")
    
    prompt = f"""Erstelle einen deutschen Produkttitel für einen {product_type} aus der Nische "{niche}".

Design-Beschreibung: {design_description}

Anforderungen:
- Maximal 70 Zeichen
- SEO-optimiert mit relevanten Keywords
- Ansprechend und zum Kauf motivierend
- Keine Sonderzeichen oder Emojis
- Deutsch

Antworte NUR mit dem Titel, ohne Anführungszeichen."""

    response = await client.chat.completions.create(
        model=settings.OPENAI_TEXT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=100,
        temperature=0.7
    )
    
    return response.choices[0].message.content.strip()


async def generate_product_description(
    niche: str,
    design_description: str,
    product_type: str = "T-Shirt"
) -> str:
    """
    Generate a product description using GPT.
    
    Returns:
        Product description string (HTML formatted)
    """
    if not client:
        raise ValueError("OpenAI client not initialized.")
    
    prompt = f"""Erstelle eine deutsche Produktbeschreibung für einen {product_type} aus der Nische "{niche}".

Design-Beschreibung: {design_description}

Anforderungen:
- 150-200 Wörter
- Conversion-optimiert
- Erwähne Qualität und Material
- Füge einen Call-to-Action ein
- HTML-formatiert mit <p>, <ul>, <li> Tags
- Deutsch

Antworte NUR mit der Beschreibung in HTML."""

    response = await client.chat.completions.create(
        model=settings.OPENAI_TEXT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
        temperature=0.7
    )
    
    return response.choices[0].message.content.strip()


async def generate_tags(niche: str, title: str) -> list[str]:
    """Generate product tags for SEO."""
    if not client:
        raise ValueError("OpenAI client not initialized.")
    
    prompt = f"""Generiere 10 relevante Tags für ein Produkt:

Nische: {niche}
Titel: {title}

Anforderungen:
- Relevante deutsche Keywords
- Mix aus spezifischen und allgemeinen Tags
- Keine Duplikate
- Kleingeschrieben

Antworte mit einer komma-getrennten Liste, ohne Nummerierung."""

    response = await client.chat.completions.create(
        model=settings.OPENAI_TEXT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=100,
        temperature=0.7
    )
    
    tags_text = response.choices[0].message.content.strip()
    return [tag.strip().lower() for tag in tags_text.split(",")]
