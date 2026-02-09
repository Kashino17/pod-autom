import { useState } from 'react'
import { DashboardLayout } from '@src/components/layout'
import { useShops } from '@src/hooks/useShopify'
import {
  useWinnerScaling,
  type WinnerProduct,
  type WinnerCampaign,
} from '@src/hooks/useWinnerScaling'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useToast } from '@src/lib/store'
import {
  Loader2,
  Trophy,
  TrendingUp,
  Video,
  Image,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  Settings,
  Sparkles,
  Target,
  Zap,
  Lock,
} from 'lucide-react'
import { Link } from 'react-router-dom'

// =====================================================
// STATS CARD COMPONENT
// =====================================================

interface StatsCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  trend?: number
  color?: string
}

function StatsCard({ title, value, icon, trend, color = 'violet' }: StatsCardProps) {
  const colorClasses = {
    violet: 'bg-violet-500/20 text-violet-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-zinc-400">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend !== undefined && (
          <span className={`text-sm ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  )
}

// =====================================================
// WINNER CARD COMPONENT
// =====================================================

interface WinnerCardProps {
  winner: WinnerProduct
  onToggle: (winnerId: string, isActive: boolean) => void
  onPauseCampaign: (campaignId: string) => void
  isToggling: boolean
}

function WinnerCard({ winner, onToggle, onPauseCampaign, isToggling }: WinnerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const activeCampaigns = winner.winner_campaigns?.filter(c => c.status === 'ACTIVE') ?? []
  const pausedCampaigns = winner.winner_campaigns?.filter(c => c.status === 'PAUSED') ?? []

  return (
    <div className={`bg-zinc-900 rounded-xl border ${winner.is_active ? 'border-zinc-800' : 'border-zinc-800/50'} overflow-hidden`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <div className="w-20 h-20 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
            {winner.shopify_image_url ? (
              <img
                src={winner.shopify_image_url}
                alt={winner.product_title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Trophy className="w-8 h-8 text-zinc-600" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-white truncate">
                  {winner.product_title}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Identifiziert: {new Date(winner.identified_at).toLocaleDateString('de-DE')}
                </p>
              </div>

              {/* Status Toggle */}
              <button
                onClick={() => onToggle(winner.id, !winner.is_active)}
                disabled={isToggling}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  winner.is_active
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                }`}
              >
                {winner.is_active ? 'Aktiv' : 'Pausiert'}
              </button>
            </div>

            {/* Sales Buckets */}
            <div className="flex gap-2 mt-3">
              <SalesBucket label="3T" value={winner.sales_3d} />
              <SalesBucket label="7T" value={winner.sales_7d} />
              <SalesBucket label="10T" value={winner.sales_10d} />
              <SalesBucket label="14T" value={winner.sales_14d} />
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/20 text-violet-400 text-xs">
                <Target className="w-3 h-3" />
                {winner.buckets_passed}/4
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Summary */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-emerald-400">
              <Play className="w-3 h-3" />
              {activeCampaigns.length} aktiv
            </span>
            <span className="flex items-center gap-1 text-zinc-500">
              <Pause className="w-3 h-3" />
              {pausedCampaigns.length} pausiert
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Kampagnen
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Campaigns */}
      {expanded && winner.winner_campaigns && winner.winner_campaigns.length > 0 && (
        <div className="border-t border-zinc-800 bg-zinc-950/50 p-4 space-y-2">
          {winner.winner_campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              onPause={() => onPauseCampaign(campaign.id)}
            />
          ))}
        </div>
      )}

      {/* No Campaigns Message */}
      {expanded && (!winner.winner_campaigns || winner.winner_campaigns.length === 0) && (
        <div className="border-t border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-sm text-zinc-500 text-center">
            Keine Kampagnen erstellt. Der naechste Job wird Kampagnen generieren.
          </p>
        </div>
      )}
    </div>
  )
}

// =====================================================
// SALES BUCKET COMPONENT
// =====================================================

function SalesBucket({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center px-2 py-1 rounded-md bg-zinc-800 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

// =====================================================
// CAMPAIGN ROW COMPONENT
// =====================================================

interface CampaignRowProps {
  campaign: WinnerCampaign
  onPause: () => void
}

function CampaignRow({ campaign, onPause }: CampaignRowProps) {
  const isActive = campaign.status === 'ACTIVE'

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          campaign.creative_type === 'video'
            ? 'bg-red-500/20 text-red-400'
            : 'bg-blue-500/20 text-blue-400'
        }`}>
          {campaign.creative_type === 'video' ? (
            <Video className="w-4 h-4" />
          ) : (
            <Image className="w-4 h-4" />
          )}
        </div>
        <div>
          <p className="text-sm text-white truncate max-w-[200px]">
            {campaign.campaign_name}
          </p>
          <p className="text-xs text-zinc-500">
            {campaign.creative_type === 'video' ? 'Video' : 'Bild'} | Link zu {campaign.link_type === 'product' ? 'Produkt' : 'Kollektion'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">
          {campaign.daily_budget.toFixed(2)} EUR/Tag
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          isActive
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-zinc-700 text-zinc-400'
        }`}>
          {campaign.status}
        </span>
        {isActive && (
          <button
            onClick={onPause}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Kampagne pausieren"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// =====================================================
// EMPTY STATE COMPONENT
// =====================================================

function EmptyState() {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
      <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Trophy className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Noch keine Winner identifiziert
      </h3>
      <p className="text-zinc-400 mb-6 max-w-md mx-auto">
        Sobald Produkte die Verkaufsschwellen erreichen, werden sie hier als Winner angezeigt
        und automatisch skaliert.
      </p>
      <div className="flex flex-col items-center gap-2 text-sm text-zinc-500">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          AI-generierte Creatives (Bilder & Videos)
        </div>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-400" />
          Automatische Kampagnen-Erstellung
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />
          A/B Testing mit Produkt & Collection Links
        </div>
      </div>
    </div>
  )
}

// =====================================================
// PREMIUM GATE COMPONENT
// =====================================================

function PremiumGate() {
  return (
    <div className="bg-zinc-900 rounded-xl border border-violet-500/30 p-12 text-center">
      <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Premium Feature
      </h3>
      <p className="text-zinc-400 mb-6 max-w-md mx-auto">
        Winner Scaling ist nur im Premium- und VIP-Tarif verfuegbar.
        Upgrade jetzt, um Top-Performer automatisch zu skalieren.
      </p>
      <Link to="/pricing" className="btn-primary">
        Auf Premium upgraden
      </Link>
    </div>
  )
}

// =====================================================
// DASHBOARD WINNERS PAGE
// =====================================================

export default function DashboardWinners() {
  const { shops, isLoading: shopsLoading } = useShops()
  const { canUseFeature } = useSubscription()
  const { addToast } = useToast()
  const currentShopId = shops[0]?.id ?? null

  const {
    winners,
    stats,
    isLoading,
    toggleWinner,
    isTogglingWinner,
    pauseCampaign,
  } = useWinnerScaling(currentShopId)

  const canUseWinnerScaling = canUseFeature('winnerScaling')
  const loading = shopsLoading || isLoading

  const handleToggleWinner = (winnerId: string, isActive: boolean) => {
    toggleWinner(
      { winnerId, isActive },
      {
        onSuccess: () => {
          addToast(
            isActive ? 'Winner aktiviert' : 'Winner pausiert',
            'success'
          )
        },
        onError: () => {
          addToast('Fehler beim Aktualisieren', 'error')
        },
      }
    )
  }

  const handlePauseCampaign = (campaignId: string) => {
    pauseCampaign(campaignId, {
      onSuccess: () => {
        addToast('Kampagne pausiert', 'success')
      },
      onError: () => {
        addToast('Fehler beim Pausieren', 'error')
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
              <Trophy className="w-6 h-6 text-violet-400" />
              Winner Scaling
            </h1>
            <p className="text-zinc-400 mt-1">
              Automatische Skalierung deiner Top-Performer
            </p>
          </div>
          <Link
            to="/settings"
            className="btn-secondary flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Einstellungen
          </Link>
        </div>

        {/* Premium Gate */}
        {!canUseWinnerScaling && <PremiumGate />}

        {/* Stats Grid */}
        {canUseWinnerScaling && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard
                title="Winner Produkte"
                value={stats.total_winners}
                icon={<Trophy className="w-4 h-4" />}
                color="violet"
              />
              <StatsCard
                title="Aktive Winner"
                value={stats.active_winners}
                icon={<TrendingUp className="w-4 h-4" />}
                color="emerald"
              />
              <StatsCard
                title="Video Kampagnen"
                value={stats.video_campaigns}
                icon={<Video className="w-4 h-4" />}
                color="amber"
              />
              <StatsCard
                title="Bild Kampagnen"
                value={stats.image_campaigns}
                icon={<Image className="w-4 h-4" />}
                color="violet"
              />
            </div>

            {/* Winners List */}
            {winners.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Winner Produkte ({winners.length})
                </h2>
                <div className="grid gap-4">
                  {winners.map((winner) => (
                    <WinnerCard
                      key={winner.id}
                      winner={winner}
                      onToggle={handleToggleWinner}
                      onPauseCampaign={handlePauseCampaign}
                      isToggling={isTogglingWinner}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
