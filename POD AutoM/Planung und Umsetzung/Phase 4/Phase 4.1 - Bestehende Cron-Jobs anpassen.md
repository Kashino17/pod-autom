# Phase 4.1 - Bestehende Cron-Jobs anpassen

## Ziel
Anpassung der bestehenden ReBoss Cron-Jobs, um auch POD AutoM Shops zu verarbeiten.

## Kritische Hinweise

### ⚠️ Supabase Python Client ist SYNCHRON
```python
# ❌ FALSCH - Der Python Supabase Client ist synchron
result = await supabase.table('shops').select('*').execute()

# ✅ RICHTIG - Kein await benötigt
result = supabase.table('shops').select('*').execute()
```

### ⚠️ Type Hints verwenden (Python 3.10+)
```python
# ✅ Moderne Python Type Hints
def get_tier_limits(tier: str) -> dict[str, int]:
    ...
```

### ⚠️ Job-Runs protokollieren
Alle Job-Ausführungen in `job_runs` Tabelle loggen für Monitoring.

---

## Übersicht

Die bestehenden Jobs müssen erweitert werden, um beide Systeme zu unterstützen:
- ReBoss: `shops` Tabelle
- POD AutoM: `pod_autom_shops` Tabelle

## Anzupassende Jobs

### 1. Shared Constants & Types

**Neue Datei:** `backend/jobs/shared/constants.py`

```python
"""Shared constants for all POD AutoM jobs"""

from typing import TypedDict

class TierLimits(TypedDict):
    max_products: int
    max_niches: int
    winner_scaling: bool
    advanced_analytics: bool

TIER_LIMITS: dict[str, TierLimits] = {
    'basis': {
        'max_products': 100,
        'max_niches': 5,
        'winner_scaling': False,
        'advanced_analytics': False
    },
    'premium': {
        'max_products': 500,
        'max_niches': 15,
        'winner_scaling': True,
        'advanced_analytics': False
    },
    'vip': {
        'max_products': -1,  # Unlimited
        'max_niches': -1,
        'winner_scaling': True,
        'advanced_analytics': True
    }
}

def get_tier_limits(tier: str) -> TierLimits:
    """Get limits for a subscription tier"""
    return TIER_LIMITS.get(tier, TIER_LIMITS['basis'])
```

### 2. POD AutoM Supabase Service

**Neue Datei:** `backend/jobs/shared/pod_autom_supabase.py`

```python
"""Supabase service for POD AutoM jobs"""

import os
import logging
from datetime import datetime, timezone
from typing import Any
from supabase import create_client, Client

logger = logging.getLogger(__name__)


class PodAutomSupabaseService:
    """Supabase service for POD AutoM operations"""

    def __init__(self) -> None:
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_KEY')

        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.client: Client = create_client(url, key)

    def get_active_shops(self) -> list[dict[str, Any]]:
        """
        Fetch all active POD AutoM shops with enabled settings.

        Returns:
            List of shop dictionaries with nested settings, niches, and prompts
        """
        try:
            result = self.client.table('pod_autom_shops').select(
                '''
                *,
                pod_autom_settings!inner(
                    *,
                    pod_autom_niches(*),
                    pod_autom_prompts(*)
                )
                '''
            ).eq(
                'connection_status', 'connected'
            ).eq(
                'pod_autom_settings.enabled', True
            ).execute()

            return result.data or []
        except Exception as e:
            logger.error(f"Failed to fetch POD AutoM shops: {e}")
            return []

    def get_subscription(self, user_id: str) -> dict[str, Any] | None:
        """
        Get user's active POD AutoM subscription.

        Args:
            user_id: The user's UUID

        Returns:
            Subscription dict or None if not found/inactive
        """
        try:
            result = self.client.table('pod_autom_subscriptions').select(
                '*'
            ).eq(
                'user_id', user_id
            ).eq(
                'status', 'active'
            ).maybeSingle().execute()

            return result.data
        except Exception as e:
            logger.error(f"Failed to fetch subscription for user {user_id}: {e}")
            return None

    def get_products_this_month(self, shop_id: str) -> int:
        """
        Count products created this month for a POD AutoM shop.

        Args:
            shop_id: The shop's UUID

        Returns:
            Number of products created this month
        """
        try:
            now = datetime.now(timezone.utc)
            start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            result = self.client.table('pod_autom_products').select(
                'id', count='exact'
            ).eq(
                'shop_id', shop_id
            ).gte(
                'created_at', start_of_month.isoformat()
            ).execute()

            return result.count or 0
        except Exception as e:
            logger.error(f"Failed to count products for shop {shop_id}: {e}")
            return 0

    def insert_product(self, product_data: dict[str, Any]) -> dict[str, Any] | None:
        """
        Insert a new product into the database.

        Args:
            product_data: Dictionary with product fields

        Returns:
            Inserted product or None on failure
        """
        try:
            result = self.client.table('pod_autom_products').insert(
                product_data
            ).execute()

            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Failed to insert product: {e}")
            return None

    def log_job_run(
        self,
        job_name: str,
        status: str,
        details: dict[str, Any] | None = None,
        error_message: str | None = None
    ) -> None:
        """
        Log a job run to the job_runs table for monitoring.

        Args:
            job_name: Name of the job (e.g., 'product_creation_job')
            status: 'started', 'completed', 'failed'
            details: Optional JSON details
            error_message: Optional error message if failed
        """
        try:
            self.client.table('job_runs').insert({
                'job_name': job_name,
                'status': status,
                'details': details or {},
                'error_message': error_message,
                'created_at': datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            # Don't fail the job if logging fails
            logger.warning(f"Failed to log job run: {e}")

    def get_unsynced_products(self, shop_id: str, platform: str, limit: int = 50) -> list[dict[str, Any]]:
        """
        Get products that haven't been synced to a specific platform.

        Args:
            shop_id: The shop's UUID
            platform: Platform name (pinterest, meta, etc.)
            limit: Maximum number of products to return

        Returns:
            List of product dictionaries
        """
        try:
            # Get product IDs that are already synced
            synced = self.client.table('pod_autom_sync_log').select(
                'product_id'
            ).eq(
                'platform', platform
            ).eq(
                'status', 'success'
            ).execute()

            synced_ids = [s['product_id'] for s in (synced.data or [])]

            # Get products not in synced list
            query = self.client.table('pod_autom_products').select(
                '*'
            ).eq(
                'shop_id', shop_id
            ).eq(
                'status', 'active'
            ).not_.is_('image_url', 'null')

            if synced_ids:
                query = query.not_.in_('id', synced_ids)

            result = query.limit(limit).execute()

            return result.data or []
        except Exception as e:
            logger.error(f"Failed to get unsynced products: {e}")
            return []


# Singleton instance
_instance: PodAutomSupabaseService | None = None

def get_supabase() -> PodAutomSupabaseService:
    """Get or create the Supabase service singleton"""
    global _instance
    if _instance is None:
        _instance = PodAutomSupabaseService()
    return _instance
```

### 3. product_creation_job Erweiterung

**Datei:** `backend/jobs/product_creation_job/main.py`

```python
#!/usr/bin/env python3
"""
Product Creation Job for POD AutoM

Creates new products for all enabled POD AutoM shops based on their
configured niches and prompts.

Schedule: Daily at 06:00 UTC
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import shared modules
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'shared'))

from pod_autom_supabase import get_supabase, PodAutomSupabaseService
from constants import get_tier_limits


def prepare_prompt(template: str, niche: str) -> str:
    """
    Replace placeholders in prompt template.

    Args:
        template: The prompt template with {niche} placeholders
        niche: The niche name to insert

    Returns:
        Prompt with placeholders replaced
    """
    return template.replace('{niche}', niche)


def process_pod_autom_shop(
    shop: dict[str, Any],
    supabase: PodAutomSupabaseService
) -> dict[str, Any]:
    """
    Process a single POD AutoM shop for product creation.

    Args:
        shop: Shop dictionary with settings, niches, prompts
        supabase: Supabase service instance

    Returns:
        Dictionary with processing results
    """
    shop_id = shop['id']
    user_id = shop['user_id']
    settings = shop.get('pod_autom_settings', {})

    result = {
        'shop_id': shop_id,
        'products_created': 0,
        'skipped_reason': None
    }

    # Validate settings exist
    if not settings:
        result['skipped_reason'] = 'no_settings'
        logger.info(f"Shop {shop_id}: No settings found")
        return result

    niches = settings.get('pod_autom_niches', [])
    prompts = settings.get('pod_autom_prompts', [])

    # Check for niches
    active_niches = [n for n in niches if n.get('is_active', True)]
    if not active_niches:
        result['skipped_reason'] = 'no_niches'
        logger.info(f"Shop {shop_id}: No active niches configured")
        return result

    # Check subscription
    subscription = supabase.get_subscription(user_id)
    if not subscription:
        result['skipped_reason'] = 'no_subscription'
        logger.warning(f"Shop {shop_id}: No active subscription for user {user_id}")
        return result

    tier = subscription.get('tier', 'basis')
    limits = get_tier_limits(tier)
    max_products = limits['max_products']

    # Check monthly limit
    current_count = supabase.get_products_this_month(shop_id)

    if max_products != -1 and current_count >= max_products:
        result['skipped_reason'] = 'monthly_limit_reached'
        logger.info(f"Shop {shop_id}: Monthly limit reached ({current_count}/{max_products})")
        return result

    # Calculate products to create
    daily_limit = settings.get('creation_limit', 20)
    remaining = (max_products - current_count) if max_products != -1 else daily_limit
    products_to_create = min(daily_limit, remaining)

    # Get prompts by type
    prompt_map = {p['prompt_type']: p['prompt_text'] for p in prompts}
    image_prompt = prompt_map.get('image', 'Create a design for {niche}')
    title_prompt = prompt_map.get('title', 'Create a title for {niche}')
    desc_prompt = prompt_map.get('description', 'Create a description for {niche}')

    # Distribute products across niches
    products_per_niche = max(1, products_to_create // len(active_niches))
    default_price = settings.get('default_price', 29.99)

    logger.info(
        f"Shop {shop_id}: Creating {products_to_create} products "
        f"({products_per_niche} per niche) for {len(active_niches)} niches"
    )

    for niche in active_niches:
        niche_name = niche['niche_name']

        for i in range(products_per_niche):
            try:
                # Prepare prompts with niche
                img_prompt = prepare_prompt(image_prompt, niche_name)
                ttl_prompt = prepare_prompt(title_prompt, niche_name)
                dsc_prompt = prepare_prompt(desc_prompt, niche_name)

                # TODO: Call GPT/DALL-E to generate content
                # For now, create placeholder product
                generated_title = f"{niche_name} Design #{i+1}"
                generated_description = f"Premium {niche_name} design"
                generated_image_url = None  # Will be filled by AI

                product_data = {
                    'shop_id': shop_id,
                    'niche': niche_name,
                    'title': generated_title,
                    'description': generated_description,
                    'image_url': generated_image_url,
                    'price': default_price,
                    'status': 'draft',
                    'optimization_status': 'pending'
                }

                inserted = supabase.insert_product(product_data)
                if inserted:
                    result['products_created'] += 1

            except Exception as e:
                logger.error(f"Failed to create product for niche {niche_name}: {e}")
                continue

    logger.info(f"Shop {shop_id}: Created {result['products_created']} products")
    return result


def process_pod_autom_shops(supabase: PodAutomSupabaseService) -> dict[str, Any]:
    """
    Process all POD AutoM shops for product creation.

    Args:
        supabase: Supabase service instance

    Returns:
        Dictionary with overall results
    """
    shops = supabase.get_active_shops()

    results = {
        'total_shops': len(shops),
        'shops_processed': 0,
        'total_products_created': 0,
        'errors': []
    }

    logger.info(f"Found {len(shops)} POD AutoM shops to process")

    for shop in shops:
        try:
            shop_result = process_pod_autom_shop(shop, supabase)
            results['shops_processed'] += 1
            results['total_products_created'] += shop_result['products_created']
        except Exception as e:
            error_msg = f"Shop {shop['id']}: {str(e)}"
            results['errors'].append(error_msg)
            logger.error(f"Error processing shop: {e}", exc_info=True)

    return results


def run() -> None:
    """Main entry point for the product creation job"""
    logger.info("=" * 60)
    logger.info("Starting Product Creation Job")
    logger.info("=" * 60)

    start_time = datetime.now(timezone.utc)
    supabase = get_supabase()

    # Log job start
    supabase.log_job_run(
        job_name='product_creation_job',
        status='started',
        details={'started_at': start_time.isoformat()}
    )

    try:
        # Process ReBoss shops (existing code - keep as is)
        # process_reboss_shops()

        # Process POD AutoM shops
        results = process_pod_autom_shops(supabase)

        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()

        # Log job completion
        supabase.log_job_run(
            job_name='product_creation_job',
            status='completed',
            details={
                'duration_seconds': duration,
                **results
            }
        )

        logger.info(f"Job completed in {duration:.2f}s")
        logger.info(f"Shops processed: {results['shops_processed']}/{results['total_shops']}")
        logger.info(f"Products created: {results['total_products_created']}")

        if results['errors']:
            logger.warning(f"Errors encountered: {len(results['errors'])}")

    except Exception as e:
        # Log job failure
        supabase.log_job_run(
            job_name='product_creation_job',
            status='failed',
            error_message=str(e)
        )
        logger.error(f"Job failed: {e}", exc_info=True)
        raise


if __name__ == '__main__':
    run()
```

### 4. product_optimize_job Erweiterung

**Datei:** `backend/jobs/product_optimize_job/pod_autom.py`

```python
"""POD AutoM product optimization module"""

import logging
from typing import Any

from openai import OpenAI

logger = logging.getLogger(__name__)


def get_products_to_optimize(supabase) -> list[dict[str, Any]]:
    """
    Get POD AutoM products that need optimization.

    Returns:
        List of product dictionaries needing optimization
    """
    try:
        result = supabase.client.table('pod_autom_products').select(
            '''
            *,
            pod_autom_shops!inner(
                shop_domain,
                access_token,
                user_id
            )
            '''
        ).eq(
            'optimization_status', 'pending'
        ).eq(
            'status', 'draft'
        ).not_.is_(
            'image_url', 'null'
        ).limit(50).execute()

        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get products to optimize: {e}")
        return []


def optimize_product(
    product: dict[str, Any],
    openai_client: OpenAI,
    supabase
) -> bool:
    """
    Optimize a single POD AutoM product with GPT.

    Args:
        product: Product dictionary
        openai_client: OpenAI client instance
        supabase: Supabase service

    Returns:
        True if optimization succeeded
    """
    product_id = product['id']
    niche = product.get('niche', 'General')
    current_title = product.get('title', '')
    current_description = product.get('description', '')

    try:
        # Optimize title
        title_response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a product copywriter. Create compelling, SEO-optimized product titles."
                },
                {
                    "role": "user",
                    "content": f"Optimize this product title for the {niche} niche. "
                               f"Current title: {current_title}. "
                               f"Make it catchy and under 70 characters."
                }
            ],
            max_tokens=100,
            temperature=0.7
        )
        optimized_title = title_response.choices[0].message.content.strip()

        # Optimize description
        desc_response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a product copywriter. Create compelling product descriptions."
                },
                {
                    "role": "user",
                    "content": f"Write an engaging product description for the {niche} niche. "
                               f"Product: {optimized_title}. "
                               f"Include benefits, features, and a call to action. Max 200 words."
                }
            ],
            max_tokens=300,
            temperature=0.7
        )
        optimized_description = desc_response.choices[0].message.content.strip()

        # Update product
        supabase.client.table('pod_autom_products').update({
            'title': optimized_title,
            'description': optimized_description,
            'optimization_status': 'optimized'
        }).eq('id', product_id).execute()

        logger.info(f"Optimized product {product_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to optimize product {product_id}: {e}")

        # Mark as failed
        supabase.client.table('pod_autom_products').update({
            'optimization_status': 'failed'
        }).eq('id', product_id).execute()

        return False


def process_pod_autom_products(supabase, openai_client: OpenAI) -> dict[str, Any]:
    """
    Process all pending POD AutoM product optimizations.

    Returns:
        Dictionary with results
    """
    products = get_products_to_optimize(supabase)

    results = {
        'total': len(products),
        'optimized': 0,
        'failed': 0
    }

    logger.info(f"Found {len(products)} POD AutoM products to optimize")

    for product in products:
        success = optimize_product(product, openai_client, supabase)
        if success:
            results['optimized'] += 1
        else:
            results['failed'] += 1

    return results
```

### 5. pinterest_sync_job Erweiterung

**Datei:** `backend/jobs/pinterest_sync_job/pod_autom.py`

```python
"""POD AutoM Pinterest sync module"""

import logging
from typing import Any

logger = logging.getLogger(__name__)


def get_shops_for_sync(supabase) -> list[dict[str, Any]]:
    """
    Get POD AutoM shops with Pinterest configured.

    Returns:
        List of shop dictionaries with Pinterest config
    """
    try:
        result = supabase.client.table('pod_autom_shops').select(
            '''
            *,
            pod_autom_settings!inner(*),
            pod_autom_pinterest_config!inner(*)
            '''
        ).eq(
            'connection_status', 'connected'
        ).eq(
            'pod_autom_pinterest_config.is_active', True
        ).execute()

        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get shops for Pinterest sync: {e}")
        return []


def sync_products_to_pinterest(
    shop: dict[str, Any],
    supabase,
    pinterest_service
) -> dict[str, Any]:
    """
    Sync POD AutoM products to Pinterest for a single shop.

    Args:
        shop: Shop dictionary with Pinterest config
        supabase: Supabase service
        pinterest_service: Pinterest API service

    Returns:
        Dictionary with sync results
    """
    shop_id = shop['id']
    pinterest_config = shop.get('pod_autom_pinterest_config', {})

    results = {
        'shop_id': shop_id,
        'synced': 0,
        'failed': 0,
        'skipped': 0
    }

    if not pinterest_config:
        logger.warning(f"Shop {shop_id}: No Pinterest config")
        return results

    board_id = pinterest_config.get('board_id')
    access_token = pinterest_config.get('access_token')

    if not board_id or not access_token:
        logger.warning(f"Shop {shop_id}: Incomplete Pinterest config")
        return results

    # Get unsynced products
    products = supabase.get_unsynced_products(shop_id, 'pinterest', limit=20)

    logger.info(f"Shop {shop_id}: Syncing {len(products)} products to Pinterest")

    for product in products:
        try:
            # Skip if no image
            if not product.get('image_url'):
                results['skipped'] += 1
                continue

            # Create pin via Pinterest API
            pin_data = {
                'title': product.get('title', ''),
                'description': product.get('description', ''),
                'link': f"https://{shop['shop_domain']}/products/{product.get('shopify_product_id', '')}",
                'media_source': {
                    'source_type': 'image_url',
                    'url': product['image_url']
                },
                'board_id': board_id
            }

            pin_result = pinterest_service.create_pin(access_token, pin_data)

            if pin_result and pin_result.get('id'):
                # Log successful sync
                supabase.client.table('pod_autom_sync_log').insert({
                    'product_id': product['id'],
                    'platform': 'pinterest',
                    'external_id': pin_result['id'],
                    'sync_type': 'pin',
                    'status': 'success'
                }).execute()

                results['synced'] += 1
            else:
                raise Exception("No pin ID returned")

        except Exception as e:
            logger.error(f"Failed to sync product {product['id']}: {e}")

            # Log failed sync
            supabase.client.table('pod_autom_sync_log').insert({
                'product_id': product['id'],
                'platform': 'pinterest',
                'sync_type': 'pin',
                'status': 'failed',
                'error_message': str(e)
            }).execute()

            results['failed'] += 1

    return results


def process_pod_autom_shops(supabase, pinterest_service) -> dict[str, Any]:
    """
    Process all POD AutoM shops for Pinterest sync.

    Returns:
        Dictionary with overall results
    """
    shops = get_shops_for_sync(supabase)

    results = {
        'total_shops': len(shops),
        'total_synced': 0,
        'total_failed': 0,
        'total_skipped': 0
    }

    logger.info(f"Found {len(shops)} POD AutoM shops for Pinterest sync")

    for shop in shops:
        try:
            shop_result = sync_products_to_pinterest(shop, supabase, pinterest_service)
            results['total_synced'] += shop_result['synced']
            results['total_failed'] += shop_result['failed']
            results['total_skipped'] += shop_result['skipped']
        except Exception as e:
            logger.error(f"Error syncing shop {shop['id']}: {e}")

    return results
```

### 6. winner_scaling_job Erweiterung

**Datei:** `backend/jobs/winner_scaling_job/pod_autom.py`

```python
"""POD AutoM winner scaling module"""

import logging
from typing import Any

from constants import get_tier_limits

logger = logging.getLogger(__name__)


def identify_winners(supabase) -> list[dict[str, Any]]:
    """
    Identify winning products in POD AutoM shops.

    Winners are products with:
    - At least 5 sales in the last 7 days
    - Active status
    - Owner has Premium or VIP subscription

    Returns:
        List of winner product dictionaries
    """
    try:
        # Use the view we created
        result = supabase.client.table('pod_autom_winner_candidates').select(
            '*'
        ).execute()

        return result.data or []
    except Exception as e:
        logger.error(f"Failed to identify winners: {e}")
        return []


def scale_winner(
    product: dict[str, Any],
    supabase
) -> bool:
    """
    Scale a winning POD AutoM product.

    Scaling actions:
    - Mark product as 'winner' status
    - Increase ad budget (if ads configured)
    - Queue for variation creation

    Args:
        product: Winner product dictionary
        supabase: Supabase service

    Returns:
        True if scaling succeeded
    """
    product_id = product['id']
    tier = product.get('subscription_tier', 'basis')

    # Check if user has winner scaling feature
    limits = get_tier_limits(tier)
    if not limits.get('winner_scaling'):
        logger.info(f"Product {product_id}: Winner scaling not available for {tier} tier")
        return False

    try:
        # Update product status to winner
        supabase.client.table('pod_autom_products').update({
            'status': 'winner'
        }).eq('id', product_id).execute()

        # TODO: Implement additional scaling actions
        # - Increase ad budget via Pinterest/Meta APIs
        # - Create product variations
        # - Expand to additional platforms

        logger.info(f"Scaled winner product {product_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to scale product {product_id}: {e}")
        return False


def process_pod_autom_winners(supabase) -> dict[str, Any]:
    """
    Process all POD AutoM winner products.

    Returns:
        Dictionary with results
    """
    winners = identify_winners(supabase)

    results = {
        'total_candidates': len(winners),
        'scaled': 0,
        'skipped': 0
    }

    logger.info(f"Found {len(winners)} POD AutoM winner candidates")

    for winner in winners:
        success = scale_winner(winner, supabase)
        if success:
            results['scaled'] += 1
        else:
            results['skipped'] += 1

    return results
```

---

## Neue Datenbank-Migrationen

**Datei:** `supabase/migrations/20260130_pod_autom_jobs.sql`

```sql
-- POD AutoM Products (von Jobs erstellt)
CREATE TABLE IF NOT EXISTS pod_autom_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES pod_autom_shops(id) ON DELETE CASCADE,
    niche VARCHAR(255),
    title VARCHAR(500),
    description TEXT,
    image_url TEXT,
    shopify_product_id VARCHAR(100),
    price DECIMAL(10,2) DEFAULT 29.99,
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'winner', 'loser', 'archived')),
    optimization_status VARCHAR(20) DEFAULT 'pending'
        CHECK (optimization_status IN ('pending', 'optimized', 'failed')),
    sales_count INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_pod_autom_products_shop_id
    ON pod_autom_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_pod_autom_products_status
    ON pod_autom_products(status);
CREATE INDEX IF NOT EXISTS idx_pod_autom_products_optimization
    ON pod_autom_products(optimization_status) WHERE optimization_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pod_autom_products_created_at
    ON pod_autom_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pod_autom_products_shop_created
    ON pod_autom_products(shop_id, created_at DESC);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_pod_autom_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pod_autom_products_updated_at ON pod_autom_products;
CREATE TRIGGER trigger_pod_autom_products_updated_at
    BEFORE UPDATE ON pod_autom_products
    FOR EACH ROW
    EXECUTE FUNCTION update_pod_autom_products_updated_at();


-- POD AutoM Pinterest Config
CREATE TABLE IF NOT EXISTS pod_autom_pinterest_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES pod_autom_shops(id) ON DELETE CASCADE,
    pinterest_account_id VARCHAR(100),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    board_id VARCHAR(100),
    ad_account_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT pod_autom_pinterest_config_shop_unique UNIQUE(shop_id)
);

CREATE INDEX IF NOT EXISTS idx_pod_autom_pinterest_config_shop
    ON pod_autom_pinterest_config(shop_id);


-- POD AutoM Product Sync Log
CREATE TABLE IF NOT EXISTS pod_autom_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES pod_autom_products(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL
        CHECK (platform IN ('pinterest', 'meta', 'google', 'tiktok')),
    external_id VARCHAR(100),
    sync_type VARCHAR(20) NOT NULL
        CHECK (sync_type IN ('pin', 'ad', 'catalog')),
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pod_autom_sync_log_product
    ON pod_autom_sync_log(product_id);
CREATE INDEX IF NOT EXISTS idx_pod_autom_sync_log_platform_status
    ON pod_autom_sync_log(platform, status);


-- Job Runs Tabelle (falls nicht existiert)
CREATE TABLE IF NOT EXISTS job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('started', 'completed', 'failed')),
    details JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_runs_job_name
    ON job_runs(job_name);
CREATE INDEX IF NOT EXISTS idx_job_runs_created_at
    ON job_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_status
    ON job_runs(status) WHERE status = 'failed';


-- Winner Candidates View (Materialized für Performance)
DROP MATERIALIZED VIEW IF EXISTS pod_autom_winner_candidates;
CREATE MATERIALIZED VIEW pod_autom_winner_candidates AS
SELECT
    p.*,
    s.user_id,
    sub.tier AS subscription_tier
FROM pod_autom_products p
JOIN pod_autom_shops s ON p.shop_id = s.id
LEFT JOIN pod_autom_subscriptions sub
    ON s.user_id = sub.user_id AND sub.status = 'active'
WHERE p.status = 'active'
    AND p.sales_count >= 5
    AND p.created_at >= NOW() - INTERVAL '7 days';

-- Index auf Materialized View
CREATE UNIQUE INDEX IF NOT EXISTS idx_pod_autom_winner_candidates_id
    ON pod_autom_winner_candidates(id);

-- Refresh function (wird per Cron aufgerufen)
CREATE OR REPLACE FUNCTION refresh_winner_candidates()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY pod_autom_winner_candidates;
END;
$$ LANGUAGE plpgsql;


-- RLS Policies für pod_autom_products
ALTER TABLE pod_autom_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY pod_autom_products_select ON pod_autom_products
    FOR SELECT USING (
        shop_id IN (
            SELECT id FROM pod_autom_shops WHERE user_id = auth.uid()
        )
    );

CREATE POLICY pod_autom_products_service ON pod_autom_products
    FOR ALL USING (true)
    WITH CHECK (true);
```

---

## Neue Dateien

| Datei | Zweck |
|-------|-------|
| `backend/jobs/shared/constants.py` | Shared constants (Tier Limits) |
| `backend/jobs/shared/pod_autom_supabase.py` | Shared Supabase service |
| `backend/jobs/product_optimize_job/pod_autom.py` | POD AutoM optimization module |
| `backend/jobs/pinterest_sync_job/pod_autom.py` | POD AutoM Pinterest sync module |
| `backend/jobs/winner_scaling_job/pod_autom.py` | POD AutoM winner scaling module |
| `supabase/migrations/20260130_pod_autom_jobs.sql` | Database migrations |

## Verifizierung

- [ ] **Keine async/await Fehler** - Supabase Client ist synchron
- [ ] **Type Hints** - Alle Funktionen haben Type Annotations
- [ ] **Error Handling** - Try-except in allen kritischen Bereichen
- [ ] **Job Logging** - Alle Jobs loggen in `job_runs` Tabelle
- [ ] **Shared Code** - Constants und Services werden wiederverwendet
- [ ] **Subscription Limits** - Werden in allen Jobs respektiert
- [ ] **Database Migrations** - Alle Tabellen und Indexes erstellt
- [ ] **RLS Policies** - Sicherheit auf Datenbankebene
- [ ] **Updated_at Trigger** - Automatische Aktualisierung
- [ ] **Materialized View** - Performante Winner-Erkennung

## Abhängigkeiten

- Phase 1.4 (Datenbank-Tabellen)
- Bestehende ReBoss Jobs als Vorlage
- Python 3.10+ für Type Hints
- `python-dotenv`, `supabase-py`, `openai` packages

## Nächster Schritt
→ Phase 4.2 - POD AutoM API-Routes hinzufügen
