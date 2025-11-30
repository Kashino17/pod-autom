
import React from 'react';
import { LimitsConfig } from '../../types';
import { Gauge, ShieldAlert, Shirt, ShoppingBag } from 'lucide-react';

interface RateLimitsProps {
  config: LimitsConfig;
  onChange: (newConfig: LimitsConfig) => void;
}

export const RateLimits: React.FC<RateLimitsProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-100/5 rounded-lg border border-zinc-100/10">
                 <Gauge className="w-5 h-5 text-zinc-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Limits & Beschränkungen</h1>
           </div>
           <p className="text-zinc-400 text-sm max-w-xl">
             Konfigurieren Sie Sicherheitslimits für die Produkterstellung und API-Nutzung.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Main Settings Card */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800 bg-zinc-900/30">
                 <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-zinc-500" />
                    <h3 className="font-semibold text-zinc-200">Creation Limits</h3>
                 </div>
              </div>
              
              <div className="p-8 space-y-8">
                 
                 {/* Fast Fashion Limit */}
                 <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-500/10 rounded-md border border-indigo-500/20">
                          <ShoppingBag className="w-4 h-4 text-indigo-400" />
                       </div>
                       <label className="text-base text-zinc-200 font-medium whitespace-nowrap">
                          Fast Fashion Creation Limit:
                       </label>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <div className="relative group">
                          <input 
                             type="number" 
                             min="0"
                             value={config.productCreationLimit}
                             onChange={(e) => onChange({...config, productCreationLimit: parseInt(e.target.value) || 0})}
                             className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 px-3 text-center text-white font-mono text-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner group-hover:border-zinc-600"
                          />
                       </div>
                       <span className="text-sm text-zinc-500 font-medium w-16">Produkte</span>
                    </div>
                 </div>

                 <div className="h-px bg-zinc-800/50 w-full" />

                 {/* POD Limit */}
                 <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                          <Shirt className="w-4 h-4 text-emerald-400" />
                       </div>
                       <label className="text-base text-zinc-200 font-medium whitespace-nowrap">
                          POD T-Shirt Creation Limit:
                       </label>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <div className="relative group">
                          <input 
                             type="number" 
                             min="0"
                             value={config.podCreationLimit || 0}
                             onChange={(e) => onChange({...config, podCreationLimit: parseInt(e.target.value) || 0})}
                             className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 px-3 text-center text-white font-mono text-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner group-hover:border-zinc-600"
                          />
                       </div>
                       <span className="text-sm text-zinc-500 font-medium w-16">Produkte</span>
                    </div>
                 </div>
                 
                 <div className="mt-4 bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50 flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-500 leading-relaxed">
                       Diese Limits definieren die maximale Anzahl an Produkten, die pro Synchronisationslauf für die jeweilige Kategorie neu erstellt werden dürfen. Dies dient als Sicherheitsmechanismus gegen ungewollte Massenerstellung und API-Überlastung.
                    </p>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};