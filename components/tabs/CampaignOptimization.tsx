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
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Pause,
  FlaskConical,
  History,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Power,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

interface CampaignOptimizationProps {
  shopId: string;
}

const METRICS: { value: OptimizationMetric; label: string }[] = [
  { value: 'spend', label: 'Spend (€)' },
  { value: 'checkouts', label: 'Checkouts' },
  { value: 'roas', label: 'ROAS' }
];

const OPERATORS: { value: OptimizationOperator; label: string }[] = [
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '==', label: '==' }
];

const TIME_RANGES = [1, 3, 7, 14];

const ACTION_TYPES: { value: OptimizationActionType; label: string; icon: React.ReactNode }[] = [
  { value: 'scale_up', label: 'Budget erhöhen', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'scale_down', label: 'Budget reduzieren', icon: <TrendingDown className="w-4 h-4" /> },
  { value: 'pause', label: 'Pausieren', icon: <Pause className="w-4 h-4" /> }
];

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
        .from('campaign_optimization_settings')
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

      // Load rules
      const { data: rulesData } = await supabase
        .from('campaign_optimization_rules')
        .select('*')
        .eq('shop_id', shopId)
        .order('priority', { ascending: false });

      setRules(rulesData || []);

      // Load logs
      const { data: logsData } = await supabase
        .from('campaign_optimization_log')
        .select('*')
        .eq('shop_id', shopId)
        .order('executed_at', { ascending: false })
        .limit(50);

      setLogs(logsData || []);

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
        .from('campaign_optimization_settings')
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
          .from('campaign_optimization_rules')
          .insert({
            ...ruleData,
            shop_id: shopId
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('campaign_optimization_rules')
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
      const { error } = await supabase
        .from('campaign_optimization_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Löschen');
    }
  };

  const toggleRuleEnabled = async (rule: OptimizationRule) => {
    try {
      const { error } = await supabase
        .from('campaign_optimization_rules')
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Kampagnen-Optimierung</h2>
          <p className="text-sm text-gray-500">
            Automatische Budget-Anpassung basierend auf Performance-Regeln
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {[
            { id: 'settings', label: 'Einstellungen', icon: Settings },
            { id: 'rules', label: 'Regeln', icon: TrendingUp },
            { id: 'logs', label: 'Verlauf', icon: History }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-6">
          {/* Enable/Disable */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Optimierung aktivieren</h3>
                <p className="text-sm text-gray-500">
                  Aktiviert die automatische Kampagnen-Optimierung für diesen Shop
                </p>
              </div>
              <button
                onClick={() => {
                  setSettings({ ...settings, is_enabled: !settings.is_enabled });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.is_enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.is_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Test Mode */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 mb-4">
              <FlaskConical className="w-5 h-5" />
              <h3 className="font-medium">Test-Modus</h3>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Test-Modus aktivieren</p>
                <p className="text-xs text-gray-500">
                  Verwendet manuelle Test-Daten statt echter Pinterest-Metriken
                </p>
              </div>
              <button
                onClick={() => {
                  setSettings({ ...settings, test_mode_enabled: !settings.test_mode_enabled });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.test_mode_enabled ? 'bg-amber-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.test_mode_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.test_mode_enabled && (
              <>
                {/* Test Campaign Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test-Kampagne
                  </label>
                  <select
                    value={settings.test_campaign_id || ''}
                    onChange={(e) => setSettings({ ...settings, test_campaign_id: e.target.value || null })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="">Kampagne auswählen...</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Test Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Einstellungen speichern
          </button>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Add Rule Button */}
          <button
            onClick={createNewRule}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
              <div className="text-center py-12 text-gray-500">
                Keine Regeln vorhanden. Erstellen Sie Ihre erste Regel.
              </div>
            ) : (
              rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className={`bg-white rounded-lg border p-4 ${
                    rule.is_enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleRuleEnabled(rule)}
                        className={`p-1 rounded ${rule.is_enabled ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        <Power className="w-5 h-5" />
                      </button>
                      <div>
                        <h4 className="font-medium text-gray-900">{rule.name}</h4>
                        <p className="text-sm text-gray-500">
                          Priorität: {rule.priority} | {rule.conditions.length} Bedingung(en)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Action Badge */}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.action_type === 'scale_up' ? 'bg-green-100 text-green-700' :
                        rule.action_type === 'scale_down' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {rule.action_type === 'scale_up' ? '↑' : rule.action_type === 'scale_down' ? '↓' : '⏸'}
                        {rule.action_type !== 'pause' && ` ${rule.action_value}${rule.action_unit === 'percent' ? '%' : '€'}`}
                      </span>

                      <button
                        onClick={() => setEditingRule(rule)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
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
                        className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                      >
                        {cond.metric} {cond.operator} {cond.value} ({cond.time_range_days}d)
                        {cond.logic && <span className="ml-1 font-medium">{cond.logic}</span>}
                      </span>
                    ))}
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
            <div className="text-center py-12 text-gray-500">
              Noch keine Optimierungen durchgeführt.
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className={`bg-white rounded-lg border p-4 ${
                  log.is_test_run ? 'border-amber-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.action_taken === 'scaled_up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                    {log.action_taken === 'scaled_down' && <TrendingDown className="w-4 h-4 text-amber-600" />}
                    {log.action_taken === 'paused' && <Pause className="w-4 h-4 text-red-600" />}
                    {log.action_taken === 'failed' && <AlertCircle className="w-4 h-4 text-red-600" />}
                    {log.action_taken === 'skipped' && <CheckCircle2 className="w-4 h-4 text-gray-400" />}

                    <span className="font-medium text-gray-900">
                      {log.action_taken === 'scaled_up' && 'Budget erhöht'}
                      {log.action_taken === 'scaled_down' && 'Budget reduziert'}
                      {log.action_taken === 'paused' && 'Pausiert'}
                      {log.action_taken === 'failed' && 'Fehlgeschlagen'}
                      {log.action_taken === 'skipped' && 'Übersprungen'}
                    </span>

                    {log.is_test_run && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                        TEST
                      </span>
                    )}
                  </div>

                  <span className="text-sm text-gray-500">
                    {new Date(log.executed_at).toLocaleString('de-DE')}
                  </span>
                </div>

                <div className="mt-2 text-sm text-gray-600">
                  {log.action_taken !== 'skipped' && log.action_taken !== 'paused' && (
                    <span>€{log.old_budget.toFixed(2)} → €{log.new_budget.toFixed(2)}</span>
                  )}
                  {log.error_message && (
                    <span className="text-red-600 ml-2">{log.error_message}</span>
                  )}
                </div>

                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>Spend: €{log.metrics_snapshot.spend.toFixed(2)}</span>
                  <span>Checkouts: {log.metrics_snapshot.checkouts}</span>
                  <span>ROAS: {log.metrics_snapshot.roas.toFixed(2)}</span>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Regel bearbeiten</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editedRule.name}
              onChange={(e) => setEditedRule({ ...editedRule, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priorität</label>
            <input
              type="number"
              value={editedRule.priority}
              onChange={(e) => setEditedRule({ ...editedRule, priority: parseInt(e.target.value) || 0 })}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">Höhere Priorität wird zuerst geprüft</p>
          </div>

          {/* Conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WENN (Bedingungen)
            </label>
            <div className="space-y-3">
              {editedRule.conditions.map((cond, index) => (
                <div key={index} className="flex items-center gap-2 flex-wrap">
                  <select
                    value={cond.metric}
                    onChange={(e) => updateCondition(index, { metric: e.target.value as OptimizationMetric })}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {METRICS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(index, { operator: e.target.value as OptimizationOperator })}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2"
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
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2"
                  />

                  <select
                    value={cond.time_range_days}
                    onChange={(e) => updateCondition(index, { time_range_days: parseInt(e.target.value) })}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {TIME_RANGES.map(d => (
                      <option key={d} value={d}>letzte {d} Tage</option>
                    ))}
                  </select>

                  {index < editedRule.conditions.length - 1 && (
                    <select
                      value={cond.logic || 'AND'}
                      onChange={(e) => updateCondition(index, { logic: e.target.value as OptimizationLogic })}
                      className="w-20 rounded-lg border border-gray-300 px-3 py-2 font-medium"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}

                  {editedRule.conditions.length > 1 && (
                    <button
                      onClick={() => removeCondition(index)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addCondition}
              className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Bedingung hinzufügen
            </button>
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DANN (Aktion)
            </label>
            <div className="flex items-center gap-3">
              <select
                value={editedRule.action_type}
                onChange={(e) => setEditedRule({ ...editedRule, action_type: e.target.value as OptimizationActionType })}
                className="rounded-lg border border-gray-300 px-3 py-2"
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
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2"
                  />

                  <select
                    value={editedRule.action_unit || 'percent'}
                    onChange={(e) => setEditedRule({ ...editedRule, action_unit: e.target.value as OptimizationActionUnit })}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Budget (€)
                </label>
                <input
                  type="number"
                  value={editedRule.min_budget}
                  onChange={(e) => setEditedRule({ ...editedRule, min_budget: parseFloat(e.target.value) || 5 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Budget (€)
                </label>
                <input
                  type="number"
                  value={editedRule.max_budget}
                  onChange={(e) => setEditedRule({ ...editedRule, max_budget: parseFloat(e.target.value) || 1000 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Abbrechen
          </button>
          <button
            onClick={() => onSave(editedRule)}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
