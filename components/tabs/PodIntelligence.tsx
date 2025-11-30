
import React from 'react';
import { BrainCircuit, TrendingUp, Trophy, AlertCircle, BarChart3, MessageSquare, Zap, Target } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, Tooltip, Legend, YAxis, CartesianGrid } from 'recharts';

export const PodIntelligence: React.FC = () => {
  
  // MOCK DATA: Niche Performance
  const NICHE_DATA = [
    { name: 'Dogs', total: 150, losers: 30, kept: 90, winners: 30 },
    { name: 'Gaming', total: 120, losers: 20, kept: 80, winners: 20 },
    { name: 'Fishing', total: 80, losers: 65, kept: 10, winners: 5 },
    { name: 'Yoga', total: 100, losers: 40, kept: 50, winners: 10 },
    { name: 'Cats', total: 130, losers: 25, kept: 85, winners: 20 },
    { name: 'Nurses', total: 90, losers: 50, kept: 35, winners: 5 },
  ];

  // MOCK DATA: Prompt Efficiency
  const PROMPT_DATA = [
    { id: 'p_1', title: 'Funny Slogan Generator v2', type: 'Humor', created: 240, survivalRate: 82, winners: 15 },
    { id: 'p_2', title: 'Minimalist Line Art', type: 'Art', created: 150, survivalRate: 65, winners: 8 },
    { id: 'p_3', title: 'Vintage 90s Style', type: 'Retro', created: 80, survivalRate: 45, winners: 2 },
    { id: 'p_4', title: 'Aggressive Sales Copy', type: 'Marketing', created: 120, survivalRate: 20, winners: 0 },
    { id: 'p_5', title: 'Pet Portrait Realism', type: 'Pets', created: 200, survivalRate: 90, winners: 25 },
  ];

  // Colors mapping
  const COLORS = {
    loser: '#ef4444', // Red-500
    kept: '#10b981',  // Emerald-500
    winner: '#a855f7' // Purple-500
  };

  const bestNiche = NICHE_DATA.reduce((prev, current) => 
    ((current.kept + current.winners) / current.total) > ((prev.kept + prev.winners) / prev.total) ? current : prev
  );

  const worstNiche = NICHE_DATA.reduce((prev, current) => 
    (current.losers / current.total) > (prev.losers / prev.total) ? current : prev
  );

  const bestPrompt = PROMPT_DATA.reduce((prev, current) => 
    current.survivalRate > prev.survivalRate ? current : prev
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
           <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                 <BrainCircuit className="w-5 h-5 text-purple-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">POD Intelligence</h1>
           </div>
           <p className="text-zinc-400 text-sm max-w-xl">
             Deep dive analysis into which niches and prompts are actually generating profitable products.
           </p>
        </div>
      </div>

      {/* Insight Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         
         {/* Top Niche */}
         <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <Trophy className="w-5 h-5 text-emerald-400" />
               </div>
               <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Best Survival Rate
               </span>
            </div>
            <div>
               <h3 className="text-2xl font-bold text-white mb-1">{bestNiche.name}</h3>
               <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Top Performing Niche</p>
               <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-emerald-500 h-full" style={{ width: `${((bestNiche.kept + bestNiche.winners) / bestNiche.total) * 100}%` }}></div>
                  </div>
                  <span className="text-xs text-emerald-500 font-mono">
                     {Math.round(((bestNiche.kept + bestNiche.winners) / bestNiche.total) * 100)}%
                  </span>
               </div>
            </div>
         </div>

         {/* Most Efficient Prompt */}
         <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <Zap className="w-5 h-5 text-indigo-400" />
               </div>
               <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Highest Efficiency
               </span>
            </div>
            <div>
               <h3 className="text-xl font-bold text-white mb-1 truncate" title={bestPrompt.title}>{bestPrompt.title}</h3>
               <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Best AI Prompt</p>
               <p className="text-[10px] text-zinc-400 mt-1">
                  Generated {bestPrompt.created} products with <span className="text-white font-bold">{bestPrompt.survivalRate}%</span> success.
               </p>
            </div>
         </div>

         {/* Problem Area */}
         <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between hover:border-red-900/30 transition-colors group">
            <div className="flex justify-between items-start mb-4">
               <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-5 h-5 text-red-400" />
               </div>
               <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 group-hover:bg-red-500/20">
                  Highest Churn
               </span>
            </div>
            <div>
               <h3 className="text-2xl font-bold text-white mb-1">{worstNiche.name}</h3>
               <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Lowest Survival Rate</p>
               <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-red-500 h-full" style={{ width: `${(worstNiche.losers / worstNiche.total) * 100}%` }}></div>
                  </div>
                  <span className="text-xs text-red-500 font-mono">
                     {Math.round((worstNiche.losers / worstNiche.total) * 100)}% Losers
                  </span>
               </div>
            </div>
         </div>

      </div>

      {/* 1. NICHE SUCCESS CHART */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
               <BarChart3 className="w-5 h-5 text-zinc-500" />
               Niche Success Rate
            </h2>
            <div className="flex items-center gap-4 text-xs">
               <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-red-500"></span> Loser
               </div>
               <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500"></span> Kept
               </div>
               <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-purple-500"></span> Winner
               </div>
            </div>
         </div>

         <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={NICHE_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                     dataKey="name" 
                     stroke="#52525b" 
                     fontSize={12} 
                     tickLine={false}
                     axisLine={false}
                     dy={10}
                  />
                  <YAxis 
                     stroke="#52525b" 
                     fontSize={12} 
                     tickLine={false}
                     axisLine={false}
                     dx={-10}
                  />
                  <Tooltip 
                     cursor={{fill: 'rgba(255,255,255,0.03)'}}
                     contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                     itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                  />
                  <Bar dataKey="losers" stackId="a" fill={COLORS.loser} radius={[0, 0, 4, 4]} />
                  <Bar dataKey="kept" stackId="a" fill={COLORS.kept} />
                  <Bar dataKey="winners" stackId="a" fill={COLORS.winner} radius={[4, 4, 0, 0]} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* 2. PROMPT EFFICIENCY */}
      <div className="space-y-4">
         <h2 className="text-lg font-bold text-zinc-200 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-zinc-500" />
            Prompt Efficiency Leaderboard
         </h2>

         <div className="grid grid-cols-1 gap-4">
            {PROMPT_DATA.sort((a,b) => b.survivalRate - a.survivalRate).map((prompt, idx) => (
               <div key={prompt.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-6 hover:border-zinc-700 transition-colors group">
                  
                  {/* Rank */}
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-zinc-950 rounded-lg border border-zinc-800 font-mono font-bold text-lg text-zinc-500 group-hover:text-white transition-colors">
                     #{idx + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-white truncate text-base">{prompt.title}</h3>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700 uppercase tracking-wider">
                           {prompt.type}
                        </span>
                     </div>
                     <div className="text-xs text-zinc-500 mt-1 font-mono">
                        ID: {prompt.id} • Generated: {prompt.created} products
                     </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-8">
                     
                     <div className="text-right w-24">
                        <div className="text-xs text-zinc-500 mb-1">Winners</div>
                        <div className="text-sm font-bold text-purple-400">{prompt.winners}</div>
                     </div>

                     <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                           <span className="text-zinc-500">Survival Rate</span>
                           <span className={`font-bold ${prompt.survivalRate > 70 ? 'text-emerald-400' : prompt.survivalRate > 40 ? 'text-amber-400' : 'text-red-400'}`}>
                              {prompt.survivalRate}%
                           </span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                           <div 
                              className={`h-full rounded-full ${prompt.survivalRate > 70 ? 'bg-emerald-500' : prompt.survivalRate > 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                              style={{ width: `${prompt.survivalRate}%` }}
                           ></div>
                        </div>
                     </div>

                  </div>

               </div>
            ))}
         </div>
      </div>

    </div>
  );
};
