"""
Product Optimize Job Models - Data structures for product optimization
"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from pydantic import BaseModel


@dataclass
class ProductCreationConfig:
    """Product optimization settings from shop rules"""
    # Basic optimizations
    generate_optimized_title: bool = True
    generate_optimized_description: bool = True
    generate_tags: bool = True
    sales_text_template: str = "Winter"

    # Variant optimizations
    translate_size: bool = True  # "Size" to "Größe"
    set_german_sizes: bool = False

    # Price optimizations
    set_compare_at_price: bool = True
    compare_at_price_percent: float = 60.0
    set_price_decimals: bool = True
    price_decimals_value: int = 90
    set_compare_at_price_decimals: bool = True
    compare_at_price_decimals_value: int = 90
    adjust_product_price: bool = True
    price_adjustment_type: str = "PERCENT"  # PERCENT or FIXED
    price_adjustment_value: float = -23.0

    # Inventory optimizations
    set_global_inventory: bool = True
    global_inventory_value: int = 10000
    enable_inventory_tracking: bool = True
    publish_channels: bool = True

    # Additional options
    set_global_tags: bool = False
    global_tags_value: str = ""
    change_product_status: bool = True
    product_status_value: str = "active"
    set_category_tag_fashion: bool = True

    @classmethod
    def from_rules(cls, rules: Dict) -> 'ProductCreationConfig':
        """Create config from shop rules JSON"""
        pc = rules.get('product_creation', {})
        return cls(
            generate_optimized_title=pc.get('generateOptimizedTitle', True),
            generate_optimized_description=pc.get('generateOptimizedDescription', True),
            generate_tags=pc.get('generateTags', True),
            sales_text_template=pc.get('salesTextTemplate', 'Winter'),
            translate_size=pc.get('translateSize', True),
            set_german_sizes=pc.get('setGermanSizes', False),
            set_compare_at_price=pc.get('setCompareAtPrice', True),
            compare_at_price_percent=pc.get('compareAtPricePercent', 60.0),
            set_price_decimals=pc.get('setPriceDecimals', True),
            price_decimals_value=pc.get('priceDecimalsValue', 90),
            set_compare_at_price_decimals=pc.get('setCompareAtPriceDecimals', True),
            compare_at_price_decimals_value=pc.get('compareAtPriceDecimalsValue', 90),
            adjust_product_price=pc.get('adjustProductPrice', True),
            price_adjustment_type=pc.get('priceAdjustmentType', 'PERCENT'),
            price_adjustment_value=pc.get('priceAdjustmentValue', -23.0),
            set_global_inventory=pc.get('setGlobalInventory', True),
            global_inventory_value=pc.get('globalInventoryValue', 10000),
            enable_inventory_tracking=pc.get('enableInventoryTracking', True),
            publish_channels=pc.get('publishChannels', True),
            set_global_tags=pc.get('setGlobalTags', False),
            global_tags_value=pc.get('globalTagsValue', ''),
            change_product_status=pc.get('changeProductStatus', True),
            product_status_value=pc.get('productStatusValue', 'active'),
            set_category_tag_fashion=pc.get('setCategoryTagFashion', True)
        )


@dataclass
class ShopConfig:
    """Shop configuration for product optimization"""
    shop_id: str
    shop_domain: str
    access_token: str
    internal_name: str
    optimization_config: ProductCreationConfig
    fast_fashion_limit: int = 20


@dataclass
class ShopifyProduct:
    """Shopify product data"""
    id: str
    title: str
    body_html: str
    vendor: str
    product_type: str
    tags: List[str]
    status: str
    variants: List[Dict]
    images: List[Dict] = field(default_factory=list)

    @classmethod
    def from_api(cls, data: Dict) -> 'ShopifyProduct':
        """Create from Shopify API response"""
        tags = data.get('tags', '')
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(',') if t.strip()]

        return cls(
            id=str(data['id']),
            title=data.get('title', ''),
            body_html=data.get('body_html', ''),
            vendor=data.get('vendor', ''),
            product_type=data.get('product_type', ''),
            tags=tags,
            status=data.get('status', 'draft'),
            variants=data.get('variants', []),
            images=data.get('images', [])
        )


class Shop(BaseModel):
    """Shop model from Supabase"""
    id: str
    internal_name: str
    shop_domain: str
    access_token: str
    user_id: str
    rules: Dict[str, Any] = {}
