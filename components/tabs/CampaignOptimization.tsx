import React, { useState, useEffect } from 'react';
import {
  OptimizationRule,
  OptimizationSettings,
  OptimizationCondition,
  OptimizationLogEntry,
  OptimizationMetric,
  OptimizationOperator,
  OptimizationLogic,
  OptimizationActionType,
  OptimizationActionUnit,
  PinterestCampaign
} from '../../types';
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Pause,
  FlaskConical,
  History,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Power,
  RefreshCw,
  Zap,
  ListChecks
} from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

interface CampaignOptimizationProps {
  shopId: string;
}

const METRICS: { value: OptimizationMetric; label: string }[] = [
  { value: 'spend', label: 'Ausgaben (€)' },
  { value: 'checkouts', label: 'Checkouts' },
  { value: 'roas', label: 'ROAS' }
];

const OPERATORS: { value: OptimizationOperator; label: string }[] = [
  { value: '>=', label: 'größer oder gleich' },
  { value: '<=', label: 'kleiner oder gleich' },
  { value: '>', label: 'größer als' },
  { value: '<', label: 'kleiner als' },
  { value: '==', label: 'gleich' }
];

const TIME_RANGES = [1, 3, 7, 14];

const ACTION_TYPES: { value: OptimizationActionType; label: string; icon: React.ReactNode }[] = [
  { value: 'scale_up', label: 'Budget erhöhen', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'scale_down', label: 'Budget reduzieren', icon: <TrendingDown className="w-4 h-4" /> },
  { value: 'pause', label: 'Pausieren', icon: <Pause className="w-4 h-4" /> }
];

// Helper function to get operator label
const getOperatorLabel = (op: OptimizationOperator): string => {
  const found = OPERATORS.find(o => o.value === op);
  return found ? found.label : op;
};

export const CampaignOptimization: React.FC<CampaignOptimizationProps> = ({ shopId }) => {
  // State
  const [settings, setSettings] = useState<OptimizationSettings | null>(null);
  const [rules, setRules] = useState<OptimizationRule[]>([]);
  const [logs, setLogs] = useState<OptimizationLogEntry[]>([]);
  const [campaigns, setCampaigns] = useState<PinterestCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rule Editor State
  const [editingRule, setEditingRule] = useState<OptimizationRule | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'settings' | 'rules' | 'logs'>('settings');

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
        .from('pinterest_campaign_optimization_settings')
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
          test_mode_enabled: false,
          test_campaign_id: null,
          test_metrics: null
        });
      }

      // Load rules (exclude soft-deleted ones)
      const { data: rulesData } = await supabase
        .from('pinterest_campaign_optimization_rules')
        .select('*')
        .eq('shop_id', shopId)
        .not('name', 'like', '[Gelöscht]%')
        .order('priority', { ascending: false });

      setRules(rulesData || []);

      // Load logs with campaign name
      const { data: logsData } = await supabase
        .from('pinterest_campaign_optimization_log')
        .select('*, pinterest_campaigns(name)')
        .eq('shop_id', shopId)
        .order('executed_at', { ascending: false })
        .limit(50);

      // Flatten the campaign name into each log entry
      const logsWithCampaignName = logsData?.map(log => ({
        ...log,
        campaign_name: log.pinterest_campaigns?.name || 'Unbekannte Kampagne'
      })) || [];

      setLogs(logsWithCampaignName);

      // Load campaigns for test mode selection
      const { data: campaignsData } = await supabase
        .from('pinterest_campaigns')
        .select('id, name, status, daily_budget')
        .eq('shop_id', shopId);

      setCampaigns(campaignsData?.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        budget: c.daily_budget
      })) || []);

    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Daten');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pinterest_campaign_optimization_settings')
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'shop_id' });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const saveRule = async (rule: OptimizationRule) => {
    setIsSaving(true);
    try {
      if (isCreatingNew) {
        const { id, ...ruleData } = rule;
        const { error } = await supabase
          .from('pinterest_campaign_optimization_rules')
          .insert({
            ...ruleData,
            shop_id: shopId
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pinterest_campaign_optimization_rules')
          .update({
            ...rule,
            updated_at: new Date().toISOString()
          })
          .eq('id', rule.id);

        if (error) throw error;
      }

      await loadData();
      setEditingRule(null);
      setIsCreatingNew(false);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern der Regel');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Regel wirklich löschen?')) return;

    try {
      // First try to delete the rule
      const { error } = await supabase
        .from('pinterest_campaign_optimization_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        // If delete fails due to foreign key constraint (rule was used in logs),
        // do a soft delete by marking it as deleted
        if (error.code === '23503' || error.message.includes('foreign key')) {
          const { error: updateError } = await supabase
            .from('pinterest_campaign_optimization_rules')
            .update({ is_enabled: false, name: `[Gelöscht] ${rules.find(r => r.id === ruleId)?.name || ''}` })
            .eq('id', ruleId);

          if (updateError) throw updateError;
        } else {
          throw error;
        }
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen');
    }
  };

  const toggleRuleEnabled = async (rule: OptimizationRule) => {
    try {
      const { error } = await supabase
        .from('pinterest_campaign_optimization_rules')
        .update({ is_enabled: !rule.is_enabled })
        .eq('id', rule.id);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Aktualisieren');
    }
  };

  const createNewRule = () => {
    const newRule: OptimizationRule = {
      id: '',
      shop_id: shopId,
      name: 'Neue Regel',
      is_enabled: true,
      priority: rules.length,
      conditions: [{
        metric: 'spend',
        operator: '>=',
        value: 100,
        time_range_days: 7
      }],
      action_type: 'scale_down',
      action_value: 20,
      action_unit: 'percent',
      min_budget: 5,
      max_budget: 1000
    };
    setEditingRule(newRule);
    setIsCreatingNew(true);
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
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Pinterest Kampagnen-Optimierung</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Automatische Budget-Anpassung basierend auf Performance-Regeln</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors border border-zinc-700 hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Aktualisieren
        </button>
      </div>

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
          { id: 'settings', label: 'Einstellungen', icon: Settings },
          { id: 'rules', label: 'Regeln', icon: ListChecks },
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

          {/* Enable/Disable Card */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-zinc-200">Optimierung aktivieren</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-300">Automatische Optimierung</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Aktiviert die automatische Kampagnen-Optimierung für diesen Shop
                    </p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, is_enabled: !settings.is_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.is_enabled ? 'bg-primary' : 'bg-zinc-700'
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
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-xs text-emerald-300/80 leading-relaxed">
                      Die Optimierung ist aktiv. Kampagnen werden basierend auf Ihren Regeln automatisch angepasst.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Test Mode Card */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-zinc-200">Test-Modus</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-300">Test-Modus aktivieren</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Verwendet manuelle Test-Daten statt echter Pinterest-Metriken
                    </p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, test_mode_enabled: !settings.test_mode_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.test_mode_enabled ? 'bg-amber-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg ${
                        settings.test_mode_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {settings.test_mode_enabled && (
                  <>
                    {/* Test Campaign Selection */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">
                        Test-Kampagne
                      </label>
                      <select
                        value={settings.test_campaign_id || ''}
                        onChange={(e) => setSettings({ ...settings, test_campaign_id: e.target.value || null })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="">Kampagne auswählen...</option>
                        {campaigns.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Test Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">
                          Test Spend (€)
                        </label>
                        <input
                          type="number"
                          value={settings.test_metrics?.spend || 0}
                          onChange={(e) => setSettings({
                            ...settings,
                            test_metrics: {
                              ...settings.test_metrics || { spend: 0, checkouts: 0, roas: 0 },
                              spend: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">
                          Test Checkouts
                        </label>
                        <input
                          type="number"
                          value={settings.test_metrics?.checkouts || 0}
                          onChange={(e) => setSettings({
                            ...settings,
                            test_metrics: {
                              ...settings.test_metrics || { spend: 0, checkouts: 0, roas: 0 },
                              checkouts: parseInt(e.target.value) || 0
                            }
                          })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">
                          Test ROAS
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={settings.test_metrics?.roas || 0}
                          onChange={(e) => setSettings({
                            ...settings,
                            test_metrics: {
                              ...settings.test_metrics || { spend: 0, checkouts: 0, roas: 0 },
                              roas: parseFloat(e.target.value) || 0
                            }
                          })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="col-span-12">
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Einstellungen speichern
            </button>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Add Rule Button */}
          <button
            onClick={createNewRule}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neue Regel
          </button>

          {/* Rule Editor Modal */}
          {editingRule && (
            <RuleEditor
              rule={editingRule}
              onSave={saveRule}
              onCancel={() => { setEditingRule(null); setIsCreatingNew(false); }}
              isSaving={isSaving}
            />
          )}

          {/* Rules List */}
          <div className="space-y-3">
            {rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                  <ListChecks className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-zinc-400 mb-1">Keine Regeln vorhanden</p>
                <p className="text-zinc-500 text-sm">Erstellen Sie Ihre erste Regel, um die Optimierung zu starten.</p>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`bg-zinc-900/50 border rounded-xl overflow-hidden transition-all ${
                    rule.is_enabled ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleRuleEnabled(rule)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            rule.is_enabled
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <div>
                          <h4 className="font-medium text-zinc-200">{rule.name}</h4>
                          <p className="text-xs text-zinc-500">
                            Priorität: {rule.priority} | {rule.conditions.length} Bedingung(en)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Action Badge */}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                          rule.action_type === 'scale_up'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : rule.action_type === 'scale_down'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {rule.action_type === 'scale_up' && <TrendingUp className="w-3 h-3" />}
                          {rule.action_type === 'scale_down' && <TrendingDown className="w-3 h-3" />}
                          {rule.action_type === 'pause' && <Pause className="w-3 h-3" />}
                          {rule.action_type === 'scale_up' && `+${rule.action_value}${rule.action_unit === 'percent' ? '%' : '€'}`}
                          {rule.action_type === 'scale_down' && `-${rule.action_value}${rule.action_unit === 'percent' ? '%' : '€'}`}
                          {rule.action_type === 'pause' && 'Pause'}
                        </span>

                        <button
                          onClick={() => setEditingRule(rule)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Conditions Preview */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {rule.conditions.map((cond, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400"
                        >
                          {cond.metric} {getOperatorLabel(cond.operator)} {cond.value} ({cond.time_range_days} Tage)
                          {cond.logic && <span className="ml-1 text-primary font-medium">{cond.logic}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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
              <p className="text-zinc-400 mb-1">Noch keine Optimierungen</p>
              <p className="text-zinc-500 text-sm">Aktivieren Sie die Optimierung und erstellen Sie Regeln.</p>
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`bg-zinc-900/50 border rounded-xl p-4 ${
                  log.is_test_run ? 'border-amber-500/30' : 'border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.action_taken === 'scaled_up' && (
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                    )}
                    {log.action_taken === 'scaled_down' && (
                      <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <TrendingDown className="w-4 h-4 text-amber-400" />
                      </div>
                    )}
                    {log.action_taken === 'paused' && (
                      <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                        <Pause className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                    {log.action_taken === 'failed' && (
                      <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                    {log.action_taken === 'skipped' && (
                      <div className="p-1.5 bg-zinc-800 rounded-lg border border-zinc-700">
                        <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                      </div>
                    )}

                    <span className="font-medium text-zinc-200">
                      {log.action_taken === 'scaled_up' && 'Budget erhöht'}
                      {log.action_taken === 'scaled_down' && 'Budget reduziert'}
                      {log.action_taken === 'paused' && 'Pausiert'}
                      {log.action_taken === 'failed' && 'Fehlgeschlagen'}
                      {log.action_taken === 'skipped' && 'Übersprungen'}
                    </span>

                    {log.is_test_run && (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded border border-amber-500/20">
                        TEST
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-zinc-500">
                    {new Date(log.executed_at).toLocaleString('de-DE')}
                  </span>
                </div>

                {/* Campaign Name */}
                <div className="mt-2 text-sm text-zinc-300">
                  <span className="text-zinc-500">Kampagne:</span>{' '}
                  <span className="font-medium">{log.campaign_name}</span>
                </div>

                <div className="mt-2 text-sm text-zinc-400">
                  {log.action_taken !== 'skipped' && log.action_taken !== 'paused' && (
                    <span className="font-mono">€{log.old_budget.toFixed(2)} → €{log.new_budget.toFixed(2)}</span>
                  )}
                  {log.error_message && (
                    <span className="text-red-400 ml-2">{log.error_message}</span>
                  )}
                </div>

                <div className="mt-3 flex gap-4 text-xs">
                  <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">Spend: €{log.metrics_snapshot.spend.toFixed(2)}</span>
                  <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">Checkouts: {log.metrics_snapshot.checkouts}</span>
                  <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">ROAS: {log.metrics_snapshot.roas.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Rule Editor Component
interface RuleEditorProps {
  rule: OptimizationRule;
  onSave: (rule: OptimizationRule) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ rule, onSave, onCancel, isSaving }) => {
  const [editedRule, setEditedRule] = useState<OptimizationRule>(rule);

  const updateCondition = (index: number, updates: Partial<OptimizationCondition>) => {
    const newConditions = [...editedRule.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setEditedRule({ ...editedRule, conditions: newConditions });
  };

  const addCondition = () => {
    const lastCondition = editedRule.conditions[editedRule.conditions.length - 1];
    if (lastCondition) {
      lastCondition.logic = 'AND';
    }
    setEditedRule({
      ...editedRule,
      conditions: [
        ...editedRule.conditions,
        { metric: 'spend', operator: '>=', value: 0, time_range_days: 7 }
      ]
    });
  };

  const removeCondition = (index: number) => {
    if (editedRule.conditions.length <= 1) return;
    const newConditions = editedRule.conditions.filter((_, i) => i !== index);
    // Remove logic from last condition
    if (newConditions.length > 0) {
      delete newConditions[newConditions.length - 1].logic;
    }
    setEditedRule({ ...editedRule, conditions: newConditions });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Regel bearbeiten</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Rule Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Name</label>
            <input
              type="text"
              value={editedRule.name}
              onChange={(e) => setEditedRule({ ...editedRule, name: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Priorität</label>
            <input
              type="number"
              value={editedRule.priority}
              onChange={(e) => setEditedRule({ ...editedRule, priority: parseInt(e.target.value) || 0 })}
              className="w-32 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50"
            />
            <p className="text-xs text-zinc-500 mt-1">Höhere Priorität wird zuerst geprüft</p>
          </div>

          {/* Conditions */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-3">
              WENN (Bedingungen)
            </label>
            <div className="space-y-3">
              {editedRule.conditions.map((cond, index) => (
                <div key={index} className="flex items-center gap-2 flex-wrap bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <select
                    value={cond.metric}
                    onChange={(e) => updateCondition(index, { metric: e.target.value as OptimizationMetric })}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  >
                    {METRICS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value as OptimizationOperator })}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  >
                    {OPERATORS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    value={cond.value}
                    onChange={(e) => updateCondition(index, { value: parseFloat(e.target.value) || 0 })}
                    className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-primary/50"
                  />

                  <select
                    value={cond.time_range_days}
                    onChange={(e) => updateCondition(index, { time_range_days: parseInt(e.target.value) })}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  >
                    {TIME_RANGES.map(d => (
                      <option key={d} value={d}>letzte {d} Tage</option>
                    ))}
                  </select>

                  {index < editedRule.conditions.length - 1 && (
                    <select
                      value={cond.logic || 'AND'}
                      onChange={(e) => updateCondition(index, { logic: e.target.value as OptimizationLogic })}
                      className="bg-primary/20 border border-primary/30 rounded-lg px-3 py-2 text-sm text-primary font-medium focus:outline-none"
                    >
                      <option value="AND">UND</option>
                      <option value="OR">ODER</option>
                    </select>
                  )}

                  {editedRule.conditions.length > 1 && (
                    <button
                      onClick={() => removeCondition(index)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addCondition}
              className="mt-3 flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Bedingung hinzufügen
            </button>
          </div>

          {/* Action */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-3">
              DANN (Aktion)
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={editedRule.action_type}
                onChange={(e) => setEditedRule({ ...editedRule, action_type: e.target.value as OptimizationActionType })}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
              >
                {ACTION_TYPES.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>

              {editedRule.action_type !== 'pause' && (
                <>
                  <input
                    type="number"
                    value={editedRule.action_value || 0}
                    onChange={(e) => setEditedRule({ ...editedRule, action_value: parseFloat(e.target.value) || 0 })}
                    className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50"
                  />

                  <select
                    value={editedRule.action_unit || 'percent'}
                    onChange={(e) => setEditedRule({ ...editedRule, action_unit: e.target.value as OptimizationActionUnit })}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="percent">%</option>
                    <option value="amount">€</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {/* Budget Limits */}
          {editedRule.action_type !== 'pause' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Minimum Budget (€)
                </label>
                <input
                  type="number"
                  value={editedRule.min_budget}
                  onChange={(e) => setEditedRule({ ...editedRule, min_budget: parseFloat(e.target.value) || 5 })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Maximum Budget (€)
                </label>
                <input
                  type="number"
                  value={editedRule.max_budget}
                  onChange={(e) => setEditedRule({ ...editedRule, max_budget: parseFloat(e.target.value) || 1000 })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => onSave(editedRule)}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignOptimization;
