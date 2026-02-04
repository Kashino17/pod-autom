import { useState } from 'react'
import { Tag, Plus, X, Loader2, Search, Sparkles } from 'lucide-react'
import { useNiches } from '@src/hooks/useShopify'

// =====================================================
// TYPES
// =====================================================

interface NicheManagerProps {
  settingsId: string
}

// Suggested niches
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
  { name: 'Wandern', icon: '🥾' },
  { name: 'Camping', icon: '⛺' },
  { name: 'Surfen', icon: '🏄' },
  { name: 'Skateboard', icon: '🛹' },
]

// =====================================================
// NICHE MANAGER COMPONENT
// =====================================================

export function NicheManager({ settingsId }: NicheManagerProps) {
  const {
    niches,
    isLoading,
    createNiche,
    isCreating,
    deleteNiche,
    isDeleting,
  } = useNiches(settingsId)

  const [newNiche, setNewNiche] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const handleAddNiche = (nicheName: string) => {
    if (!nicheName.trim()) return

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

  // Filter suggestions based on search and already added niches
  const filteredSuggestions = SUGGESTED_NICHES.filter((suggestion) => {
    const matchesSearch = suggestion.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const alreadyAdded = niches.some(
      (n) => n.niche_name.toLowerCase() === suggestion.name.toLowerCase()
    )
    return matchesSearch && !alreadyAdded
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-violet-400" />
            Nischen verwalten
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            {niches.length} Nischen aktiv
          </p>
        </div>
      </div>

      {/* Add new niche */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newNiche}
          onChange={(e) => setNewNiche(e.target.value)}
          className="input flex-1"
          placeholder="Neue Nische hinzufügen..."
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
      </form>

      {/* Current niches */}
      {niches.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
          <p className="text-sm text-zinc-400 mb-3">Aktive Nischen:</p>
          <div className="flex flex-wrap gap-2">
            {niches.map((niche) => (
              <span
                key={niche.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-lg text-sm group"
              >
                {niche.niche_name}
                <button
                  onClick={() => handleRemoveNiche(niche.id)}
                  disabled={isDeleting}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-zinc-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Vorschläge
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9 py-1.5 text-sm w-48"
              placeholder="Suchen..."
            />
          </div>
        </div>

        {filteredSuggestions.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion.name}
                onClick={() => handleAddNiche(suggestion.name)}
                disabled={isCreating}
                className="flex items-center gap-2 p-2 rounded-lg bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm transition-colors text-left"
              >
                <span className="text-base">{suggestion.icon}</span>
                <span className="truncate">{suggestion.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-4">
            {searchTerm
              ? 'Keine Vorschläge gefunden'
              : 'Alle Vorschläge wurden hinzugefügt'}
          </p>
        )}
      </div>

      {/* Tips */}
      <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
        <p className="text-sm text-violet-300">
          <strong>Tipps für Nischen:</strong>
        </p>
        <ul className="mt-2 text-xs text-zinc-400 space-y-1">
          <li>• Je spezifischer die Nische, desto besser die Ergebnisse</li>
          <li>• Kombiniere breite und spezifische Nischen für mehr Vielfalt</li>
          <li>• Teste neue Nischen mit wenigen Produkten zuerst</li>
        </ul>
      </div>
    </div>
  )
}

export default NicheManager
