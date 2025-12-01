import React, { useEffect, useState } from 'react'
// Components from /components/ (outside src)
import { Sidebar } from '@components/Sidebar'
import { WelcomeView } from '@components/WelcomeView'
import { ShopDashboard } from '@components/ShopDashboard'
// Components from /src/components/
import { AddShopDialog } from '../components/AddShopDialog'
import { useShops } from '../hooks/useShops'
import { useAppStore } from '../lib/store'
import { Loader2 } from 'lucide-react'
import { Shop } from '../lib/database.types'

export function Dashboard() {
  const { data: shops, isLoading, error } = useShops()
  const {
    activeShopId,
    setActiveShopId,
    activeTabId,
    setActiveTabId,
    isAddShopDialogOpen,
    setAddShopDialogOpen
  } = useAppStore()

  // State for editing a shop
  const [editingShop, setEditingShop] = useState<Shop | null>(null)

  // Find active shop
  const activeShop = activeShopId
    ? shops?.find(s => s.id === activeShopId)
    : null

  // Auto-select first shop if none selected and shops exist
  useEffect(() => {
    if (!activeShopId && shops && shops.length > 0) {
      setActiveShopId(shops[0].id)
    }
  }, [shops, activeShopId, setActiveShopId])

  // Convert Supabase shop to component format
  const formattedShops = shops?.map(shop => ({
    id: shop.id,
    name: shop.internal_name,
    domain: shop.shop_domain,
    status: shop.connection_status as 'connected' | 'disconnected' | 'syncing' | 'error',
    lastSync: shop.last_sync_at
      ? new Date(shop.last_sync_at).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Nie',
    stats: {
      processed: 0, // TODO: Get from analytics
      pending: 0,
      actions: 0
    }
  })) || []

  const formattedActiveShop = activeShop ? {
    id: activeShop.id,
    name: activeShop.internal_name,
    domain: activeShop.shop_domain,
    status: activeShop.connection_status as 'connected' | 'disconnected' | 'syncing' | 'error',
    lastSync: activeShop.last_sync_at
      ? new Date(activeShop.last_sync_at).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Nie',
    stats: {
      processed: 0,
      pending: 0,
      actions: 0
    }
  } : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-zinc-400">Shops werden geladen...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <p className="text-red-400 mb-4">Fehler beim Laden der Shops</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen bg-black text-zinc-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        shops={formattedShops}
        activeShopId={activeShopId}
        activeTabId={activeTabId}
        onSelectShop={setActiveShopId}
        onSelectTab={setActiveTabId}
        onAddShop={() => setAddShopDialogOpen(true)}
        onEditShop={(shopId) => {
          const shopToEdit = shops?.find(s => s.id === shopId)
          if (shopToEdit) {
            setEditingShop(shopToEdit)
          }
        }}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 relative">
        {formattedActiveShop ? (
          <ShopDashboard
            key={formattedActiveShop.id}
            shop={formattedActiveShop}
            activeTab={activeTabId}
          />
        ) : (
          <WelcomeView />
        )}
      </main>

      {/* Add Shop Dialog */}
      <AddShopDialog
        isOpen={isAddShopDialogOpen}
        onClose={() => setAddShopDialogOpen(false)}
        onSuccess={(shopId) => {
          setActiveShopId(shopId)
          setAddShopDialogOpen(false)
        }}
      />

      {/* Edit Shop Dialog */}
      <AddShopDialog
        isOpen={!!editingShop}
        onClose={() => setEditingShop(null)}
        onSuccess={() => {
          setEditingShop(null)
        }}
        editShop={editingShop}
      />
    </div>
  )
}
