import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  Store,
  User,
  ChevronLeft,
  Loader2,
  Megaphone,
  Link as LinkIcon,
} from 'lucide-react'
import { useShops } from '@src/hooks/useShopify'
import {
  ShopSettings,
  AccountSettings,
  PinterestManager,
} from '@src/components/settings'

// =====================================================
// TYPES
// =====================================================

type SettingsTab = 'shop' | 'pinterest' | 'account'

interface TabItem {
  id: SettingsTab
  label: string
  icon: React.ReactNode
}

const TABS: TabItem[] = [
  { id: 'shop', label: 'Shop', icon: <Store className="w-5 h-5" /> },
  { id: 'pinterest', label: 'Pinterest', icon: <Megaphone className="w-5 h-5" /> },
  { id: 'account', label: 'Konto', icon: <User className="w-5 h-5" /> },
]

// =====================================================
// SETTINGS PAGE - MOBILE RESPONSIVE
// =====================================================

export default function Settings() {
  const { shops, isLoading: shopsLoading } = useShops()
  const [activeTab, setActiveTab] = useState<SettingsTab>('shop')
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)

  // Auto-select first shop if none selected
  const currentShopId = selectedShopId || shops[0]?.id || null
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

      <div className="relative max-w-6xl mx-auto px-4 py-6 sm:py-8 safe-top safe-bottom">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/dashboard"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors touch-manipulation"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
                Einstellungen
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm hidden sm:block">
                Verwalte deinen Shop, Nischen und KI-Einstellungen
              </p>
            </div>
          </div>

          {/* Shop selector (if multiple shops) */}
          {shops.length > 1 && (
            <select
              value={currentShopId || ''}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="input w-40 sm:w-64 text-sm"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.internal_name || shop.shop_domain}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Mobile: Horizontal scrollable tabs */}
        <div className="mb-4 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors touch-manipulation ${
                  activeTab === tab.id
                    ? 'bg-violet-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white active:bg-zinc-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: Sidebar + Content | Mobile: Stacked */}
        <div className="flex gap-8">
          {/* Desktop Sidebar (hidden on mobile) */}
          <div className="w-64 flex-shrink-0 hidden lg:block">
            <nav className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 sm:p-6">
              {/* Shop Settings */}
              {activeTab === 'shop' && (
                hasShop && currentShopId ? (
                  <ShopSettings shopId={currentShopId} />
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Store className="w-7 h-7 sm:w-8 sm:h-8 text-zinc-500" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                      Kein Shop verbunden
                    </h3>
                    <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto px-4">
                      Verbinde deinen Shop, um die Automatisierung einzurichten.
                    </p>
                    <button
                      onClick={() => {
                        // Placeholder - wird später implementiert
                      }}
                      className="btn-primary"
                    >
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Shop verknüpfen
                    </button>
                  </div>
                )
              )}

              {/* Pinterest Settings */}
              {activeTab === 'pinterest' && <PinterestManager />}

              {/* Account Settings */}
              {activeTab === 'account' && <AccountSettings />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
