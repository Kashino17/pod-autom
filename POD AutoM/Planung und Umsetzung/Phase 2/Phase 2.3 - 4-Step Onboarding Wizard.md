# Phase 2.3 - 4-Step Onboarding Wizard

## Ziel
Geführter Onboarding-Prozess mit Fortschrittspersistenz, Animationen und vollständiger Ad-Plattform Integration.

## Geschätzte Dauer
8-10 Stunden

## Wizard Steps

1. **Shopify verbinden** - OAuth Flow (Phase 2.2)
2. **Nischen wählen** - Produktnischen auswählen
3. **Prompts konfigurieren** - KI-Prompts anpassen
4. **Ad-Plattformen verbinden** - Pinterest/Meta OAuth

---

## Komponenten

### 1. src/pages/Onboarding.tsx
```typescript
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '@src/lib/store'
import { useToast } from '@src/hooks/useToast'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Store, Palette, Wand2, Megaphone, X, Home } from 'lucide-react'
import { ROUTES } from '@src/lib/constants'

// Step Components
import ShopConnection from '@src/components/onboarding/ShopConnection'
import NicheSelection from '@src/components/onboarding/NicheSelection'
import PromptConfig from '@src/components/onboarding/PromptConfig'
import AdPlatformSetup from '@src/components/onboarding/AdPlatformSetup'

const steps = [
  { id: 1, title: 'Shop verbinden', icon: Store, description: 'Shopify Store verbinden' },
  { id: 2, title: 'Nischen wählen', icon: Palette, description: 'Produktnischen auswählen' },
  { id: 3, title: 'Prompts konfigurieren', icon: Wand2, description: 'KI-Prompts anpassen' },
  { id: 4, title: 'Ad-Plattformen', icon: Megaphone, description: 'Werbeplattformen verbinden' },
]

// Animation variants
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -20 }
}

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3
}

export default function Onboarding() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const {
    onboardingStep,
    setOnboardingStep,
    onboardingCompleted,
    setOnboardingCompleted,
    onboardingSkipped,
    setOnboardingSkipped
  } = useAppStore()

  const [currentStep, setCurrentStep] = useState(onboardingStep || 1)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [showExitDialog, setShowExitDialog] = useState(false)

  // Handle OAuth callback params and URL step
  useEffect(() => {
    const stepParam = searchParams.get('step')
    const shopConnected = searchParams.get('shop_connected')
    const errorParam = searchParams.get('error')

    // Handle errors
    if (errorParam) {
      toast({
        title: 'Fehler',
        description: getErrorMessage(errorParam),
        variant: 'destructive'
      })
      // Clear error from URL
      searchParams.delete('error')
      setSearchParams(searchParams, { replace: true })
    }

    // Handle step from URL
    if (stepParam) {
      const step = parseInt(stepParam)
      if (step >= 1 && step <= 4) {
        setCurrentStep(step)
      }
    }

    // Handle successful shop connection
    if (shopConnected === 'true') {
      setCurrentStep(2)
      setDirection(1)
      toast({
        title: 'Shop verbunden!',
        description: 'Dein Shopify Store wurde erfolgreich verbunden.',
        variant: 'success'
      })
      // Clear params
      searchParams.delete('shop_connected')
      searchParams.delete('step')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, toast])

  // Persist step changes to store
  useEffect(() => {
    setOnboardingStep(currentStep)
  }, [currentStep, setOnboardingStep])

  // Navigate forward
  const handleStepComplete = useCallback((nextStep: number) => {
    setDirection(1)

    if (nextStep > 4) {
      // Onboarding complete
      setOnboardingCompleted(true)
      toast({
        title: 'Setup abgeschlossen!',
        description: 'Du kannst jetzt dein Dashboard nutzen.',
        variant: 'success'
      })
      navigate(ROUTES.DASHBOARD)
    } else {
      setCurrentStep(nextStep)
    }
  }, [navigate, setOnboardingCompleted, toast])

  // Navigate backward
  const handleBack = useCallback((prevStep: number) => {
    setDirection(-1)
    setCurrentStep(prevStep)
  }, [])

  // Skip onboarding
  const handleSkip = useCallback(() => {
    setOnboardingSkipped(true)
    toast({
      title: 'Setup übersprungen',
      description: 'Du kannst das Setup jederzeit in den Einstellungen fortsetzen.',
      variant: 'info'
    })
    navigate(ROUTES.DASHBOARD)
  }, [navigate, setOnboardingSkipped, toast])

  // Render step content with animation
  const renderStepContent = () => {
    const content = (() => {
      switch (currentStep) {
        case 1:
          return <ShopConnection onComplete={() => handleStepComplete(2)} />
        case 2:
          return (
            <NicheSelection
              onComplete={() => handleStepComplete(3)}
              onBack={() => handleBack(1)}
            />
          )
        case 3:
          return (
            <PromptConfig
              onComplete={() => handleStepComplete(4)}
              onBack={() => handleBack(2)}
            />
          )
        case 4:
          return (
            <AdPlatformSetup
              onComplete={() => handleStepComplete(5)}
              onBack={() => handleBack(3)}
            />
          )
        default:
          return <ShopConnection onComplete={() => handleStepComplete(2)} />
      }
    })()

    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentStep}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          custom={direction}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-surface/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowExitDialog(true)}
                className="p-2 text-zinc-400 hover:text-white transition rounded-lg hover:bg-surface"
                aria-label="Zum Dashboard"
              >
                <Home className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Setup Wizard</h1>
            </div>
            <button
              onClick={() => setShowExitDialog(true)}
              className="text-sm text-zinc-400 hover:text-white transition flex items-center gap-2"
            >
              Überspringen
            </button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-zinc-800 bg-surface/30">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: currentStep === step.id ? 1.1 : 1,
                      backgroundColor: currentStep > step.id
                        ? 'rgb(16 185 129)' // emerald-500
                        : currentStep === step.id
                        ? 'rgb(139 92 246)' // primary
                        : 'rgb(39 39 42)' // zinc-800
                    }}
                    transition={{ duration: 0.2 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      currentStep >= step.id ? 'text-white' : 'text-zinc-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </motion.div>
                  <span
                    className={`mt-2 text-sm font-medium hidden sm:block ${
                      currentStep >= step.id ? 'text-white' : 'text-zinc-500'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-xs text-zinc-600 hidden md:block">
                    {step.description}
                  </span>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4 relative">
                    <div className="absolute inset-0 bg-zinc-800" />
                    <motion.div
                      initial={false}
                      animate={{
                        width: currentStep > step.id ? '100%' : '0%'
                      }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-y-0 left-0 bg-emerald-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        {renderStepContent()}
      </main>

      {/* Exit Confirmation Dialog */}
      <AnimatePresence>
        {showExitDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowExitDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-zinc-800 rounded-xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Setup überspringen?</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Du kannst das Setup jederzeit in den Einstellungen fortsetzen.
                Einige Funktionen sind ohne vollständiges Setup eingeschränkt.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="flex-1 btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSkip}
                  className="flex-1 btn-primary"
                >
                  Überspringen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper function for error messages
function getErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    missing_params: 'Fehlende Parameter. Bitte versuche es erneut.',
    invalid_hmac: 'Ungültige Signatur. Bitte versuche es erneut.',
    invalid_state: 'Sicherheitstoken abgelaufen. Bitte starte neu.',
    state_expired: 'Verbindungsprozess abgelaufen. Bitte starte neu.',
    token_exchange_failed: 'Verbindung fehlgeschlagen. Bitte versuche es später.',
    shop_inactive: 'Dieser Shop ist nicht aktiv.',
    oauth_denied: 'Zugriff verweigert. Bitte erlaube die Berechtigungen.',
    default: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
  }
  return messages[error] || messages.default
}
```

### 2. src/components/onboarding/NicheSelection.tsx (Korrigiert)
```typescript
import { useState, useEffect, useMemo } from 'react'
import { useShops } from '@src/hooks/useShopify'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useToast } from '@src/hooks/useToast'
import {
  Palette,
  Search,
  Check,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Info
} from 'lucide-react'

interface NicheSelectionProps {
  onComplete: () => void
  onBack: () => void
}

// Kategorisierte Nischen-Vorschläge
const nicheCategories = {
  'Lifestyle & Hobbys': [
    'Fitness & Sport', 'Gaming', 'Reisen', 'Musik', 'Fotografie',
    'Kunst & Design', 'Kochen & Backen', 'Garten', 'Camping'
  ],
  'Tiere': [
    'Hunde', 'Katzen', 'Pferde', 'Vögel', 'Aquaristik'
  ],
  'Fahrzeuge': [
    'Autos', 'Motorräder', 'Oldtimer', 'Trucks', 'Fahrräder'
  ],
  'Natur & Wellness': [
    'Yoga & Meditation', 'Natur & Umwelt', 'Wandern', 'Angeln', 'Surfen'
  ],
  'Anlässe': [
    'Vatertag', 'Muttertag', 'Weihnachten', 'Halloween', 'Ostern',
    'Geburtstag', 'Hochzeit', 'Valentinstag'
  ],
  'Berufe': [
    'Krankenpfleger', 'Lehrer', 'Feuerwehr', 'Polizei', 'Handwerker',
    'Ingenieure', 'Entwickler', 'Ärzte'
  ],
  'Essen & Trinken': [
    'Kaffee', 'Bier', 'Wein', 'Grillen & BBQ', 'Vegetarisch', 'Vegan'
  ]
}

// Trending Nischen (dynamisch aktualisierbar)
const trendingNiches = ['Gaming', 'Yoga & Meditation', 'Kaffee', 'Hunde', 'Fitness & Sport']

export default function NicheSelection({ onComplete, onBack }: NicheSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [customNiche, setCustomNiche] = useState('')
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const { data: shops } = useShops()
  const { tier, maxNiches } = useSubscription()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const connectedShop = shops?.find(s => s.connection_status === 'connected')

  // Fetch existing niches
  const { data: existingNiches, isLoading: nichesLoading } = useQuery({
    queryKey: ['pod-autom-niches', connectedShop?.id],
    queryFn: async () => {
      if (!connectedShop) return []

      const { data: settings } = await supabase
        .from('pod_autom_settings')
        .select('id')
        .eq('shop_id', connectedShop.id)
        .single()

      if (!settings) return []

      const { data: niches } = await supabase
        .from('pod_autom_niches')
        .select('*')
        .eq('settings_id', settings.id)

      return niches || []
    },
    enabled: !!connectedShop
  })

  // Initialize selected niches from existing (using useEffect correctly!)
  useEffect(() => {
    if (existingNiches && existingNiches.length > 0) {
      setSelectedNiches(existingNiches.map(n => n.niche_name))
    }
  }, [existingNiches])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (niches: string[]) => {
      if (!connectedShop) throw new Error('No shop connected')

      const { data: settings } = await supabase
        .from('pod_autom_settings')
        .select('id')
        .eq('shop_id', connectedShop.id)
        .single()

      if (!settings) throw new Error('Settings not found')

      // Delete existing niches
      await supabase
        .from('pod_autom_niches')
        .delete()
        .eq('settings_id', settings.id)

      // Insert new niches
      const nicheRecords = niches.map((name, index) => ({
        settings_id: settings.id,
        niche_name: name,
        is_active: true,
        sort_order: index
      }))

      const { error } = await supabase
        .from('pod_autom_niches')
        .insert(nicheRecords)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-niches'] })
      toast({
        title: 'Nischen gespeichert',
        description: `${selectedNiches.length} Nischen wurden gespeichert.`,
        variant: 'success'
      })
      onComplete()
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: 'Nischen konnten nicht gespeichert werden.',
        variant: 'destructive'
      })
    }
  })

  // Filter all niches based on search
  const allNiches = useMemo(() => {
    return Object.values(nicheCategories).flat()
  }, [])

  const filteredNiches = useMemo(() => {
    if (!searchTerm) return []
    return allNiches.filter(n =>
      n.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, allNiches])

  // Toggle niche selection
  const toggleNiche = (niche: string) => {
    setError('')

    if (selectedNiches.includes(niche)) {
      setSelectedNiches(prev => prev.filter(n => n !== niche))
    } else {
      if (maxNiches !== -1 && selectedNiches.length >= maxNiches) {
        setError(`Maximum ${maxNiches} Nischen in deinem ${tier?.toUpperCase()}-Plan`)
        return
      }
      setSelectedNiches(prev => [...prev, niche])
    }
  }

  // Add custom niche
  const addCustomNiche = () => {
    const trimmed = customNiche.trim()
    if (!trimmed) return

    if (selectedNiches.includes(trimmed)) {
      setError('Diese Nische ist bereits ausgewählt')
      return
    }
    if (maxNiches !== -1 && selectedNiches.length >= maxNiches) {
      setError(`Maximum ${maxNiches} Nischen in deinem Plan`)
      return
    }

    setSelectedNiches(prev => [...prev, trimmed])
    setCustomNiche('')
    setError('')
  }

  // Handle continue
  const handleContinue = () => {
    if (selectedNiches.length === 0) {
      setError('Bitte wähle mindestens eine Nische')
      return
    }
    saveMutation.mutate(selectedNiches)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Palette className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Nischen auswählen</h2>
        <p className="text-zinc-400">
          Wähle die Nischen, in denen du Produkte verkaufen möchtest.
        </p>
        {maxNiches !== -1 && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-surface rounded-full text-sm">
            <span className="text-zinc-400">Dein Plan:</span>
            <span className={`font-medium ${
              selectedNiches.length >= maxNiches ? 'text-amber-400' : 'text-primary'
            }`}>
              {selectedNiches.length}/{maxNiches} Nischen
            </span>
          </div>
        )}
      </div>

      {/* Selected Niches */}
      {selectedNiches.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">Ausgewählt ({selectedNiches.length})</label>
            {selectedNiches.length > 1 && (
              <button
                onClick={() => setSelectedNiches([])}
                className="text-xs text-zinc-500 hover:text-red-400 transition"
              >
                Alle entfernen
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedNiches.map(niche => (
              <button
                key={niche}
                onClick={() => toggleNiche(niche)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary rounded-full text-sm hover:bg-primary/30 transition group"
              >
                {niche}
                <X className="w-4 h-4 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
          placeholder="Nische suchen..."
        />
        {searchTerm && filteredNiches.length > 0 && (
          <div className="absolute z-10 mt-2 w-full bg-surface border border-zinc-800 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {filteredNiches.map(niche => {
              const isSelected = selectedNiches.includes(niche)
              return (
                <button
                  key={niche}
                  onClick={() => {
                    toggleNiche(niche)
                    setSearchTerm('')
                  }}
                  className={`w-full text-left px-4 py-2 flex items-center justify-between hover:bg-surface-highlight transition ${
                    isSelected ? 'bg-primary/10' : ''
                  }`}
                >
                  <span>{niche}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Custom Niche */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={customNiche}
          onChange={(e) => setCustomNiche(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomNiche()}
          className="input flex-1"
          placeholder="Eigene Nische hinzufügen..."
        />
        <button
          onClick={addCustomNiche}
          disabled={!customNiche.trim()}
          className="btn-secondary"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-6 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Trending Niches */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <label className="text-sm font-medium">Trending</label>
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingNiches.map(niche => {
            const isSelected = selectedNiches.includes(niche)
            return (
              <button
                key={niche}
                onClick={() => toggleNiche(niche)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-amber-500/10 text-amber-400/70 hover:bg-amber-500/20'
                }`}
              >
                {isSelected && <Check className="w-4 h-4" />}
                <Sparkles className="w-3 h-3" />
                {niche}
              </button>
            )
          })}
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Kategorien</label>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(nicheCategories).map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(activeCategory === category ? null : category)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                activeCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-surface-highlight text-zinc-400 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Category Content */}
        {activeCategory && (
          <div className="p-4 bg-surface rounded-lg border border-zinc-800">
            <div className="flex flex-wrap gap-2">
              {nicheCategories[activeCategory as keyof typeof nicheCategories].map(niche => {
                const isSelected = selectedNiches.includes(niche)
                return (
                  <button
                    key={niche}
                    onClick={() => toggleNiche(niche)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition ${
                      isSelected
                        ? 'bg-primary text-white'
                        : 'bg-surface-highlight text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                    {niche}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg mb-8">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-zinc-400">
          <p className="font-medium text-zinc-300 mb-1">Tipps zur Nischen-Auswahl:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Wähle Nischen, die dich interessieren</li>
            <li>Achte auf eine gute Balance aus Konkurrenz und Nachfrage</li>
            <li>Saisonale Nischen können zu bestimmten Zeiten sehr profitabel sein</li>
          </ul>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={onBack} className="btn-ghost">
          <ArrowLeft className="w-5 h-5" />
          Zurück
        </button>
        <button
          onClick={handleContinue}
          disabled={selectedNiches.length === 0 || saveMutation.isPending}
          className="btn-primary"
        >
          {saveMutation.isPending ? (
            <>
              <span className="animate-spin">⏳</span>
              Speichern...
            </>
          ) : (
            <>
              Weiter
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
```

### 3. src/components/onboarding/PromptConfig.tsx (Korrigiert)
```typescript
import { useState, useEffect } from 'react'
import { useShops } from '@src/hooks/useShopify'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { useToast } from '@src/hooks/useToast'
import {
  Wand2,
  ArrowLeft,
  ArrowRight,
  Info,
  RotateCcw,
  Copy,
  Check,
  Eye,
  Sparkles
} from 'lucide-react'

interface PromptConfigProps {
  onComplete: () => void
  onBack: () => void
}

const defaultPrompts = {
  image: `Erstelle ein minimalistisches, trendiges T-Shirt Design für die Nische "{niche}".

Das Design sollte:
- Modern und visuell ansprechend sein
- Gut auf schwarzem oder weißem Hintergrund funktionieren
- Keine Texte enthalten (nur Grafik)
- Im Flat-Design oder Line-Art Stil sein
- Emotionen der Zielgruppe ansprechen
- Druckbar in hoher Qualität sein`,

  title: `Erstelle einen verkaufsstarken Produkttitel für ein T-Shirt in der Nische "{niche}".

Anforderungen:
- Maximal 60 Zeichen lang
- Enthält relevante Keywords für SEO
- Spricht die Zielgruppe emotional an
- Keine Übertreibungen oder Clickbait
- Deutsch, professionell`,

  description: `Erstelle eine Produktbeschreibung für ein T-Shirt in der Nische "{niche}".

Anforderungen:
- Ca. 100-150 Wörter
- Hebt die Vorteile des Produkts hervor
- Spricht Emotionen der Zielgruppe an
- Enthält einen Call-to-Action
- Erwähnt Qualität und Komfort
- SEO-optimiert mit relevanten Keywords`
}

const promptTips: Record<string, string[]> = {
  image: [
    'Verwende klare Stilbeschreibungen',
    'Definiere Farbpalette wenn gewünscht',
    'Beschreibe gewünschte Emotionen'
  ],
  title: [
    'Keywords am Anfang platzieren',
    'Zielgruppe direkt ansprechen',
    'Unique Selling Points einbauen'
  ],
  description: [
    'Mit einem Hook beginnen',
    'Bullet Points für Features',
    'Dringlichkeit erzeugen (limitiert)'
  ]
}

export default function PromptConfig({ onComplete, onBack }: PromptConfigProps) {
  const [prompts, setPrompts] = useState(defaultPrompts)
  const [activeTab, setActiveTab] = useState<'image' | 'title' | 'description'>('image')
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const { data: shops } = useShops()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const connectedShop = shops?.find(s => s.connection_status === 'connected')

  // Fetch existing prompts
  const { data: existingPrompts, isLoading } = useQuery({
    queryKey: ['pod-autom-prompts', connectedShop?.id],
    queryFn: async () => {
      if (!connectedShop) return null

      const { data: settings } = await supabase
        .from('pod_autom_settings')
        .select('id')
        .eq('shop_id', connectedShop.id)
        .single()

      if (!settings) return null

      const { data: prompts } = await supabase
        .from('pod_autom_prompts')
        .select('*')
        .eq('settings_id', settings.id)

      return prompts
    },
    enabled: !!connectedShop
  })

  // Initialize prompts from existing (useEffect statt useState!)
  useEffect(() => {
    if (existingPrompts && existingPrompts.length > 0) {
      const promptMap = {
        image: existingPrompts.find(p => p.prompt_type === 'image')?.prompt_text || defaultPrompts.image,
        title: existingPrompts.find(p => p.prompt_type === 'title')?.prompt_text || defaultPrompts.title,
        description: existingPrompts.find(p => p.prompt_type === 'description')?.prompt_text || defaultPrompts.description
      }
      setPrompts(promptMap)
    }
  }, [existingPrompts])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!connectedShop) throw new Error('No shop connected')

      const { data: settings } = await supabase
        .from('pod_autom_settings')
        .select('id')
        .eq('shop_id', connectedShop.id)
        .single()

      if (!settings) throw new Error('Settings not found')

      // Delete existing prompts
      await supabase
        .from('pod_autom_prompts')
        .delete()
        .eq('settings_id', settings.id)

      // Insert new prompts
      const promptRecords = Object.entries(prompts).map(([type, text]) => ({
        settings_id: settings.id,
        prompt_type: type,
        prompt_text: text,
        is_active: true
      }))

      const { error } = await supabase
        .from('pod_autom_prompts')
        .insert(promptRecords)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-prompts'] })
      toast({
        title: 'Prompts gespeichert',
        description: 'Deine KI-Prompts wurden erfolgreich gespeichert.',
        variant: 'success'
      })
      onComplete()
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Prompts konnten nicht gespeichert werden.',
        variant: 'destructive'
      })
    }
  })

  const resetPrompt = (type: 'image' | 'title' | 'description') => {
    setPrompts(prev => ({ ...prev, [type]: defaultPrompts[type] }))
    toast({
      title: 'Prompt zurückgesetzt',
      description: 'Der Standard-Prompt wurde wiederhergestellt.',
      variant: 'info'
    })
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompts[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs = [
    { id: 'image' as const, label: 'Bild-Prompt', icon: '🎨' },
    { id: 'title' as const, label: 'Titel-Prompt', icon: '📝' },
    { id: 'description' as const, label: 'Beschreibung', icon: '📄' }
  ]

  // Preview with replaced placeholder
  const previewText = prompts[activeTab].replace(/{niche}/g, 'Fitness & Sport')

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Wand2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">KI-Prompts konfigurieren</h2>
        <p className="text-zinc-400">
          Passe die Prompts an, die zur Generierung deiner Produkte verwendet werden.
        </p>
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg mb-6">
        <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-zinc-300 mb-2">
            Verwende <code className="bg-surface px-1.5 py-0.5 rounded text-primary">{'{niche}'}</code> als Platzhalter.
            Er wird automatisch durch die jeweilige Nische ersetzt.
          </p>
          <p className="text-zinc-500 text-xs">
            Beispiel: "{'{niche}'}" wird zu "Fitness & Sport"
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-lg mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Prompt Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            {tabs.find(t => t.id === activeTab)?.label}
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Editor' : 'Vorschau'}
            </button>
            <button
              onClick={copyPrompt}
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
            <button
              onClick={() => resetPrompt(activeTab)}
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {showPreview ? (
          <div className="min-h-[200px] p-4 bg-surface rounded-lg border border-zinc-800 whitespace-pre-wrap text-sm text-zinc-300">
            {previewText}
          </div>
        ) : (
          <textarea
            value={prompts[activeTab]}
            onChange={(e) => setPrompts(prev => ({ ...prev, [activeTab]: e.target.value }))}
            className="input min-h-[200px] font-mono text-sm resize-y"
            placeholder="Prompt eingeben..."
          />
        )}

        {/* Tips */}
        <div className="p-3 bg-zinc-900/50 rounded-lg">
          <p className="text-xs font-medium text-zinc-400 mb-2">💡 Tipps:</p>
          <ul className="text-xs text-zinc-500 space-y-1">
            {promptTips[activeTab].map((tip, i) => (
              <li key={i}>• {tip}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-12 flex justify-between">
        <button onClick={onBack} className="btn-ghost">
          <ArrowLeft className="w-5 h-5" />
          Zurück
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="btn-primary"
        >
          {saveMutation.isPending ? (
            <>
              <span className="animate-spin">⏳</span>
              Speichern...
            </>
          ) : (
            <>
              Weiter
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
```

### 4. src/components/onboarding/AdPlatformSetup.tsx (Vollständig implementiert)
```typescript
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useShops } from '@src/hooks/useShopify'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { useToast } from '@src/hooks/useToast'
import { API_URL } from '@src/lib/constants'
import {
  Megaphone,
  ArrowLeft,
  Check,
  ExternalLink,
  Lock,
  Loader2,
  RefreshCw,
  AlertCircle,
  Info,
  Unplug
} from 'lucide-react'

interface AdPlatformSetupProps {
  onComplete: () => void
  onBack: () => void
}

// Platform Configuration
const platforms = [
  {
    id: 'pinterest',
    name: 'Pinterest',
    logo: '📌', // Emoji als Fallback
    color: 'red',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/50',
    description: 'Erreiche kaufbereite Nutzer mit visuellen Pins.',
    features: ['Shopping Pins', 'Katalog Integration', 'Conversions API'],
    requiredTier: 'basis' as const
  },
  {
    id: 'meta',
    name: 'Meta (Facebook & Instagram)',
    logo: '📘',
    color: 'blue',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/50',
    description: 'Zielgruppengerichtete Werbung auf FB und IG.',
    features: ['Dynamic Ads', 'Lookalike Audiences', 'Pixel Tracking'],
    requiredTier: 'basis' as const
  },
  {
    id: 'google',
    name: 'Google Ads',
    logo: '🔍',
    color: 'green',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/50',
    description: 'Suchanzeigen und Shopping Campaigns.',
    features: ['Performance Max', 'Smart Shopping', 'Search Ads'],
    requiredTier: 'vip' as const
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    logo: '🎵',
    color: 'cyan',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    description: 'Erreiche die Gen-Z mit kreativen Videos.',
    features: ['Spark Ads', 'Katalog Sales', 'In-Feed Ads'],
    requiredTier: 'vip' as const
  }
]

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

export default function AdPlatformSetup({ onComplete, onBack }: AdPlatformSetupProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { tier } = useSubscription()
  const { data: shops } = useShops()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const connectedShop = shops?.find(s => s.connection_status === 'connected')

  // Fetch connected platforms
  const { data: connectedPlatforms, isLoading } = useQuery({
    queryKey: ['pod-autom-ad-platforms', connectedShop?.id],
    queryFn: async () => {
      if (!connectedShop) return []

      const { data } = await supabase
        .from('pod_autom_ad_connections')
        .select('*')
        .eq('shop_id', connectedShop.id)

      return data || []
    },
    enabled: !!connectedShop
  })

  // Handle OAuth callback
  useEffect(() => {
    const platform = searchParams.get('platform_connected')
    const error = searchParams.get('platform_error')

    if (platform) {
      toast({
        title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} verbunden!`,
        description: 'Die Plattform wurde erfolgreich verbunden.',
        variant: 'success'
      })
      queryClient.invalidateQueries({ queryKey: ['pod-autom-ad-platforms'] })
      searchParams.delete('platform_connected')
      setSearchParams(searchParams, { replace: true })
    }

    if (error) {
      toast({
        title: 'Verbindung fehlgeschlagen',
        description: error === 'access_denied' ? 'Zugriff wurde verweigert.' : 'Bitte versuche es erneut.',
        variant: 'destructive'
      })
      searchParams.delete('platform_error')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, toast, queryClient])

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (platformId: string) => {
      const token = await getAuthToken()
      const response = await fetch(
        `${API_URL}/pod-autom/ad-platforms/${platformId}/auth?shop_id=${connectedShop?.id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!response.ok) throw new Error('Failed to initiate OAuth')

      const { auth_url } = await response.json()
      return auth_url
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Verbindung konnte nicht gestartet werden.',
        variant: 'destructive'
      })
    }
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (platformId: string) => {
      const token = await getAuthToken()
      const response = await fetch(
        `${API_URL}/pod-autom/ad-platforms/${platformId}/disconnect?shop_id=${connectedShop?.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!response.ok) throw new Error('Failed to disconnect')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-ad-platforms'] })
      toast({
        title: 'Plattform getrennt',
        description: 'Die Verbindung wurde entfernt.',
        variant: 'info'
      })
    }
  })

  // Check platform availability
  const isPlatformAvailable = (requiredTier: string) => {
    if (requiredTier === 'basis') return true
    if (requiredTier === 'premium') return tier === 'premium' || tier === 'vip'
    if (requiredTier === 'vip') return tier === 'vip'
    return false
  }

  const isPlatformConnected = (platformId: string) => {
    return connectedPlatforms?.some(p => p.platform === platformId && p.status === 'connected')
  }

  // Basis plan restriction - only 1 platform
  const connectedCount = connectedPlatforms?.filter(p => p.status === 'connected').length || 0
  const isAtBasisLimit = tier === 'basis' && connectedCount >= 1

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Megaphone className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Ad-Plattformen verbinden</h2>
        <p className="text-zinc-400">
          Verbinde deine Werbekonten für automatische Kampagnen.
        </p>
        {tier === 'basis' && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-sm text-amber-400">
            <AlertCircle className="w-4 h-4" />
            Basis-Plan: Wähle Pinterest ODER Meta (1 Plattform)
          </div>
        )}
      </div>

      {/* Platforms Grid */}
      <div className="grid gap-4">
        {platforms.map(platform => {
          const isConnected = isPlatformConnected(platform.id)
          const isAvailable = isPlatformAvailable(platform.requiredTier)
          const isDisabledForBasis = isAtBasisLimit && !isConnected
          const isLoading = connectMutation.isPending && connectMutation.variables === platform.id

          return (
            <div
              key={platform.id}
              className={`card transition-all ${
                !isAvailable ? 'opacity-50' : ''
              } ${isConnected ? platform.borderColor : 'border-transparent'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Platform Logo */}
                  <div className={`w-14 h-14 ${platform.bgColor} rounded-xl flex items-center justify-center text-2xl`}>
                    {platform.logo}
                  </div>

                  {/* Platform Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{platform.name}</h3>
                      {!isAvailable && (
                        <span className="badge bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5">
                          {platform.requiredTier.toUpperCase()}
                        </span>
                      )}
                      {isConnected && (
                        <span className="badge badge-success text-xs">Verbunden</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 mb-2">{platform.description}</p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2">
                      {platform.features.map(feature => (
                        <span
                          key={feature}
                          className="text-xs px-2 py-0.5 bg-surface-highlight rounded text-zinc-500"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex flex-col gap-2">
                  {isConnected ? (
                    <>
                      <button
                        onClick={() => disconnectMutation.mutate(platform.id)}
                        disabled={disconnectMutation.isPending}
                        className="btn-ghost text-red-400 hover:bg-red-500/10 text-sm"
                      >
                        <Unplug className="w-4 h-4" />
                        Trennen
                      </button>
                    </>
                  ) : !isAvailable ? (
                    <button disabled className="btn-secondary opacity-50 cursor-not-allowed">
                      <Lock className="w-4 h-4" />
                      Upgrade
                    </button>
                  ) : isDisabledForBasis ? (
                    <button disabled className="btn-secondary opacity-50 cursor-not-allowed text-sm">
                      Limit erreicht
                    </button>
                  ) : (
                    <button
                      onClick={() => connectMutation.mutate(platform.id)}
                      disabled={isLoading}
                      className="btn-secondary"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      Verbinden
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg mt-6">
        <Info className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-zinc-400">
          <p className="mb-2">
            Du kannst Ad-Plattformen auch später in den Einstellungen verbinden oder ändern.
          </p>
          <p className="text-xs text-zinc-500">
            Die Verbindung ermöglicht automatisches Erstellen und Optimieren von Kampagnen.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-12 flex justify-between">
        <button onClick={onBack} className="btn-ghost">
          <ArrowLeft className="w-5 h-5" />
          Zurück
        </button>
        <button onClick={onComplete} className="btn-primary">
          Setup abschließen
          <Check className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
```

### 5. src/lib/store.ts (Erweiterung)
```typescript
// Onboarding State zum bestehenden Store hinzufügen

interface AppState {
  // ... existing state ...

  // Onboarding
  onboardingStep: number
  onboardingCompleted: boolean
  onboardingSkipped: boolean
  setOnboardingStep: (step: number) => void
  setOnboardingCompleted: (completed: boolean) => void
  setOnboardingSkipped: (skipped: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ... existing state ...

      // Onboarding
      onboardingStep: 1,
      onboardingCompleted: false,
      onboardingSkipped: false,
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      setOnboardingSkipped: (skipped) => set({ onboardingSkipped: skipped }),
    }),
    {
      name: 'pod-autom-storage',
      partialize: (state) => ({
        onboardingStep: state.onboardingStep,
        onboardingCompleted: state.onboardingCompleted,
        onboardingSkipped: state.onboardingSkipped,
      })
    }
  )
)
```

### 6. Backend: Ad Platform OAuth Routes
```python
# backend/api/routes/pod_autom_ads.py

from flask import Blueprint, request, redirect, jsonify
import os
import secrets

bp = Blueprint('pod_autom_ads', __name__, url_prefix='/pod-autom/ad-platforms')

FRONTEND_URL = os.getenv('POD_AUTOM_FRONTEND_URL')

# Pinterest OAuth
PINTEREST_APP_ID = os.getenv('PINTEREST_APP_ID')
PINTEREST_APP_SECRET = os.getenv('PINTEREST_APP_SECRET')
PINTEREST_SCOPES = 'ads:read,ads:write,catalogs:read,catalogs:write,pins:read,boards:read'

# Meta OAuth
META_APP_ID = os.getenv('META_APP_ID')
META_APP_SECRET = os.getenv('META_APP_SECRET')
META_SCOPES = 'ads_management,business_management,pages_read_engagement'


@bp.route('/pinterest/auth', methods=['GET'])
@verify_jwt
def pinterest_auth():
    """Initiate Pinterest OAuth"""
    shop_id = request.args.get('shop_id')
    if not shop_id:
        return jsonify({'error': 'shop_id required'}), 400

    state = secrets.token_urlsafe(32)

    # Store state
    supabase.table('pod_autom_oauth_states').insert({
        'user_id': request.user_id,
        'shop_id': shop_id,
        'platform': 'pinterest',
        'nonce': state,
        'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    }).execute()

    redirect_uri = f"{os.getenv('API_URL')}/pod-autom/ad-platforms/pinterest/callback"

    auth_url = (
        f"https://www.pinterest.com/oauth/"
        f"?client_id={PINTEREST_APP_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={PINTEREST_SCOPES}"
        f"&state={state}"
    )

    return jsonify({'auth_url': auth_url})


@bp.route('/pinterest/callback', methods=['GET'])
def pinterest_callback():
    """Handle Pinterest OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')

    if error:
        return redirect(f"{FRONTEND_URL}/onboarding?platform_error={error}")

    # Verify state and exchange code for token
    # ... (similar to Shopify OAuth)

    return redirect(f"{FRONTEND_URL}/onboarding?platform_connected=pinterest")


@bp.route('/meta/auth', methods=['GET'])
@verify_jwt
def meta_auth():
    """Initiate Meta OAuth"""
    shop_id = request.args.get('shop_id')
    if not shop_id:
        return jsonify({'error': 'shop_id required'}), 400

    state = secrets.token_urlsafe(32)

    # Store state
    supabase.table('pod_autom_oauth_states').insert({
        'user_id': request.user_id,
        'shop_id': shop_id,
        'platform': 'meta',
        'nonce': state,
        'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    }).execute()

    redirect_uri = f"{os.getenv('API_URL')}/pod-autom/ad-platforms/meta/callback"

    auth_url = (
        f"https://www.facebook.com/v19.0/dialog/oauth"
        f"?client_id={META_APP_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={META_SCOPES}"
        f"&state={state}"
    )

    return jsonify({'auth_url': auth_url})


@bp.route('/<platform>/disconnect', methods=['DELETE'])
@verify_jwt
def disconnect_platform(platform):
    """Disconnect an ad platform"""
    shop_id = request.args.get('shop_id')

    supabase.table('pod_autom_ad_connections').delete().eq(
        'shop_id', shop_id
    ).eq('platform', platform).execute()

    return jsonify({'success': True})
```

### 7. Neue Datenbank-Tabelle
```sql
-- Ad Platform Connections
CREATE TABLE IF NOT EXISTS pod_autom_ad_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES pod_autom_shops(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'pinterest', 'meta', 'google', 'tiktok'
  access_token TEXT,
  refresh_token TEXT,
  account_id VARCHAR(255),
  account_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'connected',
  scopes TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(shop_id, platform)
);

CREATE INDEX idx_pod_autom_ad_connections_shop ON pod_autom_ad_connections(shop_id);
```

---

## Package.json Ergänzung
```json
{
  "dependencies": {
    "framer-motion": "^11.0.0"
  }
}
```

---

## Verifizierung

### Funktionale Tests
- [ ] Wizard zeigt alle 4 Schritte an
- [ ] Progress-Anzeige funktioniert
- [ ] Navigation zwischen Schritten (vor/zurück)
- [ ] Step 1: Shop-Verbindung (OAuth)
- [ ] Step 2: Nischen-Auswahl speichert korrekt
- [ ] Step 3: Prompt-Konfiguration speichert korrekt
- [ ] Step 4: Ad-Plattformen verbinden
- [ ] Onboarding kann übersprungen werden
- [ ] Fortschritt wird im localStorage gespeichert
- [ ] Nach Abschluss → Dashboard
- [ ] OAuth Callback Fehler werden angezeigt

### UI/UX Tests
- [ ] Animationen zwischen Steps flüssig
- [ ] Exit-Dialog erscheint bei "Überspringen"
- [ ] Toast-Nachrichten erscheinen
- [ ] Responsive auf Mobile
- [ ] Kategorie-Tabs für Nischen funktionieren
- [ ] Prompt-Vorschau funktioniert

### State Tests
- [ ] Existing data wird korrekt geladen
- [ ] useState → useEffect Bug ist behoben
- [ ] Mutations invalidieren Queries

---

## Abhängigkeiten
- Phase 2.1 (Auth Pages)
- Phase 2.2 (Shopify OAuth)
- framer-motion für Animationen
- useToast Hook

## Nächster Schritt
→ Phase 2.4 - Basis Settings Page
