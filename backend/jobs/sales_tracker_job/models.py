"""
Sales Tracker Job - Data Models
"""
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass, field


@dataclass
class Shop:
    """Shop model from Supabase"""
    id: str
    internal_name: str
    shop_domain: str
    access_token: str


@dataclass
class CollectionAssignment:
    """Collection assignment from campaign_batch_assignments"""
    id: str
    campaign_id: str
    shopify_collection_id: str
    collection_title: str
    batch_indices: List[int]
    assigned_shop: str
    ad_channel: str


@dataclass
class Product:
    """Product model from Shopify"""
    id: str
    title: str
    handle: str
    created_at: datetime
    updated_at: datetime
    variants: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class SalesData:
    """Sales data model for Supabase"""
    product_id: str
    product_title: str
    total_sales: float = 0.0
    total_quantity: int = 0
    sales_first_7_days: int = 0
    sales_last_3_days: int = 0
    sales_last_7_days: int = 0
    sales_last_10_days: int = 0
    sales_last_14_days: int = 0
    last_update: datetime = field(default_factory=datetime.now)
    date_added_to_collection: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert SalesData to dict for Supabase."""
        return {
            'product_id': self.product_id,
            'product_title': self.product_title,
            'total_sales': self.total_sales,
            'total_quantity': self.total_quantity,
            'sales_first_7_days': self.sales_first_7_days,
            'sales_last_3_days': self.sales_last_3_days,
            'sales_last_7_days': self.sales_last_7_days,
            'sales_last_10_days': self.sales_last_10_days,
            'sales_last_14_days': self.sales_last_14_days,
            'last_update': self.last_update.isoformat() if self.last_update else None,
            'date_added_to_collection': self.date_added_to_collection.isoformat() if self.date_added_to_collection else None
        }
