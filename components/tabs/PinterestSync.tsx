import React, { useState, useEffect } from 'react';
import {
  Share2, Plus, Search, Layers, Save, Trash2, ChevronDown,
  AlertTriangle, Info, Target, RefreshCw, Loader2, LogOut, Check, Filter
} from 'lucide-react';
import {
  usePinterestAuth,
  usePinterestAdAccounts,
  usePinterestCampaigns,
  usePinterestSettings,
  useConnectPinterest,
  useDisconnectPinterest,
  useSyncPinterestAdAccounts,
  useRefreshPinterestCampaigns,
  useSelectPinterestAdAccount,
  useUpdatePinterestSettings,
  useCampaignBatchAssignments,
  useCreateCampaignBatchAssignment,
  useDeleteCampaignBatchAssignment,
  useStoredShopifyCollections,
  useUpsertPinterestCampaign
} from '../../src/hooks/usePinterest';
import { useShop } from '../../src/hooks/useShops';

interface PinterestSyncProps {
  shopId: string;
}

// Type definitions for API responses
interface PinterestAuth {
  is_connected: boolean;
  pinterest_username?: string;
}

interface PinterestAdAccount {
  id: string;
  pinterest_account_id: string;
  name: string;
  currency: string;
  is_selected: boolean;
}

interface PinterestCampaign {
  id: string;
  name: string;
  status: string;
  daily_budget?: number;
}

interface PinterestSettings {
  global_batch_size: number;
}

interface ShopifyCollection {
  id: string;
  shopify_id: string;
  title: string;
  product_count: number;
}

// Joined assignment data from Supabase
interface SyncAssignmentJoined {
  id: string;
  campaign_id: string;
  collection_id: string;
  batch_indices: number[];
  created_at: string;
  pinterest_campaigns: {
    id: string;
    name: string;
    status: string;
    pinterest_campaign_id: string;
  } | null;
  shopify_collections: {
    id: string;
    title: string;
    shopify_id: string;
    product_count: number;
  } | null;
}

export const PinterestSync: React.FC<PinterestSyncProps> = ({ shopId }) => {
  // Get shop data for Shopify credentials
  const { data: shop } = useShop(shopId);

  // Data queries
  const { data: pinterestAuthRaw, isLoading: authLoading } = usePinterestAuth(shopId);
  const pinterestAuth = pinterestAuthRaw as PinterestAuth | null;
  const { data: adAccountsRaw = [], isLoading: accountsLoading } = usePinterestAdAccounts(shopId);
  const adAccounts = adAccountsRaw as PinterestAdAccount[];
  const { data: campaignsRaw = [], isLoading: campaignsLoading } = usePinterestCampaigns(
    shopId,
    adAccounts.find(a => a.is_selected)?.pinterest_account_id || null
  );
  const campaigns = campaignsRaw as PinterestCampaign[];
  const { data: settingsRaw } = usePinterestSettings(shopId);
  const settings = settingsRaw as PinterestSettings | null;
  // Load collections from Supabase (synced from Shopify)
  const { data: collectionsRaw = [] } = useStoredShopifyCollections(shopId);
  const collections = collectionsRaw as ShopifyCollection[];

  // Mutations
  const connectPinterest = useConnectPinterest();
  const disconnectPinterest = useDisconnectPinterest();
  const syncAdAccounts = useSyncPinterestAdAccounts();
  const refreshCampaigns = useRefreshPinterestCampaigns();
  const selectAdAccount = useSelectPinterestAdAccount();
  const updateSettings = useUpdatePinterestSettings();

  // Sync assignments
  const { data: syncAssignmentsRaw = [] } = useCampaignBatchAssignments(shopId);
  const syncAssignments = syncAssignmentsRaw as SyncAssignmentJoined[];
  const createAssignment = useCreateCampaignBatchAssignment();
  const deleteAssignment = useDeleteCampaignBatchAssignment();
  const upsertCampaign = useUpsertPinterestCampaign();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const [tempBatchSize, setTempBatchSize] = useState(settings?.global_batch_size || 10);
  const [formState, setFormState] = useState({
    campaignMode: 'EXISTING' as 'EXISTING' | 'NEW',
    selectedCampaignId: '',
    newCampaignName: '',
    selectedCollectionId: '',
    selectedBatch: 1,
  });

  // Get selected ad account
  const selectedAdAccount = adAccounts.find(a => a.is_selected);

  // Update batch size when settings load
  useEffect(() => {
    if (settings?.global_batch_size) {
      setTempBatchSize(settings.global_batch_size);
    }
  }, [settings]);

  // Auto-sync ad accounts when connected but no accounts loaded
  useEffect(() => {
    if (pinterestAuth?.is_connected && !accountsLoading && adAccounts.length === 0 && !syncAdAccounts.isPending) {
      syncAdAccounts.mutate(shopId);
    }
  }, [pinterestAuth?.is_connected, accountsLoading, adAccounts.length]);

  // Auto-select first ad account if none selected
  useEffect(() => {
    if (adAccounts.length > 0 && !selectedAdAccount && !selectAdAccount.isPending) {
      selectAdAccount.mutate({ shopId, adAccountId: adAccounts[0].pinterest_account_id });
    }
  }, [adAccounts, selectedAdAccount]);

  // Campaigns are now automatically loaded by usePinterestCampaigns when adAccountId is set

  const hasBatchSizeChanged = tempBatchSize !== (settings?.global_batch_size || 10);

  // Handlers
  const handleConnect = () => {
    connectPinterest.mutate(shopId);
  };

  const handleDisconnect = async () => {
    if (confirm('Pinterest-Verbindung wirklich trennen? Alle Kampagnen-Zuweisungen gehen verloren.')) {
      await disconnectPinterest.mutateAsync(shopId);
    }
  };

  const handleSyncAdAccounts = async () => {
    await syncAdAccounts.mutateAsync(shopId);
  };

  const handleSelectAdAccount = async (accountId: string) => {
    await selectAdAccount.mutateAsync({ shopId, adAccountId: accountId });
  };

  const handleRefreshCampaigns = async () => {
    if (selectedAdAccount) {
      await refreshCampaigns.mutateAsync({
        shopId,
        adAccountId: selectedAdAccount.pinterest_account_id
      });
    }
  };

  const saveBatchSize = async () => {
    await updateSettings.mutateAsync({
      shopId,
      settings: { global_batch_size: tempBatchSize }
    });
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 text-[#E60023] animate-spin" />
      </div>
    );
  }

  // Not connected view
  if (!pinterestAuth?.is_connected) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-[#E60023]/10 flex items-center justify-center mb-8 border border-[#E60023]/20 shadow-[0_0_30px_rgba(230,0,35,0.1)]">
          <Share2 className="w-10 h-10 text-[#E60023]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Pinterest Marketing Sync</h2>
        <p className="text-zinc-400 text-center max-w-md mb-8">
          Verbinde dein Pinterest Ad Account um Produkte automatisch in Kampagnen zu synchronisieren.
        </p>
        <button
          onClick={handleConnect}
          disabled={connectPinterest.isPending}
          className="bg-[#E60023] hover:bg-[#ad081b] text-white px-8 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-[#E60023]/25 flex items-center gap-2 disabled:opacity-50"
        >
          {connectPinterest.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Share2 className="w-5 h-5" />
          )}
          Mit Pinterest verbinden
        </button>
      </div>
    );
  }

  // Selected collection for batch calculation
  const selectedCollection = collections.find(c => c.id === formState.selectedCollectionId);
  const batchSize = settings?.global_batch_size || 10;
  const maxBatches = selectedCollection ? Math.ceil((selectedCollection.product_count || 0) / batchSize) : 1;

  // Filter sync assignments for search
  const filteredAssignments = syncAssignments.filter(a =>
    (a.pinterest_campaigns?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.shopify_collections?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get campaign name and collection name for an assignment
  const getCampaignName = (assignment: SyncAssignmentJoined) => {
    return assignment.pinterest_campaigns?.name || 'Unbekannte Kampagne';
  };

  const getCollectionName = (assignment: SyncAssignmentJoined) => {
    return assignment.shopify_collections?.title || 'Unbekannte Kollektion';
  };

  // Handle creating a sync assignment
  const handleCreateSync = async () => {
    if (!formState.selectedCampaignId || !formState.selectedCollectionId) return;

    // Find the selected campaign from Pinterest API data
    const selectedCampaign = campaigns.find(c => c.id === formState.selectedCampaignId);
    const selectedCol = collections.find(c => c.id === formState.selectedCollectionId);

    if (!selectedCampaign || !selectedCol) return;

    try {
      // Step 1: Upsert the campaign to Supabase to get/create a UUID
      const savedCampaign = await upsertCampaign.mutateAsync({
        shop_id: shopId,
        ad_account_id: selectedAdAccount?.pinterest_account_id,
        pinterest_campaign_id: selectedCampaign.id, // The Pinterest API campaign ID
        name: selectedCampaign.name,
        status: selectedCampaign.status,
        daily_budget: selectedCampaign.daily_budget
      });

      // Step 2: Create the assignment using the Supabase UUIDs
      await createAssignment.mutateAsync({
        shop_id: shopId,
        campaign_id: savedCampaign.id,  // UUID from pinterest_campaigns table
        collection_id: selectedCol.id,   // UUID from shopify_collections table
        batch_indices: [formState.selectedBatch]
      });

      // Reset form
      setFormState({
        ...formState,
        selectedCampaignId: '',
        selectedCollectionId: '',
        selectedBatch: 1
      });
    } catch (error) {
      console.error('Error creating sync:', error);
    }
  };

  // Handle delete confirmation
  const confirmDelete = async () => {
    if (linkToDelete) {
      await deleteAssignment.mutateAsync({ assignmentId: linkToDelete, shopId });
      setLinkToDelete(null);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500 relative">

      {/* DELETE CONFIRMATION MODAL */}
      {linkToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Sync Job löschen?</h3>
                <p className="text-sm text-zinc-400 mt-2">
                  Die Synchronisation für diese Kampagne wird sofort gestoppt.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setLinkToDelete(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteAssignment.isPending}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50"
                >
                  {deleteAssignment.isPending ? 'Löschen...' : 'Löschen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 shrink-0 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#E60023]/10 rounded-lg border border-[#E60023]/20">
            <Share2 className="w-5 h-5 text-[#E60023]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Verbunden als</span>
              <span className="text-white font-medium">{pinterestAuth.pinterest_username || 'Pinterest User'}</span>
            </div>

            {/* Ad Account Selector */}
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedAdAccount?.pinterest_account_id || ''}
                onChange={(e) => handleSelectAdAccount(e.target.value)}
                disabled={accountsLoading || adAccounts.length === 0}
                className="bg-transparent text-zinc-400 text-sm focus:outline-none cursor-pointer disabled:cursor-not-allowed"
              >
                {adAccounts.length === 0 ? (
                  <option value="">Keine Ad Accounts gefunden</option>
                ) : (
                  adAccounts.map(acc => (
                    <option key={acc.id} value={acc.pinterest_account_id} className="bg-zinc-900">
                      {acc.name} ({acc.currency})
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={handleSyncAdAccounts}
                disabled={syncAdAccounts.isPending}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                title="Ad Accounts neu laden"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncAdAccounts.isPending ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Info Tooltip */}
          <div className="relative group">
            <Info className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-help transition-colors" />
            <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
              <h4 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                Batch Konfiguration
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Anzahl der Produkte pro Synchronisierung.
              </p>
            </div>
          </div>

          {/* Batch Size Input */}
          <div className="flex items-center gap-1">
            <div className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-950 rounded-lg border transition-colors ${hasBatchSizeChanged ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800'}`}>
              <input
                type="number"
                min="1"
                max="500"
                value={tempBatchSize}
                onChange={(e) => setTempBatchSize(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-12 bg-transparent text-right text-xs text-white focus:outline-none font-mono"
              />
              <span className="text-xs text-zinc-500 select-none">Produkte/Batch</span>
            </div>

            <button
              onClick={saveBatchSize}
              disabled={!hasBatchSizeChanged || updateSettings.isPending}
              className={`p-1.5 rounded-lg border transition-all duration-200 flex items-center justify-center w-8 h-8 ${
                hasBatchSizeChanged
                  ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed opacity-50'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            disabled={disconnectPinterest.isPending}
            className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
            title="Pinterest trennen"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6">

        {/* LEFT: SYNC REGISTRY */}
        <div className="col-span-12 lg:col-span-5 flex flex-col bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Header & Search */}
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-200 text-sm">Sync Registry</h3>
              <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 border border-zinc-700">
                {filteredAssignments.length} Aktiv
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Kampagne oder Kollektion suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-1.5 pl-8 pr-2 text-xs text-white focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950/30">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-950/80 text-[10px] uppercase text-zinc-500 font-semibold sticky top-0 z-10 backdrop-blur-md border-b border-zinc-800/50">
                <tr>
                  <th className="px-4 py-2 font-medium tracking-wider">Job Details</th>
                  <th className="px-2 py-2 text-center font-medium tracking-wider w-16">Batch</th>
                  <th className="px-4 py-2 text-right font-medium tracking-wider w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.map(assignment => (
                    <tr key={assignment.id} className="group hover:bg-zinc-900/50 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-start gap-3">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-zinc-200 truncate" title={getCampaignName(assignment)}>
                              {getCampaignName(assignment)}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate mt-0.5" title={getCollectionName(assignment)}>
                              {getCollectionName(assignment)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center align-middle">
                        <span className="text-[10px] font-mono text-zinc-400">
                          #{assignment.batch_indices?.[0] || 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <button
                          onClick={() => setLinkToDelete(assignment.id)}
                          className="p-1.5 hover:bg-red-500/10 rounded-md text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Sync entfernen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-600">
                        <Filter className="w-6 h-6 mb-2 opacity-20" />
                        <p className="text-xs">Keine Sync-Jobs vorhanden</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Erstelle rechts eine neue Synchronisation</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: CREATE SYNC */}
        <div className="col-span-12 lg:col-span-7 flex flex-col bg-zinc-900/20 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/40">
            <h3 className="font-semibold text-zinc-200 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-zinc-500" />
              Neue Synchronisation erstellen
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-8">

              {/* SECTION 1: CAMPAIGN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" /> 1. Kampagne wählen
                  </label>
                  <button
                    onClick={handleRefreshCampaigns}
                    disabled={refreshCampaigns.isPending || !selectedAdAccount}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                    title="Kampagnen neu laden"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshCampaigns.isPending ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <select
                  value={formState.selectedCampaignId}
                  onChange={(e) => setFormState({...formState, selectedCampaignId: e.target.value})}
                  disabled={campaignsLoading || campaigns.length === 0}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 appearance-none disabled:opacity-50"
                >
                  <option value="">-- Kampagne auswählen ({campaigns.filter(c => ['ACTIVE', 'SCHEDULED'].includes(c.status)).length} verfügbar) --</option>
                  {campaigns
                    .filter(c => ['ACTIVE', 'SCHEDULED'].includes(c.status))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status})
                      </option>
                    ))}
                </select>
              </div>

              {/* SECTION 2: COLLECTION */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> 2. Kollektion wählen
                </label>

                <select
                  value={formState.selectedCollectionId}
                  onChange={(e) => setFormState({
                    ...formState,
                    selectedCollectionId: e.target.value,
                    selectedBatch: 1
                  })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 appearance-none"
                >
                  <option value="">-- Kollektion auswählen --</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.product_count || 0} Produkte)
                    </option>
                  ))}
                </select>
              </div>

              {/* SECTION 3: BATCH */}
              <div className={`space-y-4 transition-opacity ${!formState.selectedCollectionId ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> 3. Batch auswählen
                </label>

                <select
                  value={formState.selectedBatch}
                  onChange={(e) => setFormState({...formState, selectedBatch: parseInt(e.target.value)})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 px-4 text-sm text-white focus:outline-none focus:border-zinc-600 appearance-none"
                >
                  {Array.from({ length: maxBatches }, (_, i) => i + 1).map(num => {
                    const startItem = (num - 1) * batchSize + 1;
                    const endItem = Math.min(num * batchSize, selectedCollection?.product_count || 0);
                    return (
                      <option key={num} value={num}>
                        Batch {num} (Produkte {startItem} - {endItem})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* ACTION */}
              <div className="pt-6 border-t border-zinc-800">
                <button
                  onClick={handleCreateSync}
                  disabled={!formState.selectedCampaignId || !formState.selectedCollectionId || createAssignment.isPending}
                  className="w-full bg-[#E60023] hover:bg-[#ad081b] disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-3 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {createAssignment.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {createAssignment.isPending ? 'Speichern...' : 'Sync erstellen'}
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
