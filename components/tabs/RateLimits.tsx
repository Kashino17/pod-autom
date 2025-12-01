
import React, { useEffect, useState } from 'react';
import { LimitsConfig, Shop } from '../../types';
import { Gauge, ShieldAlert, Shirt, ShoppingBag, Save, Loader2, CheckCircle } from 'lucide-react';
import { useRateLimits, useUpsertRateLimits } from '../../src/hooks/useRateLimits';

interface RateLimitsProps {
  config: LimitsConfig;
  onChange: (newConfig: LimitsConfig) => void;
  shop: Shop;
}

export const RateLimits: React.FC<RateLimitsProps> = ({ config, onChange, shop }) => {
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Load rate limits from database
  const { data: dbLimits, isLoading } = useRateLimits(shop?.id || null);
  const upsertMutation = useUpsertRateLimits();

  // Sync database values to local config on load
  useEffect(() => {
    if (dbLimits) {
      onChange({
        productCreationLimit: dbLimits.fast_fashion_limit,
        podCreationLimit: dbLimits.pod_creation_limit
      });
    }
  }, [dbLimits]);

  // Track changes
  const handleChange = (newConfig: LimitsConfig) => {
    onChange(newConfig);
    setHasChanges(true);
    setShowSaved(false);
  };

  // Save to database
  const handleSave = async () => {
    if (!shop?.id) return;

    try {
      await upsertMutation.mutateAsync({
        shopId: shop.id,
        fastFashionLimit: config.productCreationLimit,
        podCreationLimit: config.podCreationLimit || 0
      });
      setHasChanges(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save rate limits:', error);
    }
  };

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

        {/* Save Button */}
        <div className="flex items-center gap-3">
          {showSaved && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm animate-in fade-in">
              <CheckCircle className="w-4 h-4" />
              Gespeichert
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || upsertMutation.isPending || isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              hasChanges
                ? 'bg-primary hover:bg-primary/90 text-white'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {upsertMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Speichern
              </>
            )}
          </button>
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

                 {isLoading ? (
                   <div className="flex items-center justify-center py-8">
                     <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                   </div>
                 ) : (
                   <>
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
                                 onChange={(e) => handleChange({...config, productCreationLimit: parseInt(e.target.value) || 0})}
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
                                 onChange={(e) => handleChange({...config, podCreationLimit: parseInt(e.target.value) || 0})}
                                 className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg py-2.5 px-3 text-center text-white font-mono text-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner group-hover:border-zinc-600"
                              />
                           </div>
                           <span className="text-sm text-zinc-500 font-medium w-16">Produkte</span>
                        </div>
                     </div>
                   </>
                 )}

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
