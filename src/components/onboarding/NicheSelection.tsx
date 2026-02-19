import { useState } from 'react'
import { Tag, Plus, X, Loader2, Sparkles, TrendingUp } from 'lucide-react'
import { useNiches, useShopSettings } from '@src/hooks/useShopify'

// =====================================================
// TYPES
// =====================================================

interface NicheSelectionProps {
  shopId: string | null
  onComplete: () => void
  onBack: () => void
}

// Suggested niches for quick selection
const SUGGESTED_NICHES = [
  { name: 'Fitness & Sport', icon: '💪' },
  { name: 'Haustiere', icon: '🐕' },
  { name: 'Gaming', icon: '🎮' },
  { name: 'Musik', icon: '🎵' },
  { name: 'Reisen', icon: '✈️' },
  { name: 'Kochen', icon: '👨‍🍳' },
  { name: 'Fotografie', icon: '📷' },
  { name: 'Garten', icon: '🌱' },
  { name: 'Angeln', icon: '🎣' },
  { name: 'Motorrad', icon: '🏍️' },
  { name: 'Yoga', icon: '🧘' },
  { name: 'Kaffee', icon: '☕' },
]

// =====================================================
// NICHE SELECTION STEP
// =====================================================

export function NicheSelection({ shopId, onComplete, onBack }: NicheSelectionProps) {
  const { settings } = useShopSettings(shopId)
  const {
    niches,
    isLoading,
    createNiche,
    isCreating,
    deleteNiche,
    isDeleting,
  } = useNiches(settings?.id || null)

  const [newNiche, setNewNiche] = useState('')

  const handleAddNiche = (nicheName: string) => {
    if (!nicheName.trim() || !settings?.id) return

    // Check if already exists
    const exists = niches.some(
      (n) => n.niche_name.toLowerCase() === nicheName.toLowerCase()
    )
    if (exists) return

    createNiche(nicheName.trim())
    setNewNiche('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAddNiche(newNiche)
  }

  const handleRemoveNiche = (nicheId: string) => {
    deleteNiche(nicheId)
  }

  const canContinue = niches.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Tag className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Nischen auswählen
        </h2>
        <p className="text-zinc-400">
          Wähle die Nischen, für die du Produkte erstellen möchtest.
        </p>
      </div>

      {/* Selected niches */}
      {niches.length > 0 && (
        <div className="space-y-2">
          <label className="label flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Deine Nischen ({niches.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {niches.map((niche) => (
              <span
                key={niche.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-lg text-sm"
              >
                {niche.niche_name}
                <button
                  onClick={() => handleRemoveNiche(niche.id)}
                  disabled={isDeleting}
                  className="ml-1 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add custom niche */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="newNiche" className="label">
          Nische hinzufügen
        </label>
        <div className="flex gap-2">
          <input
            id="newNiche"
            type="text"
            value={newNiche}
            onChange={(e) => setNewNiche(e.target.value)}
            className="input flex-1"
            placeholder="z.B. Wandern, Camping, ..."
          />
          <button
            type="submit"
            disabled={!newNiche.trim() || isCreating}
            className="btn-primary px-4"
          >
            {isCreating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Suggested niches */}
      <div className="space-y-2">
        <label className="label flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Beliebte Nischen
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SUGGESTED_NICHES.map((niche) => {
            const isSelected = niches.some(
              (n) => n.niche_name.toLowerCase() === niche.name.toLowerCase()
            )
            return (
              <button
                key={niche.name}
                onClick={() => !isSelected && handleAddNiche(niche.name)}
                disabled={isSelected || isCreating}
                className={`p-3 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-violet-500/30 text-violet-300 cursor-default'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                <span className="text-lg mr-1">{niche.icon}</span>
                {niche.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <p className="text-sm text-zinc-400">
          <strong className="text-white">Tipp:</strong> Starte mit 2-3 Nischen und erweitere später.
          Je spezifischer die Nische, desto besser die Ergebnisse.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 py-3">
          Zurück
        </button>
        <button
          onClick={onComplete}
          disabled={!canContinue}
          className="btn-primary flex-1 py-3"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Weiter'
          )}
        </button>
      </div>
    </div>
  )
}

export default NicheSelection
