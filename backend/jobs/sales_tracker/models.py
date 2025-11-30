"""
Sales Tracker Models - Pydantic models for type safety
"""
from typing import Dict, List, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class Shop(BaseModel):
    """Shop model from Supabase"""
    id: str
    internal_name: str
    shop_domain: str
    access_token: str
    user_id: str


class Collection(BaseModel):
    """Collection model"""
    id: str
    title: str
    enabled: bool = True


class Product(BaseModel):
    """Product model from Shopify"""
    id: str
    title: str
    handle: str
    created_at: datetime
    updated_at: datetime
    variants: List[Dict[str, Any]] = []


class SalesData(BaseModel):
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
    last_update: datetime
    orders_processed: List[str] = []
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
            'last_update': self.last_update.isoformat(),
            'orders_processed': self.orders_processed,
            'date_added_to_collection': self.date_added_to_collection.isoformat() if self.date_added_to_collection else None
        }


class Order(BaseModel):
    """Order model from Shopify"""
    id: str
    name: str
    created_at: datetime
    line_items: List[Dict[str, Any]]
    financial_status: str
    fulfillment_status: Optional[str] = None
    cancelled_at: Optional[datetime] = None
