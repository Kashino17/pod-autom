"""
Replace Job Models - Data structures for product replacement logic
"""
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
from dataclasses import dataclass
from pydantic import BaseModel


class ProductPhase(Enum):
    """Product lifecycle phases"""
    TOO_NEW = "too_new"      # Not yet in evaluation
    INITIAL = "initial"      # First phase (e.g., 7 days)
    POST = "post"           # Post phase (e.g., after 14 days)


class ProductAction(Enum):
    """Possible actions for a product"""
    KEEP = "keep"           # Keep product in collection
    REPLACE = "replace"     # Replace product (LOSER or REPLACED based on total_sales)


@dataclass
class ProductAnalysis:
    """Analysis result for a single product"""
    product_id: str
    product_gid: str
    title: str
    tags: List[str]
    phase: ProductPhase
    action: ProductAction
    reason: str
    position: Optional[int] = None
    sales_data: Optional[Dict] = None


@dataclass
class ShopConfig:
    """Shop configuration from Supabase"""
    shop_id: str
    shop_domain: str
    access_token: str
    test_mode: bool
    qk_tag: str
    replace_tag_prefix: str
    start_phase_days: int
    nach_phase_days: int
    initial_phase_rules: Dict
    post_phase_rules: Dict
    selected_collections: List[Dict]
    maintain_positions: bool
    loser_threshold: int = 5  # Products with total_sales <= this get LOSER tag and stock=0


class Shop(BaseModel):
    """Shop model from Supabase"""
    id: str
    internal_name: str
    shop_domain: str
    access_token: str
    user_id: str
    rules: Dict[str, Any] = {}


class Collection(BaseModel):
    """Collection model"""
    id: str
    title: str
    enabled: bool = True
