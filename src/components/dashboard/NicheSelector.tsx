import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Tag,
  Plus,
  X,
  Search,
  Loader2,
  Sparkles,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Lock,
  ArrowRight,
} from 'lucide-react'
import { useSubscription } from '@src/contexts/SubscriptionContext'

// =====================================================
// TYPES
// =====================================================

export interface NicheWithStats {
  id: string
  name: string
  slug: string
  isActive: boolean
  productCount: number
  createdAt: string
}

interface NicheSelectorProps {
  niches: NicheWithStats[]
  isLoading: boolean
  onAddNiche: (name: string) => void
  onToggleNiche: (id: string, active: boolean) => void
  onDeleteNiche: (id: string) => void
  isAdding?: boolean
}

// Suggested niches for quick add
const SUGGESTED_NICHES = [
  { name: 'Fitness & Sport', icon: '💪' },
  { name: 'Haustiere', icon: '🐕' },
  { name: 'Gaming', icon: '🎮' },
  { name: 'Musik', icon: '🎵' },
  { name: 'Reisen', icon: '✈️' },
  { name: 'Kochen', icon: '👨‍🍳' },
  { name: 'Fotografie', icon: '📷' },
  { name: 'Yoga', icon: '🧘' },
]

// =====================================================
// NICHE CARD COMPONENT
// =====================================================

interface NicheCardProps {
  niche: NicheWithStats
  onToggle: (active: boolean) => void
  onDelete: () => void
}

function NicheCard({ niche, onToggle, onDelete }: NicheCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={`relative bg-zinc-800/50 rounded-xl border transition-all ${
        niche.isActive
          ? 'border-violet-500/30 hover:border-violet-500/50'
          : 'border-zinc-700 opacity-60'
      }`}
    >
      {/* Content */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              niche.isActive ? 'bg-violet-500/20' : 'bg-zinc-700'
            }`}
          >
            <Tag className={`w-5 h-5 ${niche.isActive ? 'text-violet-400' : 'text-zinc-500'}`} />
          </div>
          <div>
            <h3 className="font-medium text-white">{niche.name}</h3>
            <p className="text-xs text-zinc-500">
              {niche.isActive ? 'Aktiv' : 'Pausiert'} · {niche.productCount} Produkte
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => {
                    onToggle(!niche.isActive)
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  {niche.isActive ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Pausieren
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Aktivieren
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// NICHE SELECTOR COMPONENT
// =====================================================

export function NicheSelector({
  niches,
  isLoading,
  onAddNiche,
  onToggleNiche,
  onDeleteNiche,
  isAdding = false,
}: NicheSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [newNiche, setNewNiche] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const { maxNiches, tier, isActive } = useSubscription()

  const filteredNiches = niches.filter((niche) =>
    niche.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeCount = niches.filter((n) => n.isActive).length
  const totalProducts = niches.reduce((sum, n) => sum + n.productCount, 0)

  // Limit checking
  const isUnlimited = maxNiches === Infinity
  const canAddMore = isActive && (isUnlimited || niches.length < maxNiches)
  const isAtLimit = !isUnlimited && niches.length >= maxNiches
  const isNearLimit = !isUnlimited && niches.length >= maxNiches * 0.8

  const handleAddNiche = (name: string) => {
    if (!name.trim()) return
    const exists = niches.some(
      (n) => n.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) return
    onAddNiche(name.trim())
    setNewNiche('')
    setShowAddModal(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAddNiche(newNiche)
  }

  // Available suggestions (not already added)
  const availableSuggestions = SUGGESTED_NICHES.filter(
    (s) => !niches.some((n) => n.name.toLowerCase() === s.name.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-violet-400" />
            Nischen
            {!isUnlimited && (
              <span className={`text-sm font-normal px-2 py-0.5 rounded-full ${
                isAtLimit
                  ? 'bg-red-500/20 text-red-400'
                  : isNearLimit
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-zinc-700 text-zinc-400'
              }`}>
                {niches.length}/{maxNiches}
              </span>
            )}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {activeCount} aktiv · {totalProducts} Produkte
          </p>
        </div>
        {canAddMore ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nische hinzufügen
          </button>
        ) : isAtLimit ? (
          <Link
            to={`/checkout?tier=${tier === 'basis' ? 'premium' : 'vip'}`}
            className="btn-primary"
          >
            <Lock className="w-4 h-4 mr-2" />
            Upgrade fuer mehr Nischen
          </Link>
        ) : (
          <button disabled className="btn-secondary opacity-50 cursor-not-allowed">
            <Plus className="w-4 h-4 mr-2" />
            Nische hinzufügen
          </button>
        )}
      </div>

      {/* Limit warning banner */}
      {isAtLimit && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-amber-200 font-medium">Nischen-Limit erreicht</p>
                <p className="text-sm text-amber-300/70">
                  Upgrade auf {tier === 'basis' ? 'Premium' : 'VIP'} fuer {tier === 'basis' ? '15' : 'unbegrenzte'} Nischen.
                </p>
              </div>
            </div>
            <Link
              to={`/checkout?tier=${tier === 'basis' ? 'premium' : 'vip'}`}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
            >
              Upgraden
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Search */}
      {niches.length > 4 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
            placeholder="Nischen durchsuchen..."
          />
        </div>
      )}

      {/* Niche Grid */}
      {filteredNiches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNiches.map((niche) => (
            <NicheCard
              key={niche.id}
              niche={niche}
              onToggle={(active) => onToggleNiche(niche.id, active)}
              onDelete={() => onDeleteNiche(niche.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchTerm ? 'Keine Nischen gefunden' : 'Keine Nischen vorhanden'}
          </h3>
          <p className="text-zinc-400 mb-4">
            {searchTerm
              ? 'Versuche einen anderen Suchbegriff.'
              : 'Füge deine erste Nische hinzu, um loszulegen.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Erste Nische hinzufügen
            </button>
          )}
        </div>
      )}

      {/* Add Niche Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            {/* Close button */}
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Nische hinzufügen</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Wähle eine Nische für die Produkt-Erstellung.
                {!isUnlimited && (
                  <span className={`ml-2 ${isNearLimit ? 'text-amber-400' : ''}`}>
                    ({niches.length}/{maxNiches} verwendet)
                  </span>
                )}
              </p>
            </div>

            {/* Custom input */}
            <form onSubmit={handleSubmit} className="mb-6">
              <label className="label">Eigene Nische</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNiche}
                  onChange={(e) => setNewNiche(e.target.value)}
                  className="input flex-1"
                  placeholder="z.B. Wandern, Camping, ..."
                />
                <button
                  type="submit"
                  disabled={!newNiche.trim() || isAdding}
                  className="btn-primary px-4"
                >
                  {isAdding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>

            {/* Suggestions */}
            {availableSuggestions.length > 0 && (
              <div>
                <label className="label flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Vorschläge
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableSuggestions.slice(0, 6).map((suggestion) => (
                    <button
                      key={suggestion.name}
                      onClick={() => handleAddNiche(suggestion.name)}
                      disabled={isAdding}
                      className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm transition-colors text-left"
                    >
                      <span className="text-lg">{suggestion.icon}</span>
                      <span>{suggestion.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NicheSelector
