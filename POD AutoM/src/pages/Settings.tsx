import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  Store,
  Tag,
  Wand2,
  User,
  ChevronLeft,
  Loader2,
  Megaphone,
} from 'lucide-react'
import { useShops, useShopSettings } from '@src/hooks/useShopify'
import {
  ShopSettings,
  NicheManager,
  PromptEditor,
  AccountSettings,
  PinterestManager,
} from '@src/components/settings'
import { ShopifyConnectButton } from '@src/components/ShopifyConnectButton'

// =====================================================
// TYPES
// =====================================================

type SettingsTab = 'shop' | 'niches' | 'prompts' | 'pinterest' | 'account'

interface TabItem {
  id: SettingsTab
  label: string
  icon: React.ReactNode
  requiresShop: boolean
}

const TABS: TabItem[] = [
  { id: 'shop', label: 'Shop', icon: <Store className="w-5 h-5" />, requiresShop: true },
  { id: 'niches', label: 'Nischen', icon: <Tag className="w-5 h-5" />, requiresShop: true },
  { id: 'prompts', label: 'KI-Prompts', icon: <Wand2 className="w-5 h-5" />, requiresShop: true },
  { id: 'pinterest', label: 'Pinterest', icon: <Megaphone className="w-5 h-5" />, requiresShop: false },
  { id: 'account', label: 'Konto', icon: <User className="w-5 h-5" />, requiresShop: false },
]

// =====================================================
// SETTINGS PAGE
// =====================================================

export default function Settings() {
  const { shops, isLoading: shopsLoading } = useShops()
  const [activeTab, setActiveTab] = useState<SettingsTab>('shop')
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)

  // Auto-select first shop if none selected
  const currentShopId = selectedShopId || shops[0]?.id || null
  const { settings } = useShopSettings(currentShopId)

  const hasShop = shops.length > 0

  // Loading state
  if (shopsLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-violet-500/5" />

      <div className="relative max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-violet-400" />
                Einstellungen
              </h1>
              <p className="text-zinc-400 text-sm">
                Verwalte deinen Shop, Nischen und KI-Einstellungen
              </p>
            </div>
          </div>

          {/* Shop selector (if multiple shops) */}
          {shops.length > 1 && (
            <select
              value={currentShopId || ''}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="input w-64"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.internal_name || shop.shop_domain}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const isDisabled = tab.requiresShop && !hasShop
                return (
                  <button
                    key={tab.id}
                    onClick={() => !isDisabled && setActiveTab(tab.id)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-violet-500/20 text-violet-300'
                        : isDisabled
                        ? 'text-zinc-600 cursor-not-allowed'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Add shop button */}
            {hasShop && (
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <ShopifyConnectButton className="w-full text-sm" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
              {/* No shop state */}
              {!hasShop && activeTab !== 'account' ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Store className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Kein Shop verbunden
                  </h3>
                  <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                    Verbinde zuerst deinen Shopify Store, um die Automatisierung
                    einzurichten.
                  </p>
                  <ShopifyConnectButton />
                </div>
              ) : (
                <>
                  {/* Shop Settings */}
                  {activeTab === 'shop' && currentShopId && (
                    <ShopSettings shopId={currentShopId} />
                  )}

                  {/* Niche Manager */}
                  {activeTab === 'niches' && settings?.id && (
                    <NicheManager settingsId={settings.id} />
                  )}

                  {/* Prompt Editor */}
                  {activeTab === 'prompts' && settings?.id && (
                    <PromptEditor settingsId={settings.id} />
                  )}

                  {/* Pinterest Settings */}
                  {activeTab === 'pinterest' && <PinterestManager />}

                  {/* Account Settings */}
                  {activeTab === 'account' && <AccountSettings />}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
