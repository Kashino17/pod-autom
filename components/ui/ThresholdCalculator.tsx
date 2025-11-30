import React, { useState, useMemo, useEffect } from 'react';
import { X, Calculator, ArrowRight, Info, AlertTriangle, ChevronRight, Copy } from 'lucide-react';

interface ThresholdCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThresholdCalculator: React.FC<ThresholdCalculatorProps> = ({ isOpen, onClose }) => {
  // Initialize state from localStorage or defaults
  const [inputs, setInputs] = useState(() => {
    const saved = localStorage.getItem('reboss_calc_inputs');
    return saved ? JSON.parse(saved) : {
      actualCPA: 12,
      aov: 30,
      cogs: 33,
      minProfitPerWeek: 20,
    };
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('reboss_calc_inputs', JSON.stringify(inputs));
  }, [inputs]);

  const handleChange = (field: string, value: string) => {
    setInputs((prev: any) => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const calculations = useMemo(() => {
    const { actualCPA, aov, cogs, minProfitPerWeek } = inputs;
    
    const grossMargin = aov * (1 - cogs / 100);
    const profitPerSale = grossMargin - actualCPA;
    const breakEvenCPA = grossMargin;
    const isProfitable = profitPerSale > 0;
    
    const minSalesPerWeek = isProfitable 
      ? Math.ceil(minProfitPerWeek / profitPerSale) 
      : 0;
    
    const getThresholdForDays = (days: number) => {
      if (!isProfitable) return { min: '—', explanation: 'Nicht profitabel' };
      const baseMin = (minSalesPerWeek / 7) * days;
      const minValue = Math.max(1, Math.floor(baseMin));
      return {
        min: minValue,
        explanation: `${minSalesPerWeek} Sales/Woche × (${days}÷7) = ${baseMin.toFixed(1)} → ${minValue} Sales`
      };
    };
    
    const replaceValue = isProfitable ? Math.max(1, Math.floor(minSalesPerWeek * 0.5)) : '—';
    const scaleValue = isProfitable ? Math.ceil(minSalesPerWeek * 2) : '—';
    
    const startPhase = {
      delete: isProfitable ? 0 : '—',
      deleteExplanation: '0 Sales nach 7 Tagen = Keine Traktion',
      replace: replaceValue,
      replaceExplanation: isProfitable 
        ? `< ${replaceValue} Sales (50% vom Ziel)`
        : 'Nicht profitabel',
      keep: isProfitable ? minSalesPerWeek : '—',
      keepExplanation: isProfitable
        ? `≥ ${minSalesPerWeek} Sales (Ziel erreicht)`
        : 'Nicht profitabel',
      scale: scaleValue,
      scaleExplanation: isProfitable
        ? `≥ ${scaleValue} Sales (200% vom Ziel)`
        : 'Nicht profitabel',
    };
    
    const postPhase = {
      3: getThresholdForDays(3),
      7: getThresholdForDays(7),
      10: getThresholdForDays(10),
      14: getThresholdForDays(14),
    };
    
    return {
      grossMargin,
      profitPerSale,
      breakEvenCPA,
      isProfitable,
      minSalesPerWeek,
      startPhase,
      postPhase
    };
  }, [inputs]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-[500px] bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Calculator className="w-5 h-5 text-indigo-400" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-white">Threshold Calculator</h2>
                <p className="text-xs text-zinc-500">Calculate realistic automation rules</p>
             </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
             <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          
          {/* INPUTS */}
          <div className="space-y-4">
             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Your Metrics
             </h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-xs text-zinc-400">Actual CPA</label>
                   <div className="relative">
                      <input 
                        type="number" min="0" step="0.5"
                        value={inputs.actualCPA}
                        onChange={(e) => handleChange('actualCPA', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-3 pr-8 text-sm text-white focus:border-indigo-500 outline-none"
                      />
                      <span className="absolute right-3 top-2 text-xs text-zinc-500">€</span>
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs text-zinc-400">AOV (Order Value)</label>
                   <div className="relative">
                      <input 
                        type="number" min="0" step="1"
                        value={inputs.aov}
                        onChange={(e) => handleChange('aov', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-3 pr-8 text-sm text-white focus:border-indigo-500 outline-none"
                      />
                      <span className="absolute right-3 top-2 text-xs text-zinc-500">€</span>
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs text-zinc-400">COGS (Costs)</label>
                   <div className="relative">
                      <input 
                        type="number" min="0" max="100"
                        value={inputs.cogs}
                        onChange={(e) => handleChange('cogs', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-3 pr-8 text-sm text-white focus:border-indigo-500 outline-none"
                      />
                      <span className="absolute right-3 top-2 text-xs text-zinc-500">%</span>
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs text-zinc-400 text-indigo-400 font-medium">Target Profit / Week</label>
                   <div className="relative">
                      <input 
                        type="number" min="0" step="5"
                        value={inputs.minProfitPerWeek}
                        onChange={(e) => handleChange('minProfitPerWeek', e.target.value)}
                        className="w-full bg-zinc-900 border border-indigo-500/30 rounded-lg py-2 pl-3 pr-8 text-sm text-white focus:border-indigo-500 outline-none shadow-[0_0_10px_rgba(99,102,241,0.1)]"
                      />
                      <span className="absolute right-3 top-2 text-xs text-zinc-500">€</span>
                   </div>
                </div>
             </div>
          </div>

          {/* RESULTS CARD */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4 relative overflow-hidden">
             {!calculations.isProfitable && (
                <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex items-center justify-center z-10 border border-red-500/20 rounded-xl">
                   <div className="bg-zinc-950 border border-red-500/50 rounded-lg p-4 shadow-2xl flex items-center gap-3 max-w-[80%]">
                      <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                      <div>
                         <h4 className="font-bold text-red-400 text-sm">Not Profitable</h4>
                         <p className="text-xs text-zinc-400">CPA is higher than margin. Reduce CPA or increase Price.</p>
                      </div>
                   </div>
                </div>
             )}
             
             <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                   <span className="text-[10px] text-zinc-500 uppercase">Margin / Sale</span>
                   <div className="text-lg font-mono text-zinc-200">€{calculations.grossMargin.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                   <span className="text-[10px] text-zinc-500 uppercase">Profit / Sale</span>
                   <div className={`text-lg font-mono ${calculations.isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                      €{calculations.profitPerSale.toFixed(2)}
                   </div>
                </div>
             </div>

             <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-between">
                <div>
                   <span className="text-[10px] text-indigo-300 uppercase font-bold">Required Sales Velocity</span>
                   <div className="text-xs text-indigo-400/70">To hit €{inputs.minProfitPerWeek} profit/week</div>
                </div>
                <div className="text-2xl font-bold text-white">
                   {calculations.minSalesPerWeek} <span className="text-xs font-normal text-zinc-400">sales/wk</span>
                </div>
             </div>
          </div>

          {/* START PHASE RECOMMENDATIONS */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
               <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> Start Phase Recommendations
               </h3>
             </div>

             <div className="grid grid-cols-2 gap-3">
                
                {/* Delete */}
                <div className="p-4 bg-zinc-900/50 border border-red-500/20 rounded-xl">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-xs font-bold text-red-400 uppercase">Delete</span>
                   </div>
                   <div className="text-2xl font-bold text-white mb-1">{calculations.startPhase.delete}</div>
                   <p className="text-[10px] text-zinc-500 leading-tight">If sales match this after 7 days.</p>
                </div>

                {/* Replace */}
                <div className="p-4 bg-zinc-900/50 border border-amber-500/20 rounded-xl">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="text-xs font-bold text-amber-400 uppercase">Replace</span>
                   </div>
                   <div className="text-2xl font-bold text-white mb-1">{calculations.startPhase.replace}</div>
                   <p className="text-[10px] text-zinc-500 leading-tight">Less than this = Underperforming.</p>
                </div>

                {/* Keep */}
                <div className="p-4 bg-zinc-900/50 border border-emerald-500/20 rounded-xl">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-bold text-emerald-400 uppercase">Keep</span>
                   </div>
                   <div className="text-2xl font-bold text-white mb-1">{calculations.startPhase.keep}</div>
                   <p className="text-[10px] text-zinc-500 leading-tight">Target met. Product is profitable.</p>
                </div>

                {/* Scale */}
                <div className="p-4 bg-zinc-900/50 border border-emerald-500/20 rounded-xl bg-gradient-to-br from-emerald-500/5 to-transparent">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]"></span>
                      <span className="text-xs font-bold text-emerald-300 uppercase">Winner</span>
                   </div>
                   <div className="text-2xl font-bold text-white mb-1">{calculations.startPhase.scale}</div>
                   <p className="text-[10px] text-zinc-500 leading-tight">Double profit target. Scale ads.</p>
                </div>
             </div>
          </div>

          {/* POST PHASE RECOMMENDATIONS */}
          <div className="space-y-4 pb-8">
             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5" /> Post Phase Averages
             </h3>
             
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
                {[3, 7, 10, 14].map((days) => {
                   const val = calculations.postPhase[days as keyof typeof calculations.postPhase];
                   return (
                      <div key={days} className="flex items-center justify-between p-3 px-4 hover:bg-zinc-800/50 transition-colors group cursor-default">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                               {days}d
                            </div>
                            <div>
                               <div className="text-xs font-medium text-zinc-300">Minimum Total Sales</div>
                               <div className="text-[10px] text-zinc-500">{val.explanation}</div>
                            </div>
                         </div>
                         <div className="text-lg font-bold text-white font-mono">
                            {val.min}
                         </div>
                      </div>
                   );
                })}
             </div>
          </div>

        </div>
      </div>
    </>
  );
};