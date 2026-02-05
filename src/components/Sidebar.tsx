import React from 'react'
import { Store, Plus, Settings, LogOut, LayoutGrid } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface Shop {
  id: string
  name: string
  domain: string
  status: 'connected' | 'disconnected' | 'syncing' | 'error'
  lastSync: string
  stats: {
    processed: number
    pending: number
    actions: number
  }
}

interface SidebarProps {
  shops: Shop[]
  activeShopId: string | null
  activeTabId: string
  onSelectShop: (shopId: string) => void
  onSelectTab: (tabId: string) => void
  onAddShop: () => void
}

export function Sidebar({
  shops,
  activeShopId,
  activeTabId,
  onSelectShop,
  onSelectTab,
  onAddShop
}: SidebarProps) {
  const { signOut } = useAuth()

  const statusColors = {
    connected: 'bg-emerald-500',
    disconnected: 'bg-zinc-500',
    syncing: 'bg-amber-500',
    error: 'bg-red-500'
  }

  return (
    <aside className="w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-bold text-white">ReBoss</h1>
            <p className="text-xs text-zinc-500">NextGen Dashboard</p>
          </div>
        </div>
      </div>

      {/* Shops List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Shops</span>
          <button
            onClick={onAddShop}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
            title="Shop hinzufügen"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          {shops.length === 0 ? (
            <div className="text-center py-8">
              <Store className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Keine Shops</p>
              <button
                onClick={onAddShop}
                className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Ersten Shop hinzufügen
              </button>
            </div>
          ) : (
            shops.map(shop => (
              <button
                key={shop.id}
                onClick={() => onSelectShop(shop.id)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  activeShopId === shop.id
                    ? 'bg-zinc-800 border border-zinc-700'
                    : 'hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center">
                    <Store className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{shop.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{shop.domain}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${statusColors[shop.status]}`} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-zinc-800 space-y-1">
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeTabId === 'settings'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          Einstellungen
        </button>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800/50 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Abmelden
        </button>
      </div>
    </aside>
  )
}
