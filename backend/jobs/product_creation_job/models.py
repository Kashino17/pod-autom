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
            try:
                images = json.loads(row['images']) if isinstance(row['images'], str) else row['images']
            except:
                images = [row['images']] if row['images'] else None

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
