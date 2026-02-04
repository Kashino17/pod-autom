import { useState } from 'react'
import {
  Wand2,
  Image,
  Type,
  FileText,
  Edit3,
  Save,
  RotateCcw,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  AlertCircle,
} from 'lucide-react'

// =====================================================
// TYPES
// =====================================================

export type PromptType = 'image' | 'title' | 'description'

export interface Prompt {
  id: string
  type: PromptType
  name: string
  content: string
  isDefault: boolean
  isActive: boolean
  usageCount: number
  lastUsed?: string
  createdAt: string
}

interface PromptManagerProps {
  prompts: Prompt[]
  isLoading: boolean
  onSave: (type: PromptType, content: string) => void
  onReset: (type: PromptType) => void
  isSaving?: boolean
}

// Default prompts
const DEFAULT_PROMPTS: Record<PromptType, string> = {
  image: `Create a modern, eye-catching print-on-demand design.

Style: Clean, minimalist, trendy
Colors: Vibrant, high contrast
Background: Transparent or solid color
Format: Suitable for t-shirts and hoodies

Niche: {{niche}}
Theme: {{theme}}

The design should appeal to {{niche}} enthusiasts and be instantly recognizable.`,

  title: `Create a catchy, SEO-optimized product title.

Requirements:
- Length: 50-70 characters
- Include main keyword: {{niche}}
- Product type: {{product_type}}
- Unique and appealing
- Avoid generic phrases like "Best" or "Amazing"

Format: [Adjective] [Niche-related word] [Product type] - [Unique selling point]`,

  description: `Write a compelling product description for {{niche}} enthusiasts.

Product: {{product_type}}
Design theme: {{theme}}

Structure:
1. Hook (1 sentence) - Grab attention
2. Benefits (2-3 bullet points) - Why they need it
3. Quality details - Premium materials, print quality
4. Call to action - Limited availability, order now

Tone: Enthusiastic but professional
Length: 100-150 words
Include relevant keywords naturally.`,
}

const PROMPT_CONFIG: Record<PromptType, { icon: React.ReactNode; label: string; description: string }> = {
  image: {
    icon: <Image className="w-5 h-5" />,
    label: 'Bild-Prompt',
    description: 'Für die KI-Bildgenerierung (DALL-E / Midjourney)',
  },
  title: {
    icon: <Type className="w-5 h-5" />,
    label: 'Titel-Prompt',
    description: 'Für SEO-optimierte Produkttitel',
  },
  description: {
    icon: <FileText className="w-5 h-5" />,
    label: 'Beschreibungs-Prompt',
    description: 'Für überzeugende Produktbeschreibungen',
  },
}

const AVAILABLE_VARIABLES = [
  { key: '{{niche}}', description: 'Aktuelle Nische (z.B. "Fitness")' },
  { key: '{{theme}}', description: 'Design-Thema (z.B. "Motivation")' },
  { key: '{{product_type}}', description: 'Produkttyp (z.B. "T-Shirt")' },
  { key: '{{style}}', description: 'Stil (z.B. "Minimalist")' },
  { key: '{{color}}', description: 'Hauptfarbe (z.B. "Schwarz")' },
]

// =====================================================
// PROMPT CARD COMPONENT
// =====================================================

interface PromptCardProps {
  type: PromptType
  content: string
  isEditing: boolean
  isSaving: boolean
  hasChanges: boolean
  onEdit: () => void
  onSave: (content: string) => void
  onReset: () => void
  onCancel: () => void
}

function PromptCard({
  type,
  content,
  isEditing,
  isSaving,
  hasChanges,
  onEdit,
  onSave,
  onReset,
  onCancel,
}: PromptCardProps) {
  const [editedContent, setEditedContent] = useState(content)
  const [showPreview, setShowPreview] = useState(false)
  const [copied, setCopied] = useState(false)

  const config = PROMPT_CONFIG[type]

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => {
    onSave(editedContent)
  }

  const handleReset = () => {
    setEditedContent(DEFAULT_PROMPTS[type])
    onReset()
  }

  const handleCancel = () => {
    setEditedContent(content)
    onCancel()
  }

  // Preview with sample values
  const getPreview = () => {
    return editedContent
      .replace(/\{\{niche\}\}/g, 'Fitness')
      .replace(/\{\{theme\}\}/g, 'Motivation')
      .replace(/\{\{product_type\}\}/g, 'T-Shirt')
      .replace(/\{\{style\}\}/g, 'Minimalist')
      .replace(/\{\{color\}\}/g, 'Schwarz')
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center text-violet-400">
            {config.icon}
          </div>
          <div>
            <h3 className="font-medium text-white">{config.label}</h3>
            <p className="text-xs text-zinc-500">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && !isEditing && (
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
          )}
          {!isEditing ? (
            <button
              onClick={onEdit}
              className="btn-secondary text-sm"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Bearbeiten
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="btn-secondary text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary text-sm"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Speichern
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="input min-h-[200px] font-mono text-sm resize-none"
              placeholder={`${config.label} eingeben...`}
            />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="btn-secondary text-sm"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-1 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  {copied ? 'Kopiert!' : 'Kopieren'}
                </button>
                <button
                  onClick={handleReset}
                  className="btn-secondary text-sm"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Standard
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="btn-secondary text-sm"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Vorschau
                </button>
              </div>
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700">
                <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Vorschau mit Beispielwerten
                </p>
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                  {getPreview()}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <pre className="text-sm text-zinc-400 whitespace-pre-wrap font-mono bg-zinc-800/50 rounded-lg p-4 max-h-[150px] overflow-y-auto">
              {content}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================
// PROMPT MANAGER COMPONENT
// =====================================================

export function PromptManager({
  prompts,
  isLoading,
  onSave,
  onReset,
  isSaving = false,
}: PromptManagerProps) {
  const [editingType, setEditingType] = useState<PromptType | null>(null)
  const [showVariables, setShowVariables] = useState(false)

  const getPromptContent = (type: PromptType): string => {
    const prompt = prompts.find((p) => p.type === type)
    return prompt?.content || DEFAULT_PROMPTS[type]
  }

  const hasChanges = (type: PromptType): boolean => {
    const prompt = prompts.find((p) => p.type === type)
    return prompt ? prompt.content !== DEFAULT_PROMPTS[type] : false
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-violet-400" />
            KI-Prompts
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Passe die Prompts an, um die KI-generierten Inhalte zu steuern.
          </p>
        </div>
      </div>

      {/* Variables Info */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <button
          onClick={() => setShowVariables(!showVariables)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="font-medium text-white">Verfügbare Variablen</p>
              <p className="text-xs text-zinc-500">
                Dynamische Platzhalter für deine Prompts
              </p>
            </div>
          </div>
          {showVariables ? (
            <ChevronUp className="w-5 h-5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          )}
        </button>

        {showVariables && (
          <div className="p-4 pt-0 border-t border-zinc-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {AVAILABLE_VARIABLES.map((variable) => (
                <div
                  key={variable.key}
                  className="flex items-start gap-2 p-3 rounded-lg bg-zinc-800/50"
                >
                  <code className="px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded text-xs font-mono">
                    {variable.key}
                  </code>
                  <p className="text-xs text-zinc-400 flex-1">
                    {variable.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-300 font-medium">Tipps für bessere Ergebnisse</p>
            <ul className="mt-2 text-xs text-zinc-400 space-y-1">
              <li>• Sei spezifisch bei Stil, Format und gewünschtem Output</li>
              <li>• Nutze Variablen für dynamische, nischenspezifische Inhalte</li>
              <li>• Teste Änderungen zuerst mit einzelnen Produkten</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Prompt Cards */}
      <div className="space-y-4">
        {(['image', 'title', 'description'] as PromptType[]).map((type) => (
          <PromptCard
            key={type}
            type={type}
            content={getPromptContent(type)}
            isEditing={editingType === type}
            isSaving={isSaving}
            hasChanges={hasChanges(type)}
            onEdit={() => setEditingType(type)}
            onSave={(content) => {
              onSave(type, content)
              setEditingType(null)
            }}
            onReset={() => onReset(type)}
            onCancel={() => setEditingType(null)}
          />
        ))}
      </div>
    </div>
  )
}

export default PromptManager
