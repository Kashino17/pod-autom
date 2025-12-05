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
  CampaignType,
  PinterestCampaign,
  ConditionGroup
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
  ListChecks,
  Layers
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

const CAMPAIGN_TYPES: { value: CampaignType; label: string; description: string }[] = [
  { value: 'replace_campaign', label: 'Replace-Kampagnen', description: 'Kampagnen aus Pinterest Sync (Produkt-Ersetzung)' },
  { value: 'winner_campaign', label: 'Winner-Kampagnen', description: 'Kampagnen aus Winner Scaling (AI Creatives)' }
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

  // Helper to convert old conditions format to new condition_groups format
  const normalizeRule = (rule: OptimizationRule): OptimizationRule => {
    if (rule.condition_groups && rule.condition_groups.length > 0) {
      return rule;
    }
    // Convert old format to new format
    if (rule.conditions && rule.conditions.length > 0) {
      return {
        ...rule,
        condition_groups: [{ conditions: rule.conditions, logic: undefined }]
      };
    }
    // Empty rule
    return {
      ...rule,
      condition_groups: [{ conditions: [{ metric: 'spend', operator: '>=', value: 0, time_range_days: 7 }], logic: undefined }]
    };
  };

  const createNewRule = () => {
    const newRule: OptimizationRule = {
      id: '',
      shop_id: shopId,
      name: 'Neue Regel',
      is_enabled: true,
      priority: rules.length,
      condition_groups: [{
        conditions: [{
          metric: 'spend',
          operator: '>=',
          value: 100,
          time_range_days: 7
        }],
        logic: undefined
      }],
      action_type: 'scale_down',
      action_value: 20,
      action_unit: 'percent',
      min_budget: 5,
      max_budget: 1000,
      min_campaign_age_days: null,
      max_campaign_age_days: null,
      campaign_type: 'replace_campaign'  // Default to replace campaigns
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
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-zinc-200">{rule.name}</h4>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              rule.campaign_type === 'winner_campaign'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {rule.campaign_type === 'winner_campaign' ? 'Winner' : 'Replace'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">
                            Priorität: {rule.priority} | {(rule.condition_groups || []).length} Gruppe(n)
                            {rule.min_campaign_age_days !== null && ` | Min. ${rule.min_campaign_age_days} Tage`}
                            {rule.max_campaign_age_days !== null && ` | Max. ${rule.max_campaign_age_days} Tage`}
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

                    {/* Condition Groups Preview */}
                    <div className="mt-3 space-y-2">
                      {(normalizeRule(rule).condition_groups || []).map((group, groupIndex) => (
                        <div key={groupIndex} className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                            <Layers className="w-3 h-3 text-zinc-500" />
                            <span className="text-xs text-zinc-500">Gruppe {groupIndex + 1}:</span>
                          </div>
                          {group.conditions.map((cond, condIndex) => (
                            <span
                              key={condIndex}
                              className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-400"
                            >
                              {cond.metric} {getOperatorLabel(cond.operator)} {cond.value} ({cond.time_range_days}T)
                              {cond.logic && <span className="ml-1 text-primary font-medium">{cond.logic}</span>}
                            </span>
                          ))}
                          {group.logic && groupIndex < (normalizeRule(rule).condition_groups || []).length - 1 && (
                            <span className="px-2 py-1 bg-primary/20 border border-primary/30 rounded text-xs text-primary font-medium">
                              {group.logic}
                            </span>
                          )}
                        </div>
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
  // Normalize rule to ensure condition_groups exists
  const normalizedRule = (): OptimizationRule => {
    if (rule.condition_groups && rule.condition_groups.length > 0) {
      return rule;
    }
    if (rule.conditions && rule.conditions.length > 0) {
      return { ...rule, condition_groups: [{ conditions: rule.conditions, logic: undefined }] };
    }
    return { ...rule, condition_groups: [{ conditions: [{ metric: 'spend', operator: '>=', value: 0, time_range_days: 7 }], logic: undefined }] };
  };

  const [editedRule, setEditedRule] = useState<OptimizationRule>(normalizedRule());

  // Update a condition within a group
  const updateCondition = (groupIndex: number, condIndex: number, updates: Partial<OptimizationCondition>) => {
    const newGroups = [...editedRule.condition_groups];
    const newConditions = [...newGroups[groupIndex].conditions];
    newConditions[condIndex] = { ...newConditions[condIndex], ...updates };
    newGroups[groupIndex] = { ...newGroups[groupIndex], conditions: newConditions };
    setEditedRule({ ...editedRule, condition_groups: newGroups });
  };

  // Add a condition to a group
  const addConditionToGroup = (groupIndex: number) => {
    const newGroups = [...editedRule.condition_groups];
    const group = newGroups[groupIndex];
    // Set logic on previous condition
    if (group.conditions.length > 0) {
      const lastCond = group.conditions[group.conditions.length - 1];
      if (!lastCond.logic) lastCond.logic = 'AND';
    }
    newGroups[groupIndex] = {
      ...group,
      conditions: [...group.conditions, { metric: 'spend', operator: '>=', value: 0, time_range_days: 7 }]
    };
    setEditedRule({ ...editedRule, condition_groups: newGroups });
  };

  // Remove a condition from a group
  const removeConditionFromGroup = (groupIndex: number, condIndex: number) => {
    const newGroups = [...editedRule.condition_groups];
    const group = newGroups[groupIndex];
    if (group.conditions.length <= 1) return;
    const newConditions = group.conditions.filter((_, i) => i !== condIndex);
    // Remove logic from last condition
    if (newConditions.length > 0) {
      delete newConditions[newConditions.length - 1].logic;
    }
    newGroups[groupIndex] = { ...group, conditions: newConditions };
    setEditedRule({ ...editedRule, condition_groups: newGroups });
  };

  // Add a new group
  const addGroup = () => {
    const newGroups = [...editedRule.condition_groups];
    // Set logic on previous group
    if (newGroups.length > 0) {
      newGroups[newGroups.length - 1] = { ...newGroups[newGroups.length - 1], logic: 'AND' };
    }
    newGroups.push({
      conditions: [{ metric: 'spend', operator: '>=', value: 0, time_range_days: 7 }],
      logic: undefined
    });
    setEditedRule({ ...editedRule, condition_groups: newGroups });
  };

  // Remove a group
  const removeGroup = (groupIndex: number) => {
    if (editedRule.condition_groups.length <= 1) return;
    const newGroups = editedRule.condition_groups.filter((_, i) => i !== groupIndex);
    // Remove logic from last group
    if (newGroups.length > 0) {
      newGroups[newGroups.length - 1] = { ...newGroups[newGroups.length - 1], logic: undefined };
    }
    setEditedRule({ ...editedRule, condition_groups: newGroups });
  };

  // Update group logic
  const updateGroupLogic = (groupIndex: number, logic: OptimizationLogic) => {
    const newGroups = [...editedRule.condition_groups];
    newGroups[groupIndex] = { ...newGroups[groupIndex], logic };
    setEditedRule({ ...editedRule, condition_groups: newGroups });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
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

          {/* Campaign Type - Required */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Kampagnen-Typ <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CAMPAIGN_TYPES.map(ct => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setEditedRule({ ...editedRule, campaign_type: ct.value })}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    editedRule.campaign_type === ct.value
                      ? ct.value === 'winner_campaign'
                        ? 'bg-purple-500/10 border-purple-500/30 ring-2 ring-purple-500/20'
                        : 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    editedRule.campaign_type === ct.value
                      ? ct.value === 'winner_campaign' ? 'text-purple-300' : 'text-blue-300'
                      : 'text-zinc-300'
                  }`}>
                    {ct.label}
                  </span>
                  <p className="text-xs text-zinc-500 mt-1">{ct.description}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Diese Regel gilt nur für Kampagnen des ausgewählten Typs
            </p>
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

          {/* Campaign Age Restrictions */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">
            <label className="block text-xs font-medium text-zinc-400 mb-3">Kampagnenalter-Einschränkungen</label>
            <div className="grid grid-cols-2 gap-4">
              {/* Min Age */}
              <div className={`p-3 rounded-lg border transition-all ${editedRule.min_campaign_age_days !== null ? 'bg-zinc-900 border-primary/30' : 'bg-zinc-950 border-zinc-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-300">Mindestalter</span>
                  <button
                    onClick={() => setEditedRule({
                      ...editedRule,
                      min_campaign_age_days: editedRule.min_campaign_age_days !== null ? null : 7
                    })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      editedRule.min_campaign_age_days !== null ? 'bg-primary' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow ${
                        editedRule.min_campaign_age_days !== null ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {editedRule.min_campaign_age_days !== null && (
                  <>
                    <input
                      type="number"
                      min="0"
                      value={editedRule.min_campaign_age_days}
                      onChange={(e) => setEditedRule({ ...editedRule, min_campaign_age_days: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Mind. X Tage alt</p>
                  </>
                )}
                {editedRule.min_campaign_age_days === null && (
                  <p className="text-xs text-zinc-600">Deaktiviert</p>
                )}
              </div>

              {/* Max Age */}
              <div className={`p-3 rounded-lg border transition-all ${editedRule.max_campaign_age_days !== null ? 'bg-zinc-900 border-primary/30' : 'bg-zinc-950 border-zinc-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-300">Maximalalter</span>
                  <button
                    onClick={() => setEditedRule({
                      ...editedRule,
                      max_campaign_age_days: editedRule.max_campaign_age_days !== null ? null : 30
                    })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      editedRule.max_campaign_age_days !== null ? 'bg-primary' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow ${
                        editedRule.max_campaign_age_days !== null ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {editedRule.max_campaign_age_days !== null && (
                  <>
                    <input
                      type="number"
                      min="0"
                      value={editedRule.max_campaign_age_days}
                      onChange={(e) => setEditedRule({ ...editedRule, max_campaign_age_days: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-primary/50"
                    />
                    <p className="text-xs text-zinc-500 mt-1">Max. X Tage alt</p>
                  </>
                )}
                {editedRule.max_campaign_age_days === null && (
                  <p className="text-xs text-zinc-600">Deaktiviert</p>
                )}
              </div>
            </div>
          </div>

          {/* Condition Groups */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-3">
              WENN (Bedingungsgruppen)
            </label>
            <div className="space-y-4">
              {editedRule.condition_groups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {/* Group Container */}
                  <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-zinc-300">Gruppe {groupIndex + 1}</span>
                      </div>
                      {editedRule.condition_groups.length > 1 && (
                        <button
                          onClick={() => removeGroup(groupIndex)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Conditions within group */}
                    <div className="space-y-2">
                      {group.conditions.map((cond, condIndex) => (
                        <div key={condIndex} className="flex items-center gap-2 flex-wrap bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                          <select
                            value={cond.metric}
                            onChange={(e) => updateCondition(groupIndex, condIndex, { metric: e.target.value as OptimizationMetric })}
                            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                          >
                            {METRICS.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>

                          <select
                            value={cond.operator}
                            onChange={(e) => updateCondition(groupIndex, condIndex, { operator: e.target.value as OptimizationOperator })}
                            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                          >
                            {OPERATORS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>

                          <input
                            type="number"
                            step="0.01"
                            value={cond.value}
                            onChange={(e) => updateCondition(groupIndex, condIndex, { value: parseFloat(e.target.value) || 0 })}
                            className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-primary/50"
                          />

                          <select
                            value={cond.time_range_days}
                            onChange={(e) => updateCondition(groupIndex, condIndex, { time_range_days: parseInt(e.target.value) })}
                            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                          >
                            {TIME_RANGES.map(d => (
                              <option key={d} value={d}>letzte {d} Tage</option>
                            ))}
                          </select>

                          {condIndex < group.conditions.length - 1 && (
                            <select
                              value={cond.logic || 'AND'}
                              onChange={(e) => updateCondition(groupIndex, condIndex, { logic: e.target.value as OptimizationLogic })}
                              className="bg-primary/20 border border-primary/30 rounded-lg px-3 py-2 text-sm text-primary font-medium focus:outline-none"
                            >
                              <option value="AND">UND</option>
                              <option value="OR">ODER</option>
                            </select>
                          )}

                          {group.conditions.length > 1 && (
                            <button
                              onClick={() => removeConditionFromGroup(groupIndex, condIndex)}
                              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => addConditionToGroup(groupIndex)}
                      className="mt-3 flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Bedingung hinzufügen
                    </button>
                  </div>

                  {/* Group Logic Connector */}
                  {groupIndex < editedRule.condition_groups.length - 1 && (
                    <div className="flex items-center justify-center py-2">
                      <select
                        value={group.logic || 'AND'}
                        onChange={(e) => updateGroupLogic(groupIndex, e.target.value as OptimizationLogic)}
                        className="bg-primary/20 border border-primary/30 rounded-lg px-4 py-2 text-sm text-primary font-bold focus:outline-none"
                      >
                        <option value="AND">UND</option>
                        <option value="OR">ODER</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addGroup}
              className="mt-4 flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 rounded-lg"
            >
              <Layers className="w-4 h-4" />
              Neue Gruppe hinzufügen
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
