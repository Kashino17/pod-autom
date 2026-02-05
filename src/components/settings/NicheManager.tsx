import { useState } from 'react'
import {
  Tag,
  Plus,
  X,
  Loader2,
  Search,
  Sparkles,
  Globe,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useNiches } from '@src/hooks/useShopify'

// =====================================================
// TYPES
// =====================================================

interface NicheManagerProps {
  settingsId: string
}

interface NicheWithDesignSettings {
  id: string
  settings_id: string
  niche_name: string
  niche_slug: string
  is_active: boolean
  language?: string
  auto_generate?: boolean
  daily_limit?: number
  created_at: string
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
  { name: 'Motivation', icon: '🔥' },
  { name: 'Natur', icon: '🌿' },
  { name: 'Essen & Food', icon: '🍕' },
]

// =====================================================
// NICHE CARD COMPONENT
// =====================================================

interface NicheCardProps {
  niche: NicheWithDesignSettings
  onUpdate: (nicheId: string, data: Record<string, unknown>) => void
  onDelete: (nicheId: string) => void
  isUpdating: boolean
  isDeleting: boolean
}

function NicheCard({ niche, onUpdate, onDelete, isUpdating, isDeleting }: NicheCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            niche.auto_generate ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
          }`} />
          <span className="text-white font-medium truncate">{niche.niche_name}</span>
          {niche.language && (
            <span className="px-1.5 py-0.5 bg-zinc-700 rounded text-xs text-zinc-400 uppercase flex-shrink-0">
              {niche.language}
            </span>
          )}
          {niche.auto_generate && (
            <span className="px-2 py-0.5 bg-emerald-500/20 rounded-full text-xs text-emerald-400 flex-shrink-0 hidden sm:inline">
              Auto ⚡
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors touch-manipulation"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(niche.id)}
            disabled={isDeleting}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Settings */}
      {expanded && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-0 space-y-3 border-t border-zinc-700/50">
          <div className="pt-3" />

          {/* Language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-300">Sprache</span>
            </div>
            <select
              value={niche.language || 'en'}
              onChange={(e) => onUpdate(niche.id, { language: e.target.value })}
              disabled={isUpdating}
              className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
            >
              <option value="en">🇬🇧 Englisch</option>
              <option value="de">🇩🇪 Deutsch</option>
            </select>
          </div>

          {/* Auto Generate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-zinc-500" />
              <div>
                <span className="text-sm text-zinc-300">Auto-Generierung</span>
                <p className="text-xs text-zinc-500">Designs täglich automatisch erstellen</p>
              </div>
            </div>
            <button
              onClick={() => onUpdate(niche.id, { auto_generate: !niche.auto_generate })}
              disabled={isUpdating}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                niche.auto_generate ? 'bg-emerald-500' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  niche.auto_generate ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Daily Limit */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-300">Designs pro Tag</span>
            </div>
            <select
              value={niche.daily_limit || 5}
              onChange={(e) => onUpdate(niche.id, { daily_limit: parseInt(e.target.value) })}
              disabled={isUpdating}
              className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
            >
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

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
    updateNiche,
    isUpdating,
  } = useNiches(settingsId)

  const [newNiche, setNewNiche] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const handleAddNiche = (nicheName: string) => {
    if (!nicheName.trim()) return
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

  const handleUpdateNiche = (nicheId: string, data: Record<string, unknown>) => {
    updateNiche({ nicheId, data })
  }

  // Filter suggestions
  const filteredSuggestions = SUGGESTED_NICHES.filter((suggestion) => {
    const matchesSearch = suggestion.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const alreadyAdded = niches.some(
      (n) => n.niche_name.toLowerCase() === suggestion.name.toLowerCase()
    )
    return matchesSearch && !alreadyAdded
  })

  const activeAutoGenerate = niches.filter((n) => n.auto_generate).length

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
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-violet-400" />
          Nischen verwalten
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          {niches.length} Nischen · {activeAutoGenerate} mit Auto-Generierung
        </p>
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
          className="btn-primary px-4 touch-manipulation"
        >
          {isCreating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
        </button>
      </form>

      {/* Current niches as cards */}
      {niches.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-400">
            Aktive Nischen — klicke ⚙️ für Design-Einstellungen:
          </p>
          {niches.map((niche) => (
            <NicheCard
              key={niche.id}
              niche={niche as NicheWithDesignSettings}
              onUpdate={handleUpdateNiche}
              onDelete={(id) => deleteNiche(id)}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {/* Info Banner */}
      {activeAutoGenerate > 0 && (
        <div className="p-3 sm:p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-sm text-emerald-300 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <strong>{activeAutoGenerate} Nische(n)</strong> generieren automatisch Designs
          </p>
          <p className="text-xs text-zinc-400 mt-1 ml-6">
            Designs werden täglich zur eingestellten Uhrzeit generiert. Du kannst die Zeit unter "Meine Motive" ändern.
          </p>
        </div>
      )}

      {/* Suggestions */}
      <div className="bg-zinc-800/50 rounded-xl p-3 sm:p-4 border border-zinc-700">
        <div className="flex items-center justify-between mb-3 gap-2">
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
              className="input pl-9 py-1.5 text-sm w-36 sm:w-48"
              placeholder="Suchen..."
            />
          </div>
        </div>

        {filteredSuggestions.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion.name}
                onClick={() => handleAddNiche(suggestion.name)}
                disabled={isCreating}
                className="flex items-center gap-2 p-2 rounded-lg bg-zinc-700/50 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-white text-sm transition-colors text-left touch-manipulation"
              >
                <span className="text-base">{suggestion.icon}</span>
                <span className="truncate">{suggestion.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-4">
            {searchTerm ? 'Keine Vorschläge gefunden' : 'Alle Vorschläge hinzugefügt 🎉'}
          </p>
        )}
      </div>

      {/* Tips */}
      <div className="p-3 sm:p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
        <p className="text-sm text-violet-300 font-medium">Tipps:</p>
        <ul className="mt-2 text-xs text-zinc-400 space-y-1">
          <li>• Klicke auf ⚙️ bei jeder Nische um Sprache und Auto-Generierung einzustellen</li>
          <li>• Deutsch erzeugt Slogans wie "Keine Ausreden, nur Ergebnisse"</li>
          <li>• Englisch erzeugt Slogans wie "Rise and grind"</li>
          <li>• Designs werden täglich zur eingestellten Uhrzeit erstellt</li>
          <li>• Unter "Meine Motive" kannst du auch manuell Designs generieren</li>
        </ul>
      </div>
    </div>
  )
}

export default NicheManager
