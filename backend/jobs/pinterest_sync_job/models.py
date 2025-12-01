"""
Data Models for Pinterest Sync Job
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime


@dataclass
class ShopPinterestConfig:
    """Shop configuration with Pinterest settings."""
    shop_id: str
    internal_name: str
    shop_domain: str
    access_token: str  # Shopify access token

    # Pinterest Auth
    pinterest_access_token: str
    pinterest_refresh_token: Optional[str] = None
    pinterest_expires_at: Optional[str] = None
    pinterest_user_id: Optional[str] = None

    # Selected Ad Account
    ad_account_id: Optional[str] = None
    pinterest_account_id: Optional[str] = None

    # Settings
    url_prefix: str = ''
    global_batch_size: int = 50


@dataclass
class PinterestCampaign:
    """Pinterest campaign with batch assignments."""
    id: str  # Supabase UUID
    pinterest_campaign_id: str
    name: str
    status: str
    ad_account_id: str
    daily_budget: Optional[float] = None

    # Batch assignments
    batch_assignments: List[Dict] = field(default_factory=list)


@dataclass
class CollectionBatch:
    """A batch of products from a Shopify collection."""
    collection_id: str
    collection_shopify_id: str
    collection_title: str
    batch_index: int
    products: List[Dict] = field(default_factory=list)


@dataclass
class ShopifyProduct:
    """Shopify product for Pinterest sync."""
    id: str
    title: str
    description: str
    handle: str
    status: str
    images: List[Dict] = field(default_factory=list)
    variants: List[Dict] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)

    @property
    def primary_image_url(self) -> Optional[str]:
        """Get first image URL."""
        if self.images:
            return self.images[0].get('src')
        return None

    @property
    def price(self) -> Optional[str]:
        """Get price from first variant."""
        if self.variants:
            return self.variants[0].get('price')
        return None

    @classmethod
    def from_api(cls, data: Dict) -> 'ShopifyProduct':
        tags_str = data.get('tags', '')
        tags = [t.strip() for t in tags_str.split(',')] if tags_str else []

        return cls(
            id=str(data.get('id')),
            title=data.get('title', ''),
            description=data.get('body_html', '') or '',
            handle=data.get('handle', ''),
            status=data.get('status', 'active'),
            images=data.get('images', []),
            variants=data.get('variants', []),
            tags=tags
        )


@dataclass
class PinterestPin:
    """Pinterest Pin data structure."""
    id: Optional[str] = None
    title: str = ''
    description: str = ''
    link: str = ''
    media_source_url: str = ''
    board_id: Optional[str] = None

    # For ad pins
    ad_account_id: Optional[str] = None
    campaign_id: Optional[str] = None


@dataclass
class SyncResult:
    """Result of syncing a product to Pinterest."""
    success: bool
    shopify_product_id: str
    pinterest_pin_id: Optional[str] = None
    error: Optional[str] = None
