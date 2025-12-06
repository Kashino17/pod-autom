"""
Product Creation Job Models - Data structures for product creation
"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pydantic import BaseModel


@dataclass
class ShopConfig:
    """Shop configuration for product creation"""
    shop_id: str
    shop_domain: str
    access_token: str
    internal_name: str
    fast_fashion_limit: int


@dataclass
class ResearchProduct:
    """Product from research table ready to be created in Shopify"""
    id: int
    title: str
    description: str
    price: Optional[str]
    compare_price: Optional[str]
    images: Optional[List[str]]
    variants_string: Optional[str]  # Raw variant string like "Title - Black / S, Title - Black / M, ..."

    @classmethod
    def from_db_row(cls, row: Dict) -> 'ResearchProduct':
        """Create from database row"""
        images = None
        if row.get('images'):
            import json
            raw_images = row['images']

            # If already a list, use it directly
            if isinstance(raw_images, list):
                images = raw_images
            elif isinstance(raw_images, str):
                # Try JSON array parsing first
                try:
                    parsed = json.loads(raw_images)
                    if isinstance(parsed, list):
                        images = parsed
                    else:
                        images = [parsed]
                except json.JSONDecodeError:
                    # Fallback: comma-separated string
                    images = [url.strip() for url in raw_images.split(',') if url.strip()]

        # Variants are stored as a comma-separated string
        variants_string = None
        if row.get('variants'):
            if isinstance(row['variants'], str):
                variants_string = row['variants']
            elif isinstance(row['variants'], list):
                # If it's a list, join back to string
                variants_string = ', '.join(row['variants'])

        return cls(
            id=row['id'],
            title=row['title'],
            description=row.get('description', ''),
            price=row.get('price'),
            compare_price=row.get('comparePrice') or row.get('compare_price'),
            images=images,
            variants_string=variants_string
        )


class Shop(BaseModel):
    """Shop model from Supabase"""
    id: str
    internal_name: str
    shop_domain: str
    access_token: str
    user_id: str
    rules: Dict[str, Any] = {}


class RateLimits(BaseModel):
    """Rate limits from Supabase"""
    shop_id: str
    fast_fashion_limit: int = 20
    pod_creation_limit: int = 10
