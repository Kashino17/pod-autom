
import React, { useState, useEffect } from 'react';
import { GeneralConfig } from '../../types';
import { Settings, Tag, Hash, Package, Link, CalendarClock, Database, AlertTriangle, CheckCircle, Loader2, Store, Save, Check, LayoutGrid, Info, Skull } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { useAllShopsResearchStatus, useInitializeAllMissingResearchTables } from '../../src/hooks/useFastFashionResearch';
import { usePinterestSettings, useUpdatePinterestSettings } from '../../src/hooks/usePinterest';

interface GeneralSettingsProps {
  config: GeneralConfig;
  onChange: (newConfig: GeneralConfig) => void;
  shopId?: string;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ config, onChange, shopId }) => {
  // Fast Fashion Research Table Status Hooks
  const { data: researchStatus, isLoading: statusLoading } = useAllShopsResearchStatus();
  const initializeAllMutation = useInitializeAllMissingResearchTables();

  // Pinterest Settings (for url_prefix)
  const { data: pinterestSettings } = usePinterestSettings(shopId || null);
  const updatePinterestSettings = useUpdatePinterestSettings();

  // Save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Loser threshold info tooltip
  const [showLoserInfo, setShowLoserInfo] = useState(false);

  // Sync urlPrefix and productsPerPage from Pinterest settings
  useEffect(() => {
    if (pinterestSettings) {
      const updates: Partial<GeneralConfig> = {};

      if (pinterestSettings.url_prefix !== undefined && pinterestSettings.url_prefix !== config.urlPrefix) {
        updates.urlPrefix = pinterestSettings.url_prefix || '';
      }

      if (pinterestSettings.products_per_page !== undefined && pinterestSettings.products_per_page !== config.productsPerPage) {
        updates.productsPerPage = pinterestSettings.products_per_page || 10;
      }

      if (Object.keys(updates).length > 0) {
        onChange({ ...config, ...updates });
      }
    }
  }, [pinterestSettings?.url_prefix, pinterestSettings?.products_per_page]);

  const handleInitializeAll = async () => {
    try {
      await initializeAllMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to initialize research tables:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!shopId) {
      setSaveError('Shop ID fehlt');
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);

    try {
      // Save url_prefix and products_per_page to pinterest_settings
      await updatePinterestSettings.mutateAsync({
        shopId,
        settings: {
          url_prefix: config.urlPrefix,
          products_per_page: config.productsPerPage
        }
      });

      // Save loser_threshold and other settings to shop_rules
      const { error: rulesError } = await supabase
        .from('shop_rules')
        .upsert({
          shop_id: shopId,
          loser_threshold: config.loserThreshold,
          qk_tag: config.qkTag,
          replace_tag_prefix: config.replaceTagPrefix,
          start_phase_days: config.startPhaseDays,
          nach_phase_days: config.postPhaseDays,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'shop_id'
        });

      if (rulesError) throw rulesError;

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Unbekannter Fehler');
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveError(null);
      }, 5000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-100/5 rounded-lg border border-zinc-100/10">
                 <Settings className="w-5 h-5 text-zinc-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">General Settings</h1>
           </div>
           <p className="text-zinc-400 text-sm max-w-xl">
             Configure global tag definitions used by the automation engine to identify and process products.
           </p>
        </div>
      </div>

      {/* Fast Fashion Research Tables Status (Plan B) */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center gap-2">
          <Database className="w-4 h-4 text-zinc-500" />
          <h3 className="font-semibold text-zinc-200 text-sm">Fast Fashion Research Tabellen</h3>
        </div>

        <div className="p-5">
          {statusLoading ? (
            <div className="flex items-center gap-3 p-4 bg-zinc-950/50 rounded-lg border border-zinc-800">
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
              <span className="text-sm text-zinc-400">Prüfe Research Tabellen Status...</span>
            </div>
          ) : researchStatus?.all_initialized ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-950/30 rounded-lg border border-emerald-800/50">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <span className="text-sm text-emerald-300 font-medium">Alle Research Tabellen vorhanden</span>
                <p className="text-xs text-emerald-400/60 mt-0.5">
                  {researchStatus.shops?.length || 0} Shop(s) - Alle Fast Fashion Research Tabellen sind initialisiert.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-amber-950/30 rounded-lg border border-amber-800/50">
                <div className="p-1.5 bg-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-amber-300 font-medium">
                    {researchStatus?.missing_count || 0} Research Tabelle(n) fehlen
                  </span>
                  <p className="text-xs text-amber-400/60 mt-0.5">
                    Einige Shops haben keine verknüpfte Research-Tabelle. Klicke auf den Button um sie zu erstellen.
                  </p>
                </div>
                <button
                  onClick={handleInitializeAll}
                  disabled={initializeAllMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-sm font-medium transition-colors border border-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {initializeAllMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Erstelle...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Alle erstellen
                    </>
                  )}
                </button>
              </div>

              {/* Liste der fehlenden Shops */}
              {researchStatus?.missing_shops && researchStatus.missing_shops.length > 0 && (
                <div className="bg-zinc-950/50 rounded-lg border border-zinc-800 p-3">
                  <p className="text-xs text-zinc-500 mb-2">Shops ohne Research-Tabelle:</p>
                  <div className="flex flex-wrap gap-2">
                    {researchStatus.missing_shops.map((shop) => (
                      <div key={shop.shop_id} className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 rounded border border-zinc-700">
                        <Store className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs text-zinc-400">{shop.internal_name || shop.shop_domain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Erfolgsmeldung nach Initialisierung */}
              {initializeAllMutation.isSuccess && initializeAllMutation.data && (
                <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-800/50">
                  <p className="text-xs text-emerald-400">
                    {initializeAllMutation.data.created_count} Tabelle(n) erfolgreich erstellt
                    {initializeAllMutation.data.failed_count > 0 && (
                      <span className="text-amber-400"> ({initializeAllMutation.data.failed_count} fehlgeschlagen)</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column: Form */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800 bg-zinc-900/30">
                 <h3 className="font-semibold text-zinc-200">Configuration</h3>
              </div>
              
              <div className="p-6 space-y-6">
                 
                 {/* QK Tag Input */}
                 <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                       <Tag className="w-3 h-3" />
                       QK Identifier Tag
                    </label>
                    <div className="relative group">
                       <input 
                          type="text" 
                          value={config.qkTag}
                          onChange={(e) => onChange({...config, qkTag: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-700 font-mono"
                          placeholder="QK"
                       />
                       <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">TAG</span>
                       </div>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                       This tag marks products for Source Collection (Quell Kollektion).
                    </p>
                 </div>

                 <div className="h-px bg-zinc-800 w-full" />

                 {/* Replace Prefix Input */}
                 <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                       <Hash className="w-3 h-3" />
                       Replace Tag Prefix
                    </label>
                    <div className="relative group">
                       <input 
                          type="text" 
                          value={config.replaceTagPrefix}
                          onChange={(e) => onChange({...config, replaceTagPrefix: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-700 font-mono"
                          placeholder="replace_"
                       />
                    </div>
                    <p className="text-[11px] text-zinc-500">
                       Prefix used for automated stock replacement logic (e.g. {config.replaceTagPrefix || 'replace_'}123).
                    </p>
                 </div>

                 <div className="h-px bg-zinc-800 w-full" />

                 {/* URL Prefix Input */}
                 <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                       <Link className="w-3 h-3" />
                       URL Prefix
                    </label>
                    <div className="relative group">
                       <input
                          type="text"
                          value={config.urlPrefix}
                          onChange={(e) => onChange({...config, urlPrefix: e.target.value})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-700 font-mono"
                          placeholder="https://myshop.com"
                       />
                    </div>
                    <p className="text-[11px] text-zinc-500">
                       Base URL used for constructing collection page links (e.g., https://myshop.com).
                    </p>
                 </div>

                 <div className="h-px bg-zinc-800 w-full" />

                 {/* Products per Page Input */}
                 <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                       <LayoutGrid className="w-3 h-3" />
                       Products per Page (Collection)
                    </label>
                    <div className="relative group">
                       <input
                          type="number"
                          min="1"
                          max="100"
                          value={config.productsPerPage}
                          onChange={(e) => onChange({...config, productsPerPage: Math.max(1, parseInt(e.target.value) || 10)})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-700 font-mono"
                          placeholder="10"
                       />
                    </div>
                    <p className="text-[11px] text-zinc-500">
                       Number of products displayed per page in your Shopify collection. Used to calculate correct Pinterest pin links.
                       <br />
                       <span className="text-zinc-600">
                          Example: If set to 10, products 1-10 link to page 1, products 11-20 link to page 2, etc.
                       </span>
                    </p>
                 </div>

                 <div className="h-px bg-zinc-800 w-full" />

                 {/* Loser Threshold Input */}
                 <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                       <Skull className="w-3 h-3" />
                       Loser Threshold
                       <div className="relative">
                          <button
                             type="button"
                             onClick={() => setShowLoserInfo(!showLoserInfo)}
                             onMouseEnter={() => setShowLoserInfo(true)}
                             onMouseLeave={() => setShowLoserInfo(false)}
                             className="p-0.5 rounded-full hover:bg-zinc-700 transition-colors"
                          >
                             <Info className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
                          </button>
                          {showLoserInfo && (
                             <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl text-left">
                                <p className="text-xs text-zinc-300 leading-relaxed">
                                   <strong className="text-red-400">Loser Threshold</strong> bestimmt, ob ein Produkt beim Ersetzen als <strong className="text-red-400">LOSER</strong> oder <strong className="text-amber-400">REPLACED</strong> markiert wird.
                                </p>
                                <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1">
                                   <p className="text-[11px] text-zinc-400">
                                      <span className="text-red-400">LOSER:</span> Total Sales ≤ Threshold → Bestand = 0
                                   </p>
                                   <p className="text-[11px] text-zinc-400">
                                      <span className="text-amber-400">REPLACED:</span> Total Sales &gt; Threshold → Bestand bleibt
                                   </p>
                                </div>
                             </div>
                          )}
                       </div>
                    </label>
                    <div className="relative group">
                       <input
                          type="number"
                          min="0"
                          max="100"
                          value={config.loserThreshold}
                          onChange={(e) => onChange({...config, loserThreshold: Math.max(0, parseInt(e.target.value) || 0)})}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-zinc-700 font-mono"
                          placeholder="5"
                       />
                       <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">SALES</span>
                       </div>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                       Produkte mit ≤ {config.loserThreshold || 0} Total Sales werden als LOSER markiert (Stock = 0).
                    </p>
                 </div>

                 <div className="h-px bg-zinc-800 w-full" />

                 {/* Phasen-Zeitfenster */}
                 <div className="space-y-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                       <CalendarClock className="w-3 h-3" />
                       Phasen-Zeitfenster
                    </label>
                    
                    <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800/50 space-y-4">
                       {/* Start Phase */}
                       <div className="flex items-center justify-between gap-4">
                          <label className="text-sm text-zinc-300">Start Phase beginnt nach:</label>
                          <div className="flex items-center gap-3">
                             <div className="relative w-20">
                                <input 
                                   type="number" 
                                   min="1"
                                   value={config.startPhaseDays}
                                   onChange={(e) => onChange({...config, startPhaseDays: Math.max(0, parseInt(e.target.value) || 0)})}
                                   className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2 px-3 text-center text-sm text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                                />
                             </div>
                             <span className="text-sm text-zinc-500 w-10">Tagen</span>
                          </div>
                       </div>

                       {/* Post Phase */}
                       <div className="flex items-center justify-between gap-4">
                          <label className="text-sm text-zinc-300">Nach Phase beginnt nach:</label>
                          <div className="flex items-center gap-3">
                             <div className="relative w-20">
                                <input 
                                   type="number" 
                                   min={config.startPhaseDays}
                                   value={config.postPhaseDays}
                                   onChange={(e) => onChange({...config, postPhaseDays: Math.max(config.startPhaseDays, parseInt(e.target.value) || 0)})}
                                   className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2 px-3 text-center text-sm text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                                />
                             </div>
                             <span className="text-sm text-zinc-500 w-10">Tagen</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Save Button */}
                 <div className="pt-4 border-t border-zinc-800">
                    <button
                       onClick={handleSaveSettings}
                       disabled={saveStatus === 'saving' || !shopId}
                       className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                          saveStatus === 'success'
                             ? 'bg-emerald-600 text-white'
                             : saveStatus === 'error'
                             ? 'bg-red-600 text-white'
                             : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                       } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                       {saveStatus === 'saving' ? (
                          <>
                             <Loader2 className="w-4 h-4 animate-spin" />
                             Speichern...
                          </>
                       ) : saveStatus === 'success' ? (
                          <>
                             <Check className="w-4 h-4" />
                             Gespeichert!
                          </>
                       ) : saveStatus === 'error' ? (
                          <>
                             <AlertTriangle className="w-4 h-4" />
                             Fehler!
                          </>
                       ) : (
                          <>
                             <Save className="w-4 h-4" />
                             Einstellungen speichern
                          </>
                       )}
                    </button>
                    {saveStatus === 'error' && saveError && (
                       <p className="mt-2 text-xs text-red-400 text-center">{saveError}</p>
                    )}
                    {!shopId && (
                       <p className="mt-2 text-xs text-zinc-500 text-center">Shop ID fehlt - Speichern nicht möglich</p>
                    )}
                 </div>

              </div>
           </div>
        </div>

        {/* Right Column: Visual Preview */}
        <div className="col-span-12 lg:col-span-7">
           <div className="h-full bg-zinc-900/30 border border-zinc-800 rounded-xl p-8 flex flex-col justify-center items-center relative overflow-hidden">
              
              {/* Live Indicator Badge */}
              <div className="absolute top-4 right-4 z-10">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">Live Preview</span>
                 </div>
              </div>

              {/* Background Grid Decoration */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

              <div className="relative w-full max-w-md z-0 flex flex-col gap-6">
                 <div className="text-center">
                    <h3 className="text-lg font-medium text-zinc-300">Shopify Admin Representation</h3>
                    <p className="text-xs text-zinc-500 mt-1">Real-time visualization of tag injection & timeline</p>
                 </div>

                 {/* Mock Shopify Product Card */}
                 <div className="bg-white rounded-lg shadow-2xl border border-zinc-200 overflow-hidden transform transition-all duration-500 hover:scale-[1.02]">
                    <div className="bg-zinc-50 border-b border-zinc-200 p-3 flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-zinc-300"></div>
                       <div className="h-2 w-24 bg-zinc-200 rounded-full"></div>
                    </div>
                    
                    <div className="p-6 flex gap-4">
                       <div className="w-20 h-20 bg-zinc-100 rounded-md border border-zinc-200 flex items-center justify-center">
                          <Package className="w-8 h-8 text-zinc-300" />
                       </div>
                       
                       <div className="flex-1 space-y-3">
                          <div className="h-4 w-3/4 bg-zinc-200 rounded animate-pulse"></div>
                          <div className="h-3 w-1/2 bg-zinc-100 rounded"></div>
                          
                          <div className="pt-2">
                             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Active Tags</p>
                             <div className="flex flex-wrap gap-2">
                                
                                {/* Static Tag */}
                                <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-100 text-zinc-600 text-xs border border-zinc-200">
                                   Summer Collection
                                </span>

                                {/* Configured QK Tag */}
                                {config.qkTag && (
                                   <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 font-medium">
                                      {config.qkTag}
                                   </span>
                                )}

                                {/* Configured Replace Tag */}
                                {config.replaceTagPrefix && (
                                   <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200 font-medium font-mono">
                                      {config.replaceTagPrefix}5
                                   </span>
                                )}

                             </div>
                          </div>
                       </div>
                    </div>

                    {/* URL Preview Section in Card */}
                    <div className="bg-zinc-50 p-3 border-t border-zinc-200 text-xs font-mono text-zinc-500 truncate flex items-center gap-2">
                       <Link className="w-3 h-3 text-zinc-400 shrink-0" />
                       <span className="truncate">
                          {config.urlPrefix ? config.urlPrefix : 'https://your-shop.com/'}summer-tee
                       </span>
                    </div>
                 </div>

                 {/* Timeline Visualization */}
                 <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 mt-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-3 text-center">Lifecycle Schedule</p>
                    <div className="relative flex items-center justify-between px-2 pt-2 pb-4">
                       {/* Line */}
                       <div className="absolute top-3.5 left-2 right-2 h-0.5 bg-zinc-800 -z-10"></div>
                       
                       {/* Point 1: Launch */}
                       <div className="flex flex-col items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-zinc-600 border-2 border-zinc-900"></div>
                          <span className="text-[10px] text-zinc-500">Creation</span>
                       </div>

                       {/* Point 2: Start Phase */}
                       <div className="flex flex-col items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-zinc-900 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                          <div className="flex flex-col items-center">
                             <span className="text-[10px] text-indigo-400 font-medium">Start Phase</span>
                             <span className="text-[9px] text-zinc-600">Day {config.startPhaseDays}</span>
                          </div>
                       </div>

                       {/* Point 3: Post Phase */}
                       <div className="flex flex-col items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-900 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          <div className="flex flex-col items-center">
                             <span className="text-[10px] text-emerald-400 font-medium">Post Phase</span>
                             <span className="text-[9px] text-zinc-600">Day {config.postPhaseDays}</span>
                          </div>
                       </div>
                    </div>
                 </div>

              </div>
           </div>
        </div>

      </div>
    </div>
  );
};