/**
 * Database Types for TMS EcomPilot
 *
 * Diese Datei sollte nach der Migration mit dem Supabase CLI generiert werden:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
 *
 * Die aktuelle Version spiegelt das Schema aus der Migration wider.
 */

export interface Database {
  public: {
    Tables: {
      // TMS EcomPilot Subscriptions
      pod_autom_subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: 'basis' | 'premium' | 'vip'
          status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          trial_start: string | null
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier: 'basis' | 'premium' | 'vip'
          status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: 'basis' | 'premium' | 'vip'
          status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // TMS EcomPilot Shops
      pod_autom_shops: {
        Row: {
          id: string
          user_id: string
          shop_domain: string
          shop_name: string | null
          internal_name: string | null
          shop_email: string | null
          shop_currency: string
          shop_timezone: string
          access_token: string | null
          scopes: string | null
          shopify_shop_id: string | null
          connection_status: 'connected' | 'disconnected' | 'error' | 'pending'
          last_sync_at: string | null
          connection_error: string | null
          printful_api_key: string | null
          fulfillment_provider: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shop_domain: string
          shop_name?: string | null
          internal_name?: string | null
          shop_email?: string | null
          shop_currency?: string
          shop_timezone?: string
          access_token?: string | null
          scopes?: string | null
          shopify_shop_id?: string | null
          connection_status?: 'connected' | 'disconnected' | 'error' | 'pending'
          last_sync_at?: string | null
          connection_error?: string | null
          printful_api_key?: string | null
          fulfillment_provider?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          shop_domain?: string
          shop_name?: string | null
          internal_name?: string | null
          shop_email?: string | null
          shop_currency?: string
          shop_timezone?: string
          access_token?: string | null
          scopes?: string | null
          shopify_shop_id?: string | null
          connection_status?: 'connected' | 'disconnected' | 'error' | 'pending'
          last_sync_at?: string | null
          connection_error?: string | null
          printful_api_key?: string | null
          fulfillment_provider?: string
          created_at?: string
          updated_at?: string
        }
      }

      // TMS EcomPilot Settings
      pod_autom_settings: {
        Row: {
          id: string
          shop_id: string
          enabled: boolean
          auto_publish: boolean
          auto_create_variants: boolean
          gpt_image_quality: 'LOW' | 'MEDIUM' | 'HIGH'
          gpt_model: string
          creation_limit: number
          daily_creation_count: number
          last_creation_reset: string
          default_price: number
          price_multiplier: number
          compare_at_price_multiplier: number
          default_product_type: string
          default_vendor: string
          default_tags: string[]
          default_collections: string[]
          creation_schedule: string
          preferred_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          enabled?: boolean
          auto_publish?: boolean
          auto_create_variants?: boolean
          gpt_image_quality?: 'LOW' | 'MEDIUM' | 'HIGH'
          gpt_model?: string
          creation_limit?: number
          daily_creation_count?: number
          last_creation_reset?: string
          default_price?: number
          price_multiplier?: number
          compare_at_price_multiplier?: number
          default_product_type?: string
          default_vendor?: string
          default_tags?: string[]
          default_collections?: string[]
          creation_schedule?: string
          preferred_time?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          enabled?: boolean
          auto_publish?: boolean
          auto_create_variants?: boolean
          gpt_image_quality?: 'LOW' | 'MEDIUM' | 'HIGH'
          gpt_model?: string
          creation_limit?: number
          daily_creation_count?: number
          last_creation_reset?: string
          default_price?: number
          price_multiplier?: number
          compare_at_price_multiplier?: number
          default_product_type?: string
          default_vendor?: string
          default_tags?: string[]
          default_collections?: string[]
          creation_schedule?: string
          preferred_time?: string
          created_at?: string
          updated_at?: string
        }
      }

      // TMS EcomPilot Niches
      pod_autom_niches: {
        Row: {
          id: string
          settings_id: string
          niche_name: string
          niche_slug: string | null
          description: string | null
          is_active: boolean
          priority: number
          total_products: number
          total_sales: number
          total_revenue: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          settings_id: string
          niche_name: string
          niche_slug?: string | null
          description?: string | null
          is_active?: boolean
          priority?: number
          total_products?: number
          total_sales?: number
          total_revenue?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          settings_id?: string
          niche_name?: string
          niche_slug?: string | null
          description?: string | null
          is_active?: boolean
          priority?: number
          total_products?: number
          total_sales?: number
          total_revenue?: number
          created_at?: string
          updated_at?: string
        }
      }

      // TMS EcomPilot Prompts
      pod_autom_prompts: {
        Row: {
          id: string
          settings_id: string
          prompt_type: 'image' | 'title' | 'description'
          prompt_name: string | null
          prompt_text: string
          variables: Record<string, unknown>
          is_active: boolean
          is_default: boolean
          version: number
          parent_id: string | null
          usage_count: number
          success_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          settings_id: string
          prompt_type: 'image' | 'title' | 'description'
          prompt_name?: string | null
          prompt_text: string
          variables?: Record<string, unknown>
          is_active?: boolean
          is_default?: boolean
          version?: number
          parent_id?: string | null
          usage_count?: number
          success_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          settings_id?: string
          prompt_type?: 'image' | 'title' | 'description'
          prompt_name?: string | null
          prompt_text?: string
          variables?: Record<string, unknown>
          is_active?: boolean
          is_default?: boolean
          version?: number
          parent_id?: string | null
          usage_count?: number
          success_rate?: number | null
          created_at?: string
          updated_at?: string
        }
      }

      // TMS EcomPilot Products
      pod_autom_products: {
        Row: {
          id: string
          shop_id: string
          niche_id: string | null
          shopify_product_id: string | null
          shopify_handle: string | null
          title: string | null
          description: string | null
          generated_image_url: string | null
          generated_title: string | null
          generated_description: string | null
          prompt_used: string | null
          price: number | null
          compare_at_price: number | null
          cost_per_item: number | null
          status: 'pending' | 'generating' | 'generated' | 'published' | 'failed' | 'archived'
          publish_status: 'draft' | 'active' | 'archived'
          phase: 'start_phase' | 'post_phase' | 'winner' | 'loser' | 'archived'
          phase_start_date: string | null
          phase_end_date: string | null
          total_views: number
          total_sales: number
          total_revenue: number
          conversion_rate: number | null
          error_message: string | null
          retry_count: number
          last_retry_at: string | null
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          shop_id: string
          niche_id?: string | null
          shopify_product_id?: string | null
          shopify_handle?: string | null
          title?: string | null
          description?: string | null
          generated_image_url?: string | null
          generated_title?: string | null
          generated_description?: string | null
          prompt_used?: string | null
          price?: number | null
          compare_at_price?: number | null
          cost_per_item?: number | null
          status?: 'pending' | 'generating' | 'generated' | 'published' | 'failed' | 'archived'
          publish_status?: 'draft' | 'active' | 'archived'
          phase?: 'start_phase' | 'post_phase' | 'winner' | 'loser' | 'archived'
          phase_start_date?: string | null
          phase_end_date?: string | null
          total_views?: number
          total_sales?: number
          total_revenue?: number
          conversion_rate?: number | null
          error_message?: string | null
          retry_count?: number
          last_retry_at?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          shop_id?: string
          niche_id?: string | null
          shopify_product_id?: string | null
          shopify_handle?: string | null
          title?: string | null
          description?: string | null
          generated_image_url?: string | null
          generated_title?: string | null
          generated_description?: string | null
          prompt_used?: string | null
          price?: number | null
          compare_at_price?: number | null
          cost_per_item?: number | null
          status?: 'pending' | 'generating' | 'generated' | 'published' | 'failed' | 'archived'
          publish_status?: 'draft' | 'active' | 'archived'
          phase?: 'start_phase' | 'post_phase' | 'winner' | 'loser' | 'archived'
          phase_start_date?: string | null
          phase_end_date?: string | null
          total_views?: number
          total_sales?: number
          total_revenue?: number
          conversion_rate?: number | null
          error_message?: string | null
          retry_count?: number
          last_retry_at?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
      }

      // TMS EcomPilot Ad Platforms
      pod_autom_ad_platforms: {
        Row: {
          id: string
          user_id: string
          platform: 'pinterest' | 'meta' | 'google' | 'tiktok'
          platform_user_id: string | null
          platform_username: string | null
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          scopes: string[] | null
          ad_account_id: string | null
          ad_account_name: string | null
          ad_account_currency: string | null
          connection_status: 'connected' | 'disconnected' | 'error' | 'expired'
          last_sync_at: string | null
          connection_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: 'pinterest' | 'meta' | 'google' | 'tiktok'
          platform_user_id?: string | null
          platform_username?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string[] | null
          ad_account_id?: string | null
          ad_account_name?: string | null
          ad_account_currency?: string | null
          connection_status?: 'connected' | 'disconnected' | 'error' | 'expired'
          last_sync_at?: string | null
          connection_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: 'pinterest' | 'meta' | 'google' | 'tiktok'
          platform_user_id?: string | null
          platform_username?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          scopes?: string[] | null
          ad_account_id?: string | null
          ad_account_name?: string | null
          ad_account_currency?: string | null
          connection_status?: 'connected' | 'disconnected' | 'error' | 'expired'
          last_sync_at?: string | null
          connection_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // TMS EcomPilot Activity Log
      pod_autom_activity_log: {
        Row: {
          id: string
          user_id: string | null
          shop_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Record<string, unknown>
          ip_address: string | null
          user_agent: string | null
          status: 'success' | 'warning' | 'error'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          shop_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Record<string, unknown>
          ip_address?: string | null
          user_agent?: string | null
          status?: 'success' | 'warning' | 'error'
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          shop_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Record<string, unknown>
          ip_address?: string | null
          user_agent?: string | null
          status?: 'success' | 'warning' | 'error'
          error_message?: string | null
          created_at?: string
        }
      }

      // TMS EcomPilot Catalog
      pod_autom_catalog: {
        Row: {
          id: string
          product_type: string
          product_code: string | null
          display_name: string | null
          description: string | null
          image_url: string | null
          gallery_urls: string[]
          mockup_template_url: string | null
          sizes: string[]
          colors: { name: string; hex: string; available: boolean }[]
          materials: string | null
          print_areas: Record<string, unknown>
          weight_grams: number | null
          dimensions: Record<string, unknown> | null
          base_price: number
          shipping_prices: Record<string, number>
          bulk_pricing: Record<string, number>
          production_time_days: number
          supplier: string | null
          is_active: boolean
          is_featured: boolean
          stock_status: 'in_stock' | 'low_stock' | 'out_of_stock'
          category: string | null
          sort_order: number
          tags: string[]
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_type: string
          product_code?: string | null
          display_name?: string | null
          description?: string | null
          image_url?: string | null
          gallery_urls?: string[]
          mockup_template_url?: string | null
          sizes?: string[]
          colors?: { name: string; hex: string; available: boolean }[]
          materials?: string | null
          print_areas?: Record<string, unknown>
          weight_grams?: number | null
          dimensions?: Record<string, unknown> | null
          base_price: number
          shipping_prices?: Record<string, number>
          bulk_pricing?: Record<string, number>
          production_time_days?: number
          supplier?: string | null
          is_active?: boolean
          is_featured?: boolean
          stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock'
          category?: string | null
          sort_order?: number
          tags?: string[]
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_type?: string
          product_code?: string | null
          display_name?: string | null
          description?: string | null
          image_url?: string | null
          gallery_urls?: string[]
          mockup_template_url?: string | null
          sizes?: string[]
          colors?: { name: string; hex: string; available: boolean }[]
          materials?: string | null
          print_areas?: Record<string, unknown>
          weight_grams?: number | null
          dimensions?: Record<string, unknown> | null
          base_price?: number
          shipping_prices?: Record<string, number>
          bulk_pricing?: Record<string, number>
          production_time_days?: number
          supplier?: string | null
          is_active?: boolean
          is_featured?: boolean
          stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock'
          category?: string | null
          sort_order?: number
          tags?: string[]
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_tier: 'basis' | 'premium' | 'vip'
      subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
      connection_status: 'connected' | 'disconnected' | 'error' | 'pending'
      ad_platform_status: 'connected' | 'disconnected' | 'error' | 'expired'
      gpt_quality: 'LOW' | 'MEDIUM' | 'HIGH'
      prompt_type: 'image' | 'title' | 'description'
      product_status: 'pending' | 'generating' | 'generated' | 'published' | 'failed' | 'archived'
      publish_status: 'draft' | 'active' | 'archived'
      product_phase: 'start_phase' | 'post_phase' | 'winner' | 'loser' | 'archived'
      ad_platform: 'pinterest' | 'meta' | 'google' | 'tiktok'
      activity_status: 'success' | 'warning' | 'error'
      stock_status: 'in_stock' | 'low_stock' | 'out_of_stock'
    }
  }
}
