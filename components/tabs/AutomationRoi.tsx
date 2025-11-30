
import React, { useState, useMemo } from 'react';
import { PiggyBank, Clock, ShoppingBag, Shirt, Layers, DollarSign, TrendingUp, Zap, RefreshCw, Share2 } from 'lucide-react';

export const AutomationRoi: React.FC = () => {
  const [viewMode, setViewMode] = useState<'ALL' | 'FAST_FASHION' | 'POD'>('ALL');
  const [dailyAdSpend, setDailyAdSpend] = useState(15);
  const [manualTaskTime, setManualTaskTime] = useState(3); // Minutes

  // MOCK DATA: Activity Counts
  const MOCK_ACTIVITY = {
    FAST_FASHION: {
      deletedProducts: 430, // Products that failed and were "removed" (stock 0)
      priceUpdates: 1250,
      syncActions: 850,
    },
    POD: {
      deletedProducts: 320,
      priceUpdates: 450,
      syncActions: 390,
    }
  };

  // Compute displayed data
  const activity = useMemo(() => {
    if (viewMode === 'FAST_FASHION') return MOCK_ACTIVITY.FAST_FASHION;
    if (viewMode === 'POD') return MOCK_ACTIVITY.POD;
    return {
      deletedProducts: MOCK_ACTIVITY.FAST_FASHION.deletedProducts + MOCK_ACTIVITY.POD.deletedProducts,
      priceUpdates: MOCK_ACTIVITY.FAST_FASHION.priceUpdates + MOCK_ACTIVITY.POD.priceUpdates,
      syncActions: MOCK_ACTIVITY.FAST_FASHION.syncActions + MOCK_ACTIVITY.POD.syncActions,
    };
  }, [viewMode]);

  // Calculations
  const moneySaved = activity.deletedProducts * dailyAdSpend;
  
  const totalActions = activity.deletedProducts + activity.priceUpdates + activity.syncActions;
  const minutesSaved = totalActions * manualTaskTime;
  const hoursSaved = Math.round(minutesSaved / 60);
  
  // Format currency
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-white mb-1">Automation ROI</h1>
           <p className="text-zinc-400 text-sm">Quantify the value of your automated workflows.</p>
        </div>
        
        {/* View Switcher */}
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
           <button 
              onClick={() => setViewMode('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'ALL' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
              <Layers className="w-3.5 h-3.5" /> All
           </button>
           <button 
              onClick={() => setViewMode('FAST_FASHION')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'FAST_FASHION' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
              <ShoppingBag className="w-3.5 h-3.5" /> Fast Fashion
           </button>
           <button 
              onClick={() => setViewMode('POD')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'POD' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
              <Shirt className="w-3.5 h-3.5" /> POD
           </button>
        </div>
      </div>

      {/* Assumptions Control Panel */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
         <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            ROI Assumptions
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Ad Spend Slider */}
            <div>
               <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-400">Avg. Daily Ad Budget (per product)</label>
                  <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded">€{dailyAdSpend}</span>
               </div>
               <input 
                  type="range" 
                  min="5" max="100" step="5"
                  value={dailyAdSpend}
                  onChange={(e) => setDailyAdSpend(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(16,185,129,0.5)]"
               />
               <p className="text-[10px] text-zinc-500 mt-2">
                  Used to calculate money saved by stopping ads for 'Loser' products.
               </p>
            </div>

            {/* Time Slider */}
            <div>
               <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-400">Time per Manual Task</label>
                  <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded">{manualTaskTime} min</span>
               </div>
               <input 
                  type="range" 
                  min="1" max="15" step="1"
                  value={manualTaskTime}
                  onChange={(e) => setManualTaskTime(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
               />
               <p className="text-[10px] text-zinc-500 mt-2">
                  Estimated time it would take a human to perform one action (delete, update, sync).
               </p>
            </div>

         </div>
      </div>

      {/* Hero ROI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         
         {/* Money Saved */}
         <div className="bg-gradient-to-br from-emerald-900/20 to-zinc-900 border border-emerald-500/20 rounded-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                     <PiggyBank className="w-6 h-6 text-emerald-400" />
                  </div>
                  <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Ad Spend Saved</span>
               </div>
               
               <div className="mt-4">
                  <div className="text-5xl font-bold text-white tracking-tight mb-2">{formatMoney(moneySaved)}</div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                     <TrendingUp className="w-4 h-4 text-emerald-500" />
                     <span>based on <strong>{activity.deletedProducts}</strong> stopped losers</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Time Saved */}
         <div className="bg-gradient-to-br from-blue-900/20 to-zinc-900 border border-blue-500/20 rounded-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                     <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">Productivity Gained</span>
               </div>
               
               <div className="mt-4">
                  <div className="text-5xl font-bold text-white tracking-tight mb-2">{hoursSaved} <span className="text-2xl font-normal text-zinc-500">hours</span></div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                     <TrendingUp className="w-4 h-4 text-blue-500" />
                     <span>saved across <strong>{totalActions.toLocaleString()}</strong> automated actions</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         
         {/* Breakdown Item 1 */}
         <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:bg-zinc-900 transition-colors">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-500" />
               </div>
               <div>
                  <div className="text-2xl font-bold text-white">{activity.deletedProducts}</div>
                  <div className="text-xs text-zinc-500">Losers Removed</div>
               </div>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
               <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(activity.deletedProducts / totalActions) * 100}%` }}></div>
            </div>
         </div>

         {/* Breakdown Item 2 */}
         <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:bg-zinc-900 transition-colors">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-indigo-500" />
               </div>
               <div>
                  <div className="text-2xl font-bold text-white">{activity.priceUpdates}</div>
                  <div className="text-xs text-zinc-500">Price/Stock Updates</div>
               </div>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
               <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(activity.priceUpdates / totalActions) * 100}%` }}></div>
            </div>
         </div>

         {/* Breakdown Item 3 */}
         <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:bg-zinc-900 transition-colors">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-pink-500" />
               </div>
               <div>
                  <div className="text-2xl font-bold text-white">{activity.syncActions}</div>
                  <div className="text-xs text-zinc-500">Marketing Syncs</div>
               </div>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
               <div className="bg-pink-500 h-full rounded-full" style={{ width: `${(activity.syncActions / totalActions) * 100}%` }}></div>
            </div>
         </div>

      </div>

    </div>
  );
};
