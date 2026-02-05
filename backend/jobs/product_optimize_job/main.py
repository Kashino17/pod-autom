"""
Product Optimize Job - Main Entry Point
Optimizes products with NEW_SET tag using GPT and shop settings
Port of the original Cloud Run Job to Render - 1:1 implementation
"""
import os
import sys
import re
import logging
from typing import Dict, List, Optional
import requests
from datetime import datetime, timezone

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Logging configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ShopifyProductOptimizer:
    """Main class for optimizing Shopify products - Port of original Cloud Run Job."""

    # Category mapping for Fashion Tags
    CATEGORY_MAPPING = {
        "Pullover & Cardigan": "Cardigan",
        "T-Shirt & Tops": "Tops",
        "Hosen": "Hose",
        "Jumpsuit & Overall": "Overall",
        "Kleider": "Kleid",
        "Schuhe": "schuhe",
        "Bademode": "bademode",
        "Taschen": "tasche",
        "Herren Oberteile": "Herren oberteil",
        "Herren Schuhe": "Herren schuhe",
        "Herren Pullover & Mäntel": "herren Jacken",
        "Schmuck": "schmuck",
        "Brillen": "Brille",
        "Kopfbedeckung": "Kopfbedeckung"
    }

    def __init__(self):
        # Initialize Supabase
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.db: Client = create_client(supabase_url, supabase_key)
        logger.info("Connected to Supabase")

        # OpenAI client will be initialized per shop
        self.openai_client: Optional[OpenAI] = None

        # Global OpenAI key as fallback
        self.global_openai_key = os.environ.get('OPENAI_API_KEY')

        # Shop type processing flags
        self.process_reboss = os.environ.get('PROCESS_REBOSS_SHOPS', 'true').lower() == 'true'
        self.process_pod_autom = os.environ.get('PROCESS_POD_AUTOM_SHOPS', 'true').lower() == 'true'

    def run(self):
        """Main function that processes all shops."""
        try:
            logger.info("=" * 60)
            logger.info("STARTING PRODUCT OPTIMIZE JOB - ReBoss NextGen + POD AutoM")
            logger.info(f"Time: {datetime.now(timezone.utc).isoformat()}")
            logger.info(f"Process ReBoss: {self.process_reboss} | Process POD AutoM: {self.process_pod_autom}")
            logger.info("=" * 60)

            # Collect all shops
            all_shops = []

            # Get ReBoss shops
            if self.process_reboss:
                logger.info("--- Fetching ReBoss Shops ---")
                reboss_shops = self.get_shops()
                for shop in reboss_shops:
                    shop['shop_type'] = 'reboss'
                all_shops.extend(reboss_shops)

            # Get POD AutoM shops
            if self.process_pod_autom:
                logger.info("--- Fetching POD AutoM Shops ---")
                pod_shops = self.get_pod_autom_shops()
                all_shops.extend(pod_shops)

            logger.info(f"Total shops to process: {len(all_shops)}")

            for shop in all_shops:
                shop_type = shop.get('shop_type', 'reboss')
                logger.info(f"Processing {shop_type} shop: {shop.get('shop_domain', shop.get('internal_name', 'Unknown'))}")
                self.process_shop(shop)

            logger.info("=" * 60)
            logger.info("PRODUCT OPTIMIZE JOB COMPLETED")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"Error running optimization: {str(e)}")
            raise

    def get_shops(self) -> List[Dict]:
        """Get all active shops from Supabase."""
        shops = []

        try:
            # Get all active shops
            response = self.db.table('shops').select(
                'id, internal_name, shop_domain, access_token'
            ).eq('is_active', True).execute()

            if response.data:
                for shop in response.data:
                    # Get shop rules for OpenAI key
                    rules_response = self.db.table('shop_rules').select(
                        'openai_api_key'
                    ).eq('shop_id', shop['id']).execute()

                    if rules_response.data:
                        shop['openai_api_key'] = rules_response.data[0].get('openai_api_key')

                    shops.append(shop)

            logger.info(f"Found: {len(shops)} ReBoss shops")
            return shops

        except Exception as e:
            logger.error(f"Error getting shops: {e}")
            return []

    def get_pod_autom_shops(self) -> List[Dict]:
        """Get all active POD AutoM shops from Supabase."""
        shops = []

        try:
            # Get POD AutoM shops that are connected
            response = self.db.table('pod_autom_shops').select(
                'id, internal_name, shop_domain, access_token'
            ).eq('connection_status', 'connected').execute()

            if response.data:
                for shop in response.data:
                    # Get POD AutoM settings for this shop
                    settings_response = self.db.table('pod_autom_settings').select('*').eq(
                        'shop_id', shop['id']
                    ).execute()

                    if settings_response.data and settings_response.data[0].get('enabled', False):
                        shop['openai_api_key'] = self.global_openai_key  # POD AutoM uses global key
                        shop['shop_type'] = 'pod_autom'
                        shop['settings_id'] = settings_response.data[0].get('id')
                        shops.append(shop)

            logger.info(f"Found: {len(shops)} POD AutoM shops")
            return shops

        except Exception as e:
            logger.error(f"Error getting POD AutoM shops: {e}")
            return []

    def get_pod_autom_settings(self, shop_id: str) -> Dict:
        """Get POD AutoM settings for a shop - maps to product_creation_settings format."""
        try:
            response = self.db.table('pod_autom_settings').select('*').eq('shop_id', shop_id).execute()

            if response.data:
                settings = response.data[0]
                # Map POD AutoM settings to the format expected by optimize_product
                return {
                    'generate_improved_description': settings.get('auto_optimize_description', True),
                    'generate_optimized_title': settings.get('auto_optimize_title', True),
                    'generate_and_set_tags': settings.get('auto_generate_tags', True),
                    'translate_variants_to_german': False,  # POD products are already in German
                    'remove_single_value_options': False,
                    'set_compare_price': settings.get('set_compare_price', False),
                    'compare_price_percentage': settings.get('compare_price_percentage', 30),
                    'set_price_decimals': True,
                    'price_decimals': 99,
                    'set_compare_price_decimals': True,
                    'compare_price_decimals': 99,
                    'enable_inventory_tracking': True,
                    'set_global_quantity': True,
                    'global_quantity': settings.get('default_quantity', 100),
                    'publish_all_channels': settings.get('auto_publish', True),
                    'set_global_tags': True,
                    'global_tags': 'POD, POD-AutoM',
                    'change_product_status': settings.get('auto_publish', True),
                    'product_status': 'active' if settings.get('auto_publish', True) else 'draft',
                    'set_category_tag_fashion': False,  # POD products have their own categorization
                    'sales_text_season': 'Spring',  # Default season
                }
            else:
                logger.warning(f"No POD AutoM settings found for shop {shop_id}")
                return {}

        except Exception as e:
            logger.error(f"Error getting POD AutoM settings: {e}")
            return {}

    def get_product_settings(self, shop_id: str) -> Dict:
        """Get product creation settings for a shop."""
        try:
            response = self.db.table('product_creation_settings').select('*').eq('shop_id', shop_id).execute()

            if response.data:
                return response.data[0]
            else:
                logger.warning(f"No settings found for shop {shop_id}")
                return {}

        except Exception as e:
            logger.error(f"Error getting settings: {e}")
            return {}

    def process_shop(self, shop: Dict):
        """Process all products of a shop."""
        shop_domain = shop.get('shop_domain')
        access_token = shop.get('access_token')
        shop_id = shop['id']
        shop_type = shop.get('shop_type', 'reboss')

        if not shop_domain or not access_token:
            logger.error(f"Missing shop_domain or access_token for shop {shop_id}")
            return

        # Get OpenAI API key (from shop rules or global fallback)
        openai_api_key = shop.get('openai_api_key') or self.global_openai_key

        if not openai_api_key:
            logger.error(f"No OpenAI API Key for shop {shop_domain}")
            return

        # Initialize OpenAI client for this shop
        self.openai_client = OpenAI(api_key=openai_api_key)

        # Get product settings based on shop type
        if shop_type == 'pod_autom':
            settings = self.get_pod_autom_settings(shop_id)
        else:
            settings = self.get_product_settings(shop_id)

        if not settings:
            logger.warning(f"Skipping shop {shop_domain} - no settings found")
            return

        # Get products with tag "NEW_SET" (or "POD_NEW" for POD AutoM)
        if shop_type == 'pod_autom':
            products = self.get_products_with_tag(shop_domain, access_token, tag="POD_NEW")
        else:
            products = self.get_products_with_tag(shop_domain, access_token)

        logger.info(f"Found: {len(products)} products to process in {shop_domain}")

        for product in products:
            try:
                self.optimize_product(product, settings, shop_domain, access_token)
            except Exception as e:
                logger.error(f"Error with product {product['id']}: {str(e)}")
                continue

    def get_products_with_tag(self, shop_domain: str, access_token: str, tag: str = "NEW_SET") -> List[Dict]:
        """Get all products with specified tag using GraphQL."""
        url = f"https://{shop_domain}/admin/api/2024-01/graphql.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }

        query = """
        query getProductsByTag($first: Int!, $after: String, $query: String!) {
            products(first: $first, after: $after, query: $query) {
                edges {
                    node {
                        id
                        title
                        handle
                        tags
                        status
                        variants(first: 100) {
                            edges {
                                node {
                                    id
                                    title
                                    price
                                    compareAtPrice
                                    sku
                                    inventoryQuantity
                                }
                            }
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                }
            }
        }
        """

        all_products = []
        has_next_page = True
        after_cursor = None

        while has_next_page:
            variables = {
                "first": 50,
                "query": f"tag:{tag}",
                "after": after_cursor
            }

            response = requests.post(
                url,
                headers=headers,
                json={"query": query, "variables": variables},
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()

                if 'errors' in data:
                    logger.error(f"GraphQL Error: {data['errors']}")
                    break

                products_data = data.get('data', {}).get('products', {})
                edges = products_data.get('edges', [])

                logger.info(f"GraphQL Response: Found {len(edges)} products with tag '{tag}'")

                # Convert GraphQL response to REST API format
                for edge in edges:
                    node = edge['node']
                    product_id = node['id'].split('/')[-1]

                    # Convert variants
                    variants = []
                    for v_edge in node.get('variants', {}).get('edges', []):
                        v_node = v_edge['node']
                        variant_id = v_node['id'].split('/')[-1]
                        variants.append({
                            'id': variant_id,
                            'title': v_node['title'],
                            'price': v_node['price'],
                            'compare_at_price': v_node.get('compareAtPrice'),
                            'sku': v_node.get('sku', ''),
                            'inventory_quantity': v_node.get('inventoryQuantity', 0)
                        })

                    product = {
                        'id': product_id,
                        'title': node['title'],
                        'handle': node['handle'],
                        'tags': ', '.join(node['tags']) if isinstance(node['tags'], list) else node['tags'],
                        'status': node['status'],
                        'variants': variants
                    }

                    all_products.append(product)
                    logger.info(f"Found: Product '{product['title']}' with tags: {product['tags']}")

                page_info = products_data.get('pageInfo', {})
                has_next_page = page_info.get('hasNextPage', False)

                if has_next_page and edges:
                    after_cursor = edges[-1]['cursor']
                else:
                    break
            else:
                logger.error(f"Error fetching products: {response.status_code} - {response.text}")
                break

        logger.info(f"Total found: {len(all_products)} products with tag '{tag}'")
        return all_products

    def get_full_product_data(self, product_id: str, shop_domain: str, access_token: str) -> Optional[Dict]:
        """Get full product data via REST API."""
        url = f"https://{shop_domain}/admin/api/2024-01/products/{product_id}.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }

        response = requests.get(url, headers=headers, timeout=30)

        if response.status_code == 200:
            return response.json().get('product', {})
        else:
            logger.error(f"Error fetching product data: {response.status_code} - {response.text}")
            return None

    def optimize_product(self, product: Dict, settings: Dict, shop_domain: str, access_token: str):
        """Optimize a single product based on settings - exact port of original."""
        logger.info(f"Optimizing product: {product['title']} (ID: {product['id']})")

        # Get full product data
        full_product = self.get_full_product_data(product['id'], shop_domain, access_token)

        if not full_product:
            logger.error(f"Could not fetch full product data for ID {product['id']}")
            return

        product = full_product

        # 1. Generate improved description (MUST BE DONE FIRST!)
        if settings.get('generate_improved_description', False):
            product['body_html'] = self.generate_improved_description(product, settings)

        # 2. Generate optimized title
        if settings.get('generate_optimized_title', False):
            product['title'] = self.generate_optimized_title(product, settings)

        # 3. Generate and set tags
        if settings.get('generate_and_set_tags', False):
            new_tags = self.generate_product_tags(product)
            current_tags = product.get('tags', '').split(', ') if product.get('tags') else []
            current_tags.extend(new_tags)
            product['tags'] = ', '.join(list(set(current_tags)))

        # 4. Translate variants to German (option names and color values)
        # Check both new and legacy column names for backwards compatibility
        translate_variants = settings.get('translate_variants_to_german', False) or settings.get('change_size_to_groesse', False)
        if translate_variants:
            logger.info("  Translating variants to German...")
            self.translate_variants_to_german(product)

        # 5. Remove single-value variant options (e.g., Color with only 'Brown')
        # Check both new and legacy column names for backwards compatibility
        remove_single = settings.get('remove_single_value_options', False) or settings.get('set_german_sizes', False)
        logger.info(f"  remove_single_value_options setting: {settings.get('remove_single_value_options')} / set_german_sizes: {settings.get('set_german_sizes')} → enabled: {remove_single}")
        if remove_single:
            logger.info("  Checking for single-value variant options to remove...")
            self.remove_single_value_options(product)

        # 6. Set compare price
        if settings.get('set_compare_price', False) and settings.get('compare_price_percentage'):
            self.set_compare_price(product, float(settings['compare_price_percentage']))

        # 6a. Apply price adjustment (fixed or percentage) with min/max limits
        if settings.get('adjust_normal_price', False) and settings.get('price_adjustment_type') and settings.get('price_adjustment_value') is not None:
            self.apply_price_adjustment(
                product,
                settings['price_adjustment_type'],
                float(settings['price_adjustment_value']),
                price_min_enabled=settings.get('price_min_enabled', False),
                price_min_value=float(settings.get('price_min_value', 0) or 0),
                price_max_enabled=settings.get('price_max_enabled', False),
                price_max_value=float(settings.get('price_max_value', 0) or 0)
            )

        # 6b. Apply compare price min/max limits (after compare price is set)
        compare_min_enabled = settings.get('compare_price_min_enabled', False)
        compare_max_enabled = settings.get('compare_price_max_enabled', False)
        if compare_min_enabled or compare_max_enabled:
            self.apply_compare_price_limits(
                product,
                compare_min_enabled=compare_min_enabled,
                compare_min_value=float(settings.get('compare_price_min_value', 0) or 0),
                compare_max_enabled=compare_max_enabled,
                compare_max_value=float(settings.get('compare_price_max_value', 0) or 0)
            )

        # 7. Set price decimals (always applies after all price adjustments)
        if settings.get('set_price_decimals', False) and settings.get('price_decimals') is not None:
            self.set_price_decimals(product, int(settings['price_decimals']))

        # 8. Set compare price decimals (always applies after all compare price adjustments)
        if settings.get('set_compare_price_decimals', False) and settings.get('compare_price_decimals') is not None:
            self.set_compare_price_decimals(product, int(settings['compare_price_decimals']))

        # 9. Enable inventory tracking
        if settings.get('enable_inventory_tracking', False):
            self.enable_inventory_tracking(product)

        # 10. Set global quantity
        if settings.get('set_global_quantity', False) and settings.get('global_quantity') is not None:
            self.set_global_quantity(product, int(settings['global_quantity']))

        # 11. Publish to all channels
        if settings.get('publish_all_channels', False):
            product['published_scope'] = 'global'

        # 12. Set global tags
        if settings.get('set_global_tags', False) and settings.get('global_tags'):
            current_tags = product.get('tags', '').split(', ') if product.get('tags') else []
            global_tags = settings['global_tags'].split(', ')
            current_tags.extend(global_tags)
            product['tags'] = ', '.join(list(set(current_tags)))

        # 13. Change product status
        if settings.get('change_product_status', False) and settings.get('product_status'):
            product['status'] = settings['product_status']

        # 14. Set category tag (Fashion)
        if settings.get('set_category_tag_fashion', False):
            category_tags = self.get_fashion_category_tags(product)
            current_tags = product.get('tags', '').split(', ') if product.get('tags') else []
            current_tags.extend(category_tags)
            product['tags'] = ', '.join(list(set(current_tags)))

        # 15. Remove "NEW_SET" tag and add "QK"
        tags = product.get('tags', '').split(', ') if product.get('tags') else []
        if 'NEW_SET' in tags:
            tags.remove('NEW_SET')
        if 'QK' not in tags:
            tags.append('QK')
        product['tags'] = ', '.join(tags)

        # Save inventory quantities before update (they get lost in REST API response)
        inventory_quantities = {}
        if settings.get('set_global_quantity', False) and settings.get('global_quantity') is not None:
            target_quantity = int(settings['global_quantity'])
            for variant in product.get('variants', []):
                inventory_quantities[variant['id']] = target_quantity

        # Update product in Shopify
        publish_to_all_channels = settings.get('publish_all_channels', False)
        should_update_inventory = len(inventory_quantities) > 0
        self.update_product_in_shopify(product, shop_domain, access_token, publish_to_all_channels, should_update_inventory, inventory_quantities)

    def generate_improved_description(self, product: Dict, settings: Dict) -> str:
        """Generate improved product description with GPT-5.1 Vision - analyzes product image."""
        try:
            if not self.openai_client:
                logger.error("OpenAI Client not initialized")
                return product.get('body_html', '')

            # Get main image if available
            image_url = ""
            if product.get('images') and len(product['images']) > 0:
                image_url = product['images'][0]['src']
                logger.info(f"  Using product image for GPT-5.1 Vision: {image_url[:80]}...")

            current_description = product.get('body_html', '')

            # Get season from settings
            season = settings.get('sales_text_season', 'Spring')
            season_mapping = {
                'Spring': 'Frühling',
                'Summer': 'Sommer',
                'Autumn': 'Herbst',
                'Winter': 'Winter'
            }
            season_german = season_mapping.get(season, 'Frühling')

            prompt = f"""Analysiere das Produktbild und schreib mir einen extrem kaufanregenden Verkaufstext für dieses Produkt. Der Text soll:

**1) SEO-optimiert** sein und alle relevanten Keywords einbinden.

**2) Kreativ und emotional ansprechend** gestaltet sein, sodass er beim Lesen Bilder im Kopf erzeugt.

**3) Fantastische Eigenschaften** nutzen, um die Vorteile des Produkts noch stärker hervorzuheben, dabei jedoch auf eine seriöse, vertrauensvolle Weise geschrieben sein – wie eine gute Freundin, die das Produkt ehrlich empfiehlt.

4) Mit **750 Zeichen (inklusive Leerzeichen)** auskommen und in der **Chunks-Methode** strukturiert sein. Verwende für die Abschnitte passende Titel, z. B. "Perfekt für kalte Tage", anstelle von "Chunk 1".

5) Eine **Produkteigenschaftsauflistung** beinhalten (Schnitt, Material, Stil, Farbe etc.). Analysiere das Bild genau, um die Eigenschaften zu erkennen. Falls vorhanden, ergänze mit Angaben aus der vorherigen Produktbeschreibung.

6) Derzeit ist {season_german}, also passe den Text an die {season_german}-Jahreszeit an.

7) Der Verkaufstext soll in HTML Format geschrieben sein. Vergiss nicht die Chunk-Title Fett zu schreiben mit <strong> </strong> und eine Zeil Abstand zwischen den Chunks zu setzen mit <br> oder <p> </p>. Verwende auf keinen Fall ** Sterne oder andere Sonderzeichen. Nutze zum Auflisten:
<ul>
  <li>Element eins</li>
  <li>Element zwei</li>
  <li>Element drei</li>
</ul>

Aktueller Produkttitel: {product.get('title', '')}
Aktuelle Beschreibung (als Referenz): {current_description}

Gib NUR den HTML-Verkaufstext zurück, ohne weitere Erklärungen.
            """

            # Build message content with vision support
            message_content = []
            message_content.append({"type": "text", "text": prompt})

            # Add image if available (GPT-5.1 Vision)
            if image_url:
                message_content.append({
                    "type": "image_url",
                    "image_url": {"url": image_url}
                })

            response = self.openai_client.chat.completions.create(
                model="gpt-5.1",
                messages=[{"role": "user", "content": message_content}],
                max_completion_tokens=1000,
                temperature=0.7
            )

            result = response.choices[0].message.content.strip()
            logger.info(f"  GPT-5.1 Vision generated description ({len(result)} chars)")
            return result

        except Exception as e:
            logger.error(f"Error generating description: {str(e)}")
            return product.get('body_html', '')

    def generate_optimized_title(self, product: Dict, settings: Dict) -> str:
        """Generate optimized product title with GPT-5.1 based on the product description."""
        try:
            if not self.openai_client:
                logger.error("OpenAI Client not initialized")
                return product.get('title', '')

            season = settings.get('sales_text_season', 'Spring')
            season_mapping = {
                'Spring': 'Frühling',
                'Summer': 'Sommer',
                'Autumn': 'Herbst',
                'Winter': 'Winter'
            }
            season_german = season_mapping.get(season, 'Frühling')

            # Use the already generated description (body_html) as basis
            prompt = f"""Erstelle einen kurzen, prägnanten und verkaufsfördernden Titel für dieses Produkt.
Der Titel sollte attraktiv und suchmaschinenoptimiert sein.
Berücksichtige, dass aktuell {season_german} ist und passe den Titel entsprechend an.
Maximale Länge: 60 Zeichen.
Keine Anführungszeichen verwenden.

Produktbeschreibung: {product.get('body_html', '')}

Gib NUR den neuen Titel zurück, ohne weitere Erklärungen.
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-5.1",
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=100,
                temperature=0.7
            )

            # Remove quotes from title
            title = response.choices[0].message.content.strip()
            title = title.strip('"').strip("'")
            title = title.strip('\u201e').strip('\u201c')
            title = title.strip('\u201a').strip('\u2018')
            title = title.strip('\u201d').strip('\u2019')
            logger.info(f"  GPT-5.1 generated title: {title}")
            return title

        except Exception as e:
            logger.error(f"Error generating title: {str(e)}")
            return product.get('title', '')

    def generate_product_tags(self, product: Dict) -> List[str]:
        """Generate product tags with GPT-5.1 based on the product description."""
        try:
            if not self.openai_client:
                logger.error("OpenAI Client not initialized")
                return []

            # Use the already generated description (body_html) as basis
            prompt = f"""Generiere relevante deutsche Tags für dieses Produkt sowie das Geschlecht (male/female, nie unisex) auf Englisch.
Die Tags sollten umfassen: Produkttyp, Kategorie, Farbe, Material, Stil, Saison und Geschlecht.
Gib sie als kommagetrennte Liste zurück, etwa:
Kleid, Sommerkleid, Blau, Baumwolle, Casual, Sommer, female

Produkttitel: {product.get('title', '')}
Produktbeschreibung: {product.get('body_html', '')}

Gib NUR die Tags als kommagetrennte Liste zurück, ohne weitere Erklärungen.
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-5.1",
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=200,
                temperature=0.7
            )

            tags_string = response.choices[0].message.content.strip()
            tags = [tag.strip() for tag in tags_string.split(',')]
            logger.info(f"  GPT-5.1 generated {len(tags)} tags")
            return tags

        except Exception as e:
            logger.error(f"Error generating tags: {str(e)}")
            return []

    def translate_variants_to_german(self, product: Dict):
        """Translate variant option names and values to German using AI."""
        try:
            if not self.openai_client:
                logger.error("OpenAI Client not initialized")
                return

            options = product.get('options', [])
            if not options:
                return

            # Collect all option names and values
            options_data = []
            for option in options:
                options_data.append({
                    'name': option.get('name', ''),
                    'values': option.get('values', [])
                })

            prompt = f"""
Übersetze die folgenden Shopify Varianten-Optionen ins Deutsche.

Varianten-Optionen:
{options_data}

WICHTIGE Regeln:
1. Übersetze die Optionsnamen: "Size" → "Größe", "Color" → "Farbe", "Style" → "Stil", "Model" → "Modell"
2. Übersetze ALLE Farbwerte ins Deutsche:
   - Black → Schwarz
   - White → Weiß
   - Red → Rot
   - Blue → Blau
   - Green → Grün
   - Yellow → Gelb
   - Brown → Braun
   - Grey/Gray → Grau
   - Dark Grey → Dunkelgrau
   - Light Grey → Hellgrau
   - Pink → Rosa
   - Purple → Lila
   - Orange → Orange
   - Beige → Beige
   - Navy → Marineblau
   - Khaki/Light Khaki → Khaki/Hellkhaki
   - Cream → Creme
   - Gold → Gold
   - Silver → Silber
3. Größenangaben (S, M, L, XL, XXL, 2XL, 3XL, etc.) NICHT übersetzen
4. "As shown" → "Wie abgebildet"
5. Für JEDE Option MÜSSEN alle value_translations angegeben werden!

Antworte NUR mit einem JSON-Objekt (ohne Markdown-Codeblöcke):
{{"translations": [{{"original_name": "Color", "translated_name": "Farbe", "value_translations": {{"Black": "Schwarz", "Red": "Rot"}}}}, {{"original_name": "Size", "translated_name": "Größe", "value_translations": {{"S": "S", "M": "M"}}}}]}}
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-5.1",
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=500,
                temperature=0.1
            )

            response_text = response.choices[0].message.content.strip()
            logger.info(f"  GPT-5.1 translation response: {response_text[:500]}")

            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = response_text.split('\n', 1)[1]
                if response_text.endswith('```'):
                    response_text = response_text.rsplit('\n', 1)[0]
                logger.info(f"  Cleaned response: {response_text[:500]}")

            import json
            translations = json.loads(response_text)
            logger.info(f"  Parsed translations: {translations}")

            # Apply translations
            for trans in translations.get('translations', []):
                original_name = trans.get('original_name', '')
                translated_name = trans.get('translated_name', '')
                value_translations = trans.get('value_translations', {})

                # Find and update the option
                for i, option in enumerate(options):
                    if option.get('name', '').lower() == original_name.lower():
                        # Update option name
                        if translated_name:
                            option['name'] = translated_name
                            logger.info(f"  Translated option: '{original_name}' → '{translated_name}'")

                        # Update option values
                        new_values = []
                        for value in option.get('values', []):
                            translated_value = value_translations.get(value, value)
                            new_values.append(translated_value)
                            if translated_value != value:
                                logger.info(f"    Translated value: '{value}' → '{translated_value}'")
                        option['values'] = new_values

                        # Update variants
                        option_position = i + 1
                        option_key = f'option{option_position}'
                        for variant in product.get('variants', []):
                            if option_key in variant:
                                current_value = variant[option_key]
                                translated_value = value_translations.get(current_value, current_value)
                                variant[option_key] = translated_value
                        break

        except Exception as e:
            logger.error(f"Error translating variants: {str(e)}")

    def remove_single_value_options(self, product: Dict):
        """Remove variant options that only have a single value (e.g., Color with only 'Brown')."""
        options = product.get('options', [])
        variants = product.get('variants', [])

        logger.info(f"  Current options: {[(opt.get('name'), opt.get('values')) for opt in options]}")

        if not options or len(options) <= 1:
            logger.info("  Skipping: Only one or no options present")
            return  # Don't remove if there's only one option or no options

        # Find options with only one unique value
        options_to_remove = []
        for i, option in enumerate(options):
            option_name = option.get('name', '')
            values = option.get('values', [])

            # Check if option name indicates it could be a color/style variant
            # Include both English and German names (after translation)
            color_style_names = ['color', 'colour', 'farbe', 'style', 'stil', 'model', 'modell', 'muster', 'pattern']
            logger.info(f"  Checking option '{option_name}' (lowercase: '{option_name.lower()}') with {len(values)} value(s): {values}")

            if option_name.lower() in color_style_names and len(values) == 1:
                options_to_remove.append({
                    'index': i,
                    'position': i + 1,
                    'name': option_name,
                    'value': values[0]
                })
                logger.info(f"  ✓ Marking for removal: Option '{option_name}' with single value '{values[0]}'")

        if not options_to_remove:
            return

        # Remove options from highest index first to avoid index shifting
        for opt_info in sorted(options_to_remove, key=lambda x: x['index'], reverse=True):
            option_position = opt_info['position']
            option_name = opt_info['name']

            # Remove from options list
            del options[opt_info['index']]
            logger.info(f"  Removed option '{option_name}'")

            # Shift variant option values
            # If we remove option2, option3 becomes option2, etc.
            for variant in variants:
                # Shift all options after the removed one
                for j in range(option_position, 4):  # Shopify supports max 3 options
                    current_key = f'option{j}'
                    next_key = f'option{j + 1}'
                    if next_key in variant:
                        variant[current_key] = variant[next_key]
                        del variant[next_key]
                    elif current_key in variant and j >= option_position:
                        del variant[current_key]

    def set_compare_price(self, product: Dict, percentage: float):
        """Set compare price based on percentage."""
        for variant in product.get('variants', []):
            if variant.get('price'):
                price = float(variant['price'])
                compare_price = price * (1 + percentage / 100)
                variant['compare_at_price'] = f"{compare_price:.2f}"

    def apply_price_adjustment(self, product: Dict, adjustment_type: str, adjustment_value: float,
                                price_min_enabled: bool = False, price_min_value: float = 0,
                                price_max_enabled: bool = False, price_max_value: float = 0):
        """Adjust price based on type (Fixed/Percentage) and value, with optional min/max limits."""
        for variant in product.get('variants', []):
            if variant.get('price'):
                current_price = float(variant['price'])

                if adjustment_type.lower() == 'percentage':
                    new_price = current_price * (1 + adjustment_value / 100)
                    logger.info(f"Price adjustment (Percentage {adjustment_value}%): {current_price:.2f} -> {new_price:.2f}")
                elif adjustment_type.lower() in ['fixed', 'fixedamount']:
                    new_price = current_price + adjustment_value
                    logger.info(f"Price adjustment (Fixed {adjustment_value}€): {current_price:.2f} -> {new_price:.2f}")
                else:
                    logger.warning(f"Unknown price adjustment type: {adjustment_type}")
                    continue

                if new_price < 0:
                    logger.warning("Price adjustment would result in negative price. Setting to 0.01")
                    new_price = 0.01

                # Apply min/max price limits
                if price_min_enabled and new_price < price_min_value:
                    logger.info(f"  Price {new_price:.2f}€ below minimum {price_min_value:.2f}€ -> using min price")
                    new_price = price_min_value

                if price_max_enabled and new_price > price_max_value:
                    logger.info(f"  Price {new_price:.2f}€ above maximum {price_max_value:.2f}€ -> using max price")
                    new_price = price_max_value

                variant['price'] = f"{new_price:.2f}"

    def apply_compare_price_limits(self, product: Dict,
                                    compare_min_enabled: bool = False, compare_min_value: float = 0,
                                    compare_max_enabled: bool = False, compare_max_value: float = 0):
        """Apply min/max limits to compare_at_price after it has been calculated."""
        for variant in product.get('variants', []):
            if variant.get('compare_at_price'):
                compare_price = float(variant['compare_at_price'])
                original_compare_price = compare_price

                # Apply min/max compare price limits
                if compare_min_enabled and compare_price < compare_min_value:
                    logger.info(f"  Compare price {compare_price:.2f}€ below minimum {compare_min_value:.2f}€ -> using min")
                    compare_price = compare_min_value

                if compare_max_enabled and compare_price > compare_max_value:
                    logger.info(f"  Compare price {compare_price:.2f}€ above maximum {compare_max_value:.2f}€ -> using max")
                    compare_price = compare_max_value

                if compare_price != original_compare_price:
                    variant['compare_at_price'] = f"{compare_price:.2f}"

    def set_price_decimals(self, product: Dict, decimals: int):
        """Round prices to specified decimals."""
        for variant in product.get('variants', []):
            if variant.get('price'):
                price = float(variant['price'])
                new_price = int(price) + (decimals / 100)
                variant['price'] = f"{new_price:.2f}"

    def set_compare_price_decimals(self, product: Dict, decimals: int):
        """Round compare prices to specified decimals."""
        for variant in product.get('variants', []):
            if variant.get('compare_at_price'):
                price = float(variant['compare_at_price'])
                new_price = int(price) + (decimals / 100)
                variant['compare_at_price'] = f"{new_price:.2f}"

    def enable_inventory_tracking(self, product: Dict):
        """Enable inventory tracking for all variants."""
        for variant in product.get('variants', []):
            variant['inventory_management'] = 'shopify'
            variant['inventory_policy'] = 'deny'

            # Generate SKU if not present
            if not variant.get('sku'):
                product_handle = product.get('handle', '').upper()[:6]
                variant_id = str(variant.get('id', ''))[-6:]
                variant['sku'] = f"{product_handle}-{variant_id}"

    def set_global_quantity(self, product: Dict, quantity: int):
        """Set global quantity for all variants."""
        logger.info(f"Setting global quantity to {quantity} for {len(product.get('variants', []))} variants")
        for variant in product.get('variants', []):
            variant['inventory_quantity'] = quantity
            logger.info(f"  Variant {variant.get('id')}: inventory_quantity set to {quantity}")

    def get_fashion_category_tags(self, product: Dict) -> List[str]:
        """Determine fashion category tags with GPT-5.1 based on the product description."""
        try:
            if not self.openai_client:
                logger.error("OpenAI Client not initialized")
                return []

            categories_list = ', '.join(self.CATEGORY_MAPPING.keys())

            # Use the already generated description (body_html) as basis
            prompt = f"""Analysiere diese Produktbeschreibung und wähle 1-3 passende Kategorien aus:

Produktbeschreibung: {product.get('body_html', '')}

Verfügbare Kategorien: {categories_list}

Wähle NUR aus den verfügbaren Kategorien aus.
Gib die ausgewählten Kategorien als kommagetrennte Liste zurück.
Mindestens 1, maximal 3 Kategorien.
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-5.1",
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=100,
                temperature=0.3
            )

            selected_categories = response.choices[0].message.content.strip().split(',')
            tags = []

            for category in selected_categories:
                category = category.strip()
                if category in self.CATEGORY_MAPPING:
                    tags.append(self.CATEGORY_MAPPING[category])

            logger.info(f"  GPT-5.1 generated {len(tags)} category tags: {tags}")
            return tags[:3]

        except Exception as e:
            logger.error(f"Error generating category tags: {str(e)}")
            return []

    def update_product_in_shopify(self, product: Dict, shop_domain: str, access_token: str,
                                   publish_to_all_channels: bool = False, should_update_inventory: bool = False,
                                   inventory_quantities: Dict = None):
        """Update product in Shopify."""
        url = f"https://{shop_domain}/admin/api/2024-01/products/{product['id']}.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }

        update_data = {"product": product}

        response = requests.put(url, headers=headers, json=update_data, timeout=30)

        if response.status_code == 200:
            logger.info(f"Product {product['id']} successfully updated")

            # If publish_to_all_channels is enabled
            if publish_to_all_channels:
                self.publish_to_all_sales_channels(product['id'], shop_domain, access_token)

            # Update inventory if set_global_quantity is enabled
            if should_update_inventory and inventory_quantities:
                logger.info(f"Updating inventory levels for product {product['id']}...")
                self.update_inventory_levels(inventory_quantities, shop_domain, access_token)
        else:
            logger.error(f"Error updating product: {response.status_code} - {response.text}")

    def publish_to_all_sales_channels(self, product_id: str, shop_domain: str, access_token: str):
        """Publish product to all available sales channels."""
        try:
            headers = {
                "X-Shopify-Access-Token": access_token,
                "Content-Type": "application/json"
            }

            graphql_url = f"https://{shop_domain}/admin/api/2024-01/graphql.json"

            # Get all publications
            query = """
            {
              publications(first: 10) {
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
            """

            response = requests.post(graphql_url, headers=headers, json={"query": query}, timeout=30)

            if response.status_code != 200:
                logger.error(f"Error fetching publications: {response.status_code} - {response.text}")
                return

            data = response.json()

            if 'errors' in data:
                logger.error(f"GraphQL Error fetching publications: {data['errors']}")
                return

            response_data = data.get('data')
            if not response_data:
                logger.error(f"No 'data' in publications response: {data}")
                return

            publications_data = response_data.get('publications')
            if not publications_data:
                logger.error(f"No 'publications' in response: {data}")
                return

            publications = publications_data.get('edges', [])
            logger.info(f"Found sales channels: {len(publications)}")

            # Publish product to all publications
            for pub_edge in publications:
                publication = pub_edge['node']
                publication_id = publication['id']
                publication_name = publication['name']

                mutation = """
                mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
                  publishablePublish(id: $id, input: $input) {
                    publishable {
                      ... on Product {
                        id
                      }
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }
                """

                variables = {
                    "id": f"gid://shopify/Product/{product_id}",
                    "input": [{
                        "publicationId": publication_id
                    }]
                }

                publish_response = requests.post(graphql_url, headers=headers, json={
                    "query": mutation,
                    "variables": variables
                }, timeout=30)

                if publish_response.status_code == 200:
                    result = publish_response.json()

                    if 'errors' in result:
                        logger.warning(f"GraphQL Error publishing to '{publication_name}': {result['errors']}")
                        continue

                    publish_data = result.get('data', {}).get('publishablePublish')
                    if publish_data:
                        errors = publish_data.get('userErrors', [])
                        if errors:
                            for error in errors:
                                logger.warning(f"Error publishing to '{publication_name}': {error.get('message')}")
                        else:
                            logger.info(f"Product {product_id} published to '{publication_name}'")
                else:
                    logger.warning(f"Error publishing to '{publication_name}': {publish_response.status_code}")

        except Exception as e:
            logger.error(f"Error publishing to sales channels: {str(e)}")

    def update_inventory_levels(self, inventory_quantities: Dict, shop_domain: str, access_token: str):
        """Update inventory levels via Inventory API.

        Args:
            inventory_quantities: Dict mapping variant_id -> target_quantity
        """
        logger.info(f"update_inventory_levels called with {len(inventory_quantities)} variants")

        if not inventory_quantities:
            logger.warning("No inventory quantities provided")
            return

        locations_url = f"https://{shop_domain}/admin/api/2024-01/locations.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }

        try:
            response = requests.get(locations_url, headers=headers, timeout=30)
            logger.info(f"Locations API response: {response.status_code}")

            if response.status_code == 200:
                locations = response.json().get('locations', [])
                logger.info(f"Found {len(locations)} locations total")
                active_locations = [loc for loc in locations if loc.get('active') and not loc.get('legacy', False)]

                if not active_locations:
                    logger.warning("No active locations found")
                    return

                location_id = active_locations[0]['id']
                logger.info(f"Using location: {active_locations[0].get('name')} (ID: {location_id})")

                for variant_id, target_quantity in inventory_quantities.items():
                    logger.info(f"  Processing variant {variant_id} with target quantity {target_quantity}")
                    self.set_inventory_level(
                        variant_id,
                        location_id,
                        target_quantity,
                        shop_domain,
                        access_token
                    )
            else:
                logger.error(f"Failed to get locations: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Exception in update_inventory_levels: {str(e)}")

    def set_inventory_level(self, variant_id: int, location_id: int, quantity: int,
                            shop_domain: str, access_token: str):
        """Set inventory level for a specific variant."""
        variant_url = f"https://{shop_domain}/admin/api/2024-01/variants/{variant_id}.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }

        response = requests.get(variant_url, headers=headers, timeout=30)

        if response.status_code == 200:
            variant_data = response.json().get('variant', {})
            inventory_item_id = variant_data.get('inventory_item_id')

            if inventory_item_id:
                # Check if inventory level exists
                check_url = f"https://{shop_domain}/admin/api/2024-01/inventory_levels.json?inventory_item_ids={inventory_item_id}&location_ids={location_id}"
                check_response = requests.get(check_url, headers=headers, timeout=30)

                if check_response.status_code == 200:
                    inventory_levels = check_response.json().get('inventory_levels', [])

                    if inventory_levels:
                        # Inventory level exists, use adjust
                        current_level = inventory_levels[0].get('available', 0)
                        adjustment = quantity - current_level

                        if adjustment != 0:
                            adjust_url = f"https://{shop_domain}/admin/api/2024-01/inventory_levels/adjust.json"
                            adjust_data = {
                                "location_id": location_id,
                                "inventory_item_id": inventory_item_id,
                                "available_adjustment": adjustment
                            }

                            adjust_response = requests.post(adjust_url, headers=headers, json=adjust_data, timeout=30)

                            if adjust_response.status_code == 200:
                                logger.info(f"Inventory for variant {variant_id} adjusted: {current_level} -> {quantity}")
                            else:
                                logger.error(f"Error adjusting inventory for variant {variant_id}: {adjust_response.text}")
                    else:
                        # No inventory level, create new one
                        connect_url = f"https://{shop_domain}/admin/api/2024-01/inventory_levels/connect.json"
                        connect_data = {
                            "location_id": location_id,
                            "inventory_item_id": inventory_item_id
                        }

                        connect_response = requests.post(connect_url, headers=headers, json=connect_data, timeout=30)

                        if connect_response.status_code in [200, 201]:
                            # Set inventory
                            set_url = f"https://{shop_domain}/admin/api/2024-01/inventory_levels/set.json"
                            set_data = {
                                "location_id": location_id,
                                "inventory_item_id": inventory_item_id,
                                "available": quantity
                            }

                            set_response = requests.post(set_url, headers=headers, json=set_data, timeout=30)

                            if set_response.status_code == 200:
                                logger.info(f"Inventory for variant {variant_id} set: {quantity}")
                            else:
                                logger.error(f"Error setting inventory for variant {variant_id}: {set_response.text}")
                        else:
                            logger.error(f"Error connecting inventory item for variant {variant_id}: {connect_response.text}")


def main():
    """Entry point for the Cron Job."""
    try:
        optimizer = ShopifyProductOptimizer()
        optimizer.run()
    except KeyboardInterrupt:
        print("\nJob interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nFATAL ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
