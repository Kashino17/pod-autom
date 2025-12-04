import React, { useState, useEffect } from 'react';
import {
  WinnerScalingSettings,
  WinnerProduct,
  WinnerCampaign,
  WinnerScalingLogEntry,
  WinnerScalingActionType
} from '../../types';
import {
  Settings,
  Save,
  X,
  History,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Award,
  Trophy,
  Video,
  Image,
  Link2,
  DollarSign,
  Target,
  Zap,
  Play,
  Pause,
  Eye,
  ExternalLink,
  Calendar,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Clock,
  Hash
} from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

interface WinnerScalingProps {
  shopId: string;
}

export const WinnerScaling: React.FC<WinnerScalingProps> = ({ shopId }) => {
  // State
  const [settings, setSettings] = useState<WinnerScalingSettings | null>(null);
  const [winners, setWinners] = useState<WinnerProduct[]>([]);
  const [logs, setLogs] = useState<WinnerScalingLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'settings' | 'winners' | 'logs'>('settings');

  // Expanded winner for detail view
  const [expandedWinnerId, setExpandedWinnerId] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [shopId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load settings
      const { data: settingsData } = await supabase
        .from('winner_scaling_settings')
        .select('*')
        .eq('shop_id', shopId)
        .single();

      if (settingsData) {
        setSettings(settingsData);
      } else {
        // Create default settings
        setSettings({
          shop_id: shopId,
          is_enabled: false,
          sales_threshold_3d: 5,
          sales_threshold_7d: 10,
          sales_threshold_10d: 15,
          sales_threshold_14d: 20,
          min_buckets_required: 3,
          max_campaigns_per_winner: 4,
          video_count: 2,
          image_count: 4,
          campaigns_per_video: 1,
          campaigns_per_image: 2,
          link_to_product: true,
          link_to_collection: true,
          daily_budget_per_campaign: 10,
          pinterest_enabled: true,
          meta_enabled: false,
          google_enabled: false
        });
      }

      // Load winners with campaign count
      const { data: winnersData } = await supabase
        .from('winner_products')
        .select(`
          *,
          winner_campaigns(id, status)
        `)
        .eq('shop_id', shopId)
        .order('identified_at', { ascending: false });

      // Calculate active campaigns count
      const winnersWithCounts = winnersData?.map(w => ({
        ...w,
        active_campaigns_count: w.winner_campaigns?.filter((c: WinnerCampaign) => c.status === 'ACTIVE').length || 0
      })) || [];

      setWinners(winnersWithCounts);

      // Load logs with winner product info
      const { data: logsData } = await supabase
        .from('winner_scaling_log')
        .select(`
          *,
          winner_products(product_title)
        `)
        .eq('shop_id', shopId)
        .order('executed_at', { ascending: false })
        .limit(100);

      // Flatten winner product info
      const logsWithProduct = logsData?.map(log => ({
        ...log,
        winner_product: log.winner_products
      })) || [];

      setLogs(logsWithProduct);

    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Daten');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('winner_scaling_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'shop_id' });

      if (error) throw error;

      setSuccessMessage('Einstellungen gespeichert');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleWinnerActive = async (winner: WinnerProduct) => {
    try {
      const { error } = await supabase
        .from('winner_products')
        .update({ is_active: !winner.is_active })
        .eq('id', winner.id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Aktualisieren');
    }
  };

  const getActionIcon = (actionType: WinnerScalingActionType) => {
    switch (actionType) {
      case 'job_started':
        return <Play className="w-4 h-4 text-blue-400" />;
      case 'job_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'winner_identified':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'campaign_created':
        return <Target className="w-4 h-4 text-primary" />;
      case 'creative_generated':
        return <Image className="w-4 h-4 text-purple-400" />;
      case 'api_limit_reached':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'campaign_status_check':
        return <Eye className="w-4 h-4 text-zinc-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getActionLabel = (actionType: WinnerScalingActionType) => {
    switch (actionType) {
      case 'job_started': return 'Job gestartet';
      case 'job_completed': return 'Job abgeschlossen';
      case 'winner_identified': return 'Winner identifiziert';
      case 'campaign_created': return 'Kampagne erstellt';
      case 'creative_generated': return 'Creative generiert';
      case 'api_limit_reached': return 'API-Limit erreicht';
      case 'campaign_status_check': return 'Status geprüft';
      case 'error': return 'Fehler';
      default: return actionType;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Winner Scaling</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Automatische Kampagnen-Erstellung mit AI-generierten Creatives
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors border border-zinc-700 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto p-1 hover:bg-emerald-500/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-800 w-fit">
        {[
          { id: 'settings', label: 'Konfiguration', icon: Settings },
          { id: 'winners', label: 'Winner Übersicht', icon: Trophy },
          { id: 'logs', label: 'Verlauf', icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="grid grid-cols-12 gap-6">

          {/* Enable Card */}
          <div className="col-span-12">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-zinc-200">Winner Scaling aktivieren</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-300">Automatische Winner-Erkennung & Kampagnen-Erstellung</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Winners werden identifiziert, AI-Creatives generiert und Kampagnen erstellt
                    </p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, is_enabled: !settings.is_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.is_enabled ? 'bg-amber-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg ${
                        settings.is_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {settings.is_enabled && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-300/80 leading-relaxed">
                      Winner Scaling ist aktiv. Der Job läuft jeden Donnerstag und erstellt automatisch neue Kampagnen für Top-Performer.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Winner Criteria (4-Bucket System) */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-zinc-200">Winner-Kriterien (4-Bucket System)</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-zinc-500">
                  Mindest-Verkäufe pro Zeitraum, um als Winner identifiziert zu werden
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">3 Tage</label>
                    <input
                      type="number"
                      value={settings.sales_threshold_3d}
                      onChange={(e) => setSettings({ ...settings, sales_threshold_3d: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">7 Tage</label>
                    <input
                      type="number"
                      value={settings.sales_threshold_7d}
                      onChange={(e) => setSettings({ ...settings, sales_threshold_7d: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">10 Tage</label>
                    <input
                      type="number"
                      value={settings.sales_threshold_10d}
                      onChange={(e) => setSettings({ ...settings, sales_threshold_10d: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2">14 Tage</label>
                    <input
                      type="number"
                      value={settings.sales_threshold_14d}
                      onChange={(e) => setSettings({ ...settings, sales_threshold_14d: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Mindestens erreichte Buckets (1-4)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        onClick={() => setSettings({ ...settings, min_buckets_required: num })}
                        className={`w-10 h-10 rounded-lg font-medium text-sm transition-all ${
                          settings.min_buckets_required === num
                            ? 'bg-amber-500 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <span className="ml-2 text-xs text-zinc-500">von 4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Creative Settings */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-400" />
                  <h3 className="font-semibold text-zinc-200">AI Creative Einstellungen</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">

                {/* Video Settings */}
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-zinc-300">Videos (Veo 3.1)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Anzahl Videos</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={settings.video_count}
                        onChange={(e) => setSettings({ ...settings, video_count: parseInt(e.target.value) || 0 })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Kampagnen/Video</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={settings.campaigns_per_video}
                        onChange={(e) => setSettings({ ...settings, campaigns_per_video: parseInt(e.target.value) || 1 })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Image Settings */}
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Image className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-zinc-300">Bilder (GPT-Image)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Anzahl Bilder</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settings.image_count}
                        onChange={(e) => setSettings({ ...settings, image_count: parseInt(e.target.value) || 0 })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Kampagnen/Bildset</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={settings.campaigns_per_image}
                        onChange={(e) => setSettings({ ...settings, campaigns_per_image: parseInt(e.target.value) || 1 })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Max Campaigns */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Max. Kampagnen pro Winner
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.max_campaigns_per_winner}
                    onChange={(e) => setSettings({ ...settings, max_campaigns_per_winner: parseInt(e.target.value) || 4 })}
                    className="w-32 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-amber-500/50"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Pausierte Kampagnen werden automatisch durch neue ersetzt
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Link Settings (A/B Test) */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-zinc-200">Link-Einstellungen (A/B Test)</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-zinc-500">
                  Wenn beide aktiviert sind, werden für jeden Creative-Typ zwei Kampagnen erstellt
                </p>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm text-zinc-300">Link zum Produkt</span>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, link_to_product: !settings.link_to_product })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.link_to_product ? 'bg-cyan-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          settings.link_to_product ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Hash className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm text-zinc-300">Link zur Collection</span>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, link_to_collection: !settings.link_to_collection })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.link_to_collection ? 'bg-cyan-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          settings.link_to_collection ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                </div>

                {settings.link_to_product && settings.link_to_collection && (
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                    <p className="text-xs text-cyan-300/80">
                      A/B-Test aktiv: Jeder Creative-Typ erhält 2 Kampagnen mit unterschiedlichen Links
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Budget Settings */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-zinc-200">Budget & Plattformen</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Tagesbudget pro Kampagne (€)
                  </label>
                  <input
                    type="number"
                    min="5"
                    step="1"
                    value={settings.daily_budget_per_campaign}
                    onChange={(e) => setSettings({ ...settings, daily_budget_per_campaign: parseFloat(e.target.value) || 10 })}
                    className="w-32 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <label className="block text-xs font-medium text-zinc-400 mb-3">
                    Plattformen
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800 cursor-pointer">
                      <span className="text-sm text-zinc-300">Pinterest</span>
                      <button
                        onClick={() => setSettings({ ...settings, pinterest_enabled: !settings.pinterest_enabled })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          settings.pinterest_enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            settings.pinterest_enabled ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>

                    <label className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-300">Meta Ads</span>
                        <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded">SOON</span>
                      </div>
                      <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-zinc-700">
                        <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-zinc-600 translate-x-1" />
                      </div>
                    </label>

                    <label className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-300">Google Ads</span>
                        <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded">SOON</span>
                      </div>
                      <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-zinc-700">
                        <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-zinc-600 translate-x-1" />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="col-span-12">
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Einstellungen speichern
            </button>
          </div>
        </div>
      )}

      {/* Winners Tab */}
      {activeTab === 'winners' && (
        <div className="space-y-4">

          {/* Stats Overview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Trophy className="w-4 h-4" />
                <span className="text-xs">Gesamt Winners</span>
              </div>
              <p className="text-2xl font-bold text-white">{winners.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-500 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs">Aktiv</span>
              </div>
              <p className="text-2xl font-bold text-white">{winners.filter(w => w.is_active).length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs">Aktive Kampagnen</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {winners.reduce((sum, w) => sum + (w.active_campaigns_count || 0), 0)}
              </p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Diese Woche</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {winners.filter(w => {
                  const identified = new Date(w.identified_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return identified > weekAgo;
                }).length}
              </p>
            </div>
          </div>

          {/* Winners List */}
          {winners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-zinc-400 mb-1">Noch keine Winner identifiziert</p>
              <p className="text-zinc-500 text-sm">Winner werden automatisch erkannt, wenn Produkte die Kriterien erfüllen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {winners.map(winner => (
                <div
                  key={winner.id}
                  className={`bg-zinc-900/50 border rounded-xl overflow-hidden transition-all ${
                    winner.is_active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Product Image */}
                        {winner.shopify_image_url ? (
                          <img
                            src={winner.shopify_image_url}
                            alt={winner.product_title}
                            className="w-12 h-12 rounded-lg object-cover border border-zinc-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                            <Package className="w-5 h-5 text-zinc-600" />
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium text-zinc-200">{winner.product_title}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-zinc-500">
                              Erkannt: {new Date(winner.identified_at).toLocaleDateString('de-DE')}
                            </span>
                            <span className="text-xs text-primary">
                              {winner.active_campaigns_count || 0} aktive Kampagnen
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Buckets passed badge */}
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {winner.buckets_passed}/4 Buckets
                        </span>

                        {/* Toggle active */}
                        <button
                          onClick={() => toggleWinnerActive(winner)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            winner.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}
                          title={winner.is_active ? 'Deaktivieren' : 'Aktivieren'}
                        >
                          {winner.is_active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>

                        {/* Expand button */}
                        <button
                          onClick={() => setExpandedWinnerId(expandedWinnerId === winner.id ? null : winner.id)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sales Stats */}
                    <div className="mt-3 flex gap-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        winner.sales_3d >= (settings?.sales_threshold_3d || 5)
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        3T: {winner.sales_3d} Verkäufe
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        winner.sales_7d >= (settings?.sales_threshold_7d || 10)
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        7T: {winner.sales_7d} Verkäufe
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        winner.sales_10d >= (settings?.sales_threshold_10d || 15)
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        10T: {winner.sales_10d} Verkäufe
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        winner.sales_14d >= (settings?.sales_threshold_14d || 20)
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        14T: {winner.sales_14d} Verkäufe
                      </span>
                    </div>

                    {/* Expanded Details */}
                    {expandedWinnerId === winner.id && winner.campaigns && winner.campaigns.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-zinc-800">
                        <h5 className="text-xs font-medium text-zinc-400 mb-3">Kampagnen</h5>
                        <div className="space-y-2">
                          {winner.campaigns.map(campaign => (
                            <div
                              key={campaign.id}
                              className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800"
                            >
                              <div className="flex items-center gap-3">
                                {campaign.creative_type === 'video' ? (
                                  <Video className="w-4 h-4 text-purple-400" />
                                ) : (
                                  <Image className="w-4 h-4 text-blue-400" />
                                )}
                                <span className="text-sm text-zinc-300">{campaign.campaign_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-400">
                                  {campaign.link_type === 'product' ? 'Produkt' : 'Collection'}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  campaign.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : campaign.status === 'PAUSED'
                                      ? 'bg-amber-500/10 text-amber-400'
                                      : 'bg-zinc-800 text-zinc-500'
                                }`}>
                                  {campaign.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <History className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-zinc-400 mb-1">Noch keine Aktivitäten</p>
              <p className="text-zinc-500 text-sm">Aktivieren Sie Winner Scaling, um den Verlauf zu sehen.</p>
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`bg-zinc-900/50 border rounded-xl p-4 ${
                  log.action_type === 'error' ? 'border-red-500/30' :
                  log.action_type === 'api_limit_reached' ? 'border-amber-500/30' :
                  'border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${
                      log.action_type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                      log.action_type === 'api_limit_reached' ? 'bg-amber-500/10 border border-amber-500/20' :
                      log.action_type === 'winner_identified' ? 'bg-amber-500/10 border border-amber-500/20' :
                      log.action_type === 'campaign_created' ? 'bg-primary/10 border border-primary/20' :
                      log.action_type === 'creative_generated' ? 'bg-purple-500/10 border border-purple-500/20' :
                      log.action_type === 'job_completed' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                      'bg-zinc-800 border border-zinc-700'
                    }`}>
                      {getActionIcon(log.action_type)}
                    </div>
                    <div>
                      <span className="font-medium text-zinc-200">{getActionLabel(log.action_type)}</span>
                      {log.winner_product && (
                        <span className="ml-2 text-sm text-zinc-500">
                          - {log.winner_product.product_title}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs text-zinc-500">
                    {new Date(log.executed_at).toLocaleString('de-DE')}
                  </span>
                </div>

                {/* Details */}
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(log.details).map(([key, value]) => (
                      <span
                        key={key}
                        className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400"
                      >
                        {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    ))}
                  </div>
                )}

                {/* API Limit Warning */}
                {log.action_type === 'api_limit_reached' && (
                  <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-300/80">
                      API-Limit erreicht. Der Job wird beim nächsten Durchlauf fortgesetzt.
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {log.action_type === 'error' && log.details?.error_message && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-300/80 font-mono">
                      {log.details.error_message}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default WinnerScaling;
