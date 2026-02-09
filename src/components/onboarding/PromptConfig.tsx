import { useState } from 'react'
import { Wand2, Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useShopSettings } from '@src/hooks/useShopify'

// =====================================================
// TYPES
// =====================================================

interface PromptConfigProps {
  shopId: string
  onComplete: () => void
  onBack: () => void
}

// Default prompts for different aspects
const DEFAULT_PROMPTS = {
  image_style: `Create a modern, eye-catching print-on-demand design with clean lines and vibrant colors.
The design should be suitable for printing on t-shirts and hoodies.
Use a transparent or solid background.
Style: Modern, minimalist, trendy.`,
  title_style: `Create a catchy, SEO-optimized product title that:
- Includes the main keyword/niche
- Is between 50-70 characters
- Sounds appealing and unique
- Avoids generic phrases`,
  description_style: `Write a compelling product description that:
- Highlights the unique design
- Mentions print quality and comfort
- Includes relevant keywords
- Has a clear call-to-action
- Is 100-150 words`,
}

// =====================================================
// PROMPT CONFIG STEP
// =====================================================

export function PromptConfig({ shopId, onComplete, onBack }: PromptConfigProps) {
  const { isUpdating } = useShopSettings(shopId)

  const [imagePrompt, setImagePrompt] = useState(DEFAULT_PROMPTS.image_style)
  const [titlePrompt, setTitlePrompt] = useState(DEFAULT_PROMPTS.title_style)
  const [descriptionPrompt, setDescriptionPrompt] = useState(DEFAULT_PROMPTS.description_style)

  const [expandedSection, setExpandedSection] = useState<string | null>('image')
  const [useDefaults, setUseDefaults] = useState(true)

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleContinue = () => {
    // In a full implementation, we would save the prompts here
    // For now, we just continue to the next step
    onComplete()
  }

  const resetToDefault = (type: 'image' | 'title' | 'description') => {
    switch (type) {
      case 'image':
        setImagePrompt(DEFAULT_PROMPTS.image_style)
        break
      case 'title':
        setTitlePrompt(DEFAULT_PROMPTS.title_style)
        break
      case 'description':
        setDescriptionPrompt(DEFAULT_PROMPTS.description_style)
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wand2 className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          KI-Prompts konfigurieren
        </h2>
        <p className="text-zinc-400">
          Passe an, wie die KI deine Designs und Texte erstellt.
        </p>
      </div>

      {/* Use defaults toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <div>
          <p className="text-white font-medium">Standard-Prompts verwenden</p>
          <p className="text-sm text-zinc-400">
            Optimierte Prompts für beste Ergebnisse
          </p>
        </div>
        <button
          onClick={() => setUseDefaults(!useDefaults)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            useDefaults ? 'bg-violet-500' : 'bg-zinc-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              useDefaults ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Prompt sections */}
      {!useDefaults && (
        <div className="space-y-3">
          {/* Image Prompt */}
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 overflow-hidden">
            <button
              onClick={() => toggleSection('image')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-white font-medium">Bild-Prompt</p>
                <p className="text-sm text-zinc-400">Für die Design-Generierung</p>
              </div>
              {expandedSection === 'image' ? (
                <ChevronUp className="w-5 h-5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              )}
            </button>
            {expandedSection === 'image' && (
              <div className="px-4 pb-4 space-y-2">
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  className="input min-h-[120px] resize-none"
                  placeholder="Beschreibe den gewünschten Bildstil..."
                />
                <button
                  onClick={() => resetToDefault('image')}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  Auf Standard zurücksetzen
                </button>
              </div>
            )}
          </div>

          {/* Title Prompt */}
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 overflow-hidden">
            <button
              onClick={() => toggleSection('title')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-white font-medium">Titel-Prompt</p>
                <p className="text-sm text-zinc-400">Für Produkttitel</p>
              </div>
              {expandedSection === 'title' ? (
                <ChevronUp className="w-5 h-5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              )}
            </button>
            {expandedSection === 'title' && (
              <div className="px-4 pb-4 space-y-2">
                <textarea
                  value={titlePrompt}
                  onChange={(e) => setTitlePrompt(e.target.value)}
                  className="input min-h-[100px] resize-none"
                  placeholder="Beschreibe den gewünschten Titelstil..."
                />
                <button
                  onClick={() => resetToDefault('title')}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  Auf Standard zurücksetzen
                </button>
              </div>
            )}
          </div>

          {/* Description Prompt */}
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 overflow-hidden">
            <button
              onClick={() => toggleSection('description')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-white font-medium">Beschreibungs-Prompt</p>
                <p className="text-sm text-zinc-400">Für Produktbeschreibungen</p>
              </div>
              {expandedSection === 'description' ? (
                <ChevronUp className="w-5 h-5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              )}
            </button>
            {expandedSection === 'description' && (
              <div className="px-4 pb-4 space-y-2">
                <textarea
                  value={descriptionPrompt}
                  onChange={(e) => setDescriptionPrompt(e.target.value)}
                  className="input min-h-[100px] resize-none"
                  placeholder="Beschreibe den gewünschten Beschreibungsstil..."
                />
                <button
                  onClick={() => resetToDefault('description')}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  Auf Standard zurücksetzen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
        <div className="flex gap-2">
          <Info className="w-5 h-5 text-violet-400 flex-shrink-0" />
          <p className="text-sm text-violet-300">
            Die KI verwendet GPT-4 und DALL-E für beste Ergebnisse.
            Du kannst die Prompts jederzeit in den Einstellungen anpassen.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 py-3">
          Zurück
        </button>
        <button
          onClick={handleContinue}
          disabled={isUpdating}
          className="btn-primary flex-1 py-3"
        >
          {isUpdating ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Weiter'
          )}
        </button>
      </div>
    </div>
  )
}

export default PromptConfig
