# Phase 3.3 - NicheSelector Komponente

## Ziel
Dashboard-Komponente zur Verwaltung der ausgewählten Nischen mit vollständiger CRUD-Funktionalität.

## Kritische Hinweise

### ⚠️ Keine Fake-Daten
Niemals `Math.random()` oder statische Platzhalter für Produktzahlen verwenden!
Die Daten müssen aus der Datenbank kommen.

### ⚠️ Keine Native Dialogs
`confirm()` und `alert()` blockieren den Thread und sind nicht barrierefrei.
Immer Custom Dialog-Komponenten verwenden.

---

## Komponenten

### 1. src/components/ui/ConfirmDialog.tsx (NEU)

Wiederverwendbare Bestätigungsdialog-Komponente.

```typescript
import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
  isLoading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  variant = 'default',
  isLoading = false
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus cancel button by default (safer option)
      cancelButtonRef.current?.focus()
    }
  }, [isOpen])

  // Keyboard handling
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Tab') {
        // Trap focus within dialog
        const focusableElements = [cancelButtonRef.current, confirmButtonRef.current]
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const variantStyles = {
    danger: {
      icon: 'bg-red-500/10 text-red-400',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500/50'
    },
    warning: {
      icon: 'bg-amber-500/10 text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/50'
    },
    default: {
      icon: 'bg-primary/10 text-primary',
      button: 'bg-primary hover:bg-primary-hover focus:ring-primary/50'
    }
  }

  const styles = variantStyles[variant]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                       w-full max-w-md bg-surface border border-zinc-700 rounded-xl
                       shadow-2xl p-6"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white
                         rounded-lg hover:bg-surface-highlight transition"
              aria-label="Dialog schließen"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className={`w-12 h-12 rounded-full ${styles.icon} flex items-center
                            justify-center mx-auto mb-4`}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            {/* Content */}
            <h2
              id="confirm-dialog-title"
              className="text-lg font-semibold text-center mb-2"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="text-zinc-400 text-center mb-6"
            >
              {description}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                ref={cancelButtonRef}
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 btn-secondary disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={() => {
                  onConfirm()
                  if (!isLoading) onClose()
                }}
                disabled={isLoading}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-white
                           transition focus:outline-none focus:ring-2 disabled:opacity-50
                           ${styles.button}`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                    rounded-full animate-spin" />
                    Bitte warten...
                  </span>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

### 2. src/hooks/useNiches.ts (NEU)

Dedizierter Hook für Nischen-Daten mit echten Produktzahlen.

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { toast } from '@src/components/ui/Toast'

export interface Niche {
  id: string
  niche_name: string
  is_active: boolean
  created_at: string
  product_count: number
  winner_count: number
}

interface UseNichesOptions {
  settingsId: string | null
  enabled?: boolean
}

export function useNiches({ settingsId, enabled = true }: UseNichesOptions) {
  return useQuery({
    queryKey: ['pod-autom-niches', settingsId],
    queryFn: async (): Promise<Niche[]> => {
      if (!settingsId) return []

      // Hole Nischen mit Product Analytics Count
      const { data: niches, error } = await supabase
        .from('pod_autom_niches')
        .select('id, niche_name, is_active, created_at')
        .eq('settings_id', settingsId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!niches) return []

      // Hole Produkt-Counts pro Nische parallel
      // Annahme: product_analytics hat ein niche_id Feld oder niche_name
      const nichesWithCounts = await Promise.all(
        niches.map(async (niche) => {
          // Alle Produkte für diese Nische
          const { count: productCount } = await supabase
            .from('product_analytics')
            .select('*', { count: 'exact', head: true })
            .eq('niche_name', niche.niche_name)

          // Winner für diese Nische
          const { count: winnerCount } = await supabase
            .from('product_analytics')
            .select('*', { count: 'exact', head: true })
            .eq('niche_name', niche.niche_name)
            .eq('current_phase', 'winner')

          return {
            ...niche,
            product_count: productCount || 0,
            winner_count: winnerCount || 0
          }
        })
      )

      return nichesWithCounts
    },
    enabled: enabled && !!settingsId,
    staleTime: 1000 * 60 * 2 // 2 Minuten
  })
}

export function useAddNiche(settingsId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nicheName: string) => {
      if (!settingsId) throw new Error('Keine Settings ID')

      const { data, error } = await supabase
        .from('pod_autom_niches')
        .insert({
          settings_id: settingsId,
          niche_name: nicheName.trim(),
          is_active: true
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Diese Nische existiert bereits')
        }
        throw error
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-niches', settingsId] })
      toast.success(`"${data.niche_name}" hinzugefügt`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useUpdateNiche(settingsId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('pod_autom_niches')
        .update({ niche_name: name.trim() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-niches', settingsId] })
      toast.success('Nische aktualisiert')
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`)
    }
  })
}

export function useToggleNicheActive(settingsId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('pod_autom_niches')
        .update({ is_active: isActive })
        .eq('id', id)

      if (error) throw error
      return isActive
    },
    onSuccess: (isActive) => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-niches', settingsId] })
      toast.success(isActive ? 'Nische aktiviert' : 'Nische deaktiviert')
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`)
    }
  })
}

export function useDeleteNiche(settingsId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pod_autom_niches')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-niches', settingsId] })
      toast.success('Nische gelöscht')
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`)
    }
  })
}
```

### 3. src/components/ui/Toast.tsx (NEU)

Einfache Toast-Notification Komponente.

```typescript
import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, type, message }])

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

function ToastContainer() {
  const context = useContext(ToastContext)
  if (!context) return null

  const { toasts, removeToast } = context

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
    info: <AlertCircle className="w-5 h-5 text-blue-400" />
  }

  const bgColors = {
    success: 'bg-emerald-500/10 border-emerald-500/30',
    error: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    info: 'bg-blue-500/10 border-blue-500/30'
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      role="region"
      aria-label="Benachrichtigungen"
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            role="alert"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
                       backdrop-blur-sm min-w-[280px] max-w-md ${bgColors[toast.type]}`}
          >
            {icons[toast.type]}
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-zinc-400 hover:text-white transition rounded"
              aria-label="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Singleton für direkten Zugriff
let toastFn: ((type: ToastType, message: string) => void) | null = null

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')

  useEffect(() => {
    toastFn = context.addToast
  }, [context.addToast])

  return context
}

// Direkter Export für Zugriff ohne Hook
export const toast = {
  success: (message: string) => toastFn?.('success', message),
  error: (message: string) => toastFn?.('error', message),
  warning: (message: string) => toastFn?.('warning', message),
  info: (message: string) => toastFn?.('info', message)
}
```

### 4. src/components/dashboard/NicheSelector.tsx (KOMPLETT ÜBERARBEITET)

```typescript
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useShops } from '@src/hooks/useShopify'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useAppStore } from '@src/lib/store'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import {
  useNiches,
  useAddNiche,
  useUpdateNiche,
  useToggleNicheActive,
  useDeleteNiche
} from '@src/hooks/useNiches'
import ConfirmDialog from '@src/components/ui/ConfirmDialog'
import {
  Palette,
  Search,
  Plus,
  X,
  Trash2,
  Edit2,
  Power,
  PowerOff,
  AlertCircle,
  Loader2,
  TrendingUp,
  Package,
  Save,
  Rocket
} from 'lucide-react'

// Nischen-Vorschläge (kategorisiert für bessere UX)
const nicheCategories = {
  'Lifestyle': [
    'Fitness & Sport', 'Yoga & Meditation', 'Reisen', 'Kochen & Backen', 'Wandern'
  ],
  'Hobbies': [
    'Gaming', 'Musik', 'Fotografie', 'Angeln', 'Kunst & Design'
  ],
  'Tiere': [
    'Hunde', 'Katzen', 'Pferde', 'Exotische Tiere'
  ],
  'Anlässe': [
    'Vatertag', 'Muttertag', 'Weihnachten', 'Halloween', 'Geburtstag', 'Hochzeit'
  ],
  'Sonstiges': [
    'Natur & Umwelt', 'Autos & Motorräder', 'Kaffee & Tee', 'Bücher & Lesen'
  ]
}

// Flache Liste aller Vorschläge
const allSuggestions = Object.values(nicheCategories).flat()

export default function NicheSelector() {
  const { selectedShopId } = useAppStore()
  const { data: shops } = useShops()
  const { maxNiches, tier } = useSubscription()

  // UI State
  const [searchTerm, setSearchTerm] = useState('')
  const [newNiche, setNewNiche] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

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
  const { data: niches, isLoading } = useNiches({ settingsId })
  const addMutation = useAddNiche(settingsId)
  const updateMutation = useUpdateNiche(settingsId)
  const toggleMutation = useToggleNicheActive(settingsId)
  const deleteMutation = useDeleteNiche(settingsId)

  // Computed Values
  const activeNiches = useMemo(() =>
    niches?.filter(n => n.is_active) || [],
    [niches]
  )

  const inactiveNiches = useMemo(() =>
    niches?.filter(n => !n.is_active) || [],
    [niches]
  )

  const canAddMore = maxNiches === -1 || activeNiches.length < maxNiches

  const filteredSuggestions = useMemo(() =>
    allSuggestions.filter(n =>
      n.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !niches?.some(existing => existing.niche_name.toLowerCase() === n.toLowerCase())
    ),
    [searchTerm, niches]
  )

  // Handlers
  const handleAddNiche = () => {
    const trimmed = newNiche.trim()
    if (!trimmed) return
    if (!canAddMore) return

    addMutation.mutate(trimmed, {
      onSuccess: () => setNewNiche('')
    })
  }

  const handleAddSuggested = (niche: string) => {
    if (!canAddMore) return
    addMutation.mutate(niche)
  }

  const handleStartEdit = (niche: { id: string; niche_name: string }) => {
    setEditingId(niche.id)
    setEditingName(niche.niche_name)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) return
    updateMutation.mutate(
      { id: editingId, name: editingName },
      { onSuccess: () => {
        setEditingId(null)
        setEditingName('')
      }}
    )
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null)
    })
  }

  // Keyboard handling für Edit-Input
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  // Keyboard handling für Add-Input
  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddNiche()
    }
  }

  // Kein Shop verbunden
  if (!selectedShop) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Kein Shop verbunden</h2>
        <p className="text-zinc-400 mb-6 text-center max-w-md">
          Verbinde einen Shopify Store, um Nischen zu verwalten.
        </p>
        <Link to="/onboarding" className="btn-primary">
          <Rocket className="w-5 h-5" />
          Shop verbinden
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Nischen verwalten</h1>
          <p className="text-zinc-400">
            <span className="text-white font-medium">{activeNiches.length}</span>
            /{maxNiches === -1 ? '∞' : maxNiches} aktive Nischen
          </p>
        </div>

        {/* Add Niche Input */}
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="text"
              value={newNiche}
              onChange={(e) => setNewNiche(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="Neue Nische hinzufügen..."
              disabled={!canAddMore}
              aria-label="Neue Nische"
              className="input w-64 pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {newNiche && (
              <button
                onClick={() => setNewNiche('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500
                           hover:text-white transition"
                aria-label="Eingabe löschen"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleAddNiche}
            disabled={!newNiche.trim() || addMutation.isPending || !canAddMore}
            aria-label="Nische hinzufügen"
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Active Niches */}
      <div className="card">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Power className="w-5 h-5 text-emerald-400" />
          Aktive Nischen ({activeNiches.length})
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : activeNiches.length > 0 ? (
          <ul className="space-y-2" role="list">
            {activeNiches.map((niche) => (
              <li
                key={niche.id}
                className="flex items-center justify-between p-4 bg-surface-highlight
                           rounded-lg transition hover:bg-zinc-700/50"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center
                                  justify-center flex-shrink-0">
                    <Palette className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === niche.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={handleSaveEdit}
                        className="input py-1 w-full max-w-xs"
                        autoFocus
                        aria-label="Nische umbenennen"
                      />
                    ) : (
                      <p className="font-medium truncate">{niche.niche_name}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {niche.product_count} Produkte
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        {niche.winner_count} Winner
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions - immer sichtbar für Accessibility */}
                <div className="flex items-center gap-1 ml-4">
                  {editingId === niche.id ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        disabled={updateMutation.isPending}
                        className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg
                                   transition disabled:opacity-50"
                        aria-label="Speichern"
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-surface
                                   rounded-lg transition"
                        aria-label="Abbrechen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartEdit(niche)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-surface
                                   rounded-lg transition"
                        aria-label={`${niche.niche_name} bearbeiten`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate({ id: niche.id, isActive: false })}
                        disabled={toggleMutation.isPending}
                        className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10
                                   rounded-lg transition disabled:opacity-50"
                        aria-label={`${niche.niche_name} deaktivieren`}
                      >
                        <PowerOff className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: niche.id, name: niche.niche_name })}
                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10
                                   rounded-lg transition"
                        aria-label={`${niche.niche_name} löschen`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12 text-zinc-400">
            <Palette className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Noch keine aktiven Nischen</p>
            <p className="text-sm mt-1">
              Füge unten eine Nische aus den Vorschlägen hinzu oder erstelle eine eigene.
            </p>
          </div>
        )}
      </div>

      {/* Inactive Niches */}
      {inactiveNiches.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <PowerOff className="w-5 h-5 text-zinc-500" />
            Inaktive Nischen ({inactiveNiches.length})
          </h2>
          <div className="flex flex-wrap gap-2" role="list">
            {inactiveNiches.map((niche) => (
              <div
                key={niche.id}
                role="listitem"
                className="inline-flex items-center gap-2 px-3 py-2 bg-surface-highlight
                           rounded-lg border border-zinc-700/50"
              >
                <span className="text-zinc-400">{niche.niche_name}</span>
                <button
                  onClick={() => toggleMutation.mutate({ id: niche.id, isActive: true })}
                  disabled={!canAddMore || toggleMutation.isPending}
                  className="p-1 text-zinc-500 hover:text-emerald-400 transition
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`${niche.niche_name} aktivieren`}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: niche.id, name: niche.niche_name })}
                  className="p-1 text-zinc-500 hover:text-red-400 transition"
                  aria-label={`${niche.niche_name} löschen`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="font-semibold">Nischen-Vorschläge</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Vorschläge durchsuchen..."
              aria-label="Vorschläge durchsuchen"
              className="input pl-9 py-1.5 w-full sm:w-56"
            />
          </div>
        </div>

        {filteredSuggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filteredSuggestions.map((niche) => (
              <button
                key={niche}
                onClick={() => handleAddSuggested(niche)}
                disabled={!canAddMore || addMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-highlight
                           rounded-full text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white
                           transition disabled:opacity-50 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Plus className="w-4 h-4" />
                {niche}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center py-4">
            {searchTerm
              ? 'Keine passenden Vorschläge gefunden'
              : 'Alle Vorschläge wurden bereits hinzugefügt'}
          </p>
        )}
      </div>

      {/* Limit Warning */}
      {!canAddMore && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">Nischen-Limit erreicht</p>
            <p className="text-sm text-zinc-400 mt-1">
              Dein <span className="capitalize font-medium">{tier}</span>-Plan erlaubt
              maximal {maxNiches} aktive Nischen.{' '}
              <Link
                to="/settings#subscription"
                className="text-primary hover:underline"
              >
                Upgrade für mehr →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Nische löschen?"
        description={`Möchtest du "${deleteTarget?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmText="Löschen"
        cancelText="Abbrechen"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
```

---

## Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/components/ui/ConfirmDialog.tsx` | Wiederverwendbarer Bestätigungsdialog |
| `src/components/ui/Toast.tsx` | Toast-Notification System |
| `src/hooks/useNiches.ts` | CRUD Hooks für Nischen mit echten Daten |

## ToastProvider in App.tsx

Der `ToastProvider` muss in `App.tsx` eingebunden werden:

```typescript
// src/App.tsx
import { ToastProvider } from '@src/components/ui/Toast'

function App() {
  return (
    <ToastProvider>
      {/* Rest der App */}
    </ToastProvider>
  )
}
```

---

## Verifizierung

- [ ] **Keine `Math.random()`** - Produktzahlen kommen aus der Datenbank
- [ ] **Keine native `confirm()`** - ConfirmDialog wird verwendet
- [ ] **React Router `<Link>`** - Alle internen Links
- [ ] **ARIA Labels** - Alle Buttons haben aria-label
- [ ] **Keyboard Navigation** - Enter/Escape in Edit-Modus
- [ ] **Focus Management** - Dialog fokussiert automatisch Abbrechen-Button
- [ ] **Toast Notifications** - Erfolg/Fehler Meldungen
- [ ] **Loading States** - Spinner während Mutations
- [ ] **Buttons immer sichtbar** - Nicht nur bei Hover (Accessibility)
- [ ] **Responsive Layout** - Funktioniert auf Mobile
- [ ] **Plan-Limit wird respektiert** - Deaktivierte Buttons wenn Limit erreicht

## Abhängigkeiten

- Phase 3.1 (Dashboard Layout mit Store)
- Phase 1.4 (Datenbank-Tabellen)
- `framer-motion` NPM-Paket

## Nächster Schritt
→ Phase 3.4 - PromptManager Komponente
