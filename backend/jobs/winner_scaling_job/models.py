"""
Data models for Winner Scaling Job
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class WinnerScalingSettings:
    """Settings for winner scaling per shop."""
    shop_id: str
    is_enabled: bool = False

    # Winner criteria (4-Bucket System)
    sales_threshold_3d: int = 5
    sales_threshold_7d: int = 10
    sales_threshold_10d: int = 15
    sales_threshold_14d: int = 20
    min_buckets_required: int = 3  # 1-4

    # Campaign limits
    max_campaigns_per_winner: int = 4

    # Creative settings
    video_count: int = 2          # Number of videos with Veo 3.1
    image_count: int = 4          # Number of images with GPT-Image
    campaigns_per_video: int = 1  # Campaigns per video set
    campaigns_per_image: int = 2  # Campaigns per image set

    # Link settings (A/B Test)
    link_to_product: bool = True
    link_to_collection: bool = True  # If both true = A/B Test

    # Budget
    daily_budget_per_campaign: float = 10.00

    # Platform flags
    pinterest_enabled: bool = True
    meta_enabled: bool = False     # Placeholder
    google_enabled: bool = False   # Placeholder


@dataclass
class PinterestSettings:
    """Pinterest settings for a shop."""
    url_prefix: str = ''
    default_board_id: Optional[str] = None
    products_per_page: int = 10


@dataclass
class ShopConfig:
    """Shop configuration with Pinterest and Shopify credentials."""
    shop_id: str
    internal_name: str
    shop_domain: str
    pinterest_access_token: str
    pinterest_refresh_token: Optional[str]
    pinterest_account_id: str
    shopify_access_token: Optional[str] = None
    pinterest_settings: Optional[PinterestSettings] = None


@dataclass
class ProductSalesData:
    """Sales data for a product."""
    product_id: str
    collection_id: str
    product_title: str
    product_handle: Optional[str] = None
    collection_handle: Optional[str] = None
    shopify_image_url: Optional[str] = None

    # Sales per timeframe
    sales_3d: int = 0
    sales_7d: int = 0
    sales_10d: int = 0
    sales_14d: int = 0

    # Original campaign info (for targeting copy)
    original_campaign_id: Optional[str] = None

    # Position in collection (for pagination calculation)
    position_in_collection: int = 0

    def calculate_buckets_passed(self, settings: WinnerScalingSettings) -> int:
        """Calculate how many bucket thresholds are passed."""
        passed = 0
        if self.sales_3d >= settings.sales_threshold_3d:
            passed += 1
        if self.sales_7d >= settings.sales_threshold_7d:
            passed += 1
        if self.sales_10d >= settings.sales_threshold_10d:
            passed += 1
        if self.sales_14d >= settings.sales_threshold_14d:
            passed += 1
        return passed

    def is_winner(self, settings: WinnerScalingSettings) -> bool:
        """Check if this product qualifies as a winner."""
        return self.calculate_buckets_passed(settings) >= settings.min_buckets_required


@dataclass
class WinnerProduct:
    """Identified winner product."""
    id: str
    shop_id: str
    product_id: str
    collection_id: str
    product_title: str
    product_handle: Optional[str] = None
    collection_handle: Optional[str] = None
    shopify_image_url: Optional[str] = None

    identified_at: Optional[datetime] = None
    is_active: bool = True

    # Sales snapshot
    sales_3d: int = 0
    sales_7d: int = 0
    sales_10d: int = 0
    sales_14d: int = 0
    buckets_passed: int = 0

    original_campaign_id: Optional[str] = None

    # Joined data
    active_campaigns_count: int = 0


@dataclass
class GeneratedCreative:
    """AI-generated creative asset."""
    url: str
    creative_type: str  # 'video' or 'image'
    model: str  # 'veo-3.1' or 'gpt-image'
    prompt_used: Optional[str] = None
    pin_id: Optional[str] = None


@dataclass
class WinnerCampaign:
    """Created campaign for a winner product."""
    id: Optional[str] = None
    shop_id: str = ""
    winner_product_id: str = ""

    pinterest_campaign_id: str = ""
    pinterest_ad_group_id: Optional[str] = None
    campaign_name: str = ""

    creative_type: str = "image"  # 'video' or 'image'
    creative_count: int = 0
    link_type: str = "product"  # 'product' or 'collection'

    status: str = "ACTIVE"  # ACTIVE, PAUSED, ARCHIVED

    generated_assets: List[GeneratedCreative] = field(default_factory=list)


@dataclass
class OriginalCampaignTargeting:
    """Targeting settings from original campaign to copy."""
    target_locations: List[str] = field(default_factory=lambda: ['DE'])
    age_group: str = 'ALL'
    gender: Optional[str] = None
    interests: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)


@dataclass
class JobMetrics:
    """Metrics tracked during job execution."""
    shops_processed: int = 0
    shops_failed: int = 0
    winners_identified: int = 0
    campaigns_created: int = 0
    creatives_generated: int = 0
    api_limits_hit: int = 0
    errors: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class LogEntry:
    """Entry for the winner scaling log."""
    shop_id: str
    action_type: str
    details: Dict[str, Any]
    winner_product_id: Optional[str] = None
    executed_at: Optional[datetime] = None
