# Phase 3.4 - PromptManager Komponente

## Ziel
Dashboard-Komponente zur Verwaltung der KI-Prompts für Bild-, Titel- und Beschreibungsgenerierung.

## Kritische Hinweise

### ⚠️ Keine Native Dialogs
`confirm()` und `alert()` sind nicht barrierefrei. Immer ConfirmDialog verwenden.

### ⚠️ Kein Delete-then-Insert
Das Löschen und Neuerstellen aller Datensätze ist gefährlich und ineffizient.
Immer `upsert` mit `onConflict` verwenden.

---

## Komponenten

### 1. src/hooks/usePrompts.ts (NEU)

Dedizierter Hook für Prompt-Verwaltung mit sicherem Upsert.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { toast } from '@src/components/ui/Toast'

export type PromptType = 'image' | 'title' | 'description'

export interface Prompt {
  id: string
  settings_id: string
  prompt_type: PromptType
  prompt_text: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export const defaultPrompts: Record<PromptType, string> = {
  image: `Erstelle ein minimalistisches, trendiges T-Shirt Design für die Nische "{niche}".

Das Design sollte:
- Modern und ansprechend sein
- Gut auf schwarzem oder weißem Hintergrund funktionieren
- Keine Texte enthalten (nur Grafik)
- Im Flat-Design Stil sein
- Hochauflösend und druckfähig sein (mindestens 4500x5400px)
- Transparenten Hintergrund haben`,

  title: `Erstelle einen verkaufsstarken Produkttitel für ein T-Shirt in der Nische "{niche}".

Der Titel sollte:
- Maximal 60 Zeichen lang sein
- Relevante Keywords für SEO enthalten
- Die Zielgruppe emotional ansprechen
- Einzigartig und einprägsam sein
- Auf Deutsch sein`,

  description: `Erstelle eine überzeugende Produktbeschreibung für ein T-Shirt in der Nische "{niche}".

Die Beschreibung sollte:
- Ca. 150-200 Wörter lang sein
- Die Vorteile des Produkts hervorheben (Qualität, Komfort, Design)
- Emotionen ansprechen und eine Geschichte erzählen
- Wichtige Details wie Material (100% Baumwolle) und Passform erwähnen
- Einen klaren Call-to-Action enthalten
- SEO-optimiert sein mit relevanten Keywords
- Auf Deutsch sein`
}

// Prompt-Vorlagen für verschiedene Stile
export const promptTemplates: Record<PromptType, { name: string; prompt: string }[]> = {
  image: [
    {
      name: 'Minimalistisch',
      prompt: `Erstelle ein minimalistisches T-Shirt Design für die Nische "{niche}".

Stil:
- Klare, einfache Linien
- Maximal 2-3 Farben
- Viel Weißraum
- Geometrische Formen
- Skandinavisch inspiriert`
    },
    {
      name: 'Vintage/Retro',
      prompt: `Erstelle ein Vintage-inspiriertes T-Shirt Design für die Nische "{niche}".

Stil:
- Verblasste, gedämpfte Farben
- Distressed/verwitterter Look
- 70er/80er Jahre Ästhetik
- Retro-Typografie-Elemente (optional)
- Warme Farbpalette`
    },
    {
      name: 'Bold & Modern',
      prompt: `Erstelle ein modernes, auffälliges T-Shirt Design für die Nische "{niche}".

Stil:
- Kräftige, kontrastreiche Farben
- Dynamische Formen
- Zeitgenössische Illustration
- Statement-Piece
- Eyecatcher-Qualität`
    }
  ],
  title: [
    {
      name: 'Emotional',
      prompt: `Erstelle einen emotional ansprechenden Produkttitel für ein T-Shirt in der Nische "{niche}".

Der Titel sollte:
- Gefühle wecken (Stolz, Zugehörigkeit, Leidenschaft)
- Die Community ansprechen
- Maximal 60 Zeichen
- Auf Deutsch sein`
    },
    {
      name: 'SEO-fokussiert',
      prompt: `Erstelle einen SEO-optimierten Produkttitel für ein T-Shirt in der Nische "{niche}".

Der Titel sollte:
- Haupt-Keyword am Anfang
- Sekundäre Keywords einbauen
- Maximal 60 Zeichen
- Trotzdem natürlich klingen`
    }
  ],
  description: [
    {
      name: 'Storytelling',
      prompt: `Erstelle eine Produktbeschreibung mit Story für ein T-Shirt in der Nische "{niche}".

Die Beschreibung sollte:
- Mit einer kurzen Geschichte beginnen
- Den Kunden als Helden darstellen
- Emotionen ansprechen
- 150-200 Wörter
- Auf Deutsch sein`
    },
    {
      name: 'Feature-fokussiert',
      prompt: `Erstelle eine feature-fokussierte Produktbeschreibung für ein T-Shirt in der Nische "{niche}".

Die Beschreibung sollte:
- Produktvorteile auflisten
- Materialqualität betonen
- Passform beschreiben
- Pflegehinweise erwähnen
- 150-200 Wörter`
    }
  ]
}

interface UsePromptsOptions {
  settingsId: string | null
  enabled?: boolean
}

export function usePrompts({ settingsId, enabled = true }: UsePromptsOptions) {
  return useQuery({
    queryKey: ['pod-autom-prompts', settingsId],
    queryFn: async (): Promise<Record<PromptType, string>> => {
      if (!settingsId) return defaultPrompts

      const { data, error } = await supabase
        .from('pod_autom_prompts')
        .select('prompt_type, prompt_text')
        .eq('settings_id', settingsId)

      if (error) throw error

      // Merge with defaults (falls nicht alle Typen in DB)
      const result = { ...defaultPrompts }
      data?.forEach(p => {
        if (p.prompt_type in result) {
          result[p.prompt_type as PromptType] = p.prompt_text
        }
      })

      return result
    },
    enabled: enabled && !!settingsId,
    staleTime: 1000 * 60 * 5
  })
}

export function useSavePrompts(settingsId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (prompts: Record<PromptType, string>) => {
      if (!settingsId) throw new Error('Keine Settings ID')

      // Upsert pattern: Für jeden Prompt-Typ einzeln
      const promises = Object.entries(prompts).map(([type, text]) =>
        supabase
          .from('pod_autom_prompts')
          .upsert(
            {
              settings_id: settingsId,
              prompt_type: type,
              prompt_text: text,
              is_active: true,
              updated_at: new Date().toISOString()
            },
            {
              onConflict: 'settings_id,prompt_type',
              ignoreDuplicates: false
            }
          )
      )

      const results = await Promise.all(promises)
      const errors = results.filter(r => r.error)

      if (errors.length > 0) {
        throw new Error(errors[0].error!.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-prompts', settingsId] })
      toast.success('Prompts gespeichert')
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`)
    }
  })
}
```

### 2. src/components/dashboard/PromptManager.tsx (KOMPLETT ÜBERARBEITET)

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useShops } from '@src/hooks/useShopify'
import { useAppStore } from '@src/lib/store'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import {
  usePrompts,
  useSavePrompts,
  defaultPrompts,
  promptTemplates,
  type PromptType
} from '@src/hooks/usePrompts'
import ConfirmDialog from '@src/components/ui/ConfirmDialog'
import {
  Wand2,
  Image,
  Type,
  FileText,
  RotateCcw,
  Save,
  AlertCircle,
  Loader2,
  Info,
  Eye,
  Copy,
  Check,
  Sparkles,
  Rocket,
  ChevronDown,
  Layout
} from 'lucide-react'

const promptInfo: Record<PromptType, { icon: typeof Image; label: string; description: string }> = {
  image: {
    icon: Image,
    label: 'Bild-Prompt',
    description: 'Dieser Prompt wird verwendet, um mit DALL-E einzigartige Designs zu generieren.'
  },
  title: {
    icon: Type,
    label: 'Titel-Prompt',
    description: 'Generiert verkaufsstarke Produkttitel mit relevanten Keywords.'
  },
  description: {
    icon: FileText,
    label: 'Beschreibung-Prompt',
    description: 'Erstellt überzeugende Produktbeschreibungen für deinen Shop.'
  }
}

export default function PromptManager() {
  const { selectedShopId } = useAppStore()
  const { data: shops } = useShops()

  // UI State
  const [activeTab, setActiveTab] = useState<PromptType>('image')
  const [localPrompts, setLocalPrompts] = useState<Record<PromptType, string>>(defaultPrompts)
  const [hasChanges, setHasChanges] = useState(false)
  const [copied, setCopied] = useState(false)
  const [previewNiche, setPreviewNiche] = useState('Fitness & Sport')
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<{ name: string; prompt: string } | null>(null)

  const selectedShop = shops?.find(s => s.id === selectedShopId) || shops?.[0]

  // Settings ID holen
  const { data: settings } = useQuery({
    queryKey: ['pod-autom-settings', selectedShop?.id],
    queryFn: async () => {
      if (!selectedShop) return null
      const { data } = await supabase
        .from('pod_autom_settings')
        .select('id')
        .eq('shop_id', selectedShop.id)
        .single()
      return data
    },
    enabled: !!selectedShop
  })

  const settingsId = settings?.id || null

  // Data Hooks
  const { data: savedPrompts, isLoading } = usePrompts({ settingsId })
  const saveMutation = useSavePrompts(settingsId)

  // Sync local state with saved data
  useEffect(() => {
    if (savedPrompts) {
      setLocalPrompts(savedPrompts)
      setHasChanges(false)
    }
  }, [savedPrompts])

  // Handlers
  const handlePromptChange = useCallback((type: PromptType, value: string) => {
    setLocalPrompts(prev => ({ ...prev, [type]: value }))
    setHasChanges(true)
  }, [])

  const handleReset = useCallback(() => {
    handlePromptChange(activeTab, defaultPrompts[activeTab])
    setResetDialogOpen(false)
  }, [activeTab, handlePromptChange])

  const handleApplyTemplate = useCallback(() => {
    if (selectedTemplate) {
      handlePromptChange(activeTab, selectedTemplate.prompt)
      setTemplateDialogOpen(false)
      setSelectedTemplate(null)
    }
  }, [selectedTemplate, activeTab, handlePromptChange])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(localPrompts[activeTab])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback für ältere Browser
      const textarea = document.createElement('textarea')
      textarea.value = localPrompts[activeTab]
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [localPrompts, activeTab])

  const handleSave = useCallback(() => {
    saveMutation.mutate(localPrompts, {
      onSuccess: () => setHasChanges(false)
    })
  }, [saveMutation, localPrompts])

  // Preview mit Nischen-Ersetzung
  const previewText = useMemo(() =>
    localPrompts[activeTab].replace(/{niche}/g, previewNiche),
    [localPrompts, activeTab, previewNiche]
  )

  // Keyboard Navigation für Tabs
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, type: PromptType) => {
    const tabs: PromptType[] = ['image', 'title', 'description']
    const currentIndex = tabs.indexOf(type)

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % tabs.length
      setActiveTab(tabs[nextIndex])
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
      setActiveTab(tabs[prevIndex])
    }
  }, [])

  // Kein Shop verbunden
  if (!selectedShop) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Kein Shop verbunden</h2>
        <p className="text-zinc-400 mb-6 text-center max-w-md">
          Verbinde einen Shopify Store, um KI-Prompts zu verwalten.
        </p>
        <Link to="/onboarding" className="btn-primary">
          <Rocket className="w-5 h-5" />
          Shop verbinden
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const tabs: PromptType[] = ['image', 'title', 'description']
  const currentTemplates = promptTemplates[activeTab]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">KI-Prompts verwalten</h1>
          <p className="text-zinc-400">
            Passe die Prompts an, die zur Generierung deiner Produkte verwendet werden
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!hasChanges || saveMutation.isPending}
          aria-label="Änderungen speichern"
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Änderungen speichern
            </>
          )}
        </button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-zinc-300 mb-1">
            <strong>Tipp:</strong> Verwende{' '}
            <code className="bg-surface px-1.5 py-0.5 rounded text-primary font-mono">
              {'{niche}'}
            </code>{' '}
            als Platzhalter.
          </p>
          <p className="text-zinc-400">
            Der Platzhalter wird automatisch durch die jeweilige Nische ersetzt,
            wenn Produkte generiert werden.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Prompt-Typen"
        className="flex gap-1 p-1 bg-surface rounded-lg"
      >
        {tabs.map((type) => {
          const info = promptInfo[type]
          const isActive = activeTab === type
          return (
            <button
              key={type}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${type}`}
              id={`tab-${type}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(type)}
              onKeyDown={(e) => handleTabKeyDown(e, type)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg
                         font-medium transition focus:outline-none focus:ring-2
                         focus:ring-primary/50 ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-surface-highlight'
              }`}
            >
              <info.icon className="w-5 h-5" />
              <span className="hidden sm:inline">{info.label}</span>
            </button>
          )
        })}
      </div>

      {/* Prompt Editor */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="card"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold">{promptInfo[activeTab].label}</h2>
              <p className="text-sm text-zinc-400 mt-1">
                {promptInfo[activeTab].description}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="p-2 text-zinc-400 hover:text-white hover:bg-surface-highlight
                           rounded-lg transition"
                aria-label="Prompt kopieren"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setResetDialogOpen(true)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-surface-highlight
                           rounded-lg transition"
                aria-label="Auf Standard zurücksetzen"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <textarea
            value={localPrompts[activeTab]}
            onChange={(e) => handlePromptChange(activeTab, e.target.value)}
            aria-label={`${promptInfo[activeTab].label} bearbeiten`}
            className="input min-h-[300px] font-mono text-sm resize-y"
            placeholder="Prompt eingeben..."
          />

          <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
            <span>{localPrompts[activeTab].length} Zeichen</span>
            {localPrompts[activeTab].includes('{niche}') ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-4 h-4" />
                Nischen-Platzhalter gefunden
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="w-4 h-4" />
                Kein {'{niche}'} Platzhalter
              </span>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-zinc-400" />
              <h2 className="font-semibold">Vorschau</h2>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="preview-niche" className="text-sm text-zinc-400">
                Nische:
              </label>
              <select
                id="preview-niche"
                value={previewNiche}
                onChange={(e) => setPreviewNiche(e.target.value)}
                className="bg-surface-highlight border border-zinc-700 rounded-lg px-3 py-1.5
                           text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option>Fitness & Sport</option>
                <option>Gaming</option>
                <option>Haustiere</option>
                <option>Reisen</option>
                <option>Musik</option>
                <option>Yoga & Meditation</option>
                <option>Kochen & Backen</option>
              </select>
            </div>
          </div>

          <div className="bg-surface-highlight rounded-lg p-4 min-h-[300px]">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-700">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-zinc-400">So sieht die KI deinen Prompt:</span>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{previewText}</p>
          </div>
        </div>
      </div>

      {/* Prompt Templates */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Prompt-Vorlagen für {promptInfo[activeTab].label}</h2>
          </div>
        </div>

        {currentTemplates.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {currentTemplates.map((template) => (
              <button
                key={template.name}
                onClick={() => {
                  setSelectedTemplate(template)
                  setTemplateDialogOpen(true)
                }}
                className="p-4 bg-surface-highlight rounded-lg text-left hover:bg-zinc-700
                           transition group focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{template.name}</span>
                  <Wand2 className="w-4 h-4 text-zinc-500 group-hover:text-primary transition" />
                </div>
                <p className="text-sm text-zinc-400 line-clamp-3">
                  {template.prompt.substring(0, 100)}...
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-zinc-500">
            Keine Vorlagen für diesen Prompt-Typ verfügbar
          </p>
        )}
      </div>

      {/* Unsaved Changes Floating Bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 px-6 py-3 bg-surface border border-zinc-700
                          rounded-full shadow-xl animate-slide-up">
            <span className="text-sm text-zinc-300">Ungespeicherte Änderungen</span>
            <button
              onClick={() => {
                setLocalPrompts(savedPrompts || defaultPrompts)
                setHasChanges(false)
              }}
              className="text-sm text-zinc-400 hover:text-white transition"
            >
              Verwerfen
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="btn-primary py-1.5 text-sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Jetzt speichern'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleReset}
        title="Prompt zurücksetzen?"
        description={`Möchtest du den ${promptInfo[activeTab].label} auf die Standard-Vorlage zurücksetzen? Deine aktuellen Änderungen gehen verloren.`}
        confirmText="Zurücksetzen"
        cancelText="Abbrechen"
        variant="warning"
      />

      {/* Template Apply Dialog */}
      <ConfirmDialog
        isOpen={templateDialogOpen}
        onClose={() => {
          setTemplateDialogOpen(false)
          setSelectedTemplate(null)
        }}
        onConfirm={handleApplyTemplate}
        title={`Vorlage "${selectedTemplate?.name}" anwenden?`}
        description="Der aktuelle Prompt wird durch die Vorlage ersetzt. Du kannst die Änderungen vor dem Speichern noch anpassen."
        confirmText="Vorlage anwenden"
        cancelText="Abbrechen"
        variant="default"
      />
    </div>
  )
}
```

---

## CSS Hinzufügen (falls noch nicht vorhanden)

Für `src/index.css`:

```css
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
```

---

## Datenbank-Constraint erforderlich

Für das Upsert-Pattern muss ein Unique Constraint existieren:

```sql
-- In supabase/migrations/
ALTER TABLE pod_autom_prompts
ADD CONSTRAINT unique_settings_prompt_type
UNIQUE (settings_id, prompt_type);
```

---

## Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/hooks/usePrompts.ts` | Hooks für Prompt CRUD mit Upsert |

## Verifizierung

- [ ] **Kein `confirm()`/`alert()`** - ConfirmDialog wird verwendet
- [ ] **Upsert statt Delete-then-Insert** - Sicheres Speichern
- [ ] **ARIA Labels** - Alle interaktiven Elemente
- [ ] **Keyboard Navigation** - Tabs mit Pfeiltasten
- [ ] **Template-Funktionalität** - Vollständig implementiert
- [ ] **Toast Notifications** - Erfolg/Fehler
- [ ] **Loading States** - Während Daten laden
- [ ] **Unsaved Changes Warning** - Mit Verwerfen-Option
- [ ] **Nischen-Platzhalter Warnung** - Wenn `{niche}` fehlt
- [ ] **Responsive Layout** - Funktioniert auf Mobile
- [ ] **Vorschau-Nische** - Dropdown mit Label

## Abhängigkeiten

- Phase 3.1 (Dashboard Layout mit Store)
- Phase 3.3 (ConfirmDialog, Toast)
- Phase 1.4 (Datenbank-Tabellen mit Unique Constraint)

## Nächster Schritt
→ Phase 3.5 - ProductQueue Anzeige
