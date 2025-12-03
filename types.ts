

export interface Shop {
  id: string;
  name: string;
  domain: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync: string;
  stats: {
    processed: number;
    pending: number;
    actions: number;
  };
}

export type TabId = 'dashboard' | 'automation-roi' | 'pod-intelligence' | 'marketing-analytics' | 'start-phase' | 'post-phase' | 'general' | 'pinterest' | 'campaign-optimization' | 'meta-ads' | 'google-ads' | 'product-creation' | 'limits';

export interface StartPhaseConfig {
  deleteThreshold: number;   // <= X: Products below this get replaced
  keepThreshold: number;     // >= X: Move to Post Phase
  winnerThreshold: number;   // >= X: Tag WP
  isActive: boolean;
}

export interface PostPhaseConfig {
  isActive: boolean;
  minBuckets: number; // How many timeframes must be successful
  averageSettings: {
    day3: number;
    day7: number;
    day10: number;
    day14: number;
  };
}

export interface GeneralConfig {
  qkTag: string;
  replaceTagPrefix: string;
  urlPrefix: string;
  startPhaseDays: number;
  postPhaseDays: number;
  productsPerPage: number; // Products per page in collection (for Pinterest URL calculation)
  loserThreshold: number;  // Total sales <= X: LOSER (Stock 0), else REPLACED
}

export interface LimitsConfig {
  productCreationLimit: number; // Fast Fashion Limit
  podCreationLimit: number;     // POD Limit
}

export interface PodNiche {
  id: string;
  category: string;
  subCategory: string;
}

export interface PodPrompt {
  id: string;
  title: string;
  content: string;
  isEditing?: boolean;
}

export interface PodCreationConfig {
  isActive: boolean;
  niches: PodNiche[];
  prompts: PodPrompt[];
  imageQuality: 'HIGH' | 'STANDARD' | 'LOW';
}

export interface ProductCreationConfig {
  // Fast Fashion Settings
  salesTextTemplate: string;
  
  // Grundlegende Optimierungen
  generateOptimizedTitle: boolean;
  generateOptimizedDescription: boolean;
  generateTags: boolean;

  // Variantenoptimierungen
  translateSize: boolean;
  setGermanSizes: boolean;

  // Preisoptimierungen
  setCompareAtPrice: boolean;
  compareAtPricePercent: number;
  
  setPriceDecimals: boolean;
  priceDecimalsValue: number;
  
  setCompareAtPriceDecimals: boolean;
  compareAtPriceDecimalsValue: number;

  adjustProductPrice: boolean;
  priceAdjustmentType: 'PERCENT' | 'FIXED';
  priceAdjustmentValue: number;
  isPriceReduction: boolean;

  // Bestandsoptimierungen
  setGlobalInventory: boolean;
  globalInventoryValue: number;
  enableInventoryTracking: boolean;
  publishChannels: boolean;

  // Zusätzliche Optionen
  setGlobalTags: boolean;
  globalTagsValue: string;
  
  changeProductStatus: boolean;
  productStatusValue: 'active' | 'draft' | 'archived';
  
  setCategoryTagFashion: boolean;

  // POD Settings
  podSettings: PodCreationConfig;
}

export type TargetLocation = 'DE' | 'AT' | 'CH' | 'NL' | 'ES' | 'FR';
export type AgeGroup = 'ALL' | '18+' | '19+' | '20+' | '21+';
export type OptimizationGoal = 'ROAS' | 'CONVERSIONS';
export type ConversionEvent = 'CHECKOUT' | 'ATC';

export interface PinterestSyncLink {
  id: string;
  campaignName: string;
  collectionName: string;
  batchNumber: number;
  status: 'active' | 'paused' | 'error';
  itemsCount: number;
}

export interface PinterestConfig {
  isConnected: boolean;
  selectedAdAccountId: string | null;
  globalBatchSize: number;
  activeLinks: PinterestSyncLink[]; // New field for storing active links
  defaultCampaignSettings: {
    dailyBudget: number;
    targetLocations: TargetLocation[];
    ageGroup: AgeGroup;
    optimization: OptimizationGoal;
    conversionEvent: ConversionEvent;
  };
}

export interface MetaSyncLink {
  id: string;
  campaignName: string;
  collectionName: string;
  batchNumber: number;
  status: 'active' | 'paused' | 'error';
  itemsCount: number;
  creatives: ('Single Image' | 'Carousel')[];
}

export interface MetaAdsConfig {
  isConnected: boolean;
  selectedAdAccountId: string | null;
  globalBatchSize: number;
  activeLinks: MetaSyncLink[];
  defaultCampaignSettings: {
    dailyBudget: number;
    targetLocations: TargetLocation[];
    ageGroup: AgeGroup;
    optimization: OptimizationGoal;
    conversionEvent: ConversionEvent;
  };
}

export interface GoogleSyncLink {
  id: string;
  campaignName: string;
  collectionName: string;
  status: 'active' | 'paused' | 'error';
}

export interface GoogleAdsConfig {
  isConnected: boolean;
  selectedAdAccountId: string | null;
  activeLinks: GoogleSyncLink[];
}

// Mock Types for UI
export interface AdAccount {
  id: string;
  name: string;
  currency: string;
}

export interface PinterestCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PENDING' | 'PAUSED';
  budget?: number;
}

// Campaign Optimization Types
export type OptimizationMetric = 'spend' | 'checkouts' | 'roas';
export type OptimizationOperator = '>=' | '<=' | '>' | '<' | '==';
export type OptimizationLogic = 'AND' | 'OR';
export type OptimizationActionType = 'scale_up' | 'scale_down' | 'pause';
export type OptimizationActionUnit = 'amount' | 'percent';

export interface OptimizationCondition {
  metric: OptimizationMetric;
  operator: OptimizationOperator;
  value: number;
  time_range_days: number;
  logic?: OptimizationLogic;
}

export interface OptimizationRule {
  id: string;
  shop_id: string;
  name: string;
  is_enabled: boolean;
  priority: number;
  conditions: OptimizationCondition[];
  action_type: OptimizationActionType;
  action_value: number | null;
  action_unit: OptimizationActionUnit | null;
  min_budget: number;
  max_budget: number;
  created_at?: string;
  updated_at?: string;
}

export interface OptimizationSettings {
  id?: string;
  shop_id: string;
  is_enabled: boolean;
  test_mode_enabled: boolean;
  test_campaign_id: string | null;
  test_metrics: {
    spend: number;
    checkouts: number;
    roas: number;
  } | null;
}

export interface OptimizationLogEntry {
  id: string;
  shop_id: string;
  campaign_id: string;
  rule_id: string;
  old_budget: number;
  new_budget: number;
  old_status?: string;
  new_status?: string;
  action_taken: 'scaled_up' | 'scaled_down' | 'paused' | 'skipped' | 'failed';
  metrics_snapshot: {
    spend: number;
    checkouts: number;
    roas: number;
  };
  is_test_run: boolean;
  test_metrics?: {
    spend: number;
    checkouts: number;
    roas: number;
  };
  error_message?: string;
  executed_at: string;
}