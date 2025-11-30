Tabelle campaign_batch_assignments:

create table public.campaign_batch_assignments (
  id uuid not null default gen_random_uuid (),
  campaign_id uuid not null,
  collection_id uuid not null,
  batch_indices integer[] null default '{}'::integer[],
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint campaign_batch_assignments_pkey primary key (id),
  constraint campaign_batch_assignments_campaign_id_collection_id_key unique (campaign_id, collection_id),
  constraint campaign_batch_assignments_campaign_id_fkey foreign KEY (campaign_id) references pinterest_campaigns (id) on delete CASCADE,
  constraint campaign_batch_assignments_collection_id_fkey foreign KEY (collection_id) references shopify_collections (id) on delete CASCADE
) TABLESPACE pg_default;


______________________

Tabelle: discord_settings

create table public.discord_settings (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  application_id text null,
  public_key text null,
  bot_token text null,
  server_channel text null,
  private_chat text null,
  group_chat text null,
  announcement_channel text null,
  log_channel text null,
  is_connected boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint discord_settings_pkey primary key (id),
  constraint discord_settings_shop_id_key unique (shop_id),
  constraint discord_settings_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_discord_settings_updated_at BEFORE
update on discord_settings for EACH row
execute FUNCTION update_updated_at_column ();


______________________

Tabelle: google_auth

create table public.google_auth (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  access_token text null,
  refresh_token text null,
  expires_at timestamp with time zone null,
  google_customer_id text null,
  is_connected boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint google_auth_pkey primary key (id),
  constraint google_auth_shop_id_key unique (shop_id),
  constraint google_auth_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_google_auth_updated_at BEFORE
update on google_auth for EACH row
execute FUNCTION update_updated_at_column ();

______________________

Tabelle: google_campaign_collections

create table public.google_campaign_collections (
  id uuid not null default gen_random_uuid (),
  campaign_id uuid not null,
  collection_id uuid not null,
  constraint google_campaign_collections_pkey primary key (id),
  constraint google_campaign_collections_campaign_id_collection_id_key unique (campaign_id, collection_id),
  constraint google_campaign_collections_campaign_id_fkey foreign KEY (campaign_id) references google_campaigns (id) on delete CASCADE,
  constraint google_campaign_collections_collection_id_fkey foreign KEY (collection_id) references shopify_collections (id) on delete CASCADE
) TABLESPACE pg_default;


______________________

Tabelle: google_campaigns

create table public.google_campaigns (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  google_campaign_id text not null,
  name text not null,
  campaign_type text null default 'PMAX'::text,
  status text null default 'ENABLED'::text,
  constraint google_campaigns_pkey primary key (id),
  constraint google_campaigns_shop_id_google_campaign_id_key unique (shop_id, google_campaign_id),
  constraint google_campaigns_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE,
  constraint google_campaigns_campaign_type_check check (
    (
      campaign_type = any (array['PMAX'::text, 'SEARCH'::text])
    )
  )
) TABLESPACE pg_default;


______________________

Tabelle: meta_ad_accounts

create table public.meta_ad_accounts (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  meta_account_id text not null,
  name text not null,
  currency text null default 'EUR'::text,
  is_selected boolean null default false,
  constraint meta_ad_accounts_pkey primary key (id),
  constraint meta_ad_accounts_shop_id_meta_account_id_key unique (shop_id, meta_account_id),
  constraint meta_ad_accounts_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

______________________

Tabelle: meta_auth

create table public.meta_auth (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  access_token text null,
  expires_at timestamp with time zone null,
  meta_user_id text null,
  meta_username text null,
  is_connected boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint meta_auth_pkey primary key (id),
  constraint meta_auth_shop_id_key unique (shop_id),
  constraint meta_auth_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_meta_auth_updated_at BEFORE
update on meta_auth for EACH row
execute FUNCTION update_updated_at_column ();

______________________

Tabelle: meta_campaign_collections

create table public.meta_campaign_collections (
  id uuid not null default gen_random_uuid (),
  campaign_id uuid not null,
  collection_id uuid not null,
  batch_indices integer[] null default '{}'::integer[],
  constraint meta_campaign_collections_pkey primary key (id),
  constraint meta_campaign_collections_campaign_id_collection_id_key unique (campaign_id, collection_id),
  constraint meta_campaign_collections_campaign_id_fkey foreign KEY (campaign_id) references meta_campaigns (id) on delete CASCADE,
  constraint meta_campaign_collections_collection_id_fkey foreign KEY (collection_id) references shopify_collections (id) on delete CASCADE
) TABLESPACE pg_default;

______________________

Tabelle: meta_campaigns

create table public.meta_campaigns (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  ad_account_id uuid null,
  meta_campaign_id text not null,
  name text not null,
  status text null default 'ACTIVE'::text,
  daily_budget numeric(10, 2) null,
  creative_strategy text null default 'single_image'::text,
  constraint meta_campaigns_pkey primary key (id),
  constraint meta_campaigns_shop_id_meta_campaign_id_key unique (shop_id, meta_campaign_id),
  constraint meta_campaigns_ad_account_id_fkey foreign KEY (ad_account_id) references meta_ad_accounts (id) on delete CASCADE,
  constraint meta_campaigns_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE,
  constraint meta_campaigns_creative_strategy_check check (
    (
      creative_strategy = any (array['single_image'::text, 'carousel'::text])
    )
  )
) TABLESPACE pg_default;

______________________

Tabelle: meta_settings

create table public.meta_settings (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  default_budget numeric(10, 2) null default 20.00,
  global_batch_size integer null default 50,
  constraint meta_settings_pkey primary key (id),
  constraint meta_settings_shop_id_key unique (shop_id),
  constraint meta_settings_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

______________________

Tabelle: pinterest_ad_accounts

create table public.pinterest_ad_accounts (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  pinterest_account_id text not null,
  name text not null,
  country text null default 'DE'::text,
  currency text null default 'EUR'::text,
  is_selected boolean null default false,
  synced_at timestamp with time zone null default now(),
  constraint pinterest_ad_accounts_pkey primary key (id),
  constraint pinterest_ad_accounts_shop_id_pinterest_account_id_key unique (shop_id, pinterest_account_id),
  constraint pinterest_ad_accounts_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

______________________

Tabelle: pinterest_auth

create table public.pinterest_auth (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  access_token text null,
  refresh_token text null,
  expires_at timestamp with time zone null,
  scopes text[] null,
  pinterest_user_id text null,
  pinterest_username text null,
  is_connected boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint pinterest_auth_pkey primary key (id),
  constraint pinterest_auth_shop_id_key unique (shop_id),
  constraint pinterest_auth_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_pinterest_auth_updated_at BEFORE
update on pinterest_auth for EACH row
execute FUNCTION update_updated_at_column ();

______________________

Tabelle: pinterest_campaigns

create table public.pinterest_campaigns (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  ad_account_id uuid null,
  pinterest_campaign_id text not null,
  name text not null,
  status text null default 'ACTIVE'::text,
  daily_budget numeric(10, 2) null,
  targeting jsonb null default '{"genders": ["female", "male"], "countries": ["DE"], "interests": [], "age_ranges": ["25-34", "35-44"]}'::jsonb,
  performance_plus boolean null default false,
  synced_at timestamp with time zone null default now(),
  constraint pinterest_campaigns_pkey primary key (id),
  constraint pinterest_campaigns_shop_id_pinterest_campaign_id_key unique (shop_id, pinterest_campaign_id),
  constraint pinterest_campaigns_ad_account_id_fkey foreign KEY (ad_account_id) references pinterest_ad_accounts (id) on delete CASCADE,
  constraint pinterest_campaigns_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE,
  constraint pinterest_campaigns_status_check check (
    (
      status = any (
        array['ACTIVE'::text, 'PAUSED'::text, 'ARCHIVED'::text]
      )
    )
  )
) TABLESPACE pg_default;

______________________

Tabelle: pinterest_settings

create table public.pinterest_settings (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  default_budget numeric(10, 2) null default 20.00,
  default_targeting jsonb null,
  auto_sync_enabled boolean null default false,
  url_prefix text null default ''::text,
  global_batch_size integer null default 50,
  constraint pinterest_settings_pkey primary key (id),
  constraint pinterest_settings_shop_id_key unique (shop_id),
  constraint pinterest_settings_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

______________________

Tabelle: pod_chatgpt_prompts

create table public.pod_chatgpt_prompts (
  id uuid not null default gen_random_uuid (),
  pod_settings_id uuid not null,
  title text not null,
  content text not null,
  is_expanded boolean null default false,
  sort_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint pod_chatgpt_prompts_pkey primary key (id),
  constraint pod_chatgpt_prompts_pod_settings_id_fkey foreign KEY (pod_settings_id) references pod_settings (id) on delete CASCADE
) TABLESPACE pg_default;

______________________

Tabelle: pod_selected_niches

create table public.pod_selected_niches (
  id uuid not null default gen_random_uuid (),
  pod_settings_id uuid not null,
  main_category text not null,
  sub_category text not null,
  sort_order integer null default 0,
  created_at timestamp with time zone null default now(),
  constraint pod_selected_niches_pkey primary key (id),
  constraint pod_selected_niches_pod_settings_id_fkey foreign KEY (pod_settings_id) references pod_settings (id) on delete CASCADE
) TABLESPACE pg_default;

______________________

Tabelle: pod_settings

create table public.pod_settings (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  enabled boolean null default false,
  gpt_image_quality text null default 'MEDIUM'::text,
  creation_limit integer null default 10,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint pod_settings_pkey primary key (id),
  constraint pod_settings_shop_id_key unique (shop_id),
  constraint pod_settings_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE,
  constraint pod_settings_gpt_image_quality_check check (
    (
      gpt_image_quality = any (array['LOW'::text, 'MEDIUM'::text, 'HIGH'::text])
    )
  )
) TABLESPACE pg_default;

create trigger update_pod_settings_updated_at BEFORE
update on pod_settings for EACH row
execute FUNCTION update_updated_at_column ();

______________________

Tabelle: product_analytics

create table public.product_analytics (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  shopify_product_id text not null,
  product_title text null,
  status text null default 'created'::text,
  source text null default 'fast_fashion'::text,
  created_at timestamp with time zone null default now(),
  entered_start_phase_at timestamp with time zone null,
  entered_post_phase_at timestamp with time zone null,
  final_status_at timestamp with time zone null,
  total_sales integer null default 0,
  day7_sales integer null default 0,
  avg3_passed boolean null,
  avg7_passed boolean null,
  avg10_passed boolean null,
  avg14_passed boolean null,
  constraint product_analytics_pkey primary key (id),
  constraint product_analytics_shop_id_shopify_product_id_key unique (shop_id, shopify_product_id),
  constraint product_analytics_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE,
  constraint product_analytics_source_check check (
    (
      source = any (array['fast_fashion'::text, 'pod'::text])
    )
  ),
  constraint product_analytics_status_check check (
    (
      status = any (
        array[
          'created'::text,
          'start_phase'::text,
          'post_phase'::text,
          'winner'::text,
          'loser'::text,
          'deleted'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_product_analytics_shop_status on public.product_analytics using btree (shop_id, status) TABLESPACE pg_default;

______________________

Tabelle: product_creation_settings

create table public.product_creation_settings (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  generate_optimized_title boolean null default false,
  generate_improved_description boolean null default false,
  generate_and_set_tags boolean null default false,
  sales_text_season text null default 'Spring'::text,
  change_size_to_groesse boolean null default false,
  set_german_sizes boolean null default false,
  set_compare_price boolean null default false,
  compare_price_percentage numeric(5, 2) null default 20.00,
  set_price_decimals boolean null default false,
  price_decimals integer null default 99,
  set_compare_price_decimals boolean null default false,
  compare_price_decimals integer null default 90,
  adjust_normal_price boolean null default false,
  price_adjustment_type text null default 'Percentage'::text,
  price_adjustment_value numeric(10, 2) null default 0,
  set_global_quantity boolean null default false,
  global_quantity integer null default 1000,
  enable_inventory_tracking boolean null default true,
  publish_all_channels boolean null default true,
  set_global_tags boolean null default false,
  global_tags text null default ''::text,
  change_product_status boolean null default false,
  product_status text null default 'active'::text,
  set_category_tag_fashion boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint product_creation_settings_pkey primary key (id),
  constraint product_creation_settings_shop_id_key unique (shop_id),
  constraint product_creation_settings_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE,
  constraint product_creation_settings_price_adjustment_type_check check (
    (
      price_adjustment_type = any (array['Percentage'::text, 'FixedAmount'::text])
    )
  ),
  constraint product_creation_settings_product_status_check check (
    (
      product_status = any (
        array['active'::text, 'draft'::text, 'archived'::text]
      )
    )
  ),
  constraint product_creation_settings_sales_text_season_check check (
    (
      sales_text_season = any (
        array[
          'Spring'::text,
          'Summer'::text,
          'Autumn'::text,
          'Winter'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create trigger update_product_creation_settings_updated_at BEFORE
update on product_creation_settings for EACH row
execute FUNCTION update_updated_at_column ();

______________________

Tabelle: rate_limits

create table public.rate_limits (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  fast_fashion_limit integer null default 50,
  pod_creation_limit integer null default 20,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint rate_limits_pkey primary key (id),
  constraint rate_limits_shop_id_key unique (shop_id),
  constraint rate_limits_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_rate_limits_updated_at BEFORE
update on rate_limits for EACH row
execute FUNCTION update_updated_at_column ();

______________________

Tabelle: shop_analytics_summary

create table public.shop_analytics_summary (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  date date not null,
  products_created integer null default 0,
  products_in_start_phase integer null default 0,
  products_in_post_phase integer null default 0,
  products_won integer null default 0,
  products_lost integer null default 0,
  products_deleted integer null default 0,
  fast_fashion_created integer null default 0,
  pod_created integer null default 0,
  estimated_ad_spend_saved numeric(10, 2) null default 0,
  estimated_time_saved_hours numeric(5, 2) null default 0,
  constraint shop_analytics_summary_pkey primary key (id),
  constraint shop_analytics_summary_shop_id_date_key unique (shop_id, date),
  constraint shop_analytics_summary_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_shop_analytics_shop_date on public.shop_analytics_summary using btree (shop_id, date desc) TABLESPACE pg_default;

______________________

Tabelle: shop_rules

create table public.shop_rules (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  min_sales_day7_delete integer null default 0,
  min_sales_day7_replace integer null default 1,
  avg3_ok integer null default 2,
  avg7_ok integer null default 3,
  avg10_ok integer null default 5,
  avg14_ok integer null default 7,
  min_ok_buckets integer null default 2,
  start_phase_days integer null default 7,
  nach_phase_days integer null default 14,
  qk_tag text null default 'QK'::text,
  replace_tag_prefix text null default 'REPLACE_'::text,
  test_mode boolean null default false,
  url_prefix text null default ''::text,
  sheet_id text null,
  openai_api_key text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint shop_rules_pkey primary key (id),
  constraint shop_rules_shop_id_key unique (shop_id),
  constraint shop_rules_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_shop_rules_updated_at BEFORE
update on shop_rules for EACH row
execute FUNCTION update_updated_at_column ();

______________________

Tabelle: shopify_collections

create table public.shopify_collections (
  id uuid not null default gen_random_uuid (),
  shop_id uuid not null,
  shopify_id text not null,
  title text not null,
  collection_type text not null,
  product_count integer null default 0,
  is_selected boolean null default false,
  synced_at timestamp with time zone null default now(),
  constraint shopify_collections_pkey primary key (id),
  constraint shopify_collections_shop_id_shopify_id_key unique (shop_id, shopify_id),
  constraint shopify_collections_shop_id_fkey foreign KEY (shop_id) references shops (id) on delete CASCADE,
  constraint shopify_collections_collection_type_check check (
    (
      collection_type = any (array['custom'::text, 'smart'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_collections_shop on public.shopify_collections using btree (shop_id) TABLESPACE pg_default;

______________________

Tabelle: shops

create table public.shops (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  internal_name text not null,
  shop_domain text not null,
  access_token text null,
  is_active boolean null default true,
  connection_status text null default 'disconnected'::text,
  last_sync_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint shops_pkey primary key (id),
  constraint shops_user_id_shop_domain_key unique (user_id, shop_domain),
  constraint shops_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint shops_connection_status_check check (
    (
      connection_status = any (
        array[
          'connected'::text,
          'disconnected'::text,
          'syncing'::text,
          'error'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_shops_user_id on public.shops using btree (user_id) TABLESPACE pg_default;

create trigger on_shop_created
after INSERT on shops for EACH row
execute FUNCTION handle_new_shop ();

create trigger update_shops_updated_at BEFORE
update on shops for EACH row
execute FUNCTION update_updated_at_column ();

______________________

Tabelle: user_profiles

create table public.user_profiles (
  id uuid not null,
  email text not null,
  full_name text null,
  avatar_url text null,
  subscription_tier text null default 'free'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_profiles_pkey primary key (id),
  constraint user_profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint user_profiles_subscription_tier_check check (
    (
      subscription_tier = any (
        array['free'::text, 'pro'::text, 'enterprise'::text]
      )
    )
  )
) TABLESPACE pg_default;

create trigger update_user_profiles_updated_at BEFORE
update on user_profiles for EACH row
execute FUNCTION update_updated_at_column ();

______________________

Tabelle: job_runs

create table public.job_runs (
  id uuid not null default gen_random_uuid (),
  job_type text not null,
  status text not null default 'running'::text,
  started_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone null,
  shops_processed integer null default 0,
  shops_failed integer null default 0,
  error_log jsonb null default '[]'::jsonb,
  metadata jsonb null default '{}'::jsonb,
  constraint job_runs_pkey primary key (id),
  constraint job_runs_job_type_check check (
    (
      job_type = any (
        array[
          'sales_tracker'::text,
          'replace_job'::text,
          'product_optimize_job'::text,
          'product_creation_job'::text,
          'pinterest_sync_job'::text
        ]
      )
    )
  ),
  constraint job_runs_status_check check (
    (
      status = any (
        array[
          'running'::text,
          'completed'::text,
          'failed'::text,
          'partial'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_job_runs_job_type_started on public.job_runs using btree (job_type, started_at desc) TABLESPACE pg_default;

______________________

Tabelle: 

______________________

Tabelle: 