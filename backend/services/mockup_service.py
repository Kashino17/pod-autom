"""
Mockup Service
Places designs on product templates (T-Shirts, Hoodies, etc.)
"""
import os
import sys
from typing import Optional, Tuple
from pathlib import Path
import logging
import httpx
from io import BytesIO

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

logger = logging.getLogger(__name__)

# Template directory
TEMPLATES_DIR = Path(__file__).parent.parent / "assets" / "mockup_templates"


# =====================================================
# MOCKUP CONFIGURATION
# =====================================================

# Define where to place designs on each template
# Format: (x, y, width, height) - position and size of design area
MOCKUP_CONFIG = {
    "t-shirt": {
        "black": {
            "template": "tshirt_black.png",
            "design_area": (300, 250, 400, 400),  # x, y, width, height
        },
        "white": {
            "template": "tshirt_white.png",
            "design_area": (300, 250, 400, 400),
        },
        "navy": {
            "template": "tshirt_navy.png",
            "design_area": (300, 250, 400, 400),
        }
    },
    "hoodie": {
        "black": {
            "template": "hoodie_black.png",
            "design_area": (280, 280, 440, 440),
        },
        "white": {
            "template": "hoodie_white.png",
            "design_area": (280, 280, 440, 440),
        }
    },
    "sweatshirt": {
        "black": {
            "template": "sweatshirt_black.png",
            "design_area": (290, 260, 420, 420),
        }
    }
}


# =====================================================
# MOCKUP GENERATION
# =====================================================

async def create_mockup(
    design_url: str,
    product_type: str = "t-shirt",
    color: str = "black",
    output_path: Optional[str] = None
) -> str:
    """
    Create a mockup by placing design on a product template.
    
    Args:
        design_url: URL of the design image to place
        product_type: Type of product (t-shirt, hoodie, sweatshirt)
        color: Color variant (black, white, navy)
        output_path: Optional path to save the mockup (if None, uploads to storage)
    
    Returns:
        URL or path to the generated mockup
    """
    product_type = product_type.lower().replace(" ", "-")
    color = color.lower()
    
    # Get mockup config
    if product_type not in MOCKUP_CONFIG:
        raise ValueError(f"Unbekannter Produkttyp: {product_type}")
    
    if color not in MOCKUP_CONFIG[product_type]:
        # Fall back to black
        color = list(MOCKUP_CONFIG[product_type].keys())[0]
    
    config = MOCKUP_CONFIG[product_type][color]
    template_path = TEMPLATES_DIR / config["template"]
    design_area = config["design_area"]
    
    logger.info(f"Creating mockup: {product_type}/{color}")
    
    # Download design image
    design_image = await download_image(design_url)
    if not design_image:
        raise ValueError("Konnte Design-Bild nicht laden.")
    
    # Load template (or create placeholder if not exists)
    if template_path.exists():
        template = Image.open(template_path).convert("RGBA")
    else:
        logger.warning(f"Template not found: {template_path}, using placeholder")
        template = create_placeholder_template(product_type, color)
    
    # Resize design to fit design area
    x, y, width, height = design_area
    design_resized = design_image.resize((width, height), Image.Resampling.LANCZOS)
    
    # If design has transparency, use it. Otherwise, make white transparent
    if design_resized.mode != "RGBA":
        design_resized = design_resized.convert("RGBA")
    
    # Paste design onto template
    template.paste(design_resized, (x, y), design_resized)
    
    # Save or upload
    if output_path:
        template.save(output_path, "PNG")
        return output_path
    else:
        # TODO: Upload to Supabase Storage or S3
        # For now, save locally and return path
        os.makedirs("/tmp/mockups", exist_ok=True)
        import uuid
        filename = f"/tmp/mockups/{uuid.uuid4()}.png"
        template.save(filename, "PNG")
        return filename


async def download_image(url: str) -> Optional[Image.Image]:
    """Download an image from URL and return as PIL Image."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            return Image.open(BytesIO(response.content)).convert("RGBA")
    except Exception as e:
        logger.error(f"Error downloading image: {e}")
        return None


def create_placeholder_template(product_type: str, color: str) -> Image.Image:
    """Create a placeholder template when real template is not available."""
    # Create a simple colored rectangle as placeholder
    colors = {
        "black": (30, 30, 30),
        "white": (245, 245, 245),
        "navy": (28, 35, 64),
        "gray": (128, 128, 128)
    }
    
    bg_color = colors.get(color, colors["black"])
    
    # Create 1000x1000 image
    img = Image.new("RGBA", (1000, 1000), bg_color + (255,))
    
    # TODO: Add product shape outline
    
    return img


# =====================================================
# BULK GENERATION
# =====================================================

async def create_all_mockups(
    design_url: str,
    product_types: list[str] = None,
    colors: list[str] = None
) -> dict[str, str]:
    """
    Create mockups for multiple product/color combinations.
    
    Returns:
        Dict mapping "product_color" to mockup URL
    """
    if product_types is None:
        product_types = ["t-shirt"]
    
    if colors is None:
        colors = ["black", "white"]
    
    results = {}
    
    for product_type in product_types:
        for color in colors:
            try:
                key = f"{product_type}_{color}"
                mockup_url = await create_mockup(design_url, product_type, color)
                results[key] = mockup_url
            except Exception as e:
                logger.error(f"Error creating mockup {product_type}/{color}: {e}")
                results[f"{product_type}_{color}"] = None
    
    return results
