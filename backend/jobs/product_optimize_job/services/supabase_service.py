"""
Supabase Service for Product Optimize Job - Database operations
"""
import os
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from supabase import create_client, Client

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ShopConfig, ProductCreationConfig


class SupabaseService:
    def __init__(self):
        """Initialize Supabase client."""
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

        if not supabase_url or not supabase_key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

        self.client: Client = create_client(supabase_url, supabase_key)
        print(f"Connected to Supabase: {supabase_url}")

    def get_shops_for_optimization(self) -> List[ShopConfig]:
        """Get all shops with their optimization settings."""
        configs = []

        try:
            # Get all shops
            shops_response = self.client.table('shops').select('*').execute()

            for shop_data in shops_response.data:
                shop_id = shop_data['id']

                # Parse rules JSON
                rules = shop_data.get('rules', {})
                if isinstance(rules, str):
                    rules = json.loads(rules)

                # Get rate limits for this shop
                rate_limits = self.get_rate_limits(shop_id)

                # Create optimization config from rules
                optimization_config = ProductCreationConfig.from_rules(rules)

                config = ShopConfig(
                    shop_id=shop_id,
                    shop_domain=shop_data.get('shop_domain'),
                    access_token=shop_data.get('access_token'),
                    internal_name=shop_data.get('internal_name', 'Unknown'),
                    optimization_config=optimization_config,
                    fast_fashion_limit=rate_limits.get('fast_fashion_limit', 20)
                )

                configs.append(config)
                print(f"  Shop {config.internal_name}: GPT Title={optimization_config.generate_optimized_title}, "
                      f"GPT Desc={optimization_config.generate_optimized_description}")

        except Exception as e:
            print(f"Error loading shop configs: {e}")
            raise

        return configs

    def get_rate_limits(self, shop_id: str) -> Dict:
        """Get rate limits for a shop."""
        try:
            response = self.client.table('rate_limits').select('*').eq(
                'shop_id', shop_id
            ).single().execute()

            if response.data:
                return response.data
            else:
                return {
                    'fast_fashion_limit': 20,
                    'pod_creation_limit': 10
                }

        except Exception as e:
            print(f"Using default rate limits for {shop_id}")
            return {
                'fast_fashion_limit': 20,
                'pod_creation_limit': 10
            }

    def log_job_run(self, job_type: str, status: str, shops_processed: int = 0,
                    shops_failed: int = 0, error_log: List[Dict] = None,
                    metadata: Dict = None) -> str:
        """Log a job run to the job_runs table."""
        try:
            data = {
                'job_type': job_type,
                'status': status,
                'shops_processed': shops_processed,
                'shops_failed': shops_failed,
                'error_log': error_log or [],
                'metadata': metadata or {}
            }

            if status in ['completed', 'failed']:
                data['completed_at'] = datetime.now(timezone.utc).isoformat()

            response = self.client.table('job_runs').insert(data).execute()

            if response.data:
                return response.data[0]['id']
            return None

        except Exception as e:
            print(f"Error logging job run: {e}")
            return None

    def update_job_run(self, job_id: str, status: str, shops_processed: int = 0,
                       shops_failed: int = 0, error_log: List[Dict] = None,
                       metadata: Dict = None):
        """Update an existing job run."""
        try:
            data = {
                'status': status,
                'shops_processed': shops_processed,
                'shops_failed': shops_failed
            }

            if error_log is not None:
                data['error_log'] = error_log
            if metadata is not None:
                data['metadata'] = metadata
            if status in ['completed', 'failed', 'completed_with_errors']:
                data['completed_at'] = datetime.now(timezone.utc).isoformat()

            self.client.table('job_runs').update(data).eq('id', job_id).execute()

        except Exception as e:
            print(f"Error updating job run: {e}")
