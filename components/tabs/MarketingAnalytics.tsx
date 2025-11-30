
import React, { useState } from 'react';
import { Share2, Facebook, TrendingUp, RefreshCw, Activity, ArrowRight, Layers, LayoutTemplate } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MarketingAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'TODAY' | '7D' | 'LIFETIME'>('7D');

  // MOCK DATA
  const STATS = {
    PINTEREST: {
      active: 1250,
      today: 45,
      last7d: 320,
      lifetime: 5400,
      replaced: 120, // Products rotated out
    },
    META: {
      active: 890,
      today: 22,
      last7d: 150,
      lifetime: 3100,
      replaced: 85,
    }
  };

  const CHART_DATA = [
    { name: 'Mon', pinterest: 40, meta: 24 },
    { name: 'Tue', pinterest: 30, meta: 18 },
    { name: 'Wed', pinterest: 55, meta: 35 },
    { name: 'Thu', pinterest: 45, meta: 28 },
    { name: 'Fri', pinterest: 60, meta: 40 },
    { name: 'Sat', pinterest: 75, meta: 45 },
    { name: 'Sun', pinterest: 50, meta: 30 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-white mb-1">Ad Sync Reports</h1>
           <p className="text-zinc-400 text-sm">Monitor synchronization health and inventory flow for Pinterest & Meta.</p>
        </div>
        
        {/* Time Range Toggle */}
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
           {(['TODAY', '7D', 'LIFETIME'] as const).map(range => (
              <button 
                 key={range}
                 onClick={() => setTimeRange(range)}
                 className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${timeRange === range ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                 {range === 'TODAY' ? 'Today' : range === '7D' ? 'Last 7 Days' : 'Lifetime'}
              </button>
           ))}
        </div>
      </div>

      {/* Platform Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         
         {/* PINTEREST CARD */}
         <div className="bg-gradient-to-br from-[#E60023]/5 to-zinc-900 border border-[#E60023]/20 rounded-xl overflow-hidden group hover:border-[#E60023]/40 transition-colors relative">
            <div className="absolute top-0 right-0 p-24 bg-[#E60023]/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="p-6 relative z-10">
               <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-[#E60023]/10 rounded-xl border border-[#E60023]/20">
                        <Share2 className="w-6 h-6 text-[#E60023]" />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-white">Pinterest</h3>
                        <p className="text-xs text-zinc-500">Catalog Sync Status</p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] font-bold text-[#E60023] bg-[#E60023]/10 px-2 py-0.5 rounded-full border border-[#E60023]/20 uppercase tracking-wide">
                        Live Sync
                     </span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                     <div className="text-3xl font-bold text-white mb-1">{STATS.PINTEREST.active}</div>
                     <div className="text-xs text-zinc-400 font-medium">Active Ad Products</div>
                  </div>
                  <div>
                     <div className="text-3xl font-bold text-white mb-1">
                        {timeRange === 'TODAY' ? STATS.PINTEREST.today : timeRange === '7D' ? STATS.PINTEREST.last7d : STATS.PINTEREST.lifetime}
                     </div>
                     <div className="text-xs text-zinc-400 font-medium">Synced {timeRange === 'TODAY' ? 'Today' : timeRange === '7D' ? 'This Week' : 'Total'}</div>
                  </div>
               </div>

               <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                     <span className="text-xs text-zinc-400">Replaced / Rotated</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-zinc-300">{STATS.PINTEREST.replaced}</span>
               </div>
            </div>
         </div>

         {/* META CARD */}
         <div className="bg-gradient-to-br from-[#1877F2]/5 to-zinc-900 border border-[#1877F2]/20 rounded-xl overflow-hidden group hover:border-[#1877F2]/40 transition-colors relative">
            <div className="absolute top-0 right-0 p-24 bg-[#1877F2]/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="p-6 relative z-10">
               <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-[#1877F2]/10 rounded-xl border border-[#1877F2]/20">
                        <Facebook className="w-6 h-6 text-[#1877F2]" />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-white">Meta Ads</h3>
                        <p className="text-xs text-zinc-500">Facebook & Instagram</p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[10px] font-bold text-[#1877F2] bg-[#1877F2]/10 px-2 py-0.5 rounded-full border border-[#1877F2]/20 uppercase tracking-wide">
                        Live Sync
                     </span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                     <div className="text-3xl font-bold text-white mb-1">{STATS.META.active}</div>
                     <div className="text-xs text-zinc-400 font-medium">Active Ad Products</div>
                  </div>
                  <div>
                     <div className="text-3xl font-bold text-white mb-1">
                        {timeRange === 'TODAY' ? STATS.META.today : timeRange === '7D' ? STATS.META.last7d : STATS.META.lifetime}
                     </div>
                     <div className="text-xs text-zinc-400 font-medium">Synced {timeRange === 'TODAY' ? 'Today' : timeRange === '7D' ? 'This Week' : 'Total'}</div>
                  </div>
               </div>

               <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                     <span className="text-xs text-zinc-400">Replaced / Rotated</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-zinc-300">{STATS.META.replaced}</span>
               </div>
            </div>
         </div>

      </div>

      {/* Sync Volume Chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
               <Activity className="w-5 h-5 text-zinc-500" />
               Sync Volume (Last 7 Days)
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium">
               <div className="flex items-center gap-2 text-[#E60023]">
                  <span className="w-3 h-3 rounded-full bg-[#E60023]"></span> Pinterest
               </div>
               <div className="flex items-center gap-2 text-[#1877F2]">
                  <span className="w-3 h-3 rounded-full bg-[#1877F2]"></span> Meta Ads
               </div>
            </div>
         </div>

         <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={CHART_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                     <linearGradient id="colorPin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E60023" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#E60023" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1877F2" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#1877F2" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                     itemStyle={{ fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="pinterest" stroke="#E60023" fillOpacity={1} fill="url(#colorPin)" strokeWidth={2} />
                  <Area type="monotone" dataKey="meta" stroke="#1877F2" fillOpacity={1} fill="url(#colorMeta)" strokeWidth={2} />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Recent Batches (Visual List) */}
      <div className="space-y-4">
         <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <Layers className="w-5 h-5 text-zinc-500" />
            Recent Sync Batches
         </h2>
         <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
            {[1, 2, 3, 4, 5].map((i) => (
               <div key={i} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className={`p-2 rounded-lg ${i % 2 === 0 ? 'bg-[#E60023]/10 border border-[#E60023]/20' : 'bg-[#1877F2]/10 border border-[#1877F2]/20'}`}>
                        {i % 2 === 0 ? <Share2 className={`w-4 h-4 text-[#E60023]`} /> : <Facebook className={`w-4 h-4 text-[#1877F2]`} />}
                     </div>
                     <div>
                        <div className="text-sm font-medium text-white flex items-center gap-2">
                           {i % 2 === 0 ? 'Pinterest' : 'Meta Ads'} - Batch #{100+i}
                           <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Success</span>
                        </div>
                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                           <LayoutTemplate className="w-3 h-3" />
                           {i % 2 === 0 ? 'Summer Collection' : 'Best Sellers'}
                        </div>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-sm font-mono text-zinc-300 font-bold">50 items</div>
                     <div className="text-xs text-zinc-500">Just now</div>
                  </div>
               </div>
            ))}
         </div>
      </div>

    </div>
  );
};
