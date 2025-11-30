"""
Replacement Logic - 2-Phase approach for Smart Collections
Phase 1: Tag management (product swap)
Phase 2: Position maintenance for manual sorting
"""
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

from models import ProductPhase, ProductAction, ProductAnalysis, ShopConfig
from services.shopify_client import ShopifyGraphQLClient
from services.supabase_service import SupabaseService


class ReplacementLogic:
    """Main logic for product replacements."""

    def __init__(self, shopify_client: ShopifyGraphQLClient,
                 supabase_service: SupabaseService, config: ShopConfig):
        self.shopify = shopify_client
        self.db = supabase_service
        self.config = config

    def get_product_sales_data(self, collection_id: str, product_id: str) -> Dict:
        """Get sales data from Supabase."""
        if product_id.startswith('gid://'):
            product_id = product_id.split('/')[-1]

        return self.db.get_sales_data(self.config.shop_id, collection_id, product_id)

    def update_collection_tracking(self, collection_id: str, product_id: str,
                                   added: datetime = None, removed: datetime = None):
        """Update tracking data in Supabase."""
        if product_id.startswith('gid://'):
            product_id = product_id.split('/')[-1]

        self.db.update_collection_tracking(
            self.config.shop_id, collection_id, product_id, added, removed
        )

    def calculate_product_phase(self, sales_data: Dict) -> Tuple[ProductPhase, int]:
        """Determine product phase based on age."""
        date_added = sales_data.get('date_added_to_collection')

        if not date_added:
            return ProductPhase.TOO_NEW, 0

        # Handle various date formats
        if isinstance(date_added, str):
            date_added = datetime.fromisoformat(date_added.replace('Z', '+00:00'))
        elif hasattr(date_added, 'timestamp'):
            date_added = datetime.fromtimestamp(date_added.timestamp(), tz=timezone.utc)

        if date_added.tzinfo is None:
            date_added = date_added.replace(tzinfo=timezone.utc)

        days_in_collection = (datetime.now(timezone.utc) - date_added).days

        # Determine phase based on configuration
        if days_in_collection < self.config.start_phase_days:
            return ProductPhase.TOO_NEW, days_in_collection
        elif days_in_collection < self.config.nach_phase_days:
            return ProductPhase.INITIAL, days_in_collection
        else:
            return ProductPhase.POST, days_in_collection

    def evaluate_product_action(self, phase: ProductPhase, sales_data: Dict,
                                days_in_collection: int) -> Tuple[ProductAction, str]:
        """Determine action for a product based on phase and sales."""
        if phase == ProductPhase.TOO_NEW:
            return ProductAction.KEEP, f"Too new ({days_in_collection} days < {self.config.start_phase_days})"

        elif phase == ProductPhase.INITIAL:
            # Initial Phase: Check first 7 days sales
            sales = sales_data.get('sales_first_7_days', 0)
            delete_threshold = self.config.initial_phase_rules.get('min_sales_day7_delete', 0)
            replace_threshold = self.config.initial_phase_rules.get('min_sales_day7_replace', 1)

            if sales <= delete_threshold:
                return ProductAction.DELETE, f"Initial: {sales} sales <= {delete_threshold} (delete)"
            elif sales <= replace_threshold:
                return ProductAction.REPLACE, f"Initial: {sales} sales <= {replace_threshold} (replace)"
            else:
                return ProductAction.KEEP, f"Initial: {sales} sales > {replace_threshold} (keep)"

        elif phase == ProductPhase.POST:
            # Post Phase: Check OK buckets
            ok_buckets = 0
            details = []

            for days in [3, 7, 10, 14]:
                sales_key = f'sales_last_{days}_days'
                threshold_key = f'avg{days}_ok'

                sales = sales_data.get(sales_key, 0)
                threshold = self.config.post_phase_rules.get(threshold_key, 0)

                if sales >= threshold:
                    ok_buckets += 1
                    details.append(f"{days}d:{sales}>={threshold}OK")
                else:
                    details.append(f"{days}d:{sales}<{threshold}X")

            min_ok = self.config.post_phase_rules.get('min_ok_thresholds', 2)

            if ok_buckets >= min_ok:
                return ProductAction.KEEP, f"Post: {ok_buckets}/{min_ok} OK ({', '.join(details)})"
            else:
                return ProductAction.REPLACE, f"Post: {ok_buckets}/{min_ok} OK ({', '.join(details)})"

        return ProductAction.KEEP, "Unknown phase"

    def analyze_collection_products(self, collection_id: str, collection_tag: str) -> Dict:
        """Analyze all products in a collection."""
        print(f"Analyzing products for collection {collection_id}")

        # Get all products with the collection tag
        products = self.shopify.get_products_by_tag(collection_tag)

        # Get current positions
        products_with_positions = self.shopify.get_collection_products_with_positions(collection_id)
        position_map = {gid: pos for gid, pos in products_with_positions}

        # Analyze each product
        analyses = []
        action_counts = {
            ProductAction.KEEP: 0,
            ProductAction.REPLACE: 0,
            ProductAction.DELETE: 0
        }

        now = datetime.now(timezone.utc)

        for product in products:
            product_gid = product['id']
            product_id = product_gid.split('/')[-1]

            # Get sales data
            sales_data = self.get_product_sales_data(collection_id, product_id)

            # Initialize tracking if new
            if not sales_data.get('date_added_to_collection'):
                print(f"First time seeing '{product['title']}' in collection, initializing")
                self.update_collection_tracking(collection_id, product_id, added=now)
                sales_data['date_added_to_collection'] = now.isoformat()

            # Determine phase and action
            phase, days_in_collection = self.calculate_product_phase(sales_data)
            action, reason = self.evaluate_product_action(phase, sales_data, days_in_collection)

            # Create analysis object
            analysis = ProductAnalysis(
                product_id=product_id,
                product_gid=product_gid,
                title=product['title'],
                tags=product.get('tags', []),
                phase=phase,
                action=action,
                reason=reason,
                position=position_map.get(product_gid),
                sales_data=sales_data
            )

            analyses.append(analysis)
            action_counts[action] += 1

            print(f"  {product['title']}: {phase.value} -> {action.value} ({reason})")

        # Sort by position
        analyses.sort(key=lambda a: a.position if a.position is not None else 999999)

        return {
            'analyses': analyses,
            'total_products': len(products),
            'to_keep': action_counts[ProductAction.KEEP],
            'to_replace': action_counts[ProductAction.REPLACE],
            'to_delete': action_counts[ProductAction.DELETE],
            'summary': f"{len(products)} products: {action_counts[ProductAction.KEEP]} keep, "
                       f"{action_counts[ProductAction.REPLACE]} replace, {action_counts[ProductAction.DELETE]} delete"
        }

    def get_available_qk_products(self, needed: int) -> List[Dict]:
        """Get available QK products for replacements."""
        qk_products = self.shopify.get_products_by_tag(
            self.config.qk_tag,
            limit=needed + 10
        )

        print(f"Found {len(qk_products)} QK products (needed: {needed})")
        return qk_products

    def execute_replacements(self, collection_id: str, collection_tag: str,
                             sort_order: str, analysis_result: Dict,
                             test_mode: bool = False) -> Dict:
        """Execute replacements (2-phase process)."""
        analyses = analysis_result['analyses']
        to_replace = [a for a in analyses if a.action == ProductAction.REPLACE]
        to_delete = [a for a in analyses if a.action == ProductAction.DELETE]

        needed = len(to_replace) + len(to_delete)

        if needed == 0:
            return {
                'kept': analysis_result['to_keep'],
                'replaced': 0,
                'deleted': 0,
                'positions_maintained': 0,
                'summary': "No replacements needed"
            }

        # Store original positions BEFORE tag changes
        original_positions = {}
        if sort_order == 'MANUAL' and self.config.maintain_positions:
            print("Storing original positions before tag changes...")
            positions_before = self.shopify.get_collection_products_with_positions(collection_id)
            original_positions = {gid: pos for gid, pos in positions_before}

        # Phase 1: Tag changes
        print(f"=== PHASE 1: TAG CHANGES ({needed} products) ===")

        qk_products = self.get_available_qk_products(needed)

        if len(qk_products) < needed:
            print(f"WARNING: Not enough QK products! Have: {len(qk_products)}, Need: {needed}")

        qk_index = 0
        replaced = 0
        deleted = 0
        position_swaps = []
        now = datetime.now(timezone.utc)

        # Process replacements
        for analysis in to_replace:
            if qk_index >= len(qk_products):
                print("No more QK products available")
                break

            new_product = qk_products[qk_index]

            if test_mode:
                print(f"[TEST] Would replace '{analysis.title}' with '{new_product['title']}'")
                if analysis.position is not None:
                    position_swaps.append((new_product['id'], analysis.position))
                replaced += 1
                qk_index += 1
            else:
                # Remove collection tag from old product
                old_tags = list(analysis.tags)
                if collection_tag in old_tags:
                    old_tags.remove(collection_tag)
                archive_tag = f"{self.config.replace_tag_prefix}{now.strftime('%d-%m-%Y')}"
                if archive_tag not in old_tags:
                    old_tags.append(archive_tag)

                # Add collection tag to new product, remove QK tag
                new_tags = new_product.get('tags', [])
                if isinstance(new_tags, str):
                    new_tags = [t.strip() for t in new_tags.split(',') if t]
                else:
                    new_tags = list(new_tags)
                new_tags = [t for t in new_tags if t != self.config.qk_tag]
                if collection_tag not in new_tags:
                    new_tags.append(collection_tag)

                # Update tags
                old_success = self.shopify.update_product_tags(analysis.product_id, old_tags)
                new_success = self.shopify.update_product_tags(new_product['id'], new_tags)

                if old_success and new_success:
                    # Update tracking
                    self.update_collection_tracking(collection_id, analysis.product_id, removed=now)
                    self.update_collection_tracking(collection_id, new_product['id'], added=now)

                    # Store position for Phase 2
                    old_product_gid = analysis.product_id
                    if not old_product_gid.startswith('gid://'):
                        old_product_gid = f'gid://shopify/Product/{old_product_gid}'

                    original_pos = original_positions.get(old_product_gid)
                    if original_pos is not None:
                        position_swaps.append((new_product['id'], original_pos))

                    replaced += 1
                    qk_index += 1
                    print(f"Replaced '{analysis.title}' with '{new_product['title']}'")
                else:
                    print(f"Failed to replace '{analysis.title}'")

        # Process deletions
        for analysis in to_delete:
            if qk_index >= len(qk_products):
                print("No more QK products available")
                break

            new_product = qk_products[qk_index]

            if test_mode:
                print(f"[TEST] Would archive '{analysis.title}' and replace with '{new_product['title']}'")
                if analysis.position is not None:
                    position_swaps.append((new_product['id'], analysis.position))
                deleted += 1
                qk_index += 1
            else:
                # Remove tags and archive
                old_tags = list(analysis.tags)
                if collection_tag in old_tags:
                    old_tags.remove(collection_tag)
                archive_tag = f"{self.config.replace_tag_prefix}{now.strftime('%d-%m-%Y')}"
                if archive_tag not in old_tags:
                    old_tags.append(archive_tag)

                # New product tags
                new_tags = new_product.get('tags', [])
                if isinstance(new_tags, str):
                    new_tags = [t.strip() for t in new_tags.split(',') if t]
                else:
                    new_tags = list(new_tags)
                new_tags = [t for t in new_tags if t != self.config.qk_tag]
                if collection_tag not in new_tags:
                    new_tags.append(collection_tag)

                # Execute updates
                old_tag_success = self.shopify.update_product_tags(analysis.product_id, old_tags)
                archive_success = self.shopify.archive_product(analysis.product_id)
                new_success = self.shopify.update_product_tags(new_product['id'], new_tags)

                if old_tag_success and archive_success and new_success:
                    self.update_collection_tracking(collection_id, analysis.product_id, removed=now)
                    self.update_collection_tracking(collection_id, new_product['id'], added=now)

                    old_product_gid = analysis.product_id
                    if not old_product_gid.startswith('gid://'):
                        old_product_gid = f'gid://shopify/Product/{old_product_gid}'

                    original_pos = original_positions.get(old_product_gid)
                    if original_pos is not None:
                        position_swaps.append((new_product['id'], original_pos))

                    deleted += 1
                    qk_index += 1
                    print(f"Archived '{analysis.title}' and replaced with '{new_product['title']}'")
                else:
                    print(f"Failed to archive '{analysis.title}'")

        # Phase 2: Position maintenance (manual sorting only)
        positions_maintained = 0

        if sort_order == 'MANUAL' and self.config.maintain_positions and position_swaps:
            print(f"=== PHASE 2: POSITION MAINTENANCE ({len(position_swaps)} products) ===")

            if test_mode:
                print(f"[TEST] Would reorder {len(position_swaps)} products")
                positions_maintained = len(position_swaps)
            else:
                # Wait for Shopify to update the collection
                print("Waiting 5 minutes for Shopify Smart Collection to update...")
                time.sleep(300)

                # Get current positions after tag changes
                print("Getting current positions after tag changes...")
                current_positions = self.shopify.get_collection_products_with_positions(collection_id)
                position_map = {gid: pos for gid, pos in current_positions}

                # Build move list
                moves = []
                for product_gid, target_position in position_swaps:
                    if not product_gid.startswith('gid://'):
                        product_gid = f'gid://shopify/Product/{product_gid}'

                    current_pos = position_map.get(product_gid)

                    if current_pos is not None and current_pos != target_position:
                        print(f"Product {product_gid}: {current_pos} -> {target_position}")
                        moves.append({
                            "id": product_gid,
                            "newPosition": str(target_position)
                        })
                    elif current_pos == target_position:
                        print(f"Product {product_gid} already at correct position")

                # Sort moves by position
                moves.sort(key=lambda m: int(m["newPosition"]))

                # Execute reorder
                if self.shopify.reorder_collection_products(collection_id, moves):
                    positions_maintained = len(moves)
                    print(f"Successfully reordered {positions_maintained} products")
                else:
                    print("Failed to reorder products")

        return {
            'kept': analysis_result['to_keep'],
            'replaced': replaced,
            'deleted': deleted,
            'positions_maintained': positions_maintained,
            'summary': f"Replaced: {replaced}, Archived: {deleted}, Positions maintained: {positions_maintained}"
        }
