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

    def run(self):
        """Main function that processes all shops."""
        try:
            logger.info("=" * 60)
            logger.info("STARTING PRODUCT OPTIMIZE JOB - ReBoss NextGen")
            logger.info(f"Time: {datetime.now(timezone.utc).isoformat()}")
            logger.info("=" * 60)

            # Get all active shops
            shops = self.get_shops()

            for shop in shops:
                logger.info(f"Processing shop: {shop.get('shop_domain', shop.get('internal_name', 'Unknown'))}")
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

            logger.info(f"Found: {len(shops)} shops")
            return shops

        except Exception as e:
            logger.error(f"Error getting shops: {e}")
            return []

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

        # Get product settings
        settings = self.get_product_settings(shop_id)

        if not settings:
            logger.warning(f"Skipping shop {shop_domain} - no settings found")
            return

        # Get products with tag "NEW_SET"
        products = self.get_products_with_tag(shop_domain, access_token)

        logger.info(f"Found: {len(products)} products to process in {shop_domain}")

        for product in products:
            try:
                self.optimize_product(product, settings, shop_domain, access_token)
            except Exception as e:
                logger.error(f"Error with product {product['id']}: {str(e)}")
                continue

    def get_products_with_tag(self, shop_domain: str, access_token: str) -> List[Dict]:
        """Get all products with tag 'NEW_SET' using GraphQL."""
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
                "query": "tag:NEW_SET",
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

                logger.info(f"GraphQL Response: Found {len(edges)} products with tag 'NEW_SET'")

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

        logger.info(f"Total found: {len(all_products)} products with tag 'NEW_SET'")
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

        # 4. Change variant name "Size" to "Größe"
        if settings.get('change_size_to_groesse', False):
            self.change_size_to_groesse(product)

        # 5. Set German sizes
        if settings.get('set_german_sizes', False):
            self.set_german_sizes(product)

        # 6. Set compare price
        if settings.get('set_compare_price', False) and settings.get('compare_price_percentage'):
            self.set_compare_price(product, float(settings['compare_price_percentage']))

        # 6a. Apply price adjustment (fixed or percentage)
        if settings.get('adjust_normal_price', False) and settings.get('price_adjustment_type') and settings.get('price_adjustment_value') is not None:
            self.apply_price_adjustment(
                product,
                settings['price_adjustment_type'],
                float(settings['price_adjustment_value'])
            )

        # 7. Set price decimals
        if settings.get('set_price_decimals', False) and settings.get('price_decimals') is not None:
            self.set_price_decimals(product, int(settings['price_decimals']))

        # 8. Set compare price decimals
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

        # Update product in Shopify
        publish_to_all_channels = settings.get('publish_all_channels', False)
        self.update_product_in_shopify(product, shop_domain, access_token, publish_to_all_channels)

    def generate_improved_description(self, product: Dict, settings: Dict) -> str:
        """Generate improved product description with GPT - exact port."""
        try:
            if not self.openai_client:
                logger.error("OpenAI Client not initialized")
                return product.get('body_html', '')

            # Get main image if available
            image_url = ""
            if product.get('images') and len(product['images']) > 0:
                image_url = product['images'][0]['src']

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

            prompt = f"""
**Schreib mir einen extrem kaufanregenden Verkaufstext für dieses Produkt.** Der Text soll:

**1) SEO-optimiert** sein und alle relevanten Keywords einbinden.

**2) Kreativ und emotional ansprechend** gestaltet sein, sodass er beim Lesen Bilder im Kopf erzeugt.

**3) Fantastische Eigenschaften** nutzen, um die Vorteile des Produkts noch stärker hervorzuheben, dabei jedoch auf eine seriöse, vertrauensvolle Weise geschrieben sein – wie eine gute Freundin, die das Produkt ehrlich empfiehlt.

4) Mit **750 Zeichen (inklusive Leerzeichen)** auskommen und in der **Chunks-Methode** strukturiert sein. Verwende für die Abschnitte passende Titel, z. B. "Perfekt für kalte Tage", anstelle von "Chunk 1".

5) Eine **Produkteigenschaftsauflistung** beinhalten (Schnitt, Material, Stil, etc.), wobei diese Angaben von der vorherigen Produktbeschreibung entnommen werden sollen. Falls in der vorherigen Beschreibung keine Angaben zu finden sind, erstelle sinnvolle Eigenschaften basierend auf den Bildern.

6) Derzeit ist {season_german}, also passe den Text an die {season_german}-Jahreszeit an.

7) Der Verkaufstext soll in HTML Format geschrieben sein. Vergiss nicht die Chunk-Title Fett zu schreiben mit <strong> </strong> und eine Zeil Abstand zwischen den Chunks zu setzen mit <br> oder <p> </p>. Verwende auf keinen Fall ** Sterne oder andere Sonderzeichen. Nutze zum Auflisten:
<ul>
  <li>Element eins</li>
  <li>Element zwei</li>
  <li>Element drei</li>
</ul>

Aktueller Produkttitel: {product.get('title', '')}
Aktuelle Beschreibung: {current_description}
Hauptbild URL: {image_url}
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.7
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"Error generating description: {str(e)}")
            return product.get('body_html', '')

    def generate_optimized_title(self, product: Dict, settings: Dict) -> str:
        """Generate optimized product title with GPT - exact port."""
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

            prompt = f"""
Erstelle einen kurzen, prägnanten und verkaufsfördernden Titel für dieses Produkt.
Der Titel sollte attraktiv und suchmaschinenoptimiert sein.
Berücksichtige, dass aktuell {season_german} ist und passe den Titel entsprechend an.
Maximale Länge: 60 Zeichen.
Keine Anführungszeichen verwenden.

Produktbeschreibung: {product.get('body_html', '')}

Gib NUR den neuen Titel zurück, ohne weitere Erklärungen.
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.7
            )

            # Remove quotes from title
            title = response.choices[0].message.content.strip()
            title = title.strip('"').strip("'")
            title = title.strip('\u201e').strip('\u201c')
            title = title.strip('\u201a').strip('\u2018')
            title = title.strip('\u201d').strip('\u2019')
            return title

        except Exception as e:
            logger.error(f"Error generating title: {str(e)}")
            return product.get('title', '')

    def generate_product_tags(self, product: Dict) -> List[str]:
        """Generate product tags with GPT - exact port."""
        try:
            if not self.openai_client:
                logger.error("OpenAI Client not initialized")
                return []

            prompt = f"""
Generiere relevante deutsche Tags für dieses Produkt sowie das Geschlecht (male/female, nie unisex) auf Englisch.
Die Tags sollten umfassen: Produkttyp, Kategorie, Farbe, Material, Stil, Saison und Geschlecht.
Gib sie als kommagetrennte Liste zurück, etwa:
Kleid, Sommerkleid, Blau, Baumwolle, Casual, Sommer, female

Produkttitel: {product.get('title', '')}
Produktbeschreibung: {product.get('body_html', '')}

Gib NUR die Tags als kommagetrennte Liste zurück, ohne weitere Erklärungen.
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.7
            )

            tags_string = response.choices[0].message.content.strip()
            return [tag.strip() for tag in tags_string.split(',')]

        except Exception as e:
            logger.error(f"Error generating tags: {str(e)}")
            return []

    def change_size_to_groesse(self, product: Dict):
        """Change variant name from 'Size' to 'Größe'."""
        for option in product.get('options', []):
            if option.get('name', '').lower() == 'size':
                option['name'] = 'Größe'

    def set_german_sizes(self, product: Dict):
        """Set German size designations."""
        size_mapping = {
            'S': 'S (36/38)',
            'M': 'M (40/42)',
            'L': 'L (44/46)',
            'XL': 'XL (48/50)',
            'XXL': 'XXL (52/54)'
        }

        # Find size option
        size_option_position = None
        for i, option in enumerate(product.get('options', [])):
            if option.get('name', '').lower() in ['size', 'größe']:
                size_option_position = i + 1
                new_values = []
                for value in option.get('values', []):
                    if value.upper() in size_mapping:
                        new_values.append(size_mapping[value.upper()])
                    else:
                        new_values.append(value)
                option['values'] = new_values
                break

        # Update variants
        if size_option_position:
            for variant in product.get('variants', []):
                option_key = f'option{size_option_position}'
                if option_key in variant:
                    current_value = variant[option_key]
                    if current_value.upper() in size_mapping:
                        variant[option_key] = size_mapping[current_value.upper()]

    def set_compare_price(self, product: Dict, percentage: float):
        """Set compare price based on percentage."""
        for variant in product.get('variants', []):
            if variant.get('price'):
                price = float(variant['price'])
                compare_price = price * (1 + percentage / 100)
                variant['compare_at_price'] = f"{compare_price:.2f}"

    def apply_price_adjustment(self, product: Dict, adjustment_type: str, adjustment_value: float):
        """Adjust price based on type (Fixed/Percentage) and value."""
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

                variant['price'] = f"{new_price:.2f}"

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
        for variant in product.get('variants', []):
            variant['inventory_quantity'] = quantity

    def get_fashion_category_tags(self, product: Dict) -> List[str]:
        """Determine fashion category tags with GPT."""
        try:
            if not self.openai_client:
                logger.error("OpenAI Client not initialized")
                return []

            categories_list = ', '.join(self.CATEGORY_MAPPING.keys())

            prompt = f"""
            Analysiere diese Produktbeschreibung und wähle 1-3 passende Kategorien aus:

            Produktbeschreibung: {product.get('body_html', '')}

            Verfügbare Kategorien: {categories_list}

            Wähle NUR aus den verfügbaren Kategorien aus.
            Gib die ausgewählten Kategorien als kommagetrennte Liste zurück.
            Mindestens 1, maximal 3 Kategorien.
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.3
            )

            selected_categories = response.choices[0].message.content.strip().split(',')
            tags = []

            for category in selected_categories:
                category = category.strip()
                if category in self.CATEGORY_MAPPING:
                    tags.append(self.CATEGORY_MAPPING[category])

            return tags[:3]

        except Exception as e:
            logger.error(f"Error generating category tags: {str(e)}")
            return []

    def update_product_in_shopify(self, product: Dict, shop_domain: str, access_token: str,
                                   publish_to_all_channels: bool = False):
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

            # If inventory management was enabled, update inventory
            if any(v.get('inventory_management') == 'shopify' for v in product.get('variants', [])):
                self.update_inventory_levels(product, shop_domain, access_token)
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

    def update_inventory_levels(self, product: Dict, shop_domain: str, access_token: str):
        """Update inventory levels via Inventory API."""
        locations_url = f"https://{shop_domain}/admin/api/2024-01/locations.json"
        headers = {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
        }

        response = requests.get(locations_url, headers=headers, timeout=30)

        if response.status_code == 200:
            locations = response.json().get('locations', [])
            active_locations = [loc for loc in locations if loc.get('active') and not loc.get('legacy', False)]

            if not active_locations:
                logger.warning("No active locations found")
                return

            location_id = active_locations[0]['id']
            logger.info(f"Using location: {active_locations[0].get('name')} (ID: {location_id})")

            for variant in product.get('variants', []):
                if 'inventory_quantity' in variant:
                    self.set_inventory_level(
                        variant['id'],
                        location_id,
                        variant['inventory_quantity'],
                        shop_domain,
                        access_token
                    )

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
