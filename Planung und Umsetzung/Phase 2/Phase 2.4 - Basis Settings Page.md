# Phase 2.4 - Basis Settings Page

## Ziel
Erstellen einer vollständigen Settings-Seite für Shop-Konfiguration, Account-Verwaltung, Sicherheit, Abonnement und GDPR-Compliance.

## Übersicht

### Settings-Tabs
| Tab | Beschreibung |
|-----|--------------|
| Shop | Verbundene Shops verwalten, Printful API Key |
| Produktion | Automatisierungs-Einstellungen |
| Account | Profil, Passwort ändern, 2FA |
| Abo | Stripe Subscription Management |
| Benachrichtigungen | E-Mail & Push Preferences |
| Sicherheit | Sessions, Datenexport, Account löschen |

---

## Komponenten

### 1. src/pages/Settings.tsx

```typescript
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@src/contexts/AuthContext'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useShops } from '@src/hooks/useShopify'
import Sidebar from '@src/components/layout/Sidebar'
import Header from '@src/components/layout/Header'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Store,
  User,
  CreditCard,
  Bell,
  Shield,
  Wand2,
  AlertTriangle
} from 'lucide-react'

// Tab Components
import ShopSettings from '@src/components/settings/ShopSettings'
import AccountSettings from '@src/components/settings/AccountSettings'
import SubscriptionSettings from '@src/components/settings/SubscriptionSettings'
import NotificationSettings from '@src/components/settings/NotificationSettings'
import ProductionSettings from '@src/components/settings/ProductionSettings'
import SecuritySettings from '@src/components/settings/SecuritySettings'

// Unsaved Changes Context
import { useUnsavedChanges } from '@src/hooks/useUnsavedChanges'

const tabs = [
  { id: 'shop', label: 'Shop', icon: Store },
  { id: 'production', label: 'Produktion', icon: Wand2 },
  { id: 'account', label: 'Account', icon: User },
  { id: 'subscription', label: 'Abo', icon: CreditCard },
  { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
  { id: 'security', label: 'Sicherheit', icon: Shield },
] as const

type TabId = typeof tabs[number]['id']

export default function Settings() {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasUnsavedChanges, confirmNavigation } = useUnsavedChanges()

  // URL Hash Navigation (#subscription, #account, etc.)
  const getInitialTab = (): TabId => {
    const hash = location.hash.replace('#', '') as TabId
    return tabs.some(t => t.id === hash) ? hash : 'shop'
  }

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingTab, setPendingTab] = useState<TabId | null>(null)

  // Sync URL hash with active tab
  useEffect(() => {
    const newHash = `#${activeTab}`
    if (location.hash !== newHash) {
      navigate(`/settings${newHash}`, { replace: true })
    }
  }, [activeTab, navigate, location.hash])

  // Handle browser back/forward with hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = location.hash.replace('#', '') as TabId
      if (tabs.some(t => t.id === hash) && hash !== activeTab) {
        handleTabChange(hash)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [activeTab])

  const handleTabChange = (newTab: TabId) => {
    if (hasUnsavedChanges) {
      setPendingTab(newTab)
      setShowUnsavedDialog(true)
      return
    }
    setActiveTab(newTab)
  }

  const confirmTabChange = () => {
    if (pendingTab) {
      setActiveTab(pendingTab)
      setPendingTab(null)
    }
    setShowUnsavedDialog(false)
  }

  const renderTabContent = () => {
    const contentVariants = {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 }
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'shop' && <ShopSettings />}
          {activeTab === 'production' && <ProductionSettings />}
          {activeTab === 'account' && <AccountSettings />}
          {activeTab === 'subscription' && <SubscriptionSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header title="Einstellungen" />

        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Tabs - Horizontal scrollable on mobile */}
            <nav
              className="flex gap-1 p-1 bg-surface rounded-lg mb-8 overflow-x-auto scrollbar-hide"
              role="tablist"
              aria-label="Settings navigation"
            >
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`flex items-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-surface-highlight'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Tab Content Panel */}
            <div
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
            >
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface border border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold">Ungespeicherte Änderungen</h3>
                <p className="text-sm text-zinc-400">
                  Änderungen gehen verloren, wenn du fortfährst.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUnsavedDialog(false)}
                className="flex-1 btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmTabChange}
                className="flex-1 btn bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
              >
                Verwerfen
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
```

---

### 2. src/hooks/useUnsavedChanges.ts

```typescript
import { create } from 'zustand'
import { useEffect, useCallback } from 'react'

interface UnsavedChangesState {
  hasUnsavedChanges: boolean
  setUnsavedChanges: (value: boolean) => void
}

const useUnsavedChangesStore = create<UnsavedChangesState>((set) => ({
  hasUnsavedChanges: false,
  setUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),
}))

export function useUnsavedChanges() {
  const { hasUnsavedChanges, setUnsavedChanges } = useUnsavedChangesStore()

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const markAsUnsaved = useCallback(() => {
    setUnsavedChanges(true)
  }, [setUnsavedChanges])

  const markAsSaved = useCallback(() => {
    setUnsavedChanges(false)
  }, [setUnsavedChanges])

  const confirmNavigation = useCallback((callback: () => void) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'Du hast ungespeicherte Änderungen. Möchtest du die Seite wirklich verlassen?'
      )
      if (confirmed) {
        setUnsavedChanges(false)
        callback()
      }
    } else {
      callback()
    }
  }, [hasUnsavedChanges, setUnsavedChanges])

  return {
    hasUnsavedChanges,
    markAsUnsaved,
    markAsSaved,
    confirmNavigation,
  }
}
```

---

### 3. src/components/settings/ShopSettings.tsx

```typescript
import { useState } from 'react'
import { useShops, useDisconnectShop, useTestConnection } from '@src/hooks/useShopify'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { useToast } from '@src/hooks/useToast'
import {
  Store,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Key,
  Eye,
  EyeOff,
  Loader2,
  Save,
  AlertCircle
} from 'lucide-react'

export default function ShopSettings() {
  const { data: shops, isLoading, refetch } = useShops()
  const disconnectMutation = useDisconnectShop()
  const testConnectionMutation = useTestConnection()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [showPrintfulKey, setShowPrintfulKey] = useState<Record<string, boolean>>({})
  const [printfulKeys, setPrintfulKeys] = useState<Record<string, string>>({})
  const [savingPrintful, setSavingPrintful] = useState<string | null>(null)

  const handleDisconnect = async (shopId: string, shopName: string) => {
    if (!confirm(`"${shopName}" wirklich trennen? Alle Einstellungen und Daten werden gelöscht.`)) return

    try {
      await disconnectMutation.mutateAsync(shopId)
      toast({
        title: 'Shop getrennt',
        description: `${shopName} wurde erfolgreich getrennt.`,
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Shop konnte nicht getrennt werden.',
        variant: 'error'
      })
    }
  }

  const handleTestConnection = async (shopId: string) => {
    try {
      await testConnectionMutation.mutateAsync(shopId)
      toast({
        title: 'Verbindung OK',
        description: 'Shopify-Verbindung funktioniert einwandfrei.',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Verbindungsfehler',
        description: 'Shopify konnte nicht erreicht werden. Token möglicherweise abgelaufen.',
        variant: 'error'
      })
    }
  }

  const handleSavePrintfulKey = async (shopId: string) => {
    const key = printfulKeys[shopId]
    if (!key) return

    setSavingPrintful(shopId)
    try {
      const { error } = await supabase
        .from('pod_autom_shops')
        .update({ printful_api_key: key })
        .eq('id', shopId)

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['shops'] })
      toast({
        title: 'Printful API Key gespeichert',
        description: 'Der API Key wurde erfolgreich aktualisiert.',
        variant: 'success'
      })
      setPrintfulKeys(prev => ({ ...prev, [shopId]: '' }))
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'API Key konnte nicht gespeichert werden.',
        variant: 'error'
      })
    } finally {
      setSavingPrintful(null)
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 w-48 bg-surface-highlight rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-surface-highlight rounded animate-pulse" />
        </div>
        {[1, 2].map(i => (
          <div key={i} className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-highlight rounded-xl animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-surface-highlight rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-surface-highlight rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Verbundene Shops</h2>
        <p className="text-sm text-zinc-400">
          Verwalte deine Shopify Store Verbindungen und Fulfillment-API Keys.
        </p>
      </div>

      {shops && shops.length > 0 ? (
        <div className="space-y-4">
          {shops.map(shop => (
            <div key={shop.id} className="card">
              {/* Shop Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    shop.connection_status === 'connected'
                      ? 'bg-emerald-500/10'
                      : 'bg-red-500/10'
                  }`}>
                    <Store className={`w-6 h-6 ${
                      shop.connection_status === 'connected'
                        ? 'text-emerald-500'
                        : 'text-red-500'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-medium">{shop.internal_name || shop.shop_domain}</h3>
                    <p className="text-sm text-zinc-500">{shop.shop_domain}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    shop.connection_status === 'connected'
                      ? 'badge-success'
                      : 'badge-error'
                  }`}>
                    {shop.connection_status === 'connected' ? (
                      <><CheckCircle2 className="w-3 h-3" /> Verbunden</>
                    ) : (
                      <><XCircle className="w-3 h-3" /> Getrennt</>
                    )}
                  </span>

                  <button
                    onClick={() => handleTestConnection(shop.id)}
                    disabled={testConnectionMutation.isPending}
                    className="p-2 text-zinc-400 hover:text-white transition rounded-lg hover:bg-surface-highlight"
                    title="Verbindung testen"
                  >
                    {testConnectionMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5" />
                    )}
                  </button>

                  <a
                    href={`https://${shop.shop_domain}/admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-zinc-400 hover:text-white transition rounded-lg hover:bg-surface-highlight"
                    title="Shopify Admin öffnen"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>

                  <button
                    onClick={() => handleDisconnect(shop.id, shop.internal_name || shop.shop_domain)}
                    disabled={disconnectMutation.isPending}
                    className="p-2 text-zinc-400 hover:text-red-400 transition rounded-lg hover:bg-red-500/10"
                    title="Shop trennen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Shop Stats */}
              {shop.connection_status === 'connected' && (
                <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-zinc-500">Produkte erstellt</p>
                    <p className="text-lg font-semibold">{shop.products_created || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Aktive Nischen</p>
                    <p className="text-lg font-semibold">{shop.active_niches || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Letzte Sync</p>
                    <p className="text-lg font-semibold">
                      {shop.last_sync_at
                        ? new Date(shop.last_sync_at).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '—'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Verbunden seit</p>
                    <p className="text-lg font-semibold">
                      {new Date(shop.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              )}

              {/* Printful API Key Section */}
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-zinc-500" />
                  <label className="text-sm font-medium">Printful API Key</label>
                  {shop.printful_api_key && (
                    <span className="badge badge-success text-xs">Konfiguriert</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPrintfulKey[shop.id] ? 'text' : 'password'}
                      value={printfulKeys[shop.id] ?? (shop.printful_api_key ? '••••••••••••••••••••' : '')}
                      onChange={(e) => setPrintfulKeys(prev => ({ ...prev, [shop.id]: e.target.value }))}
                      placeholder="Printful API Key eingeben..."
                      className="input pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPrintfulKey(prev => ({ ...prev, [shop.id]: !prev[shop.id] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      {showPrintfulKey[shop.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => handleSavePrintfulKey(shop.id)}
                    disabled={!printfulKeys[shop.id] || savingPrintful === shop.id}
                    className="btn-primary px-4"
                  >
                    {savingPrintful === shop.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-zinc-500 mt-2">
                  API Key findest du unter{' '}
                  <a
                    href="https://www.printful.com/dashboard/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Printful Dashboard → Settings → API
                  </a>
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Store className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="font-medium mb-2">Kein Shop verbunden</h3>
          <p className="text-sm text-zinc-500 mb-4">
            Verbinde deinen Shopify Store, um loszulegen.
          </p>
          <a href="/onboarding" className="btn-primary inline-flex">
            Shop verbinden
          </a>
        </div>
      )}

      {/* Help Section */}
      <div className="card bg-surface-highlight/50 border-zinc-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-zinc-400 mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Verbindungsprobleme?</h4>
            <p className="text-sm text-zinc-400">
              Wenn dein Shop als "Getrennt" angezeigt wird, kann es sein, dass der OAuth-Token
              abgelaufen ist. Klicke auf "Shop verbinden", um die Verbindung zu erneuern.
              Deine Einstellungen bleiben erhalten.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### 4. src/components/settings/ProductionSettings.tsx

```typescript
import { useState, useEffect, useCallback } from 'react'
import { useShops } from '@src/hooks/useShopify'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { useToast } from '@src/hooks/useToast'
import { useUnsavedChanges } from '@src/hooks/useUnsavedChanges'
import {
  Wand2,
  Save,
  Loader2,
  Info,
  RotateCcw,
  HelpCircle
} from 'lucide-react'

interface ProductionSettingsData {
  enabled: boolean
  gpt_image_quality: 'LOW' | 'MEDIUM' | 'HIGH'
  creation_limit: number
  auto_publish: boolean
  default_price: number
  product_type: 'tshirt' | 'hoodie' | 'poster' | 'mug' | 'all'
  collection_assignment: 'auto' | 'manual' | 'none'
}

const defaultSettings: ProductionSettingsData = {
  enabled: true,
  gpt_image_quality: 'HIGH',
  creation_limit: 20,
  auto_publish: true,
  default_price: 29.99,
  product_type: 'all',
  collection_assignment: 'auto'
}

export default function ProductionSettings() {
  const { data: shops } = useShops()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { markAsUnsaved, markAsSaved } = useUnsavedChanges()

  const connectedShop = shops?.find(s => s.connection_status === 'connected')

  const [settings, setSettings] = useState<ProductionSettingsData>(defaultSettings)
  const [initialSettings, setInitialSettings] = useState<ProductionSettingsData | null>(null)

  // Fetch settings
  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ['pod-autom-settings', connectedShop?.id],
    queryFn: async () => {
      if (!connectedShop) return null
      const { data } = await supabase
        .from('pod_autom_settings')
        .select('*')
        .eq('shop_id', connectedShop.id)
        .single()
      return data
    },
    enabled: !!connectedShop
  })

  // Update local state when data loads
  useEffect(() => {
    if (existingSettings) {
      const loaded: ProductionSettingsData = {
        enabled: existingSettings.enabled,
        gpt_image_quality: existingSettings.gpt_image_quality as 'LOW' | 'MEDIUM' | 'HIGH',
        creation_limit: existingSettings.creation_limit,
        auto_publish: existingSettings.auto_publish,
        default_price: parseFloat(existingSettings.default_price),
        product_type: existingSettings.product_type || 'all',
        collection_assignment: existingSettings.collection_assignment || 'auto'
      }
      setSettings(loaded)
      setInitialSettings(loaded)
    }
  }, [existingSettings])

  // Track unsaved changes
  useEffect(() => {
    if (initialSettings) {
      const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings)
      if (hasChanges) {
        markAsUnsaved()
      } else {
        markAsSaved()
      }
    }
  }, [settings, initialSettings, markAsUnsaved, markAsSaved])

  // Reset to initial values
  const handleReset = useCallback(() => {
    if (initialSettings) {
      setSettings(initialSettings)
    }
  }, [initialSettings])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ProductionSettingsData) => {
      if (!existingSettings) throw new Error('No settings found')
      const { error } = await supabase
        .from('pod_autom_settings')
        .update({
          enabled: data.enabled,
          gpt_image_quality: data.gpt_image_quality,
          creation_limit: data.creation_limit,
          auto_publish: data.auto_publish,
          default_price: data.default_price,
          product_type: data.product_type,
          collection_assignment: data.collection_assignment,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSettings.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-settings'] })
      setInitialSettings(settings)
      markAsSaved()
      toast({
        title: 'Einstellungen gespeichert',
        description: 'Produktions-Einstellungen wurden aktualisiert.',
        variant: 'success'
      })
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Einstellungen konnten nicht gespeichert werden.',
        variant: 'error'
      })
    }
  })

  const hasChanges = initialSettings && JSON.stringify(settings) !== JSON.stringify(initialSettings)

  if (!connectedShop) {
    return (
      <div className="card text-center py-12">
        <Wand2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="font-medium mb-2">Kein Shop verbunden</h3>
        <p className="text-sm text-zinc-500">
          Verbinde zuerst einen Shop, um Produktions-Einstellungen zu konfigurieren.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 w-48 bg-surface-highlight rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-surface-highlight rounded animate-pulse" />
        </div>
        <div className="card">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="py-4 border-b border-zinc-800 last:border-0">
              <div className="h-5 w-32 bg-surface-highlight rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-surface-highlight rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">Produktions-Einstellungen</h2>
          <p className="text-sm text-zinc-400">
            Konfiguriere, wie Produkte automatisch erstellt werden.
          </p>
        </div>

        {hasChanges && (
          <button
            onClick={handleReset}
            className="btn-ghost text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Zurücksetzen
          </button>
        )}
      </div>

      <div className="card space-y-6">
        {/* Enabled Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium">Automatische Produktion</label>
            <p className="text-sm text-zinc-400">Aktiviert die automatische Produkt-Erstellung</p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
            role="switch"
            aria-checked={settings.enabled}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              settings.enabled ? 'bg-primary' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* GPT Image Quality */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="font-medium">Bildqualität (GPT-4o)</label>
            <div className="group relative">
              <HelpCircle className="w-4 h-4 text-zinc-500 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <strong>LOW:</strong> ~$0.01/Bild - Schnell, für Tests<br/>
                <strong>MEDIUM:</strong> ~$0.03/Bild - Balance<br/>
                <strong>HIGH:</strong> ~$0.08/Bild - Beste Qualität
              </div>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mb-3">
            Höhere Qualität = bessere Bilder, aber höhere API-Kosten
          </p>
          <div className="flex gap-2">
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map(quality => (
              <button
                key={quality}
                onClick={() => setSettings(s => ({ ...s, gpt_image_quality: quality }))}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                  settings.gpt_image_quality === quality
                    ? 'bg-primary text-white'
                    : 'bg-surface-highlight text-zinc-400 hover:text-white'
                }`}
              >
                {quality === 'LOW' && 'Niedrig'}
                {quality === 'MEDIUM' && 'Mittel'}
                {quality === 'HIGH' && 'Hoch'}
              </button>
            ))}
          </div>
        </div>

        {/* Product Type */}
        <div>
          <label className="block font-medium mb-2">Standard-Produkttyp</label>
          <p className="text-sm text-zinc-400 mb-3">
            Welche Produktart soll standardmäßig erstellt werden?
          </p>
          <select
            value={settings.product_type}
            onChange={(e) => setSettings(s => ({ ...s, product_type: e.target.value as any }))}
            className="input w-full max-w-xs"
          >
            <option value="all">Alle Typen (nach Nische)</option>
            <option value="tshirt">Nur T-Shirts</option>
            <option value="hoodie">Nur Hoodies</option>
            <option value="poster">Nur Poster</option>
            <option value="mug">Nur Tassen</option>
          </select>
        </div>

        {/* Creation Limit */}
        <div>
          <label className="block font-medium mb-2">Produkte pro Tag</label>
          <p className="text-sm text-zinc-400 mb-3">
            Maximale Anzahl neuer Produkte pro Cron-Run (morgens 06:00 UTC)
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="100"
              value={settings.creation_limit}
              onChange={(e) => setSettings(s => ({ ...s, creation_limit: parseInt(e.target.value) }))}
              className="flex-1 accent-primary"
            />
            <input
              type="number"
              min="1"
              max="100"
              value={settings.creation_limit}
              onChange={(e) => setSettings(s => ({ ...s, creation_limit: parseInt(e.target.value) || 1 }))}
              className="input w-20 text-center"
            />
          </div>
        </div>

        {/* Auto Publish */}
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium">Automatisch veröffentlichen</label>
            <p className="text-sm text-zinc-400">
              Produkte direkt im Shop veröffentlichen (sonst als Entwurf)
            </p>
          </div>
          <button
            onClick={() => setSettings(s => ({ ...s, auto_publish: !s.auto_publish }))}
            role="switch"
            aria-checked={settings.auto_publish}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              settings.auto_publish ? 'bg-primary' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                settings.auto_publish ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Collection Assignment */}
        <div>
          <label className="block font-medium mb-2">Collection-Zuweisung</label>
          <p className="text-sm text-zinc-400 mb-3">
            Wie sollen neue Produkte Collections zugewiesen werden?
          </p>
          <div className="flex gap-2">
            {[
              { value: 'auto', label: 'Automatisch', desc: 'Nach Nische' },
              { value: 'manual', label: 'Manuell', desc: 'Keine Zuweisung' },
              { value: 'none', label: 'Keine', desc: 'Ohne Collection' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setSettings(s => ({ ...s, collection_assignment: option.value as any }))}
                className={`flex-1 py-2 px-3 rounded-lg text-sm transition ${
                  settings.collection_assignment === option.value
                    ? 'bg-primary text-white'
                    : 'bg-surface-highlight text-zinc-400 hover:text-white'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-xs opacity-70">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Default Price */}
        <div>
          <label className="block font-medium mb-2">Standard-Verkaufspreis</label>
          <p className="text-sm text-zinc-400 mb-3">
            Preis für neue Produkte (kann pro Nische überschrieben werden)
          </p>
          <div className="relative w-32">
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.default_price}
              onChange={(e) => setSettings(s => ({ ...s, default_price: parseFloat(e.target.value) || 0 }))}
              className="input pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">€</span>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {hasChanges ? '⚠️ Ungespeicherte Änderungen' : '✓ Alle Änderungen gespeichert'}
          </p>
          <button
            onClick={() => saveMutation.mutate(settings)}
            disabled={saveMutation.isPending || !hasChanges}
            className="btn-primary"
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
      </div>
    </div>
  )
}
```

---

### 5. src/components/settings/AccountSettings.tsx

```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '@src/contexts/AuthContext'
import { supabase } from '@src/lib/supabase'
import { useToast } from '@src/hooks/useToast'
import { validatePassword } from '@src/lib/validation'
import {
  User,
  Mail,
  Key,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Camera,
  X,
  Shield
} from 'lucide-react'

export default function AccountSettings() {
  const { user, refetchUser } = useAuth()
  const { toast } = useToast()

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false)

  // Load user profile
  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || '')
      setAvatarUrl(user.user_metadata?.avatar_url || null)
      // Check 2FA status from user metadata
      setTwoFactorEnabled(!!user.user_metadata?.two_factor_enabled)
    }
  }, [user])

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Fehler', description: 'Nur Bilddateien erlaubt', variant: 'error' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Fehler', description: 'Maximale Dateigröße: 2MB', variant: 'error' })
      return
    }

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('pod-autom-assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pod-autom-assets')
        .getPublicUrl(filePath)

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      refetchUser?.()
      toast({ title: 'Profilbild aktualisiert', variant: 'success' })
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast({ title: 'Upload fehlgeschlagen', variant: 'error' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Remove avatar
  const handleRemoveAvatar = async () => {
    if (!user) return

    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      })
      if (error) throw error

      setAvatarUrl(null)
      refetchUser?.()
      toast({ title: 'Profilbild entfernt', variant: 'success' })
    } catch (error) {
      toast({ title: 'Fehler beim Entfernen', variant: 'error' })
    }
  }

  // Update display name
  const handleUpdateProfile = async () => {
    if (!user) return

    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      })
      if (error) throw error

      refetchUser?.()
      toast({ title: 'Profil aktualisiert', variant: 'success' })
    } catch (error) {
      toast({ title: 'Fehler beim Speichern', variant: 'error' })
    }
  }

  // Password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordErrors([])

    // Validate new password
    const validation = validatePassword(newPassword)
    if (!validation.isValid) {
      setPasswordErrors(validation.errors)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrors(['Passwörter stimmen nicht überein'])
      return
    }

    setPasswordLoading(true)
    try {
      // First verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword
      })

      if (signInError) {
        setPasswordErrors(['Aktuelles Passwort ist falsch'])
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      toast({
        title: 'Passwort geändert',
        description: 'Dein Passwort wurde erfolgreich aktualisiert.',
        variant: 'success'
      })

      // Clear form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordErrors(['Fehler beim Ändern des Passworts'])
    } finally {
      setPasswordLoading(false)
    }
  }

  // Password strength indicator
  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    if (!password) return { score: 0, label: '', color: '' }

    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (score <= 2) return { score, label: 'Schwach', color: 'bg-red-500' }
    if (score <= 4) return { score, label: 'Mittel', color: 'bg-amber-500' }
    return { score, label: 'Stark', color: 'bg-emerald-500' }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Account-Einstellungen</h2>
        <p className="text-sm text-zinc-400">
          Verwalte deine persönlichen Daten und Sicherheitseinstellungen.
        </p>
      </div>

      {/* Profile Info */}
      <div className="card">
        <h3 className="font-medium mb-6">Profil</h3>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
              )}

              <label className="absolute bottom-0 right-0 p-2 bg-surface rounded-full cursor-pointer hover:bg-surface-highlight transition border border-zinc-700">
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            {avatarUrl && (
              <button
                onClick={handleRemoveAvatar}
                className="text-xs text-zinc-500 hover:text-red-400 transition"
              >
                Entfernen
              </button>
            )}
          </div>

          {/* Profile Fields */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Anzeigename</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dein Name"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input pl-10 opacity-60 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                E-Mail-Adresse kann nicht geändert werden
              </p>
            </div>

            <button
              onClick={handleUpdateProfile}
              className="btn-primary"
            >
              Profil speichern
            </button>
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div className="card">
        <h3 className="font-medium mb-4">Passwort ändern</h3>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {passwordErrors.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              {passwordErrors.map((error, i) => (
                <div key={i} className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Aktuelles Passwort</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input pl-10 pr-10"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Neues Passwort</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input pl-10 pr-10"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength.score ? passwordStrength.color : 'bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${
                  passwordStrength.score <= 2 ? 'text-red-400' :
                  passwordStrength.score <= 4 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Passwort bestätigen</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input pl-10"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
              {confirmPassword && newPassword === confirmPassword && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="btn-primary"
          >
            {passwordLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Ändern...
              </>
            ) : (
              'Passwort ändern'
            )}
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              twoFactorEnabled ? 'bg-emerald-500/10' : 'bg-zinc-800'
            }`}>
              <Shield className={`w-5 h-5 ${
                twoFactorEnabled ? 'text-emerald-500' : 'text-zinc-500'
              }`} />
            </div>
            <div>
              <h3 className="font-medium">Zwei-Faktor-Authentifizierung</h3>
              <p className="text-sm text-zinc-400">
                {twoFactorEnabled
                  ? 'Aktiviert - Dein Account ist zusätzlich geschützt'
                  : 'Erhöhe die Sicherheit deines Accounts'
                }
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTwoFactorSetup(true)}
            className={twoFactorEnabled ? 'btn-secondary' : 'btn-primary'}
          >
            {twoFactorEnabled ? 'Verwalten' : 'Aktivieren'}
          </button>
        </div>

        {/* 2FA Setup Modal would be shown here */}
        {showTwoFactorSetup && (
          <div className="mt-4 p-4 bg-surface-highlight rounded-lg">
            <p className="text-sm text-zinc-400">
              2FA-Setup wird in einer späteren Phase implementiert (Supabase Auth MFA).
            </p>
            <button
              onClick={() => setShowTwoFactorSetup(false)}
              className="btn-secondary mt-3 text-sm"
            >
              Schließen
            </button>
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="card bg-surface-highlight/50">
        <h3 className="font-medium mb-4">Account-Informationen</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-zinc-500">User ID</dt>
            <dd className="font-mono text-xs mt-1 truncate">{user?.id}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Registriert</dt>
            <dd className="mt-1">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })
                : '—'
              }
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">E-Mail verifiziert</dt>
            <dd className="mt-1">
              {user?.email_confirmed_at ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Ja
                </span>
              ) : (
                <span className="text-amber-400">Nein</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Letzter Login</dt>
            <dd className="mt-1">
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '—'
              }
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
```

---

### 6. src/components/settings/SubscriptionSettings.tsx

(Siehe Phase 6.2 für die vollständige Stripe-Integration. Hier die Basis-Version mit Portal-Integration)

```typescript
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSubscription } from '@src/contexts/SubscriptionContext'
import { useCreateCheckoutSession, useCreatePortalSession } from '@src/hooks/useStripe'
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@src/lib/constants'
import { useToast } from '@src/hooks/useToast'
import {
  CreditCard,
  Check,
  ArrowUpRight,
  Calendar,
  AlertCircle,
  Loader2,
  Crown,
  Sparkles,
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function SubscriptionSettings() {
  const [searchParams] = useSearchParams()
  const { subscription, tier, isActive, refetch } = useSubscription()
  const { toast } = useToast()

  // Stripe mutations
  const checkoutMutation = useCreateCheckoutSession()
  const portalMutation = useCreatePortalSession()

  const [showSuccess, setShowSuccess] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  // Handle checkout callback from Stripe
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout')
    if (checkoutStatus === 'success') {
      setShowSuccess(true)
      refetch()
      // Clear URL param
      window.history.replaceState({}, '', '/settings#subscription')
      toast({
        title: 'Zahlung erfolgreich!',
        description: 'Dein Abonnement wurde aktiviert.',
        variant: 'success'
      })
    } else if (checkoutStatus === 'cancel') {
      setShowCancel(true)
      window.history.replaceState({}, '', '/settings#subscription')
    }
  }, [searchParams, refetch, toast])

  const currentPlan = tier ? SUBSCRIPTION_TIERS[tier] : null

  const handleUpgrade = async (newTier: SubscriptionTier) => {
    try {
      const url = await checkoutMutation.mutateAsync(newTier)
      window.location.href = url
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Checkout konnte nicht gestartet werden.',
        variant: 'error'
      })
    }
  }

  const handleManageSubscription = async () => {
    try {
      const url = await portalMutation.mutateAsync()
      window.location.href = url
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Portal konnte nicht geöffnet werden.',
        variant: 'error'
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Abonnement</h2>
        <p className="text-sm text-zinc-400">
          Verwalte dein Abo und Zahlungsinformationen.
        </p>
      </div>

      {/* Success/Cancel Messages */}
      {showSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <div className="flex-1">
            <p className="font-medium text-emerald-400">Zahlung erfolgreich!</p>
            <p className="text-sm text-zinc-400">Dein Abo wurde aktiviert.</p>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-zinc-400 hover:text-white"
            aria-label="Schließen"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {showCancel && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-fade-in">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <div className="flex-1">
            <p className="font-medium text-amber-400">Checkout abgebrochen</p>
            <p className="text-sm text-zinc-400">Du kannst jederzeit ein Abo abschließen.</p>
          </div>
          <button
            onClick={() => setShowCancel(false)}
            className="text-zinc-400 hover:text-white"
            aria-label="Schließen"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Current Plan */}
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-medium mb-1">Aktueller Plan</h3>
            {currentPlan ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary capitalize">{tier}</span>
                <span className={`badge ${
                  isActive ? 'badge-success' :
                  subscription?.status === 'past_due' ? 'badge-warning' :
                  'badge-error'
                }`}>
                  {isActive ? 'Aktiv' :
                   subscription?.status === 'past_due' ? 'Zahlung ausstehend' :
                   subscription?.status === 'canceled' ? 'Gekündigt' :
                   'Inaktiv'
                  }
                </span>
              </div>
            ) : (
              <p className="text-zinc-400">Kein aktives Abonnement</p>
            )}
          </div>

          {currentPlan && (
            <div className="text-right">
              <span className="text-3xl font-bold">{currentPlan.price}€</span>
              <span className="text-zinc-400">/Monat</span>
            </div>
          )}
        </div>

        {currentPlan && (
          <>
            {/* Plan Features */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-surface-highlight rounded-lg">
                <p className="text-sm text-zinc-400 mb-1">Nischen</p>
                <p className="font-semibold">
                  {currentPlan.maxNiches === -1 ? 'Unbegrenzt' : currentPlan.maxNiches}
                </p>
              </div>
              <div className="p-3 bg-surface-highlight rounded-lg">
                <p className="text-sm text-zinc-400 mb-1">Produkte/Monat</p>
                <p className="font-semibold">
                  {currentPlan.maxProducts === -1 ? 'Unbegrenzt' : currentPlan.maxProducts}
                </p>
              </div>
              <div className="p-3 bg-surface-highlight rounded-lg">
                <p className="text-sm text-zinc-400 mb-1">Winner Scaling</p>
                <p className="font-semibold">
                  {currentPlan.winnerScaling ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-surface-highlight rounded-lg">
                <p className="text-sm text-zinc-400 mb-1">Support</p>
                <p className="font-semibold capitalize">{currentPlan.support}</p>
              </div>
            </div>

            {/* Renewal/Cancellation Date */}
            {subscription?.current_period_end && (
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
                <Calendar className="w-4 h-4" />
                {subscription.cancel_at_period_end
                  ? `Läuft aus am ${new Date(subscription.current_period_end).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}`
                  : `Nächste Zahlung: ${new Date(subscription.current_period_end).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}`
                }
              </div>
            )}

            {/* Manage Subscription Button */}
            <button
              onClick={handleManageSubscription}
              disabled={portalMutation.isPending}
              className="btn-secondary"
            >
              {portalMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Laden...
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  Abo über Stripe verwalten
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Upgrade Options */}
      {tier !== 'vip' && (
        <div className="card">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            {tier ? 'Upgrade verfügbar' : 'Plan wählen'}
          </h3>

          <div className="grid md:grid-cols-3 gap-4">
            {(['basis', 'premium', 'vip'] as const)
              .filter(t => !tier || t !== tier)
              .filter(t => {
                if (!tier) return true
                const tierOrder = { basis: 1, premium: 2, vip: 3 }
                return tierOrder[t] > tierOrder[tier]
              })
              .map((t) => {
                const plan = SUBSCRIPTION_TIERS[t]
                const isPopular = t === 'premium'

                return (
                  <div
                    key={t}
                    className={`p-4 bg-surface-highlight rounded-lg border-2 transition cursor-pointer hover:border-primary/50 ${
                      isPopular ? 'border-primary/30' : 'border-transparent'
                    }`}
                    onClick={() => handleUpgrade(t)}
                  >
                    {isPopular && (
                      <div className="flex items-center gap-1 text-primary text-xs font-medium mb-2">
                        <Sparkles className="w-3 h-3" />
                        Beliebt
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold capitalize">{t}</span>
                      <span className="font-bold">
                        {plan.price}€<span className="text-sm text-zinc-400">/Mo</span>
                      </span>
                    </div>
                    <ul className="text-sm text-zinc-400 space-y-1 mb-4">
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-emerald-500" />
                        {plan.maxNiches === -1 ? 'Unbegrenzt' : plan.maxNiches} Nischen
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-emerald-500" />
                        {plan.maxProducts === -1 ? 'Unbegrenzt' : plan.maxProducts} Produkte
                      </li>
                      {plan.winnerScaling && (
                        <li className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-emerald-500" />
                          Winner Scaling
                        </li>
                      )}
                      {plan.advancedAnalytics && (
                        <li className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-emerald-500" />
                          Advanced Analytics
                        </li>
                      )}
                    </ul>
                    <button
                      disabled={checkoutMutation.isPending}
                      className={`w-full ${isPopular ? 'btn-primary' : 'btn-secondary'} py-2`}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Auswählen
                          <ArrowUpRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Past Due Warning */}
      {subscription?.status === 'past_due' && (
        <div className="card border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-400">Zahlung ausstehend</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Deine letzte Zahlung konnte nicht verarbeitet werden.
                Bitte aktualisiere deine Zahlungsmethode, um den Service weiter nutzen zu können.
              </p>
              <button
                onClick={handleManageSubscription}
                className="btn-primary mt-3"
              >
                Zahlungsmethode aktualisieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Subscription CTA */}
      {!tier && (
        <div className="card bg-gradient-to-r from-primary/10 via-transparent to-transparent border-primary/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Starte jetzt mit POD AutoM</h3>
              <p className="text-sm text-zinc-400">
                Wähle einen Plan und automatisiere dein Print-on-Demand Business.
              </p>
            </div>
            <button
              onClick={() => handleUpgrade('premium')}
              className="btn-primary"
            >
              <Sparkles className="w-5 h-5" />
              Plan wählen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### 7. src/components/settings/NotificationSettings.tsx

```typescript
import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { useAuth } from '@src/contexts/AuthContext'
import { useToast } from '@src/hooks/useToast'
import { useUnsavedChanges } from '@src/hooks/useUnsavedChanges'
import {
  Bell,
  Mail,
  Smartphone,
  Loader2,
  Save,
  RotateCcw
} from 'lucide-react'

interface NotificationSetting {
  id: string
  label: string
  description: string
  email: boolean
  push: boolean
}

const defaultNotifications: NotificationSetting[] = [
  {
    id: 'new_products',
    label: 'Neue Produkte',
    description: 'Benachrichtigung wenn neue Produkte erstellt wurden',
    email: true,
    push: true
  },
  {
    id: 'winners',
    label: 'Winner erkannt',
    description: 'Wenn ein Produkt als Winner identifiziert wird',
    email: true,
    push: true
  },
  {
    id: 'errors',
    label: 'Fehler & Probleme',
    description: 'Bei Problemen mit der Produkt-Erstellung oder Sync',
    email: true,
    push: false
  },
  {
    id: 'weekly_report',
    label: 'Wöchentlicher Report',
    description: 'Zusammenfassung der Woche per E-Mail',
    email: true,
    push: false
  },
  {
    id: 'marketing',
    label: 'Produkt-Updates',
    description: 'Neue Features und Verbesserungen',
    email: false,
    push: false
  }
]

export default function NotificationSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { markAsUnsaved, markAsSaved } = useUnsavedChanges()

  const [settings, setSettings] = useState<NotificationSetting[]>(defaultNotifications)
  const [initialSettings, setInitialSettings] = useState<NotificationSetting[] | null>(null)

  // Fetch notification preferences from DB
  const { data: savedPrefs, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase
        .from('pod_autom_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()
      return data
    },
    enabled: !!user
  })

  // Initialize from saved data
  useEffect(() => {
    if (savedPrefs?.preferences) {
      const merged = defaultNotifications.map(def => ({
        ...def,
        email: savedPrefs.preferences[def.id]?.email ?? def.email,
        push: savedPrefs.preferences[def.id]?.push ?? def.push
      }))
      setSettings(merged)
      setInitialSettings(merged)
    } else {
      setInitialSettings(defaultNotifications)
    }
  }, [savedPrefs])

  // Track changes
  useEffect(() => {
    if (initialSettings) {
      const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings)
      if (hasChanges) {
        markAsUnsaved()
      } else {
        markAsSaved()
      }
    }
  }, [settings, initialSettings, markAsUnsaved, markAsSaved])

  const toggleSetting = (id: string, type: 'email' | 'push') => {
    setSettings(prev => prev.map(s =>
      s.id === id ? { ...s, [type]: !s[type] } : s
    ))
  }

  const handleReset = () => {
    if (initialSettings) {
      setSettings(initialSettings)
    }
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const preferences = settings.reduce((acc, s) => ({
        ...acc,
        [s.id]: { email: s.email, push: s.push }
      }), {})

      const { error } = await supabase
        .from('pod_autom_notification_preferences')
        .upsert({
          user_id: user.id,
          preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      setInitialSettings(settings)
      markAsSaved()
      toast({
        title: 'Einstellungen gespeichert',
        description: 'Benachrichtigungseinstellungen wurden aktualisiert.',
        variant: 'success'
      })
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Einstellungen konnten nicht gespeichert werden.',
        variant: 'error'
      })
    }
  })

  const hasChanges = initialSettings && JSON.stringify(settings) !== JSON.stringify(initialSettings)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 w-48 bg-surface-highlight rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-surface-highlight rounded animate-pulse" />
        </div>
        <div className="card">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="py-4 border-b border-zinc-800 last:border-0">
              <div className="h-5 w-32 bg-surface-highlight rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-surface-highlight rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">Benachrichtigungen</h2>
          <p className="text-sm text-zinc-400">
            Wähle, wie und worüber du benachrichtigt werden möchtest.
          </p>
        </div>

        {hasChanges && (
          <button
            onClick={handleReset}
            className="btn-ghost text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Zurücksetzen
          </button>
        )}
      </div>

      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-end gap-8 mb-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-sm text-zinc-400 w-20 justify-center">
            <Mail className="w-4 h-4" />
            E-Mail
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400 w-20 justify-center">
            <Smartphone className="w-4 h-4" />
            Push
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-4">
          {settings.map(setting => (
            <div
              key={setting.id}
              className="flex items-center justify-between py-2"
            >
              <div className="flex-1 pr-4">
                <p className="font-medium">{setting.label}</p>
                <p className="text-sm text-zinc-400">{setting.description}</p>
              </div>
              <div className="flex items-center gap-8">
                <div className="w-20 flex justify-center">
                  <button
                    onClick={() => toggleSetting(setting.id, 'email')}
                    role="switch"
                    aria-checked={setting.email}
                    aria-label={`${setting.label} per E-Mail`}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      setting.email ? 'bg-primary' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                        setting.email ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="w-20 flex justify-center">
                  <button
                    onClick={() => toggleSetting(setting.id, 'push')}
                    role="switch"
                    aria-checked={setting.push}
                    aria-label={`${setting.label} als Push`}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      setting.push ? 'bg-primary' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                        setting.push ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {hasChanges ? '⚠️ Ungespeicherte Änderungen' : '✓ Alle Änderungen gespeichert'}
          </p>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hasChanges}
            className="btn-primary"
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
      </div>

      {/* Push Notification Info */}
      <div className="card bg-surface-highlight/50 border-zinc-700">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-zinc-400 mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Push-Benachrichtigungen</h4>
            <p className="text-sm text-zinc-400">
              Push-Benachrichtigungen werden über den Browser gesendet.
              Stelle sicher, dass du Benachrichtigungen für diese Website erlaubt hast.
            </p>
            <button
              onClick={() => {
                if ('Notification' in window) {
                  Notification.requestPermission()
                }
              }}
              className="btn-secondary text-sm mt-3"
            >
              Browser-Berechtigung prüfen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### 8. src/components/settings/SecuritySettings.tsx (NEU)

```typescript
import { useState } from 'react'
import { useAuth } from '@src/contexts/AuthContext'
import { supabase } from '@src/lib/supabase'
import { useToast } from '@src/hooks/useToast'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Shield,
  Monitor,
  Smartphone,
  Globe,
  Clock,
  LogOut,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
  FileJson,
  CheckCircle
} from 'lucide-react'

interface Session {
  id: string
  user_agent: string
  ip: string
  created_at: string
  last_active: string
  current: boolean
}

export default function SecuritySettings() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [exportingData, setExportingData] = useState(false)

  // Mock sessions (in production, fetch from Supabase auth sessions)
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['auth-sessions', user?.id],
    queryFn: async (): Promise<Session[]> => {
      // In production: fetch actual sessions from Supabase
      // For now, return mock data with current session
      return [
        {
          id: 'current',
          user_agent: navigator.userAgent,
          ip: '—',
          created_at: user?.last_sign_in_at || new Date().toISOString(),
          last_active: new Date().toISOString(),
          current: true
        }
      ]
    },
    enabled: !!user
  })

  // Logout from all devices
  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: 'Überall abgemeldet',
        description: 'Du wurdest auf allen Geräten abgemeldet.',
        variant: 'success'
      })
    }
  })

  // Export user data (GDPR)
  const handleExportData = async () => {
    setExportingData(true)
    try {
      // Collect all user data
      const [
        { data: shops },
        { data: settings },
        { data: niches },
        { data: notifications }
      ] = await Promise.all([
        supabase.from('pod_autom_shops').select('*').eq('user_id', user?.id),
        supabase.from('pod_autom_settings').select('*'),
        supabase.from('pod_autom_niches').select('*'),
        supabase.from('pod_autom_notification_preferences').select('*').eq('user_id', user?.id)
      ])

      const exportData = {
        exported_at: new Date().toISOString(),
        user: {
          id: user?.id,
          email: user?.email,
          created_at: user?.created_at,
          last_sign_in_at: user?.last_sign_in_at
        },
        shops,
        settings,
        niches,
        notifications
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pod-autom-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Daten exportiert',
        description: 'Deine Daten wurden als JSON-Datei heruntergeladen.',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Export fehlgeschlagen',
        description: 'Daten konnten nicht exportiert werden.',
        variant: 'error'
      })
    } finally {
      setExportingData(false)
    }
  }

  // Delete account
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // In production: call backend endpoint that:
      // 1. Deletes all user data
      // 2. Cancels Stripe subscription
      // 3. Deletes Supabase auth user

      // For now, just sign out and show message
      throw new Error('Account-Löschung muss über den Support angefordert werden.')
    },
    onError: (error) => {
      toast({
        title: 'Hinweis',
        description: error.message,
        variant: 'info'
      })
    }
  })

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'LÖSCHEN') return
    deleteAccountMutation.mutate()
  }

  // Parse user agent for display
  const parseUserAgent = (ua: string): { device: string; browser: string } => {
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua)
    const browser = ua.includes('Chrome') ? 'Chrome' :
                   ua.includes('Firefox') ? 'Firefox' :
                   ua.includes('Safari') ? 'Safari' :
                   ua.includes('Edge') ? 'Edge' : 'Browser'
    return {
      device: isMobile ? 'Mobil' : 'Desktop',
      browser
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Sicherheit & Datenschutz</h2>
        <p className="text-sm text-zinc-400">
          Verwalte aktive Sitzungen und deine Daten.
        </p>
      </div>

      {/* Active Sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Aktive Sitzungen</h3>
          <button
            onClick={() => logoutAllMutation.mutate()}
            disabled={logoutAllMutation.isPending}
            className="btn-ghost text-sm text-red-400 hover:bg-red-500/10"
          >
            {logoutAllMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Überall abmelden
              </>
            )}
          </button>
        </div>

        {sessionsLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="p-4 bg-surface-highlight rounded-lg animate-pulse">
                <div className="h-5 w-48 bg-zinc-700 rounded mb-2" />
                <div className="h-4 w-32 bg-zinc-700 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sessions?.map(session => {
              const { device, browser } = parseUserAgent(session.user_agent)
              return (
                <div
                  key={session.id}
                  className={`p-4 bg-surface-highlight rounded-lg ${
                    session.current ? 'border border-primary/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {device === 'Mobil' ? (
                        <Smartphone className="w-5 h-5 text-zinc-400" />
                      ) : (
                        <Monitor className="w-5 h-5 text-zinc-400" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{device} • {browser}</p>
                          {session.current && (
                            <span className="badge badge-primary text-xs">Diese Sitzung</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {session.ip}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Aktiv: {new Date(session.last_active).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!session.current && (
                      <button className="btn-ghost text-sm text-red-400">
                        Abmelden
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Data Export (GDPR) */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium mb-1">Daten exportieren</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Lade eine Kopie aller deiner Daten herunter (DSGVO-Anforderung).
              Der Export enthält deine Shops, Einstellungen, Nischen und Benachrichtigungspräferenzen.
            </p>
            <button
              onClick={handleExportData}
              disabled={exportingData}
              className="btn-secondary"
            >
              {exportingData ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exportieren...
                </>
              ) : (
                <>
                  <FileJson className="w-5 h-5" />
                  Daten als JSON exportieren
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div className="card border-red-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-red-400 mb-1">Account löschen</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Das Löschen deines Accounts ist permanent und kann nicht rückgängig gemacht werden.
              Alle deine Daten, Shops und Einstellungen werden unwiderruflich gelöscht.
              Aktive Abonnements werden automatisch gekündigt.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
              >
                <Trash2 className="w-5 h-5" />
                Account löschen
              </button>
            ) : (
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Bist du sicher?</span>
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                  Tippe <code className="px-1 py-0.5 bg-zinc-800 rounded text-red-400">LÖSCHEN</code> ein, um zu bestätigen.
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="LÖSCHEN"
                  className="input mb-3"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    className="btn-secondary flex-1"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'LÖSCHEN' || deleteAccountMutation.isPending}
                    className="btn bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    {deleteAccountMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Endgültig löschen'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Tips */}
      <div className="card bg-surface-highlight/50 border-zinc-700">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          Sicherheitstipps
        </h3>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
            Verwende ein starkes, einzigartiges Passwort
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
            Aktiviere die Zwei-Faktor-Authentifizierung
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
            Prüfe regelmäßig deine aktiven Sitzungen
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
            Melde dich ab, wenn du öffentliche Geräte verwendest
          </li>
        </ul>
      </div>
    </div>
  )
}
```

---

## Datenbank-Erweiterungen

### pod_autom_notification_preferences

```sql
CREATE TABLE pod_autom_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_notification_prefs_user ON pod_autom_notification_preferences(user_id);

-- RLS
ALTER TABLE pod_autom_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notification preferences"
  ON pod_autom_notification_preferences
  FOR ALL
  USING (auth.uid() = user_id);
```

### pod_autom_settings Erweiterungen

```sql
ALTER TABLE pod_autom_settings
ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS collection_assignment VARCHAR(20) DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### pod_autom_shops Erweiterungen

```sql
ALTER TABLE pod_autom_shops
ADD COLUMN IF NOT EXISTS products_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_niches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
```

---

## Verifizierung

- [ ] Settings Page lädt korrekt
- [ ] Tab-Navigation funktioniert (inkl. URL Hash)
- [ ] Unsaved Changes Warning erscheint
- [ ] Shop Settings zeigt verbundene Shops mit Stats
- [ ] Printful API Key kann gespeichert werden
- [ ] Production Settings speichert alle Felder
- [ ] Account Settings: Avatar Upload funktioniert
- [ ] Account Settings: Passwort-Änderung mit echtem Supabase
- [ ] Account Settings: Passwort-Stärke-Indikator
- [ ] Subscription Settings: Stripe Portal Integration
- [ ] Subscription Settings: Checkout Callback verarbeitet
- [ ] Notification Settings: Speichert in DB
- [ ] Security Settings: Sessions anzeigen
- [ ] Security Settings: Datenexport (GDPR)
- [ ] Security Settings: Account-Löschung Bestätigung
- [ ] Responsive Design (Mobile Tabs)
- [ ] Keyboard Navigation (Tab-Index, ARIA)
- [ ] Toast Notifications bei Aktionen

---

## Abhängigkeiten

- Phase 2.1-2.3 (Auth, OAuth, Onboarding)
- Phase 3.1 (Dashboard Layout) für Sidebar/Header
- Phase 6.1 (Stripe Integration) für useStripe Hooks
- framer-motion für Animationen
- Zustand für Unsaved Changes State

---

## Nächster Schritt
→ Phase 3.1 - Dashboard Layout (Sidebar + Header)
