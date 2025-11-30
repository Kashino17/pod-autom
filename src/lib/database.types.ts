// Auto-generated types for Supabase
// Run: npm run db:types to regenerate from your Supabase project

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'pro' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
      }
      shops: {
        Row: {
          id: string
          user_id: string
          internal_name: string
          shop_domain: string
          access_token: string | null
          is_active: boolean
          connection_status: 'connected' | 'disconnected' | 'syncing' | 'error'
          last_sync_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          internal_name: string
          shop_domain: string
          access_token?: string | null
          is_active?: boolean
          connection_status?: 'connected' | 'disconnected' | 'syncing' | 'error'
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          internal_name?: string
          shop_domain?: string
          access_token?: string | null
          is_active?: boolean
          connection_status?: 'connected' | 'disconnected' | 'syncing' | 'error'
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shop_rules: {
        Row: {
          id: string
          shop_id: string
          min_sales_day7_delete: number
          min_sales_day7_replace: number
          avg3_ok: number
          avg7_ok: number
          avg10_ok: number
          avg14_ok: number
          min_ok_buckets: number
          start_phase_days: number
          nach_phase_days: number
          qk_tag: string
          replace_tag_prefix: string
          test_mode: boolean
          url_prefix: string
          sheet_id: string | null
          openai_api_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          min_sales_day7_delete?: number
          min_sales_day7_replace?: number
          avg3_ok?: number
          avg7_ok?: number
          avg10_ok?: number
          avg14_ok?: number
          min_ok_buckets?: number
          start_phase_days?: number
          nach_phase_days?: number
          qk_tag?: string
          replace_tag_prefix?: string
          test_mode?: boolean
          url_prefix?: string
          sheet_id?: string | null
          openai_api_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          min_sales_day7_delete?: number
          min_sales_day7_replace?: number
          avg3_ok?: number
          avg7_ok?: number
          avg10_ok?: number
          avg14_ok?: number
          min_ok_buckets?: number
          start_phase_days?: number
          nach_phase_days?: number
          qk_tag?: string
          replace_tag_prefix?: string
          test_mode?: boolean
          url_prefix?: string
          sheet_id?: string | null
          openai_api_key?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      discord_settings: {
        Row: {
          id: string
          shop_id: string
          application_id: string | null
          public_key: string | null
          bot_token: string | null
          server_channel: string | null
          private_chat: string | null
          group_chat: string | null
          announcement_channel: string | null
          log_channel: string | null
          is_connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          application_id?: string | null
          public_key?: string | null
          bot_token?: string | null
          server_channel?: string | null
          private_chat?: string | null
          group_chat?: string | null
          announcement_channel?: string | null
          log_channel?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          application_id?: string | null
          public_key?: string | null
          bot_token?: string | null
          server_channel?: string | null
          private_chat?: string | null
          group_chat?: string | null
          announcement_channel?: string | null
          log_channel?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      shopify_collections: {
        Row: {
          id: string
          shop_id: string
          shopify_id: string
          title: string
          collection_type: 'custom' | 'smart'
          product_count: number
          is_selected: boolean
          synced_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          shopify_id: string
          title: string
          collection_type: 'custom' | 'smart'
          product_count?: number
          is_selected?: boolean
          synced_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          shopify_id?: string
          title?: string
          collection_type?: 'custom' | 'smart'
          product_count?: number
          is_selected?: boolean
          synced_at?: string
        }
      }
      product_creation_settings: {
        Row: {
          id: string
          shop_id: string
          generate_optimized_title: boolean
          generate_improved_description: boolean
          generate_and_set_tags: boolean
          sales_text_season: 'Spring' | 'Summer' | 'Autumn' | 'Winter'
          change_size_to_groesse: boolean
          set_german_sizes: boolean
          set_compare_price: boolean
          compare_price_percentage: number
          set_price_decimals: boolean
          price_decimals: number
          set_compare_price_decimals: boolean
          compare_price_decimals: number
          adjust_normal_price: boolean
          price_adjustment_type: 'Percentage' | 'FixedAmount'
          price_adjustment_value: number
          set_global_quantity: boolean
          global_quantity: number
          enable_inventory_tracking: boolean
          publish_all_channels: boolean
          set_global_tags: boolean
          global_tags: string
          change_product_status: boolean
          product_status: 'active' | 'draft' | 'archived'
          set_category_tag_fashion: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          generate_optimized_title?: boolean
          generate_improved_description?: boolean
          generate_and_set_tags?: boolean
          sales_text_season?: 'Spring' | 'Summer' | 'Autumn' | 'Winter'
          change_size_to_groesse?: boolean
          set_german_sizes?: boolean
          set_compare_price?: boolean
          compare_price_percentage?: number
          set_price_decimals?: boolean
          price_decimals?: number
          set_compare_price_decimals?: boolean
          compare_price_decimals?: number
          adjust_normal_price?: boolean
          price_adjustment_type?: 'Percentage' | 'FixedAmount'
          price_adjustment_value?: number
          set_global_quantity?: boolean
          global_quantity?: number
          enable_inventory_tracking?: boolean
          publish_all_channels?: boolean
          set_global_tags?: boolean
          global_tags?: string
          change_product_status?: boolean
          product_status?: 'active' | 'draft' | 'archived'
          set_category_tag_fashion?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          generate_optimized_title?: boolean
          generate_improved_description?: boolean
          generate_and_set_tags?: boolean
          sales_text_season?: 'Spring' | 'Summer' | 'Autumn' | 'Winter'
          change_size_to_groesse?: boolean
          set_german_sizes?: boolean
          set_compare_price?: boolean
          compare_price_percentage?: number
          set_price_decimals?: boolean
          price_decimals?: number
          set_compare_price_decimals?: boolean
          compare_price_decimals?: number
          adjust_normal_price?: boolean
          price_adjustment_type?: 'Percentage' | 'FixedAmount'
          price_adjustment_value?: number
          set_global_quantity?: boolean
          global_quantity?: number
          enable_inventory_tracking?: boolean
          publish_all_channels?: boolean
          set_global_tags?: boolean
          global_tags?: string
          change_product_status?: boolean
          product_status?: 'active' | 'draft' | 'archived'
          set_category_tag_fashion?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      pod_settings: {
        Row: {
          id: string
          shop_id: string
          enabled: boolean
          gpt_image_quality: 'LOW' | 'MEDIUM' | 'HIGH'
          creation_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          enabled?: boolean
          gpt_image_quality?: 'LOW' | 'MEDIUM' | 'HIGH'
          creation_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          enabled?: boolean
          gpt_image_quality?: 'LOW' | 'MEDIUM' | 'HIGH'
          creation_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      pod_selected_niches: {
        Row: {
          id: string
          pod_settings_id: string
          main_category: string
          sub_category: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          pod_settings_id: string
          main_category: string
          sub_category: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          pod_settings_id?: string
          main_category?: string
          sub_category?: string
          sort_order?: number
          created_at?: string
        }
      }
      pod_chatgpt_prompts: {
        Row: {
          id: string
          pod_settings_id: string
          title: string
          content: string
          is_expanded: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pod_settings_id: string
          title: string
          content: string
          is_expanded?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pod_settings_id?: string
          title?: string
          content?: string
          is_expanded?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      rate_limits: {
        Row: {
          id: string
          shop_id: string
          fast_fashion_limit: number
          pod_creation_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          fast_fashion_limit?: number
          pod_creation_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          fast_fashion_limit?: number
          pod_creation_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      pinterest_auth: {
        Row: {
          id: string
          shop_id: string
          access_token: string | null
          refresh_token: string | null
          expires_at: string | null
          scopes: string[] | null
          pinterest_user_id: string | null
          pinterest_username: string | null
          is_connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          scopes?: string[] | null
          pinterest_user_id?: string | null
          pinterest_username?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          scopes?: string[] | null
          pinterest_user_id?: string | null
          pinterest_username?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      pinterest_ad_accounts: {
        Row: {
          id: string
          shop_id: string
          pinterest_account_id: string
          name: string
          country: string
          currency: string
          is_selected: boolean
          synced_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          pinterest_account_id: string
          name: string
          country?: string
          currency?: string
          is_selected?: boolean
          synced_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          pinterest_account_id?: string
          name?: string
          country?: string
          currency?: string
          is_selected?: boolean
          synced_at?: string
        }
      }
      pinterest_campaigns: {
        Row: {
          id: string
          shop_id: string
          ad_account_id: string | null
          pinterest_campaign_id: string
          name: string
          status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
          daily_budget: number | null
          targeting: Json
          performance_plus: boolean
          synced_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          ad_account_id?: string | null
          pinterest_campaign_id: string
          name: string
          status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
          daily_budget?: number | null
          targeting?: Json
          performance_plus?: boolean
          synced_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          ad_account_id?: string | null
          pinterest_campaign_id?: string
          name?: string
          status?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
          daily_budget?: number | null
          targeting?: Json
          performance_plus?: boolean
          synced_at?: string
        }
      }
      campaign_batch_assignments: {
        Row: {
          id: string
          campaign_id: string
          collection_id: string
          batch_indices: number[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          collection_id: string
          batch_indices?: number[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          collection_id?: string
          batch_indices?: number[]
          created_at?: string
          updated_at?: string
        }
      }
      pinterest_settings: {
        Row: {
          id: string
          shop_id: string
          default_budget: number
          default_targeting: Json | null
          auto_sync_enabled: boolean
          url_prefix: string
          global_batch_size: number
        }
        Insert: {
          id?: string
          shop_id: string
          default_budget?: number
          default_targeting?: Json | null
          auto_sync_enabled?: boolean
          url_prefix?: string
          global_batch_size?: number
        }
        Update: {
          id?: string
          shop_id?: string
          default_budget?: number
          default_targeting?: Json | null
          auto_sync_enabled?: boolean
          url_prefix?: string
          global_batch_size?: number
        }
      }
      meta_auth: {
        Row: {
          id: string
          shop_id: string
          access_token: string | null
          expires_at: string | null
          meta_user_id: string | null
          meta_username: string | null
          is_connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          access_token?: string | null
          expires_at?: string | null
          meta_user_id?: string | null
          meta_username?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          access_token?: string | null
          expires_at?: string | null
          meta_user_id?: string | null
          meta_username?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      meta_ad_accounts: {
        Row: {
          id: string
          shop_id: string
          meta_account_id: string
          name: string
          currency: string
          is_selected: boolean
        }
        Insert: {
          id?: string
          shop_id: string
          meta_account_id: string
          name: string
          currency?: string
          is_selected?: boolean
        }
        Update: {
          id?: string
          shop_id?: string
          meta_account_id?: string
          name?: string
          currency?: string
          is_selected?: boolean
        }
      }
      meta_campaigns: {
        Row: {
          id: string
          shop_id: string
          ad_account_id: string | null
          meta_campaign_id: string
          name: string
          status: string
          daily_budget: number | null
          creative_strategy: 'single_image' | 'carousel'
        }
        Insert: {
          id?: string
          shop_id: string
          ad_account_id?: string | null
          meta_campaign_id: string
          name: string
          status?: string
          daily_budget?: number | null
          creative_strategy?: 'single_image' | 'carousel'
        }
        Update: {
          id?: string
          shop_id?: string
          ad_account_id?: string | null
          meta_campaign_id?: string
          name?: string
          status?: string
          daily_budget?: number | null
          creative_strategy?: 'single_image' | 'carousel'
        }
      }
      meta_campaign_collections: {
        Row: {
          id: string
          campaign_id: string
          collection_id: string
          batch_indices: number[]
        }
        Insert: {
          id?: string
          campaign_id: string
          collection_id: string
          batch_indices?: number[]
        }
        Update: {
          id?: string
          campaign_id?: string
          collection_id?: string
          batch_indices?: number[]
        }
      }
      meta_settings: {
        Row: {
          id: string
          shop_id: string
          default_budget: number
          global_batch_size: number
        }
        Insert: {
          id?: string
          shop_id: string
          default_budget?: number
          global_batch_size?: number
        }
        Update: {
          id?: string
          shop_id?: string
          default_budget?: number
          global_batch_size?: number
        }
      }
      google_auth: {
        Row: {
          id: string
          shop_id: string
          access_token: string | null
          refresh_token: string | null
          expires_at: string | null
          google_customer_id: string | null
          is_connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          google_customer_id?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          google_customer_id?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      google_campaigns: {
        Row: {
          id: string
          shop_id: string
          google_campaign_id: string
          name: string
          campaign_type: 'PMAX' | 'SEARCH'
          status: string
        }
        Insert: {
          id?: string
          shop_id: string
          google_campaign_id: string
          name: string
          campaign_type?: 'PMAX' | 'SEARCH'
          status?: string
        }
        Update: {
          id?: string
          shop_id?: string
          google_campaign_id?: string
          name?: string
          campaign_type?: 'PMAX' | 'SEARCH'
          status?: string
        }
      }
      google_campaign_collections: {
        Row: {
          id: string
          campaign_id: string
          collection_id: string
        }
        Insert: {
          id?: string
          campaign_id: string
          collection_id: string
        }
        Update: {
          id?: string
          campaign_id?: string
          collection_id?: string
        }
      }
      product_analytics: {
        Row: {
          id: string
          shop_id: string
          shopify_product_id: string
          product_title: string | null
          status: 'created' | 'start_phase' | 'post_phase' | 'winner' | 'loser' | 'deleted'
          source: 'fast_fashion' | 'pod'
          created_at: string
          entered_start_phase_at: string | null
          entered_post_phase_at: string | null
          final_status_at: string | null
          total_sales: number
          day7_sales: number
          avg3_passed: boolean | null
          avg7_passed: boolean | null
          avg10_passed: boolean | null
          avg14_passed: boolean | null
        }
        Insert: {
          id?: string
          shop_id: string
          shopify_product_id: string
          product_title?: string | null
          status?: 'created' | 'start_phase' | 'post_phase' | 'winner' | 'loser' | 'deleted'
          source?: 'fast_fashion' | 'pod'
          created_at?: string
          entered_start_phase_at?: string | null
          entered_post_phase_at?: string | null
          final_status_at?: string | null
          total_sales?: number
          day7_sales?: number
          avg3_passed?: boolean | null
          avg7_passed?: boolean | null
          avg10_passed?: boolean | null
          avg14_passed?: boolean | null
        }
        Update: {
          id?: string
          shop_id?: string
          shopify_product_id?: string
          product_title?: string | null
          status?: 'created' | 'start_phase' | 'post_phase' | 'winner' | 'loser' | 'deleted'
          source?: 'fast_fashion' | 'pod'
          created_at?: string
          entered_start_phase_at?: string | null
          entered_post_phase_at?: string | null
          final_status_at?: string | null
          total_sales?: number
          day7_sales?: number
          avg3_passed?: boolean | null
          avg7_passed?: boolean | null
          avg10_passed?: boolean | null
          avg14_passed?: boolean | null
        }
      }
      shop_analytics_summary: {
        Row: {
          id: string
          shop_id: string
          date: string
          products_created: number
          products_in_start_phase: number
          products_in_post_phase: number
          products_won: number
          products_lost: number
          products_deleted: number
          fast_fashion_created: number
          pod_created: number
          estimated_ad_spend_saved: number
          estimated_time_saved_hours: number
        }
        Insert: {
          id?: string
          shop_id: string
          date: string
          products_created?: number
          products_in_start_phase?: number
          products_in_post_phase?: number
          products_won?: number
          products_lost?: number
          products_deleted?: number
          fast_fashion_created?: number
          pod_created?: number
          estimated_ad_spend_saved?: number
          estimated_time_saved_hours?: number
        }
        Update: {
          id?: string
          shop_id?: string
          date?: string
          products_created?: number
          products_in_start_phase?: number
          products_in_post_phase?: number
          products_won?: number
          products_lost?: number
          products_deleted?: number
          fast_fashion_created?: number
          pod_created?: number
          estimated_ad_spend_saved?: number
          estimated_time_saved_hours?: number
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
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type Shop = Tables<'shops'>
export type ShopInsert = InsertTables<'shops'>
export type ShopUpdate = UpdateTables<'shops'>

export type ShopRules = Tables<'shop_rules'>
export type ShopRulesUpdate = UpdateTables<'shop_rules'>

export type UserProfile = Tables<'user_profiles'>

export type ShopifyCollection = Tables<'shopify_collections'>

export type ProductCreationSettings = Tables<'product_creation_settings'>
export type ProductCreationSettingsUpdate = UpdateTables<'product_creation_settings'>

export type PodSettings = Tables<'pod_settings'>
export type PodNiche = Tables<'pod_selected_niches'>
export type PodPrompt = Tables<'pod_chatgpt_prompts'>

export type RateLimits = Tables<'rate_limits'>

export type PinterestAuth = Tables<'pinterest_auth'>
export type PinterestAdAccount = Tables<'pinterest_ad_accounts'>
export type PinterestCampaign = Tables<'pinterest_campaigns'>
export type PinterestSettings = Tables<'pinterest_settings'>
export type CampaignBatchAssignment = Tables<'campaign_batch_assignments'>

export type MetaAuth = Tables<'meta_auth'>
export type MetaAdAccount = Tables<'meta_ad_accounts'>
export type MetaCampaign = Tables<'meta_campaigns'>

export type GoogleAuth = Tables<'google_auth'>
export type GoogleCampaign = Tables<'google_campaigns'>

export type ProductAnalytics = Tables<'product_analytics'>
export type ShopAnalyticsSummary = Tables<'shop_analytics_summary'>
