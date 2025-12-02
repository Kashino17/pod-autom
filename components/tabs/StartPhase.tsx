
import React, { useState, useEffect, useRef } from 'react';
import { StartPhaseConfig } from '../../types';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, Tooltip, ReferenceLine } from 'recharts';
import { Info, AlertTriangle, Zap, Calculator, Trophy, Repeat, CheckCircle2, Save, Loader2, Check, Undo2 } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { useAppStore } from '../../src/lib/store';

interface StartPhaseProps {
  config: StartPhaseConfig;
  onChange: (newConfig: StartPhaseConfig) => void;
  onOpenCalculator: () => void;
  shopId: string;
}

export const StartPhase: React.FC<StartPhaseProps> = ({ config, onChange, onOpenCalculator, shopId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const setHasUnsavedChanges = useAppStore(state => state.setHasUnsavedChanges);

  // Track original config for change detection
  const [originalConfig, setOriginalConfig] = useState<StartPhaseConfig>(config);
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
          start_phase_replace_threshold: config.deleteThreshold,
          start_phase_keep_threshold: config.keepThreshold,
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
      console.error('Error saving start phase config:', err);
      setSaveError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };
  const data = [
    { name: 'Prod A', sales: 12 },
    { name: 'Prod B', sales: 1 },
    { name: 'Prod C', sales: 5 },
    { name: 'Prod D', sales: 25 },
    { name: 'Prod E', sales: 0 },
    { name: 'Prod F', sales: 4 },
    { name: 'Prod G', sales: 15 },
    { name: 'Prod H', sales: 2 },
    { name: 'Prod I', sales: 8 },
  ];

  const getBarColor = (sales: number) => {
    if (sales <= config.deleteThreshold) return '#ef4444'; // Red (Replace/Loser)
    if (sales >= config.winnerThreshold) return '#a855f7'; // Purple (Winner)
    if (sales >= config.keepThreshold) return '#10b981'; // Green (Keep)
    return '#27272a'; // Fallback
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Banner - Simplified */}
      <div className="flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <Zap className="w-5 h-5 text-primary" />
           </div>
           <h1 className="text-2xl font-bold text-white">Start Phase Logic</h1>
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
        
        {/* Settings Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
           
           {/* Card: Replace Rule (Formerly Delete Rule) */}
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden group hover:border-red-900/50 transition-colors">
              <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
                 <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-200">Replace Rule</h3>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                 </div>
              </div>
              <div className="p-6 space-y-6">
                 <div>
                    <label className="flex justify-between text-xs font-medium text-zinc-400 mb-4">
                       Threshold (Sales ≤)
                       <span className="text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">{config.deleteThreshold} sales</span>
                    </label>
                    <input 
                       type="range" 
                       min="0" 
                       max="10" 
                       value={config.deleteThreshold}
                       onChange={(e) => onChange({...config, deleteThreshold: parseInt(e.target.value)})}
                       className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(239,68,68,0.5)] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                    />
                 </div>
                 <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                    <p className="text-xs text-red-300/80 leading-relaxed">
                       Warning: Products with <strong>{config.deleteThreshold} sales</strong> or less in the first 7 days will be <strong>automatically replaced</strong> by new products from the creation queue.
                    </p>
                 </div>
              </div>
           </div>

           {/* Card: Classification Thresholds */}
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
                 <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-200">Classification Thresholds</h3>
                 </div>
              </div>
              <div className="p-6 space-y-5">
                 
                 {/* Keep */}
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-emerald-200 mb-1">Keep</label>
                        <p className="text-[10px] text-zinc-500">Sales with this or higher value</p>
                    </div>
                    <input 
                       type="number"
                       value={config.keepThreshold}
                       onChange={(e) => onChange({...config, keepThreshold: parseInt(e.target.value)})}
                       className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg py-2 text-center text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    />
                 </div>

                 <div className="h-px bg-zinc-800 w-full"></div>

                 {/* Winner */}
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <Trophy className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-purple-200 mb-1">Winner (WP)</label>
                        <p className="text-[10px] text-zinc-500">Sales with this or higher value</p>
                    </div>
                    <input 
                       type="number"
                       value={config.winnerThreshold}
                       onChange={(e) => onChange({...config, winnerThreshold: parseInt(e.target.value)})}
                       className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg py-2 text-center text-sm text-white focus:outline-none focus:border-purple-500/50"
                    />
                 </div>

              </div>
           </div>

        </div>

        {/* Visualizer Column */}
        <div className="col-span-12 lg:col-span-8">
           <div className="h-full bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 flex flex-col min-h-[450px]">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="font-medium text-zinc-200">Impact Simulation</h3>
                 <div className="flex gap-4 bg-zinc-950/50 p-1.5 rounded-lg border border-zinc-800/50">
                    <div className="flex items-center gap-2 px-2">
                       <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span>
                       <span className="text-xs text-zinc-400">Replace (Loser)</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 border-l border-zinc-800">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                       <span className="text-xs text-zinc-400">Keep</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 border-l border-zinc-800">
                       <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"></span>
                       <span className="text-xs text-zinc-400">Winner</span>
                    </div>
                 </div>
              </div>

              <div className="flex-1 w-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barSize={40}>
                       <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#52525b', fontSize: 11}} 
                          dy={15} 
                       />
                       <Tooltip 
                          cursor={{fill: 'rgba(255,255,255,0.03)'}}
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: '#fff' }}
                       />
                       <ReferenceLine y={config.deleteThreshold} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Replace', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                       <ReferenceLine y={config.winnerThreshold} stroke="#a855f7" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Winner', fill: '#a855f7', fontSize: 10, position: 'right' }} />
                       <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                          {data.map((entry, index) => (
                             <Cell 
                                key={`cell-${index}`} 
                                fill={getBarColor(entry.sales)} 
                                className="transition-all duration-300 hover:opacity-80"
                             />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};