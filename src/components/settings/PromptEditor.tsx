import { useState, useEffect } from 'react'
import { Wand2, Save, RotateCcw, Loader2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { api } from '@src/lib/api'
import { useToastStore } from '@src/lib/store'

// =====================================================
// TYPES
// =====================================================

interface PromptEditorProps {
  settingsId: string
}

interface Prompt {
  id: string
  settings_id: string
  prompt_type: 'image' | 'title' | 'description'
  prompt_text: string
  is_active: boolean
}

// Default prompts
const DEFAULT_PROMPTS = {
  image: `Create a modern, eye-catching print-on-demand design with clean lines and vibrant colors.
The design should be suitable for printing on t-shirts and hoodies.
Use a transparent or solid background.
Style: Modern, minimalist, trendy.
Niche: {{niche}}`,
  title: `Create a catchy, SEO-optimized product title for a {{product_type}} in the {{niche}} niche.
Requirements:
- Between 50-70 characters
- Include main keyword
- Sound appealing and unique
- Avoid generic phrases`,
  description: `Write a compelling product description for a {{product_type}} targeting {{niche}} enthusiasts.
Requirements:
- Highlight the unique design
- Mention print quality and comfort
- Include relevant keywords
- Clear call-to-action
- 100-150 words`,
}

const PROMPT_LABELS = {
  image: { title: 'Bild-Prompt', description: 'Für die KI-Bildgenerierung' },
  title: { title: 'Titel-Prompt', description: 'Für Produkttitel' },
  description: { title: 'Beschreibungs-Prompt', description: 'Für Produktbeschreibungen' },
}

// =====================================================
// PROMPT EDITOR COMPONENT
// =====================================================

export function PromptEditor({ settingsId }: PromptEditorProps) {
  const addToast = useToastStore((state) => state.addToast)

  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>('image')
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Fetch prompts
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const response = await api.get<{ success: boolean; prompts: Prompt[] }>(
          `/api/pod-autom/prompts/${settingsId}`
        )
        if (response.success) {
          setPrompts(response.prompts)
          // Initialize edited prompts
          const edited: Record<string, string> = {}
          response.prompts.forEach((p) => {
            edited[p.prompt_type] = p.prompt_text
          })
          setEditedPrompts(edited)
        }
      } catch {
        // If no prompts exist, use defaults
        setEditedPrompts({
          image: DEFAULT_PROMPTS.image,
          title: DEFAULT_PROMPTS.title,
          description: DEFAULT_PROMPTS.description,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrompts()
  }, [settingsId])

  const handleSave = async (promptType: 'image' | 'title' | 'description') => {
    setIsSaving(promptType)
    try {
      await api.put(`/api/pod-autom/prompts/${settingsId}/${promptType}`, {
        prompt_text: editedPrompts[promptType],
      })
      addToast({
        type: 'success',
        title: 'Prompt gespeichert',
        description: `${PROMPT_LABELS[promptType].title} wurde aktualisiert.`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: 'Prompt konnte nicht gespeichert werden.',
      })
    } finally {
      setIsSaving(null)
    }
  }

  const handleReset = (promptType: 'image' | 'title' | 'description') => {
    setEditedPrompts((prev) => ({
      ...prev,
      [promptType]: DEFAULT_PROMPTS[promptType],
    }))
  }

  const handleCopy = async (promptType: string) => {
    await navigator.clipboard.writeText(editedPrompts[promptType] || '')
    setCopiedId(promptType)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleExpand = (promptType: string) => {
    setExpandedPrompt(expandedPrompt === promptType ? null : promptType)
  }

  const hasChanges = (promptType: string) => {
    const original = prompts.find((p) => p.prompt_type === promptType)
    return original ? original.prompt_text !== editedPrompts[promptType] : true
  }

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
          <Wand2 className="w-5 h-5 text-violet-400" />
          KI-Prompts bearbeiten
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          Passe die Prompts an, um die KI-generierten Inhalte zu steuern.
        </p>
      </div>

      {/* Variables info */}
      <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <p className="text-sm text-zinc-300 mb-2">Verfügbare Variablen:</p>
        <div className="flex flex-wrap gap-2">
          {['{{niche}}', '{{product_type}}', '{{style}}', '{{color}}'].map((v) => (
            <code
              key={v}
              className="px-2 py-1 bg-zinc-700 text-violet-300 rounded text-xs font-mono"
            >
              {v}
            </code>
          ))}
        </div>
      </div>

      {/* Prompt editors */}
      <div className="space-y-3">
        {(['image', 'title', 'description'] as const).map((promptType) => (
          <div
            key={promptType}
            className="bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => toggleExpand(promptType)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/80 transition-colors"
            >
              <div>
                <p className="text-white font-medium flex items-center gap-2">
                  {PROMPT_LABELS[promptType].title}
                  {hasChanges(promptType) && (
                    <span className="w-2 h-2 bg-amber-500 rounded-full" />
                  )}
                </p>
                <p className="text-sm text-zinc-400">
                  {PROMPT_LABELS[promptType].description}
                </p>
              </div>
              {expandedPrompt === promptType ? (
                <ChevronUp className="w-5 h-5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              )}
            </button>

            {/* Editor */}
            {expandedPrompt === promptType && (
              <div className="px-4 pb-4 space-y-3">
                <textarea
                  value={editedPrompts[promptType] || ''}
                  onChange={(e) =>
                    setEditedPrompts((prev) => ({
                      ...prev,
                      [promptType]: e.target.value,
                    }))
                  }
                  className="input min-h-[150px] resize-none font-mono text-sm"
                  placeholder={`${PROMPT_LABELS[promptType].title} eingeben...`}
                />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(promptType)}
                      className="btn-secondary text-sm"
                    >
                      {copiedId === promptType ? (
                        <Check className="w-4 h-4 mr-1 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      {copiedId === promptType ? 'Kopiert!' : 'Kopieren'}
                    </button>
                    <button
                      onClick={() => handleReset(promptType)}
                      className="btn-secondary text-sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Standard
                    </button>
                  </div>
                  <button
                    onClick={() => handleSave(promptType)}
                    disabled={isSaving === promptType || !hasChanges(promptType)}
                    className="btn-primary text-sm"
                  >
                    {isSaving === promptType ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Speichern
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
        <p className="text-sm text-violet-300">
          <strong>Tipps für bessere Prompts:</strong>
        </p>
        <ul className="mt-2 text-xs text-zinc-400 space-y-1">
          <li>• Sei spezifisch bei Stil, Farben und Format</li>
          <li>• Nutze Variablen für dynamische Inhalte</li>
          <li>• Teste Änderungen mit wenigen Produkten zuerst</li>
        </ul>
      </div>
    </div>
  )
}

export default PromptEditor
