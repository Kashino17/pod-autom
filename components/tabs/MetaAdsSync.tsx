

import React, { useState, useEffect } from 'react';
import { MetaAdsConfig, AdAccount, PinterestCampaign, TargetLocation, AgeGroup, OptimizationGoal, ConversionEvent, MetaSyncLink, PinterestSyncLink, GoogleSyncLink } from '../../types';
import { Facebook, Plus, Search, Layers, ArrowRight, Save, Activity, Trash2, LayoutTemplate, ChevronDown, Filter, AlertTriangle, Info, Target, Image as ImageIcon, Copy, Share2 } from 'lucide-react';

interface MetaAdsSyncProps {
  config: MetaAdsConfig;
  onChange: (newConfig: MetaAdsConfig) => void;
  pinterestLinks?: PinterestSyncLink[];
  googleLinks?: GoogleSyncLink[];
}

// MOCK DATA (reused structure but rebranded)
const MOCK_AD_ACCOUNTS: AdAccount[] = [
  { id: 'act_meta_1', name: 'ReBoss FB Ads Main', currency: 'EUR' },
  { id: 'act_meta_2', name: 'ReBoss IG Backup', currency: 'USD' },
];

const MOCK_CAMPAIGNS: PinterestCampaign[] = [
  { id: 'cmp_m1', name: 'FB - Summer Scaling 2024', status: 'ACTIVE' },
  { id: 'cmp_m2', name: 'IG - Retargeting DPA', status: 'ACTIVE' },
  { id: 'cmp_m3', name: 'FB - Cold Interest Test', status: 'PAUSED' },
];

const MOCK_COLLECTIONS = [
  { id: 'col_1', name: 'Summer Essentials', count: 124 },
  { id: 'col_2', name: 'Jeans & Denim', count: 450 },
  { id: 'col_3', name: 'Accessories', count: 85 },
  { id: 'col_4', name: 'New Arrivals', count: 12 },
  { id: 'col_5', name: 'Best Sellers', count: 56 },
];

const LOCATIONS: TargetLocation[] = ['DE', 'AT', 'CH', 'NL', 'ES', 'FR'];
const AGES: AgeGroup[] = ['ALL', '18+', '19+', '20+', '21+'];

export const MetaAdsSync: React.FC<MetaAdsSyncProps> = ({ 
  config, 
  onChange,
  pinterestLinks = [],
  googleLinks = []
}) => {
  // Local State for the "Create New Link" Form
  const [formState, setFormState] = useState({
    campaignMode: 'EXISTING' as 'EXISTING' | 'NEW',
    selectedCampaignId: '',
    newCampaignName: '',
    selectedCollectionId: '',
    selectedBatch: 1,
    isCampaignNameDirty: false,
    
    // Creative Strategy State
    useSingleImage: true,
    useCarousel: false,
  });

  const [searchQuery, setSearchQuery] = useState('');
  
  // State for Delete Confirmation Modal
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);

  // Local state for Batch Size input to allow "Save" action
  const [tempBatchSize, setTempBatchSize] = useState(config.globalBatchSize);
  const hasBatchSizeChanged = tempBatchSize !== config.globalBatchSize;

  // Helpers
  const isSyncedWithPinterest = (colName: string) => pinterestLinks.some(l => l.collectionName === colName);
  const isSyncedWithGoogle = (colName: string) => googleLinks.some(l => l.collectionName === colName);

  // Ensure activeLinks exists (migration)
  useEffect(() => {
    if (!config.activeLinks) {
      onChange({ ...config, activeLinks: [] });
    }
  }, []);

  const selectedCollection = MOCK_COLLECTIONS.find(c => c.id === formState.selectedCollectionId);
  const maxBatches = selectedCollection ? Math.ceil(selectedCollection.count / config.globalBatchSize) : 1;

  // Handlers
  const toggleLocation = (loc: TargetLocation) => {
    const current = config.defaultCampaignSettings.targetLocations;
    const isSelected = current.includes(loc);
    const newLocs = isSelected ? current.filter(l => l !== loc) : [...current, loc];
    onChange({
      ...config,
      defaultCampaignSettings: { ...config.defaultCampaignSettings, targetLocations: newLocs }
    });
  };

  const handleCreateLink = () => {
    const campaignName = formState.campaignMode === 'NEW' 
      ? (formState.newCampaignName || 'New Campaign') 
      : MOCK_CAMPAIGNS.find(c => c.id === formState.selectedCampaignId)?.name || 'Unknown Campaign';

    const collectionName = selectedCollection?.name || 'Unknown Collection';
    const itemCount = selectedCollection ? Math.min(config.globalBatchSize, selectedCollection.count) : 0; // rough estimate

    // Collect chosen creatives
    const creatives: ('Single Image' | 'Carousel')[] = [];
    if (formState.useSingleImage) creatives.push('Single Image');
    if (formState.useCarousel) creatives.push('Carousel');

    const newLink: MetaSyncLink = {
      id: Math.random().toString(36).substr(2, 9),
      campaignName,
      collectionName,
      batchNumber: formState.selectedBatch,
      status: 'active',
      itemsCount: itemCount,
      creatives: creatives
    };

    const newActiveLinks = config.activeLinks ? [...config.activeLinks, newLink] : [newLink];
    onChange({ ...config, activeLinks: newActiveLinks });
    
    // Reset Form
    setFormState({
      campaignMode: 'EXISTING',
      selectedCampaignId: '',
      newCampaignName: '',
      selectedCollectionId: '',
      selectedBatch: 1,
      isCampaignNameDirty: false,
      useSingleImage: true,
      useCarousel: false,
    });
  };

  const confirmDelete = () => {
    if (linkToDelete) {
      const newLinks = config.activeLinks.filter(l => l.id !== linkToDelete);
      onChange({ ...config, activeLinks: newLinks });
      setLinkToDelete(null);
    }
  };

  const saveBatchSize = () => {
    onChange({ ...config, globalBatchSize: tempBatchSize });
  };

  // Logic: Force Checkout if ROAS
  useEffect(() => {
    if (config.defaultCampaignSettings.optimization === 'ROAS' && config.defaultCampaignSettings.conversionEvent !== 'CHECKOUT') {
      onChange({
        ...config,
        defaultCampaignSettings: { ...config.defaultCampaignSettings, conversionEvent: 'CHECKOUT' }
      });
    }
  }, [config.defaultCampaignSettings.optimization]);

  const filteredLinks = config.activeLinks?.filter(link => 
    link.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.collectionName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Form Validation Logic
  const isTargetingValid = config.defaultCampaignSettings.targetLocations.length > 0;
  // Creative validation: at least one creative must be selected
  const isCreativeValid = formState.useSingleImage || formState.useCarousel;

  const canSave = formState.selectedCollectionId && isCreativeValid && (
    formState.campaignMode === 'EXISTING' 
      ? !!formState.selectedCampaignId 
      : (!!formState.newCampaignName && isTargetingValid)
  );

  // Helper for Date Format
  const getFormattedDate = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // -- NOT CONNECTED VIEW --
  if (!config.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-[#1877F2]/10 flex items-center justify-center mb-8 border border-[#1877F2]/20 shadow-[0_0_30px_rgba(24,119,242,0.1)]">
          <Facebook className="w-10 h-10 text-[#1877F2]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Meta Ads Marketing Sync</h2>
        <p className="text-zinc-400 text-center max-w-md mb-8">
          Connect your Facebook/Instagram Ad Account to automatically sync products into dynamic catalog or standard campaigns.
        </p>
        <button 
          onClick={() => onChange({...config, isConnected: true, selectedAdAccountId: MOCK_AD_ACCOUNTS[0].id, activeLinks: []})}
          className="bg-[#1877F2] hover:bg-[#0c63d4] text-white px-8 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-[#1877F2]/25 flex items-center gap-2"
        >
          <Facebook className="w-5 h-5" />
          Connect via OAuth
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500 relative">
      
      {/* DELETE CONFIRMATION MODAL */}
      {linkToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="p-6 text-center space-y-4">
                 <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white">Delete Sync Job?</h3>
                    <p className="text-sm text-zinc-400 mt-2">
                       This will stop the synchronization for this campaign immediately. This action cannot be undone.
                    </p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                       onClick={() => setLinkToDelete(null)}
                       className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={confirmDelete}
                       className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors shadow-lg shadow-red-900/20"
                    >
                       Delete Job
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 shrink-0 backdrop-blur-sm">
        <div className="flex items-center gap-4">
           <div className="p-2 bg-[#1877F2]/10 rounded-lg border border-[#1877F2]/20">
              <Facebook className="w-5 h-5 text-[#1877F2]" />
           </div>
           <div>
              <label className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider block mb-0.5">Connected Ad Account</label>
              <select 
                value={config.selectedAdAccountId || ''}
                onChange={(e) => onChange({...config, selectedAdAccountId: e.target.value})}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-sm"
              >
                {MOCK_AD_ACCOUNTS.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-zinc-900">{acc.name} ({acc.currency})</option>
                ))}
              </select>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
           
           {/* Info Tooltip */}
           <div className="relative group">
              <Info className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-help transition-colors" />
              {/* Tooltip Card */}
              <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none transform translate-y-2 group-hover:translate-y-0 duration-200">
                 <h4 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    Global Batch Configuration
                 </h4>
                 <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">
                    Defines the number of products processed in a single synchronization request.
                 </p>
                 <div className="bg-zinc-950/50 rounded border border-zinc-800 p-2 text-[10px] text-zinc-500">
                    <span className="text-zinc-300 font-medium">Tip:</span> Smaller batches (e.g. 50) ensure better stability.
                 </div>
              </div>
           </div>

           {/* Batch Size Input Group */}
           <div className="flex items-center gap-1">
              <div className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-950 rounded-lg border transition-colors ${hasBatchSizeChanged ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800'}`}>
                 <input 
                   type="number"
                   min="1"
                   max="500" 
                   value={tempBatchSize}
                   onChange={(e) => setTempBatchSize(Math.max(1, parseInt(e.target.value) || 0))}
                   className="w-12 bg-transparent text-right text-xs text-white focus:outline-none font-mono"
                 />
                 <span className="text-xs text-zinc-500 select-none">items/batch</span>
              </div>
              
              <button 
                 onClick={saveBatchSize}
                 disabled={!hasBatchSizeChanged}
                 className={`
                    p-1.5 rounded-lg border transition-all duration-200 flex items-center justify-center w-8 h-8
                    ${hasBatchSizeChanged 
                      ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed opacity-50'}
                 `}
                 title="Save Batch Size"
              >
                 <Save className="w-3.5 h-3.5" />
              </button>
           </div>

        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6">
        
        {/* LEFT PANE: REGISTRY (Compact Table Table) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
           {/* Header & Search */}
           <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 space-y-3">
              <div className="flex items-center justify-between">
                 <h3 className="font-semibold text-zinc-200 text-sm">Sync Registry</h3>
                 <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 border border-zinc-700">
                    {filteredLinks.length} Active
                 </span>
              </div>
              <div className="relative">
                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                 <input 
                    type="text" 
                    placeholder="Search campaign or collection..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-1.5 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
                 />
              </div>
           </div>

           {/* Table Content */}
           <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/30">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-zinc-950/80 text-[10px] uppercase text-zinc-500 font-semibold sticky top-0 z-10 backdrop-blur-md border-b border-zinc-800/50">
                    <tr>
                       <th className="px-4 py-2 font-medium tracking-wider">Job Details</th>
                       <th className="px-2 py-2 text-center font-medium tracking-wider w-16">Creative</th>
                       <th className="px-4 py-2 text-right font-medium tracking-wider w-12"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800/40">
                    {filteredLinks.length > 0 ? (
                       filteredLinks.map(link => (
                          <tr key={link.id} className="group hover:bg-zinc-900/50 transition-colors">
                             <td className="px-4 py-3 align-top">
                                <div className="flex items-start gap-3">
                                   <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${link.status === 'active' ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`} />
                                   <div className="min-w-0 flex-1">
                                      <div className="text-xs font-medium text-zinc-200 truncate" title={link.campaignName}>
                                         {link.campaignName}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                         <span className="text-[10px] text-zinc-500 truncate max-w-[120px]" title={link.collectionName}>{link.collectionName}</span>
                                         
                                         {/* CROSS PLATFORM ICONS */}
                                         <div className="flex items-center gap-1">
                                            {isSyncedWithPinterest(link.collectionName) && (
                                               <div title="Also synced with Pinterest" className="p-0.5 bg-[#E60023]/10 rounded border border-[#E60023]/20">
                                                  <Share2 className="w-2.5 h-2.5 text-[#E60023]" />
                                               </div>
                                            )}
                                            {isSyncedWithGoogle(link.collectionName) && (
                                               <div title="Also synced with Google" className="p-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                                                  <Search className="w-2.5 h-2.5 text-blue-500" />
                                               </div>
                                            )}
                                         </div>
                                      </div>
                                      <div className="text-[9px] text-zinc-600 mt-1 font-mono">Batch #{link.batchNumber}</div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-2 py-3 text-center align-middle">
                                <div className="flex flex-col gap-1 items-center">
                                    {link.creatives.map(c => (
                                        <div key={c} title={c} className="bg-zinc-800 p-1 rounded text-zinc-400">
                                            {c === 'Single Image' ? <ImageIcon className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
                                        </div>
                                    ))}
                                </div>
                             </td>
                             <td className="px-4 py-3 text-right align-top">
                                <button 
                                   onClick={() => setLinkToDelete(link.id)}
                                   className="p-1.5 hover:bg-red-500/10 rounded-md text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                   title="Remove Sync"
                                >
                                   <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             </td>
                          </tr>
                       ))
                    ) : (
                       <tr>
                          <td colSpan={3} className="px-4 py-12 text-center">
                             <div className="flex flex-col items-center justify-center text-zinc-600">
                                <Filter className="w-6 h-6 mb-2 opacity-20" />
                                <p className="text-xs">No matching jobs.</p>
                             </div>
                          </td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* RIGHT PANE: CREATOR (Form) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
           <div className="p-4 border-b border-zinc-800 bg-zinc-900/40">
              <h3 className="font-semibold text-zinc-200 text-sm flex items-center gap-2">
                 <Plus className="w-4 h-4 text-zinc-500" />
                 Create New Sync
              </h3>
           </div>

           <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-8">

                 {/* SECTION 1: CAMPAIGN */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                          <Target className="w-3.5 h-3.5" /> 1. Campaign Strategy
                       </label>
                       
                       <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                          <button 
                             onClick={() => setFormState({...formState, campaignMode: 'EXISTING'})}
                             className={`px-3 py-1 rounded text-xs font-medium transition-all ${formState.campaignMode === 'EXISTING' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                             Existing
                          </button>
                          <button 
                             onClick={() => setFormState({...formState, campaignMode: 'NEW'})}
                             className={`px-3 py-1 rounded text-xs font-medium transition-all ${formState.campaignMode === 'NEW' ? 'bg-[#1877F2] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                             Create New
                          </button>
                       </div>
                    </div>

                    {formState.campaignMode === 'EXISTING' ? (
                       <div className="relative">
                          <select 
                             value={formState.selectedCampaignId}
                             onChange={(e) => setFormState({...formState, selectedCampaignId: e.target.value})}
                             className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 appearance-none"
                          >
                             <option value="">-- Select Active Campaign --</option>
                             {MOCK_CAMPAIGNS.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                             ))}
                          </select>
                          <ArrowRight className="absolute right-4 top-3.5 w-4 h-4 text-zinc-600 pointer-events-none" />
                       </div>
                    ) : (
                       <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-6 animate-in slide-in-from-top-2">
                          
                          {/* Name Input */}
                          <div>
                             <label className="block text-xs text-zinc-500 mb-1.5">New Campaign Name</label>
                             <input 
                                type="text"
                                value={formState.newCampaignName}
                                onChange={(e) => {
                                   const newVal = e.target.value;
                                   setFormState({
                                     ...formState, 
                                     newCampaignName: newVal,
                                     isCampaignNameDirty: newVal.length > 0 // Reset dirty flag if empty
                                   });
                                }}
                                placeholder="e.g. Summer 2024 - Retargeting"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#1877F2]/50"
                             />
                          </div>

                          {/* Strategy Config Grid */}
                          <div className="grid grid-cols-2 gap-6 pt-2">
                             
                             {/* Budget & Optimization */}
                             <div className="space-y-4">
                                <label className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Financials & Bidding</label>
                                
                                <div className="space-y-2">
                                   <div className="flex justify-between text-xs text-zinc-400">
                                      <span>Daily Budget</span>
                                      <span className="text-white">€{config.defaultCampaignSettings.dailyBudget}</span>
                                   </div>
                                   <input 
                                      type="range" 
                                      min="5" max="500" step="5"
                                      value={config.defaultCampaignSettings.dailyBudget}
                                      onChange={(e) => onChange({...config, defaultCampaignSettings: {...config.defaultCampaignSettings, dailyBudget: parseFloat(e.target.value)}})}
                                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-[#1877F2] [&::-webkit-slider-thumb]:rounded-full"
                                   />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                   {(['ROAS', 'CONVERSIONS'] as OptimizationGoal[]).map(goal => (
                                      <button
                                         key={goal}
                                         onClick={() => onChange({...config, defaultCampaignSettings: {...config.defaultCampaignSettings, optimization: goal}})}
                                         className={`py-1.5 rounded text-[10px] font-bold border ${config.defaultCampaignSettings.optimization === goal ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-transparent border-zinc-800 text-zinc-500'}`}
                                      >
                                         {goal}
                                      </button>
                                   ))}
                                </div>

                                <div className="flex items-center gap-2 p-2 bg-zinc-900 rounded border border-zinc-800">
                                   <Activity className="w-3.5 h-3.5 text-zinc-500" />
                                   <select 
                                      value={config.defaultCampaignSettings.conversionEvent}
                                      onChange={(e) => onChange({...config, defaultCampaignSettings: {...config.defaultCampaignSettings, conversionEvent: e.target.value as ConversionEvent}})}
                                      disabled={config.defaultCampaignSettings.optimization === 'ROAS'}
                                      className="bg-transparent text-xs text-white focus:outline-none w-full disabled:opacity-50"
                                   >
                                      <option value="CHECKOUT">Checkout</option>
                                      <option value="ATC">Add To Cart</option>
                                   </select>
                                </div>
                             </div>

                             {/* Targeting */}
                             <div className="space-y-4">
                                <label className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">
                                   Audience Targeting <span className="text-red-500">*</span>
                                </label>
                                
                                <div className="flex flex-wrap gap-1.5">
                                   {LOCATIONS.map(loc => (
                                      <button
                                         key={loc}
                                         onClick={() => toggleLocation(loc)}
                                         className={`px-2 py-1 rounded text-[10px] font-bold border ${config.defaultCampaignSettings.targetLocations.includes(loc) ? 'bg-[#1877F2]/10 border-[#1877F2]/30 text-[#1877F2]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                      >
                                         {loc}
                                      </button>
                                   ))}
                                </div>
                                {!isTargetingValid && (
                                   <p className="text-[10px] text-red-500 font-medium animate-pulse">
                                      At least one location required.
                                   </p>
                                )}

                                <div className="pt-2">
                                   <label className="text-xs text-zinc-500 block mb-1">Age Group</label>
                                   <select 
                                      value={config.defaultCampaignSettings.ageGroup}
                                      onChange={(e) => onChange({...config, defaultCampaignSettings: {...config.defaultCampaignSettings, ageGroup: e.target.value as AgeGroup}})}
                                      className="w-full bg-zinc-900 border border-zinc-800 rounded py-1.5 px-2 text-xs text-white"
                                   >
                                      {AGES.map(a => <option key={a} value={a}>{a}</option>)}
                                   </select>
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>

                 {/* SECTION 2: COLLECTION */}
                 <div className="space-y-4">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                       <LayoutTemplate className="w-3.5 h-3.5" /> 2. Source Collection
                    </label>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="col-span-2 relative">
                          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                          <select 
                             value={formState.selectedCollectionId}
                             onChange={(e) => {
                                const newColId = e.target.value;
                                const col = MOCK_COLLECTIONS.find(c => c.id === newColId);
                                
                                let updatedName = formState.newCampaignName;
                                const isInputEmpty = formState.newCampaignName.trim().length === 0;

                                // Auto-populate name if user hasn't edited it manually OR if the field is currently empty
                                if (formState.campaignMode === 'NEW' && (!formState.isCampaignNameDirty || isInputEmpty) && col) {
                                   updatedName = `${col.name} | ${getFormattedDate()}`;
                                }

                                setFormState({
                                    ...formState, 
                                    selectedCollectionId: newColId, 
                                    selectedBatch: 1,
                                    newCampaignName: updatedName
                                });
                             }}
                             className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-zinc-600 appearance-none"
                          >
                             <option value="">-- Select Shopify Collection --</option>
                             {MOCK_COLLECTIONS.map(c => {
                                const hasPin = isSyncedWithPinterest(c.name);
                                const hasGoogle = isSyncedWithGoogle(c.name);
                                const indicators = [];
                                if (hasPin) indicators.push("Pinterest");
                                if (hasGoogle) indicators.push("Google");
                                const suffix = indicators.length > 0 ? ` [Synced: ${indicators.join(', ')}]` : '';

                                return (
                                   <option key={c.id} value={c.id}>{c.name} ({c.count} products){suffix}</option>
                                );
                             })}
                          </select>
                       </div>
                    </div>
                 </div>

                 {/* SECTION 3: BATCH */}
                 <div className={`space-y-4 transition-opacity ${!formState.selectedCollectionId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                       <Layers className="w-3.5 h-3.5" /> 3. Batch Selection
                    </label>
                    
                    <div className="relative">
                       <select 
                          value={formState.selectedBatch}
                          onChange={(e) => setFormState({...formState, selectedBatch: parseInt(e.target.value)})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 appearance-none"
                       >
                          {Array.from({ length: maxBatches }, (_, i) => i + 1).map(num => {
                             const startItem = (num - 1) * config.globalBatchSize + 1;
                             const endItem = Math.min(num * config.globalBatchSize, selectedCollection?.count || 0);
                             return (
                                <option key={num} value={num}>
                                   Batch {num} ({startItem} - {endItem} of {selectedCollection?.count} items)
                                </option>
                             );
                          })}
                       </select>
                       <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                    </div>
                 </div>

                 {/* SECTION 4: CREATIVE (NEW) */}
                 <div className={`space-y-4 transition-opacity ${!formState.selectedCollectionId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                       <ImageIcon className="w-3.5 h-3.5" /> 4. Ad Creatives Strategy
                    </label>
                    
                    <div className="grid grid-cols-2 gap-4">
                       
                       {/* Single Image Toggle Card */}
                       <div 
                         onClick={() => setFormState({...formState, useSingleImage: !formState.useSingleImage})}
                         className={`
                           p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3 select-none
                           ${formState.useSingleImage 
                             ? 'bg-[#1877F2]/10 border-[#1877F2]/50 shadow-[0_0_15px_rgba(24,119,242,0.1)]' 
                             : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}
                         `}
                       >
                          <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors ${formState.useSingleImage ? 'bg-[#1877F2] border-[#1877F2]' : 'border-zinc-600'}`}>
                             {formState.useSingleImage && <ImageIcon className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                             <h4 className={`text-sm font-semibold mb-1 ${formState.useSingleImage ? 'text-white' : 'text-zinc-400'}`}>Single Image</h4>
                             <p className="text-xs text-zinc-500 leading-relaxed">
                                Uses the primary product image for standard feed ads.
                             </p>
                          </div>
                       </div>

                       {/* Carousel Toggle Card */}
                       <div 
                         onClick={() => setFormState({...formState, useCarousel: !formState.useCarousel})}
                         className={`
                           p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3 select-none
                           ${formState.useCarousel 
                             ? 'bg-[#1877F2]/10 border-[#1877F2]/50 shadow-[0_0_15px_rgba(24,119,242,0.1)]' 
                             : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}
                         `}
                       >
                          <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors ${formState.useCarousel ? 'bg-[#1877F2] border-[#1877F2]' : 'border-zinc-600'}`}>
                             {formState.useCarousel && <Copy className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                             <h4 className={`text-sm font-semibold mb-1 ${formState.useCarousel ? 'text-white' : 'text-zinc-400'}`}>Carousel Ad</h4>
                             <p className="text-xs text-zinc-500 leading-relaxed">
                                Creates a multi-image carousel from product media gallery.
                             </p>
                          </div>
                       </div>
                    </div>
                    {!isCreativeValid && <p className="text-[10px] text-red-500 font-medium pt-1">Please select at least one creative format.</p>}
                 </div>

                 {/* ACTION FOOTER */}
                 <div className="pt-6 border-t border-zinc-800">
                    <button 
                       onClick={handleCreateLink}
                       disabled={!canSave}
                       className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                       <Save className="w-4 h-4" />
                       Save Sync-Automation
                    </button>
                 </div>

              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
