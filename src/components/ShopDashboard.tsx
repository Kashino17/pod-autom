import React, { useState } from 'react'
import {
  Store,
  RefreshCw,
  Settings,
  Package,
  FolderOpen,
  TrendingUp,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useSyncShopifyCollections, useShop } from '../hooks/useShops'

const COLLECTIONS_PER_PAGE = 5

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

interface ShopDashboardProps {
  shop: Shop
  activeTab: string
}

export function ShopDashboard({ shop, activeTab }: ShopDashboardProps) {
  const { data: fullShop } = useShop(shop.id)
  const syncCollections = useSyncShopifyCollections()
  const [collectionsPage, setCollectionsPage] = useState(0)

  const handleSyncCollections = async () => {
    if (!fullShop) return

    try {
      await syncCollections.mutateAsync({
        shopId: shop.id,
        shopDomain: fullShop.shop_domain,
        accessToken: fullShop.access_token
      })
    } catch (error) {
      console.error('Failed to sync collections:', error)
    }
  }

  const statusConfig = {
    connected: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Verbunden' },
    disconnected: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', label: 'Getrennt' },
    syncing: { color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Synchronisiert...' },
    error: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Fehler' }
  }

  const status = statusConfig[shop.status]

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Store className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{shop.name}</h1>
              <p className="text-sm text-zinc-500">{shop.domain}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg}`}>
              <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`} />
              <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncCollections}
              disabled={syncCollections.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncCollections.isPending ? 'animate-spin' : ''}`} />
              Sync
            </button>
            <button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Package className="w-5 h-5" />}
            label="Produkte"
            value={fullShop?.shopify_collections?.reduce((acc: number, c: any) => acc + (c.product_count || 0), 0) || 0}
            color="blue"
          />
          <StatCard
            icon={<FolderOpen className="w-5 h-5" />}
            label="Kollektionen"
            value={fullShop?.shopify_collections?.length || 0}
            color="purple"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Verkäufe heute"
            value={0}
            color="emerald"
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Aktionen"
            value={shop.stats.actions}
            color="amber"
          />
        </div>

        {/* Collections */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Kollektionen</h2>
            <span className="text-xs text-zinc-500">
              {fullShop?.shopify_collections?.length || 0} gefunden
            </span>
          </div>

          {fullShop?.shopify_collections && fullShop.shopify_collections.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {fullShop.shopify_collections.map((collection: any) => (
                <div key={collection.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{collection.title}</p>
                      <p className="text-xs text-zinc-500">{collection.product_count || 0} Produkte</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    collection.is_selected
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {collection.is_selected ? 'Aktiv' : 'Inaktiv'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <FolderOpen className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 mb-4">Keine Kollektionen gefunden</p>
              <button
                onClick={handleSyncCollections}
                disabled={syncCollections.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {syncCollections.isPending ? 'Lädt...' : 'Kollektionen laden'}
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Letzte Aktivitäten</h2>
          </div>
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Noch keine Aktivitäten</p>
            <p className="text-xs text-zinc-600 mt-1">Aktivitäten werden hier angezeigt sobald Jobs laufen</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'blue' | 'purple' | 'emerald' | 'amber'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400'
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString('de-DE')}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  )
}
