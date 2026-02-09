import { useState } from 'react'
import { DashboardLayout } from '@src/components/layout'
import { useShops } from '@src/hooks/useShopify'
import { useCampaigns, type Campaign, type CreateCampaignData } from '@src/hooks/useCampaigns'
import { usePinterest } from '@src/hooks/usePinterest'
import { useToast } from '@src/lib/store'
import {
  Loader2,
  Megaphone,
  Plus,
  Play,
  Pause,
  Trash2,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  MoreVertical,
  X,
  AlertTriangle,
  RefreshCw,
  Filter,
  BarChart3,
} from 'lucide-react'
import { Link } from 'react-router-dom'

// =====================================================
// STATS CARD COMPONENT
// =====================================================

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  color?: string
}

function StatsCard({ title, value, icon, color = 'violet' }: StatsCardProps) {
  const colorClasses: Record<string, string> = {
    violet: 'bg-violet-500/20 text-violet-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-zinc-400">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
  )
}

// =====================================================
// CAMPAIGN CARD COMPONENT
// =====================================================

interface CampaignCardProps {
  campaign: Campaign
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
  isUpdating: boolean
}

function CampaignCard({ campaign, onStatusChange, onDelete, isUpdating }: CampaignCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/20 text-emerald-400',
    PAUSED: 'bg-amber-500/20 text-amber-400',
    DRAFT: 'bg-zinc-700 text-zinc-400',
    ARCHIVED: 'bg-zinc-800 text-zinc-500',
    ERROR: 'bg-red-500/20 text-red-400',
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: campaign.currency || 'EUR',
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('de-DE').format(value)
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-white truncate">{campaign.name}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[campaign.status]}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            {campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)} |{' '}
            {campaign.campaign_type === 'winner_scaling' ? 'Winner' : 'Standard'}
          </p>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 py-1">
                {campaign.status === 'ACTIVE' && (
                  <button
                    onClick={() => {
                      onStatusChange(campaign.id, 'PAUSED')
                      setShowMenu(false)
                    }}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pausieren
                  </button>
                )}
                {campaign.status === 'PAUSED' && (
                  <button
                    onClick={() => {
                      onStatusChange(campaign.id, 'ACTIVE')
                      setShowMenu(false)
                    }}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Aktivieren
                  </button>
                )}
                {campaign.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => {
                      onStatusChange(campaign.id, 'ARCHIVED')
                      setShowMenu(false)
                    }}
                    disabled={isUpdating}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Archivieren
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('Kampagne wirklich loeschen?')) {
                      onDelete(campaign.id)
                    }
                    setShowMenu(false)
                  }}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Loeschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
            <DollarSign className="w-3 h-3" />
            Ausgaben
          </div>
          <p className="text-sm font-medium text-white">{formatCurrency(campaign.total_spend)}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
            <Eye className="w-3 h-3" />
            Impressionen
          </div>
          <p className="text-sm font-medium text-white">{formatNumber(campaign.total_impressions)}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
            <MousePointer className="w-3 h-3" />
            Klicks
          </div>
          <p className="text-sm font-medium text-white">{formatNumber(campaign.total_clicks)}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
            <ShoppingCart className="w-3 h-3" />
            Conversions
          </div>
          <p className="text-sm font-medium text-white">{formatNumber(campaign.total_conversions)}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">
            Budget: <span className="text-white">{formatCurrency(campaign.daily_budget)}/Tag</span>
          </span>
          {campaign.roas !== null && campaign.roas > 0 && (
            <span className="text-zinc-500">
              ROAS: <span className="text-emerald-400">{campaign.roas.toFixed(2)}x</span>
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-600">
          {campaign.last_sync_at
            ? `Sync: ${new Date(campaign.last_sync_at).toLocaleDateString('de-DE')}`
            : 'Nie synchronisiert'}
        </span>
      </div>
    </div>
  )
}

// =====================================================
// CREATE CAMPAIGN MODAL
// =====================================================

interface CreateCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: CreateCampaignData) => void
  isCreating: boolean
}

function CreateCampaignModal({ isOpen, onClose, onCreate, isCreating }: CreateCampaignModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dailyBudget, setDailyBudget] = useState('10.00')
  const [campaignType, setCampaignType] = useState<'standard' | 'collection'>('standard')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      daily_budget: parseFloat(dailyBudget),
      campaign_type: campaignType,
      status: 'DRAFT',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Neue Kampagne erstellen</h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Kampagnen-Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Sommer Kollektion 2026"
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung..."
              className="input w-full h-20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Tagesbudget (EUR)
              </label>
              <input
                type="number"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                min="1"
                step="0.01"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Kampagnen-Typ
              </label>
              <select
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value as 'standard' | 'collection')}
                className="input w-full"
              >
                <option value="standard">Standard</option>
                <option value="collection">Kollektion</option>
                <option value="product">Einzelprodukt</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="btn-primary flex-1"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Erstellen
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =====================================================
// EMPTY STATE COMPONENT
// =====================================================

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
      <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Megaphone className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Keine Kampagnen vorhanden
      </h3>
      <p className="text-zinc-400 mb-6 max-w-md mx-auto">
        Erstelle deine erste Pinterest Kampagne, um deine Produkte zu bewerben und mehr Verkaeufe zu generieren.
      </p>
      <button onClick={onCreateClick} className="btn-primary">
        <Plus className="w-4 h-4 mr-2" />
        Erste Kampagne erstellen
      </button>
    </div>
  )
}

// =====================================================
// PINTEREST NOT CONNECTED WARNING
// =====================================================

function PinterestNotConnected() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Pinterest nicht verbunden</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Verbinde dein Pinterest Business Konto in den Einstellungen, um Kampagnen zu erstellen und zu verwalten.
          </p>
          <Link to="/settings" className="inline-block mt-3 text-sm text-amber-400 hover:text-amber-300">
            Zu den Einstellungen →
          </Link>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// DASHBOARD CAMPAIGNS PAGE
// =====================================================

export default function DashboardCampaigns() {
  const { shops, isLoading: shopsLoading } = useShops()
  const { isConnected: pinterestConnected, isLoading: pinterestLoading } = usePinterest()
  const { addToast } = useToast()
  const currentShopId = shops[0]?.id ?? null

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const {
    campaigns,
    stats,
    isLoading,
    createCampaign,
    isCreating,
    updateStatus,
    isUpdatingStatus,
    deleteCampaign,
    refetch,
  } = useCampaigns(currentShopId)

  const loading = shopsLoading || isLoading || pinterestLoading

  // Filter campaigns
  const filteredCampaigns = statusFilter === 'all'
    ? campaigns
    : campaigns.filter((c: Campaign) => c.status === statusFilter)

  const handleCreate = (data: CreateCampaignData) => {
    createCampaign(data, {
      onSuccess: () => {
        addToast('Kampagne erstellt', 'success')
        setShowCreateModal(false)
      },
      onError: () => {
        addToast('Fehler beim Erstellen', 'error')
      },
    })
  }

  const handleStatusChange = (campaignId: string, status: string) => {
    updateStatus(
      { campaignId, status },
      {
        onSuccess: () => {
          addToast(`Kampagne ${status === 'ACTIVE' ? 'aktiviert' : status === 'PAUSED' ? 'pausiert' : 'archiviert'}`, 'success')
        },
        onError: () => {
          addToast('Fehler beim Aktualisieren', 'error')
        },
      }
    )
  }

  const handleDelete = (campaignId: string) => {
    deleteCampaign(campaignId, {
      onSuccess: () => {
        addToast('Kampagne geloescht', 'success')
      },
      onError: () => {
        addToast('Fehler beim Loeschen', 'error')
      },
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-violet-400" />
              Kampagnen
            </h1>
            <p className="text-zinc-400 mt-1">
              Verwalte deine Pinterest Werbekampagnen
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="btn-secondary"
              title="Aktualisieren"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {pinterestConnected && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neue Kampagne
              </button>
            )}
          </div>
        </div>

        {/* Pinterest Not Connected Warning */}
        {!pinterestConnected && <PinterestNotConnected />}

        {/* Stats Grid */}
        {pinterestConnected && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              title="Kampagnen"
              value={stats.total_campaigns}
              icon={<Megaphone className="w-4 h-4" />}
              color="violet"
            />
            <StatsCard
              title="Aktiv"
              value={stats.active_campaigns}
              icon={<Play className="w-4 h-4" />}
              color="emerald"
            />
            <StatsCard
              title="Ausgaben"
              value={`${stats.total_spend.toFixed(2)} EUR`}
              icon={<DollarSign className="w-4 h-4" />}
              color="amber"
            />
            <StatsCard
              title="Avg. ROAS"
              value={`${stats.avg_roas.toFixed(2)}x`}
              icon={<BarChart3 className="w-4 h-4" />}
              color="violet"
            />
          </div>
        )}

        {/* Campaigns List */}
        {pinterestConnected && (
          <>
            {/* Filter Bar */}
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-zinc-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-40"
              >
                <option value="all">Alle Status</option>
                <option value="ACTIVE">Aktiv</option>
                <option value="PAUSED">Pausiert</option>
                <option value="DRAFT">Entwurf</option>
                <option value="ARCHIVED">Archiviert</option>
              </select>
              <span className="text-sm text-zinc-500">
                {filteredCampaigns.length} Kampagne{filteredCampaigns.length !== 1 ? 'n' : ''}
              </span>
            </div>

            {/* Campaign Cards */}
            {campaigns.length === 0 ? (
              <EmptyState onCreateClick={() => setShowCreateModal(true)} />
            ) : filteredCampaigns.length === 0 ? (
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
                <p className="text-zinc-400">Keine Kampagnen mit diesem Status gefunden.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredCampaigns.map((campaign: Campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    isUpdating={isUpdatingStatus}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Create Campaign Modal */}
        <CreateCampaignModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          isCreating={isCreating}
        />
      </div>
    </DashboardLayout>
  )
}
