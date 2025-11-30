

import React, { useState } from 'react';
import { GoogleAdsConfig, AdAccount, GoogleSyncLink, PinterestSyncLink, MetaSyncLink } from '../../types';
import { Search, Share2, Facebook, Plus, AlertTriangle, Trash2, Filter, Save, ArrowRight } from 'lucide-react';

interface GoogleAdsManagerProps {
  config: GoogleAdsConfig;
  onChange: (newConfig: GoogleAdsConfig) => void;
  pinterestLinks?: PinterestSyncLink[];
  metaLinks?: MetaSyncLink[];
}

// MOCK DATA
const MOCK_AD_ACCOUNTS: AdAccount[] = [
  { id: 'act_google_1', name: 'ReBoss Google Ads', currency: 'EUR' },
  { id: 'act_google_2', name: 'Search Only Account', currency: 'USD' },
];

const MOCK_CAMPAIGNS = [
  { id: 'cmp_g1', name: 'PMAX - Summer Scale', type: 'PMAX' },
  { id: 'cmp_g2', name: 'Search - Brand Keywords', type: 'SEARCH' },
  { id: 'cmp_g3', name: 'PMAX - Retargeting', type: 'PMAX' },
];

const MOCK_COLLECTIONS = [
  { id: 'col_1', name: 'Summer Essentials' },
  { id: 'col_2', name: 'Jeans & Denim' },
  { id: 'col_3', name: 'Accessories' },
  { id: 'col_4', name: 'New Arrivals' },
  { id: 'col_5', name: 'Best Sellers' },
];

export const GoogleAdsManager: React.FC<GoogleAdsManagerProps> = ({ 
  config, 
  onChange, 
  pinterestLinks = [], 
  metaLinks = [] 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  
  // Create Form State
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');

  // Helpers
  const isSyncedWithPinterest = (colName: string) => pinterestLinks.some(l => l.collectionName === colName);
  const isSyncedWithMeta = (colName: string) => metaLinks.some(l => l.collectionName === colName);

  const handleCreateLink = () => {
    const campaign = MOCK_CAMPAIGNS.find(c => c.id === selectedCampaignId);
    const collection = MOCK_COLLECTIONS.find(c => c.id === selectedCollectionId);

    if (campaign && collection) {
      const newLink: GoogleSyncLink = {
        id: Math.random().toString(36).substr(2, 9),
        campaignName: campaign.name,
        collectionName: collection.name,
        status: 'active'
      };
      onChange({ ...config, activeLinks: [...config.activeLinks, newLink] });
      // Reset
      setSelectedCampaignId('');
      setSelectedCollectionId('');
    }
  };

  const confirmDelete = () => {
    if (linkToDelete) {
      const newLinks = config.activeLinks.filter(l => l.id !== linkToDelete);
      onChange({ ...config, activeLinks: newLinks });
      setLinkToDelete(null);
    }
  };

  const filteredLinks = config.activeLinks.filter(link => 
    link.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.collectionName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canSave = selectedCampaignId && selectedCollectionId;

  // -- NOT CONNECTED VIEW --
  if (!config.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-8 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <Search className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Google Ads Manager</h2>
        <p className="text-zinc-400 text-center max-w-md mb-8">
          Link your Shopify Collections directly to PMAX or Search Campaigns for automated asset filtering.
        </p>
        <button 
          onClick={() => onChange({...config, isConnected: true, selectedAdAccountId: MOCK_AD_ACCOUNTS[0].id, activeLinks: []})}
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
        >
          <Search className="w-5 h-5" />
          Connect via OAuth
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500 relative">
      
      {/* DELETE MODAL */}
      {linkToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="p-6 text-center space-y-4">
                 <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white">Unlink Collection?</h3>
                    <p className="text-sm text-zinc-400 mt-2">
                       This will remove the product filter from the Google Ads Asset Group.
                    </p>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => setLinkToDelete(null)} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium">Cancel</button>
                    <button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium shadow-lg shadow-red-900/20">Delete Link</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 shrink-0 backdrop-blur-sm">
        <div className="flex items-center gap-4">
           <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Search className="w-5 h-5 text-blue-500" />
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
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6">
        
        {/* LEFT: REGISTRY */}
        <div className="col-span-12 lg:col-span-6 flex flex-col bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
           <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 space-y-3">
              <div className="flex items-center justify-between">
                 <h3 className="font-semibold text-zinc-200 text-sm">Linked Asset Groups</h3>
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
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-1.5 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-zinc-600 transition-colors"
                 />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/30">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-zinc-950/80 text-[10px] uppercase text-zinc-500 font-semibold sticky top-0 z-10 backdrop-blur-md border-b border-zinc-800/50">
                    <tr>
                       <th className="px-4 py-2 font-medium tracking-wider">Campaign / Collection Link</th>
                       <th className="px-4 py-2 text-right font-medium tracking-wider w-12"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800/40">
                    {filteredLinks.length > 0 ? (
                       filteredLinks.map(link => (
                          <tr key={link.id} className="group hover:bg-zinc-900/50 transition-colors">
                             <td className="px-4 py-3 align-top">
                                <div className="flex items-start gap-3">
                                   <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                                   <div className="min-w-0 flex-1">
                                      <div className="text-xs font-medium text-zinc-200 truncate">{link.campaignName}</div>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] text-zinc-500 truncate">{link.collectionName}</span>
                                          
                                          {/* CROSS PLATFORM ICONS */}
                                          <div className="flex items-center gap-1">
                                             {isSyncedWithPinterest(link.collectionName) && (
                                                <div title="Also synced with Pinterest" className="p-0.5 bg-[#E60023]/10 rounded border border-[#E60023]/20">
                                                   <Share2 className="w-2.5 h-2.5 text-[#E60023]" />
                                                </div>
                                             )}
                                             {isSyncedWithMeta(link.collectionName) && (
                                                <div title="Also synced with Meta" className="p-0.5 bg-[#1877F2]/10 rounded border border-[#1877F2]/20">
                                                   <Facebook className="w-2.5 h-2.5 text-[#1877F2]" />
                                                </div>
                                             )}
                                          </div>
                                      </div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-4 py-3 text-right">
                                <button onClick={() => setLinkToDelete(link.id)} className="p-1.5 hover:bg-red-500/10 rounded-md text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                   <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             </td>
                          </tr>
                       ))
                    ) : (
                       <tr>
                          <td colSpan={2} className="px-4 py-12 text-center text-zinc-600">
                             <Filter className="w-6 h-6 mb-2 mx-auto opacity-20" />
                             <p className="text-xs">No active links found.</p>
                          </td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* RIGHT: LINK CREATOR */}
        <div className="col-span-12 lg:col-span-6 flex flex-col bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
           <div className="p-4 border-b border-zinc-800 bg-zinc-900/40">
              <h3 className="font-semibold text-zinc-200 text-sm flex items-center gap-2">
                 <Plus className="w-4 h-4 text-zinc-500" />
                 Link Collection
              </h3>
           </div>

           <div className="flex-1 p-6 space-y-6">
              
              {/* Campaign Select */}
              <div className="space-y-2">
                 <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Google Campaign</label>
                 <div className="relative">
                    <select 
                       value={selectedCampaignId}
                       onChange={(e) => setSelectedCampaignId(e.target.value)}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 appearance-none"
                    >
                       <option value="">-- Choose Campaign --</option>
                       {MOCK_CAMPAIGNS.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                       ))}
                    </select>
                    <ArrowRight className="absolute right-4 top-3.5 w-4 h-4 text-zinc-600 pointer-events-none" />
                 </div>
              </div>

              {/* Collection Select */}
              <div className="space-y-2">
                 <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Source Collection</label>
                 <div className="relative">
                    <select 
                       value={selectedCollectionId}
                       onChange={(e) => setSelectedCollectionId(e.target.value)}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 appearance-none"
                    >
                       <option value="">-- Choose Collection --</option>
                       {MOCK_COLLECTIONS.map(c => {
                          const hasPin = isSyncedWithPinterest(c.name);
                          const hasMeta = isSyncedWithMeta(c.name);
                          const indicators = [];
                          if (hasPin) indicators.push("Pinterest");
                          if (hasMeta) indicators.push("Meta");
                          const suffix = indicators.length > 0 ? ` [Synced: ${indicators.join(', ')}]` : '';

                          return (
                             <option key={c.id} value={c.id}>
                                {c.name}{suffix}
                             </option>
                          );
                       })}
                    </select>
                    <Search className="absolute right-4 top-3.5 w-4 h-4 text-zinc-600 pointer-events-none" />
                 </div>
              </div>

              <div className="pt-6 border-t border-zinc-800">
                 <button 
                    onClick={handleCreateLink}
                    disabled={!canSave}
                    className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                    <Save className="w-4 h-4" />
                    Create Link
                 </button>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};
