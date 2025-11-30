
import React, { useState } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Activity, Box, Trophy, Zap, RefreshCw, ShoppingBag, Shirt, Layers, Filter } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<'ALL' | 'FAST_FASHION' | 'POD'>('ALL');

  // MOCK DATA SEGMENTS
  const MOCK_DATA = {
    FAST_FASHION: {
      created: 850,
      startPhase: 780,
      survivors: 350,
      postPhase: 320,
      winners: 95,
      losers: 430 // Products set to stock 0
    },
    POD: {
      created: 390,
      startPhase: 200,
      survivors: 70,
      postPhase: 60,
      winners: 17,
      losers: 320
    }
  };

  // Compute displayed data based on selection
  const funnelData = (() => {
    if (viewMode === 'FAST_FASHION') return MOCK_DATA.FAST_FASHION;
    if (viewMode === 'POD') return MOCK_DATA.POD;
    
    // Sum for ALL
    return {
      created: MOCK_DATA.FAST_FASHION.created + MOCK_DATA.POD.created,
      startPhase: MOCK_DATA.FAST_FASHION.startPhase + MOCK_DATA.POD.startPhase,
      survivors: MOCK_DATA.FAST_FASHION.survivors + MOCK_DATA.POD.survivors,
      postPhase: MOCK_DATA.FAST_FASHION.postPhase + MOCK_DATA.POD.postPhase,
      winners: MOCK_DATA.FAST_FASHION.winners + MOCK_DATA.POD.winners,
      losers: MOCK_DATA.FAST_FASHION.losers + MOCK_DATA.POD.losers,
    };
  })();

  // Calculate percentages relative to previous step
  const rates = {
    toStart: Math.round((funnelData.startPhase / funnelData.created) * 100) || 0,
    toSurvivors: Math.round((funnelData.survivors / funnelData.startPhase) * 100) || 0,
    toPost: Math.round((funnelData.postPhase / funnelData.survivors) * 100) || 0,
    toWinners: Math.round((funnelData.winners / funnelData.postPhase) * 100) || 0,
  };

  const getEfficiencyScore = () => {
    if (viewMode === 'POD') return '82.5%';
    if (viewMode === 'FAST_FASHION') return '96.1%';
    return '94.2%';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-white mb-1">Store Analytics</h1>
           <p className="text-zinc-400 text-sm">Real-time insights into your automated product lifecycle.</p>
        </div>
        
        <div className="flex items-center gap-4">
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

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-zinc-400 font-mono">System Operational</span>
            </div>
        </div>
      </div>

      {/* Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         
         {/* Efficiency Score */}
         <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Activity className="w-5 h-5 text-blue-400" />
               </div>
               <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <TrendingUp className="w-3 h-3" /> +12%
               </span>
            </div>
            <div>
               <h3 className="text-3xl font-bold text-white mb-1">{getEfficiencyScore()}</h3>
               <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Automation Efficiency</p>
            </div>
         </div>

         {/* Losers Count (Zero Stock) */}
         <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <Zap className="w-5 h-5 text-amber-400" />
               </div>
            </div>
            <div>
               <h3 className="text-3xl font-bold text-white mb-1">{funnelData.losers}</h3>
               <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Losers (Stock set to 0)</p>
               <p className="text-[10px] text-zinc-600 mt-1">Inventory reset to stop ad spend</p>
            </div>
         </div>

         {/* Total Winners */}
         <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <Trophy className="w-5 h-5 text-purple-400" />
               </div>
            </div>
            <div>
               <h3 className="text-3xl font-bold text-white mb-1">{funnelData.winners}</h3>
               <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Winners (Evergreen)</p>
               <p className="text-[10px] text-zinc-600 mt-1">
                  Success Rate: <span className="text-zinc-400">{((funnelData.winners / funnelData.created) * 100).toFixed(1)}%</span>
               </p>
            </div>
         </div>

      </div>

      {/* LIFECYCLE FUNNEL */}
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-200">Product Lifecycle Funnel</h2>
            <div className="flex items-center gap-2">
               <span className="text-xs text-zinc-500 font-medium">Viewing Data:</span>
               <span className="text-xs font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                  {viewMode === 'ALL' ? 'All Sources' : viewMode === 'FAST_FASHION' ? 'Fast Fashion' : 'Print on Demand'}
               </span>
            </div>
         </div>
         
         <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-8 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[800px] relative">
               
               {/* 1. Created */}
               <FunnelStep 
                  label="Created" 
                  subLabel="New Products"
                  count={funnelData.created} 
                  color="blue"
                  icon={ShoppingBag}
               />

               <Connector rate={rates.toStart} />

               {/* 2. Start Phase */}
               <FunnelStep 
                  label="Start Phase" 
                  subLabel="Launched"
                  count={funnelData.startPhase} 
                  color="indigo"
                  icon={Zap}
               />

               <Connector rate={rates.toSurvivors} />

               {/* 3. Survivors */}
               <FunnelStep 
                  label="Survivors" 
                  subLabel="Passed 7 Days"
                  count={funnelData.survivors} 
                  color="amber"
                  icon={Activity}
               />

               <Connector rate={rates.toPost} />

               {/* 4. Post Phase */}
               <FunnelStep 
                  label="Post Phase" 
                  subLabel="Long-Term Monitor"
                  count={funnelData.postPhase} 
                  color="emerald"
                  icon={RefreshCw}
               />

               <Connector rate={rates.toWinners} />

               {/* 5. Winners */}
               <FunnelStep 
                  label="Winners" 
                  subLabel="Established"
                  count={funnelData.winners} 
                  color="purple"
                  icon={Trophy}
                  isFinal
               />

            </div>
            
            <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-between px-4">
               <div className="text-xs text-zinc-500">
                  <strong>Insight:</strong> 
                  {viewMode === 'POD' 
                     ? ' POD products have a higher drop-off rate in the Start Phase due to strict testing.'
                     : ' Fast Fashion items show strong traction in the first 7 days.'
                  }
               </div>
               <div className="text-xs text-zinc-500">
                  Global Conversion: <strong className="text-zinc-300">{((funnelData.winners / funnelData.created) * 100).toFixed(1)}%</strong>
               </div>
            </div>
         </div>
      </div>

    </div>
  );
};

// Sub-components for cleaner code
const FunnelStep = ({ label, subLabel, count, color, icon: Icon, isFinal }: any) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  };

  const ringColors: Record<string, string> = {
    blue: 'border-blue-500/30',
    indigo: 'border-indigo-500/30',
    amber: 'border-amber-500/30',
    emerald: 'border-emerald-500/30',
    purple: 'border-purple-500/30',
  };

  return (
    <div className="flex flex-col items-center gap-4 relative z-10 group">
       <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-xl transition-transform group-hover:scale-105
          ${colors[color]} ${ringColors[color]} bg-zinc-900
       `}>
          <Icon className="w-7 h-7" />
       </div>
       <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-white font-mono">{count}</div>
          <div className="text-sm font-bold text-zinc-300">{label}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{subLabel}</div>
       </div>
    </div>
  );
};

const Connector = ({ rate }: { rate: number }) => {
   const dropOff = 100 - rate;
   return (
      <div className="flex-1 h-[2px] bg-zinc-800 relative mx-4 -mt-20">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-[10px] font-mono text-zinc-400">
            {rate}%
         </div>
         {dropOff > 0 && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
               <TrendingDown className="w-3 h-3 text-red-500/50 mb-1" />
               <span className="text-[9px] text-red-500/50 font-mono">-{dropOff}%</span>
            </div>
         )}
      </div>
   );
};
