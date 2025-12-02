
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PostPhaseConfig } from '../../types';
import { RefreshCw, Calculator, CheckCircle2, XCircle, Info, Target, BarChart3, AlertCircle, Save, Loader2, Check, SlidersHorizontal, Undo2 } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { useAppStore } from '../../src/lib/store';

interface PostPhaseProps {
  config: PostPhaseConfig;
  onChange: (newConfig: PostPhaseConfig) => void;
  onOpenCalculator: () => void;
  shopId: string;
}

// Mock data for the simulator
const SIMULATION_PRODUCTS = [
  { id: 1, name: 'Vintage Tee', img: 'bg-blue-500', avgs: { day3: 2, day7: 5, day10: 8, day14: 12 } },
  { id: 2, name: 'Cargo Pants', img: 'bg-emerald-500', avgs: { day3: 0, day7: 1, day10: 2, day14: 3 } },
  { id: 3, name: 'Leather Belt', img: 'bg-amber-500', avgs: { day3: 4, day7: 8, day10: 10, day14: 15 } },
  { id: 4, name: 'Wool Socks', img: 'bg-purple-500', avgs: { day3: 2, day7: 3, day10: 5, day14: 7 } },
  { id: 5, name: 'Denim Jacket', img: 'bg-zinc-500', avgs: { day3: 0, day7: 0, day10: 0, day14: 1 } },
];

export const PostPhase: React.FC<PostPhaseProps> = ({ config, onChange, onOpenCalculator, shopId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const setHasUnsavedChanges = useAppStore(state => state.setHasUnsavedChanges);

  // Sales boost slider for simulation (0-20)
  const [salesBoost, setSalesBoost] = useState(0);

  // Track original config for change detection
  const [originalConfig, setOriginalConfig] = useState<PostPhaseConfig>(config);
  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // Sync hasChanges with global store
  useEffect(() => {
    setHasUnsavedChanges(hasChanges);
  }, [hasChanges, setHasUnsavedChanges]);

  // Reset hasUnsavedChanges when unmounting
  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  // Update original config when component mounts or config is loaded from DB
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      setOriginalConfig(config);
      isInitialMount.current = false;
    }
  }, []);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleDiscard = () => {
    onChange(originalConfig);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const { error } = await supabase
        .from('shop_rules')
        .upsert({
          shop_id: shopId,
          min_ok_buckets: config.minBuckets,
          avg3_ok: config.averageSettings.day3,
          avg7_ok: config.averageSettings.day7,
          avg10_ok: config.averageSettings.day10,
          avg14_ok: config.averageSettings.day14,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'shop_id'
        });

      if (error) throw error;

      // Update original config after successful save
      setOriginalConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('Error saving post phase config:', err);
      setSaveError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to update specific nested settings
  const updateAvg = (key: keyof PostPhaseConfig['averageSettings'], value: number) => {
    onChange({
      ...config,
      averageSettings: {
        ...config.averageSettings,
        [key]: value
      }
    });
  };

  // Calculate logic for the simulation table (with salesBoost applied)
  const simulationResults = useMemo(() => {
    return SIMULATION_PRODUCTS.map(product => {
      // Apply sales boost to all values
      const boostedAvgs = {
        day3: product.avgs.day3 + salesBoost,
        day7: product.avgs.day7 + salesBoost,
        day10: product.avgs.day10 + salesBoost,
        day14: product.avgs.day14 + salesBoost,
      };

      // Check each timeframe against config
      const checks = {
        day3: boostedAvgs.day3 >= config.averageSettings.day3,
        day7: boostedAvgs.day7 >= config.averageSettings.day7,
        day10: boostedAvgs.day10 >= config.averageSettings.day10,
        day14: boostedAvgs.day14 >= config.averageSettings.day14,
      };

      // Count successful buckets
      const successCount = Object.values(checks).filter(Boolean).length;
      const passed = successCount >= config.minBuckets;

      return { product, checks, successCount, passed, boostedAvgs };
    });
  }, [config, salesBoost]);

  const passingProducts = simulationResults.filter(r => r.passed).length;
  const failingProducts = simulationResults.length - passingProducts;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <RefreshCw className="w-5 h-5 text-indigo-400" />
           </div>
           <h1 className="text-2xl font-bold text-white">Post Phase Logic</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
             onClick={onOpenCalculator}
             className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors border border-zinc-700 hover:text-white group"
           >
              <Calculator className="w-3.5 h-3.5 text-zinc-500 group-hover:text-primary transition-colors" />
              Open Calculator
           </button>

          {/* Show Discard and Save buttons only when there are changes */}
          {hasChanges && (
            <>
              <button
                onClick={handleDiscard}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors border border-zinc-700 hover:text-white"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Discard
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`
                  flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all border
                  ${saveSuccess
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : saveError
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-primary hover:bg-primary/90 border-primary text-white'}
                  ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}
                `}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saveSuccess ? 'Saved!' : saveError ? 'Error' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Configuration */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Minimum Buckets Config */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden group hover:border-indigo-500/30 transition-colors">
            <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
               <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-200">Validation Strategy</h3>
                  <Target className="w-4 h-4 text-indigo-400" />
               </div>
            </div>
            
            <div className="p-6">
               <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-medium text-zinc-400">Required Success Points</label>
                  <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                     {config.minBuckets} of 4
                  </span>
               </div>

               <div className="grid grid-cols-4 gap-2">
                 {[1, 2, 3, 4].map((num) => (
                   <button
                     key={num}
                     onClick={() => onChange({...config, minBuckets: num})}
                     className={`
                       py-2.5 rounded-lg text-sm font-bold transition-all border
                       ${config.minBuckets === num 
                         ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                         : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}
                     `}
                   >
                     {num}
                   </button>
                 ))}
               </div>
               
               <div className="mt-4 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg flex gap-2">
                  <Info className="w-4 h-4 text-indigo-400/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-indigo-300/70 leading-relaxed">
                     A product must meet the sales target in at least <strong>{config.minBuckets}</strong> of the 4 monitored timeframes to remain active. Otherwise, it will get the 'LOSER' tag and stock set to 0.
                  </p>
               </div>
            </div>
          </div>

          {/* Timeframe Thresholds */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
              <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-200">Performance Thresholds</h3>
                  <BarChart3 className="w-4 h-4 text-zinc-500" />
               </div>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* Consolidated Group */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Sustain Phase (Rolling Performance)</label>
                   <div className="h-px bg-zinc-800 w-24"></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* 3 Days */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-medium text-zinc-400">Last 3 Days</span>
                    <input 
                      type="number" 
                      min="0"
                      value={config.averageSettings.day3}
                      onChange={(e) => updateAvg('day3', parseFloat(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono text-center"
                    />
                  </div>
                  
                  {/* 7 Days */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-medium text-zinc-400">Last 7 Days</span>
                    <input 
                      type="number" 
                      min="0"
                      value={config.averageSettings.day7}
                      onChange={(e) => updateAvg('day7', parseFloat(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono text-center"
                    />
                  </div>

                  {/* 10 Days */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-medium text-zinc-400">Last 10 Days</span>
                    <input 
                      type="number" 
                      min="0"
                      value={config.averageSettings.day10}
                      onChange={(e) => updateAvg('day10', parseFloat(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono text-center"
                    />
                  </div>
                  
                  {/* 14 Days */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-medium text-zinc-400">Last 14 Days</span>
                    <input 
                      type="number" 
                      min="0"
                      value={config.averageSettings.day14}
                      onChange={(e) => updateAvg('day14', parseFloat(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono text-center"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Matrix */}
        <div className="col-span-12 lg:col-span-8">
          <div className="h-full bg-zinc-900/30 border border-zinc-800 rounded-xl flex flex-col min-h-[500px] overflow-hidden">
            
            {/* Simulation Header */}
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
               <div className="flex items-center justify-between mb-4">
                  <div>
                     <h3 className="font-semibold text-zinc-200">Logic Simulation Matrix</h3>
                     <p className="text-xs text-zinc-500 mt-1">Live preview of automated decisions based on sales data</p>
                  </div>

                  <div className="flex items-center gap-6">
                     <div className="text-right">
                        <span className="block text-xl font-bold text-emerald-400">{passingProducts}</span>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Keep (Active)</span>
                     </div>
                     <div className="w-px h-8 bg-zinc-800"></div>
                     <div className="text-right">
                        <span className="block text-xl font-bold text-red-400">{failingProducts}</span>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Archive</span>
                     </div>
                  </div>
               </div>

               {/* Sales Boost Slider */}
               <div className="flex items-center gap-4 p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-2 shrink-0">
                     <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                     <span className="text-xs font-medium text-zinc-400">Sales Boost</span>
                  </div>
                  <input
                     type="range"
                     min="0"
                     max="20"
                     step="1"
                     value={salesBoost}
                     onChange={(e) => setSalesBoost(parseInt(e.target.value))}
                     className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(99,102,241,0.5)] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                  />
                  <div className="shrink-0 min-w-[4rem] text-right">
                     <span className={`text-sm font-bold ${salesBoost > 0 ? 'text-indigo-400' : 'text-zinc-500'}`}>
                        +{salesBoost}
                     </span>
                     <span className="text-[10px] text-zinc-600 ml-1">sales</span>
                  </div>
               </div>
            </div>

            {/* Matrix Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-950/50 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4 font-medium">Product</th>
                    <th className="px-4 py-4 text-center">3 Days</th>
                    <th className="px-4 py-4 text-center">7 Days</th>
                    <th className="px-4 py-4 text-center">10 Days</th>
                    <th className="px-4 py-4 text-center">14 Days</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {simulationResults.map(({ product, checks, passed, boostedAvgs }) => (
                    <tr key={product.id} className="group hover:bg-zinc-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center`}>
                            <span className="text-xs font-bold text-zinc-400">{product.name.charAt(0)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-zinc-200">{product.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">ID: #{product.id}294</div>
                          </div>
                        </div>
                      </td>

                      {/* Dynamic Cells */}
                      {['day3', 'day7', 'day10', 'day14'].map((period) => {
                         const key = period as keyof typeof checks;
                         const isPassed = checks[key];
                         const boostedValue = boostedAvgs[key];
                         const target = config.averageSettings[key as keyof typeof config.averageSettings];

                         return (
                            <td key={period} className="px-4 py-4 text-center">
                              <div className={`
                                inline-flex flex-col items-center justify-center min-w-[3.5rem] py-1 rounded border transition-all duration-300
                                ${isPassed
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/5 border-red-500/10 text-red-400/70'}
                              `}>
                                <span className="font-mono font-bold text-xs">
                                  {boostedValue}
                                </span>
                                <span className="text-[9px] opacity-50">/ {target}</span>
                              </div>
                            </td>
                         );
                      })}

                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                            <span className={`text-xs font-medium ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                               {passed ? 'Keep' : 'Archive'}
                            </span>
                            {passed ? (
                               <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                               <XCircle className="w-5 h-5 text-red-500/50" />
                            )}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 text-center">
               <p className="text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Products are evaluated daily at 00:00 UTC.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
