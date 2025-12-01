

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

export type TabId = 'dashboard' | 'automation-roi' | 'pod-intelligence' | 'marketing-analytics' | 'start-phase' | 'post-phase' | 'general' | 'pinterest' | 'meta-ads' | 'google-ads' | 'product-creation' | 'limits';

export interface StartPhaseConfig {
  deleteThreshold: number;   // <= X: Loser (Stock 0, Tag LOSER) -> Now called Replace Rule
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