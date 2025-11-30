

import React, { useState, useEffect } from 'react';
import { Shop, StartPhaseConfig, PostPhaseConfig, GeneralConfig, PinterestConfig, MetaAdsConfig, GoogleAdsConfig, LimitsConfig, ProductCreationConfig, TabId } from '../types';
import { RefreshCw, Settings, ChevronRight } from 'lucide-react';
import { StartPhase } from './tabs/StartPhase';
import { PostPhase } from './tabs/PostPhase';
import { GeneralSettings } from './tabs/GeneralSettings';
import { PinterestSync } from './tabs/PinterestSync';
import { MetaAdsSync } from './tabs/MetaAdsSync';
import { GoogleAdsManager } from './tabs/GoogleAdsManager';
import { RateLimits } from './tabs/RateLimits';
import { ProductCreation } from './tabs/ProductCreation';
import { ThresholdCalculator } from './ui/ThresholdCalculator';
import { AnalyticsDashboard } from './tabs/AnalyticsDashboard';
import { AutomationRoi } from './tabs/AutomationRoi';
import { PodIntelligence } from './tabs/PodIntelligence';
import { MarketingAnalytics } from './tabs/MarketingAnalytics';

interface ShopDashboardProps {
  shop: Shop;
  activeTab: TabId;
}

export const ShopDashboard: React.FC<ShopDashboardProps> = ({ shop, activeTab }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Configuration State
  const [startConfig, setStartConfig] = useState<StartPhaseConfig>({
    deleteThreshold: 1,
    keepThreshold: 4,
    winnerThreshold: 10,
    isActive: true
  });

  const [postConfig, setPostConfig] = useState<PostPhaseConfig>({
    isActive: true,
    minBuckets: 2,
    averageSettings: {
      day3: 2.0,
      day7: 3.0,
      day10: 4.5,
      day14: 6.0
    }
  });

  const [generalConfig, setGeneralConfig] = useState<GeneralConfig>({
    qkTag: 'QK',
    replaceTagPrefix: 'replace_',
    urlPrefix: '',
    startPhaseDays: 3,
    postPhaseDays: 12
  });

  const [limitsConfig, setLimitsConfig] = useState<LimitsConfig>({
    productCreationLimit: 20,
    podCreationLimit: 10
  });

  const [productCreationConfig, setProductCreationConfig] = useState<ProductCreationConfig>({
    // Fast Fashion Defaults
    salesTextTemplate: 'Winter',
    generateOptimizedTitle: true,
    generateOptimizedDescription: true,
    generateTags: true,
    translateSize: true,
    setGermanSizes: false,
    setCompareAtPrice: true,
    compareAtPricePercent: 60,
    setPriceDecimals: true,
    priceDecimalsValue: 90,
    setCompareAtPriceDecimals: true,
    compareAtPriceDecimalsValue: 90,
    adjustProductPrice: true,
    priceAdjustmentType: 'PERCENT',
    priceAdjustmentValue: -23.0,
    isPriceReduction: true,
    setGlobalInventory: true,
    globalInventoryValue: 10000,
    enableInventoryTracking: true,
    publishChannels: true,
    setGlobalTags: false,
    globalTagsValue: '',
    changeProductStatus: true,
    productStatusValue: 'active',
    setCategoryTagFashion: true,
    
    // POD Defaults
    podSettings: {
      isActive: false,
      niches: [],
      prompts: [],
      imageQuality: 'HIGH'
    }
  });

  const [pinterestConfig, setPinterestConfig] = useState<PinterestConfig>({
    isConnected: false,
    selectedAdAccountId: null,
    globalBatchSize: 50,
    activeLinks: [],
    defaultCampaignSettings: {
      dailyBudget: 20,
      targetLocations: ['DE'],
      ageGroup: 'ALL',
      optimization: 'CONVERSIONS',
      conversionEvent: 'CHECKOUT'
    }
  });

  const [metaConfig, setMetaConfig] = useState<MetaAdsConfig>({
    isConnected: false,
    selectedAdAccountId: null,
    globalBatchSize: 50,
    activeLinks: [],
    defaultCampaignSettings: {
      dailyBudget: 20,
      targetLocations: ['DE'],
      ageGroup: 'ALL',
      optimization: 'CONVERSIONS',
      conversionEvent: 'CHECKOUT'
    }
  });

  const [googleConfig, setGoogleConfig] = useState<GoogleAdsConfig>({
    isConnected: false,
    selectedAdAccountId: null,
    activeLinks: []
  });

  // Mock Sync Simulation
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsProcessing(false);
            return 0;
          }
          return prev + 5;
        });
      }, 80);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  // Helper to get title based on ID
  const getTabTitle = (id: TabId) => {
    const map: Record<string, string> = {
      'dashboard': 'Analytics Dashboard',
      'automation-roi': 'ROI & Savings',
      'pod-intelligence': 'POD Intelligence',
      'marketing-analytics': 'Ad Sync Reports',
      'start-phase': 'Start Phase Automation',
      'post-phase': 'Post Phase Automation',
      'product-creation': 'Product Creation',
      'pinterest': 'Pinterest Integration',
      'meta-ads': 'Meta Ads Integration',
      'google-ads': 'Google Ads Manager',
      'limits': 'Limits & Beschränkungen',
      'general': 'General Settings'
    };
    return map[id] || 'Dashboard';
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 relative">
      
      {/* Top Header Bar */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-900 bg-zinc-950 shrink-0">
        <div className="flex items-center text-sm">
          <span className="text-zinc-500 font-medium">Overview</span>
          <ChevronRight className="w-4 h-4 mx-2 text-zinc-700" />
          <span className="text-white font-medium">{getTabTitle(activeTab)}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Status Indicator Only */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
             <div className={`w-2 h-2 rounded-full ${shop.status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500'}`} />
             <span className="text-xs font-medium text-zinc-400 capitalize">{shop.status}</span>
          </div>
        </div>
      </header>

      {/* Global Progress Bar (if syncing) */}
      {isProcessing && (
         <div className="h-0.5 w-full bg-zinc-900 overflow-hidden">
            <div className="h-full bg-primary shadow-[0_0_10px_#3b82f6] transition-all duration-200 ease-out" style={{ width: `${progress}%` }} />
         </div>
      )}

      {/* Main Content View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-[1400px] mx-auto h-full">
          
          {activeTab === 'dashboard' ? (
            <AnalyticsDashboard />
          ) : activeTab === 'automation-roi' ? (
            <AutomationRoi />
          ) : activeTab === 'pod-intelligence' ? (
            <PodIntelligence />
          ) : activeTab === 'marketing-analytics' ? (
            <MarketingAnalytics />
          ) : activeTab === 'start-phase' ? (
            <StartPhase 
              config={startConfig} 
              onChange={setStartConfig} 
              onOpenCalculator={() => setIsCalculatorOpen(true)}
            />
          ) : activeTab === 'post-phase' ? (
            <PostPhase 
              config={postConfig} 
              onChange={setPostConfig} 
              onOpenCalculator={() => setIsCalculatorOpen(true)}
            />
          ) : activeTab === 'general' ? (
            <GeneralSettings config={generalConfig} onChange={setGeneralConfig} />
          ) : activeTab === 'pinterest' ? (
            <PinterestSync shopId={shop.id} />
          ) : activeTab === 'meta-ads' ? (
            <MetaAdsSync 
               config={metaConfig} 
               onChange={setMetaConfig} 
               pinterestLinks={pinterestConfig.activeLinks}
               googleLinks={googleConfig.activeLinks}
            />
          ) : activeTab === 'google-ads' ? (
            <GoogleAdsManager 
               config={googleConfig} 
               onChange={setGoogleConfig} 
               pinterestLinks={pinterestConfig.activeLinks}
               metaLinks={metaConfig.activeLinks}
            />
          ) : activeTab === 'limits' ? (
            <RateLimits config={limitsConfig} onChange={setLimitsConfig} />
          ) : activeTab === 'product-creation' ? (
            <ProductCreation config={productCreationConfig} onChange={setProductCreationConfig} />
          ) : (
            // Placeholder for other tabs
            <div className="flex flex-col items-center justify-center h-[600px] text-center border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-xl">
                 <Settings className="w-8 h-8 text-zinc-600" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Work in Progress</h2>
              <p className="text-zinc-500 max-w-sm">
                The <strong>{getTabTitle(activeTab)}</strong> module is currently being updated to the new design system.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Global Calculator Drawer */}
      <ThresholdCalculator 
        isOpen={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
      />

    </div>
  );
};