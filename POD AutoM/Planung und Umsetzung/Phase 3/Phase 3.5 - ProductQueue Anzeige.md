# Phase 3.5 - ProductQueue Anzeige

## Ziel
Dashboard-Komponente zur Anzeige und Verwaltung der generierten Produkte mit Filterung, Suche und Pagination.

## Kritische Hinweise

### ⚠️ Keine Mock-Daten
Niemals statische Arrays als Datenquelle verwenden. Immer echte Datenbank-Queries!

### ⚠️ Tailwind CSS Dynamic Classes
`bg-${color}-500` funktioniert **NICHT**! Vollständige Klassennamen verwenden.

### ⚠️ Korrekte Shopify Admin URL
Die Shopify Admin URL braucht die Shop-Domain:
- ❌ `https://admin.shopify.com/products/123`
- ✅ `https://admin.shopify.com/store/${shopDomain}/products/123`

---

## Komponenten

### 1. src/hooks/useProducts.ts (NEU)

Dedizierter Hook für Produkt-Daten mit Pagination.

```typescript
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import { toast } from '@src/components/ui/Toast'

export type ProductStatus = 'draft' | 'start_phase' | 'post_phase' | 'winner' | 'loser' | 'archived'

export interface Product {
  id: string
  shopify_product_id: string | null
  product_title: string
  niche_name: string | null
  image_url: string | null
  price: number
  current_phase: ProductStatus
  total_sales: number
  total_revenue: number
  created_at: string
  shop_domain: string
}

export interface ProductFilters {
  search: string
  status: ProductStatus | 'all'
  niche: string | 'all'
}

export interface PaginationState {
  page: number
  pageSize: number
}

interface UseProductsOptions {
  shopId: string | null
  filters: ProductFilters
  pagination: PaginationState
  enabled?: boolean
}

export interface ProductsResponse {
  products: Product[]
  total: number
  totalPages: number
}

export function useProducts({
  shopId,
  filters,
  pagination,
  enabled = true
}: UseProductsOptions) {
  return useQuery({
    queryKey: ['pod-autom-products', shopId, filters, pagination],
    queryFn: async (): Promise<ProductsResponse> => {
      if (!shopId) return { products: [], total: 0, totalPages: 0 }

      // Basis-Query
      let query = supabase
        .from('product_analytics')
        .select(`
          id,
          shopify_product_id,
          product_title,
          niche_name,
          image_url,
          price,
          current_phase,
          total_sales,
          total_revenue,
          created_at,
          shops!inner(shop_domain)
        `, { count: 'exact' })
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })

      // Filter: Status
      if (filters.status !== 'all') {
        query = query.eq('current_phase', filters.status)
      }

      // Filter: Nische
      if (filters.niche !== 'all') {
        query = query.eq('niche_name', filters.niche)
      }

      // Filter: Suche
      if (filters.search) {
        query = query.or(`product_title.ilike.%${filters.search}%,niche_name.ilike.%${filters.search}%`)
      }

      // Pagination
      const from = pagination.page * pagination.pageSize
      const to = from + pagination.pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Transformiere Daten
      const products: Product[] = (data || []).map(item => ({
        id: item.id,
        shopify_product_id: item.shopify_product_id,
        product_title: item.product_title,
        niche_name: item.niche_name,
        image_url: item.image_url,
        price: item.price || 0,
        current_phase: item.current_phase as ProductStatus,
        total_sales: item.total_sales || 0,
        total_revenue: item.total_revenue || 0,
        created_at: item.created_at,
        shop_domain: (item.shops as { shop_domain: string })?.shop_domain || ''
      }))

      return {
        products,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pagination.pageSize)
      }
    },
    enabled: enabled && !!shopId,
    placeholderData: keepPreviousData, // Verhindert Flackern beim Seitenwechsel
    staleTime: 1000 * 60 * 2
  })
}

export function useProductStats(shopId: string | null) {
  return useQuery({
    queryKey: ['pod-autom-product-stats', shopId],
    queryFn: async () => {
      if (!shopId) return null

      const { data, error } = await supabase
        .from('product_analytics')
        .select('current_phase')
        .eq('shop_id', shopId)

      if (error) throw error

      const stats = {
        total: data?.length || 0,
        winners: data?.filter(p => p.current_phase === 'winner').length || 0,
        active: data?.filter(p => ['start_phase', 'post_phase'].includes(p.current_phase)).length || 0,
        drafts: data?.filter(p => p.current_phase === 'draft').length || 0,
        losers: data?.filter(p => p.current_phase === 'loser').length || 0
      }

      return stats
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 2
  })
}

export function useProductNiches(shopId: string | null) {
  return useQuery({
    queryKey: ['pod-autom-product-niches', shopId],
    queryFn: async () => {
      if (!shopId) return []

      const { data, error } = await supabase
        .from('product_analytics')
        .select('niche_name')
        .eq('shop_id', shopId)
        .not('niche_name', 'is', null)

      if (error) throw error

      // Unique niches
      return [...new Set(data?.map(p => p.niche_name).filter(Boolean) as string[])]
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5
  })
}

export function useArchiveProduct(shopId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('product_analytics')
        .update({ current_phase: 'archived' })
        .eq('id', productId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pod-autom-products', shopId] })
      queryClient.invalidateQueries({ queryKey: ['pod-autom-product-stats', shopId] })
      toast.success('Produkt archiviert')
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`)
    }
  })
}
```

### 2. src/components/ui/Pagination.tsx (NEU)

Wiederverwendbare Pagination-Komponente.

```typescript
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 20
}: PaginationProps) {
  if (totalPages <= 1) return null

  const canGoPrevious = currentPage > 0
  const canGoNext = currentPage < totalPages - 1

  // Berechne sichtbare Seitenzahlen
  const getVisiblePages = () => {
    const delta = 2
    const range: number[] = []
    const rangeWithDots: (number | 'dots')[] = []

    for (
      let i = Math.max(0, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    // Füge erste Seite hinzu
    if (range[0] > 0) {
      rangeWithDots.push(0)
      if (range[0] > 1) {
        rangeWithDots.push('dots')
      }
    }

    rangeWithDots.push(...range)

    // Füge letzte Seite hinzu
    if (range[range.length - 1] < totalPages - 1) {
      if (range[range.length - 1] < totalPages - 2) {
        rangeWithDots.push('dots')
      }
      rangeWithDots.push(totalPages - 1)
    }

    return rangeWithDots
  }

  const visiblePages = getVisiblePages()

  // Berechne Anzeige-Range
  const fromItem = currentPage * pageSize + 1
  const toItem = Math.min((currentPage + 1) * pageSize, totalItems || 0)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Info */}
      {totalItems !== undefined && (
        <p className="text-sm text-zinc-400">
          Zeige {fromItem}–{toItem} von {totalItems} Produkten
        </p>
      )}

      {/* Controls */}
      <nav
        className="flex items-center gap-1"
        role="navigation"
        aria-label="Pagination"
      >
        {/* First Page */}
        <button
          onClick={() => onPageChange(0)}
          disabled={!canGoPrevious}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-highlight
                     transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Erste Seite"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-highlight
                     transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Vorherige Seite"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) =>
            page === 'dots' ? (
              <span key={`dots-${index}`} className="px-2 text-zinc-500">
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? 'page' : undefined}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition
                           focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  currentPage === page
                    ? 'bg-primary text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-surface-highlight'
                }`}
              >
                {page + 1}
              </button>
            )
          )}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-highlight
                     transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Nächste Seite"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={!canGoNext}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-surface-highlight
                     transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Letzte Seite"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  )
}
```

### 3. src/components/dashboard/ProductQueue.tsx (KOMPLETT ÜBERARBEITET)

```typescript
import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useShops } from '@src/hooks/useShopify'
import { useAppStore } from '@src/lib/store'
import {
  useProducts,
  useProductStats,
  useProductNiches,
  useArchiveProduct,
  type ProductStatus,
  type ProductFilters,
  type PaginationState,
  type Product
} from '@src/hooks/useProducts'
import ConfirmDialog from '@src/components/ui/ConfirmDialog'
import Pagination from '@src/components/ui/Pagination'
import {
  Package,
  Search,
  Grid,
  List,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  Archive,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  DollarSign,
  ShoppingCart,
  RefreshCw,
  Rocket,
  X,
  Play
} from 'lucide-react'

type ViewMode = 'grid' | 'list'

// ⚠️ WICHTIG: Tailwind CSS unterstützt keine dynamischen Klassen!
const statusConfig: Record<ProductStatus, {
  label: string
  bgClass: string
  textClass: string
  icon: typeof TrendingUp
}> = {
  draft: {
    label: 'Entwurf',
    bgClass: 'bg-zinc-500/20',
    textClass: 'text-zinc-400',
    icon: Clock
  },
  start_phase: {
    label: 'Start-Phase',
    bgClass: 'bg-blue-500/20',
    textClass: 'text-blue-400',
    icon: Play
  },
  post_phase: {
    label: 'Post-Phase',
    bgClass: 'bg-violet-500/20',
    textClass: 'text-violet-400',
    icon: Package
  },
  winner: {
    label: 'Winner',
    bgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-400',
    icon: TrendingUp
  },
  loser: {
    label: 'Underperformer',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    icon: TrendingDown
  },
  archived: {
    label: 'Archiviert',
    bgClass: 'bg-zinc-500/20',
    textClass: 'text-zinc-400',
    icon: Archive
  }
}

const PAGE_SIZE = 20

export default function ProductQueue() {
  const { selectedShopId } = useAppStore()
  const { data: shops } = useShops()

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    status: 'all',
    niche: 'all'
  })
  const [pagination, setPagination] = useState<PaginationState>({
    page: 0,
    pageSize: PAGE_SIZE
  })
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)

  const selectedShop = shops?.find(s => s.id === selectedShopId) || shops?.[0]
  const shopId = selectedShop?.id || null

  // Data Hooks
  const { data: productData, isLoading, isFetching, refetch } = useProducts({
    shopId,
    filters,
    pagination
  })
  const { data: stats } = useProductStats(shopId)
  const { data: niches } = useProductNiches(shopId)
  const archiveMutation = useArchiveProduct(shopId)

  // Handlers
  const handleFilterChange = useCallback((key: keyof ProductFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 0 })) // Reset to first page
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const handleArchive = useCallback(() => {
    if (!archiveTarget) return
    archiveMutation.mutate(archiveTarget.id, {
      onSuccess: () => setArchiveTarget(null)
    })
  }, [archiveTarget, archiveMutation])

  const clearFilters = useCallback(() => {
    setFilters({ search: '', status: 'all', niche: 'all' })
    setPagination(prev => ({ ...prev, page: 0 }))
  }, [])

  // Shopify Admin URL generieren
  const getShopifyUrl = useCallback((product: Product) => {
    if (!product.shopify_product_id || !product.shop_domain) return null
    // Entferne .myshopify.com falls vorhanden für den Store-Namen
    const storeName = product.shop_domain.replace('.myshopify.com', '')
    return `https://admin.shopify.com/store/${storeName}/products/${product.shopify_product_id}`
  }, [])

  // Check ob Filter aktiv sind
  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.niche !== 'all'

  // Kein Shop verbunden
  if (!selectedShop) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Kein Shop verbunden</h2>
        <p className="text-zinc-400 mb-6 text-center max-w-md">
          Verbinde einen Shopify Store, um Produkte zu verwalten.
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
          <h1 className="text-2xl font-bold mb-1">Produkt-Queue</h1>
          <p className="text-zinc-400">
            {productData?.total || 0} Produkte in der Datenbank
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary"
          aria-label="Produkte aktualisieren"
        >
          <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={Package}
          value={stats?.total || 0}
          label="Gesamt"
          bgClass="bg-violet-500/10"
          textClass="text-violet-500"
        />
        <StatCard
          icon={TrendingUp}
          value={stats?.winners || 0}
          label="Winner"
          bgClass="bg-emerald-500/10"
          textClass="text-emerald-500"
        />
        <StatCard
          icon={Play}
          value={stats?.active || 0}
          label="Aktiv"
          bgClass="bg-blue-500/10"
          textClass="text-blue-500"
        />
        <StatCard
          icon={Clock}
          value={stats?.drafts || 0}
          label="Entwürfe"
          bgClass="bg-zinc-500/10"
          textClass="text-zinc-500"
        />
        <StatCard
          icon={TrendingDown}
          value={stats?.losers || 0}
          label="Underperformer"
          bgClass="bg-red-500/10"
          textClass="text-red-500"
        />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Produkte suchen..."
              aria-label="Produkte suchen"
              className="input pl-10 w-full"
            />
            {filters.search && (
              <button
                onClick={() => handleFilterChange('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                aria-label="Suche löschen"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm text-zinc-400 whitespace-nowrap">
              Status:
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input w-full lg:w-48"
            >
              <option value="all">Alle Status</option>
              <option value="draft">Entwürfe</option>
              <option value="start_phase">Start-Phase</option>
              <option value="post_phase">Post-Phase</option>
              <option value="winner">Winner</option>
              <option value="loser">Underperformer</option>
              <option value="archived">Archiviert</option>
            </select>
          </div>

          {/* Niche Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="niche-filter" className="text-sm text-zinc-400 whitespace-nowrap">
              Nische:
            </label>
            <select
              id="niche-filter"
              value={filters.niche}
              onChange={(e) => handleFilterChange('niche', e.target.value)}
              className="input w-full lg:w-48"
            >
              <option value="all">Alle Nischen</option>
              {niches?.map(niche => (
                <option key={niche} value={niche}>{niche}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-zinc-400 hover:text-white transition whitespace-nowrap"
            >
              Filter zurücksetzen
            </button>
          )}

          {/* View Toggle */}
          <div
            className="flex gap-1 p-1 bg-surface-highlight rounded-lg"
            role="group"
            aria-label="Ansicht wählen"
          >
            <button
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              className={`p-2 rounded-md transition ${
                viewMode === 'grid' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
              }`}
              aria-label="Rasteransicht"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`p-2 rounded-md transition ${
                viewMode === 'list' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
              }`}
              aria-label="Listenansicht"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Products */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !productData?.products.length ? (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="font-medium mb-2">Keine Produkte gefunden</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Versuche andere Filter oder setze die Filter zurück.'
              : 'Produkte werden automatisch erstellt, sobald Nischen konfiguriert und der Product Creation Job läuft.'}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-secondary mt-4">
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {productData.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              shopifyUrl={getShopifyUrl(product)}
              onArchive={() => setArchiveTarget(product)}
              onViewDetails={() => setDetailProduct(product)}
            />
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Produkt</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Nische</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-400">Status</th>
                <th className="text-right p-4 text-sm font-medium text-zinc-400">Preis</th>
                <th className="text-right p-4 text-sm font-medium text-zinc-400">Verkäufe</th>
                <th className="text-right p-4 text-sm font-medium text-zinc-400">Umsatz</th>
                <th className="text-right p-4 text-sm font-medium text-zinc-400">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {productData.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  shopifyUrl={getShopifyUrl(product)}
                  onArchive={() => setArchiveTarget(product)}
                  onViewDetails={() => setDetailProduct(product)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {productData && productData.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={productData.totalPages}
          totalItems={productData.total}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
        />
      )}

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Produkt archivieren?"
        description={`Möchtest du "${archiveTarget?.product_title}" archivieren? Archivierte Produkte werden nicht mehr in Kampagnen berücksichtigt.`}
        confirmText="Archivieren"
        cancelText="Abbrechen"
        variant="warning"
        isLoading={archiveMutation.isPending}
      />

      {/* Detail Modal (vereinfacht - kann später erweitert werden) */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          shopifyUrl={getShopifyUrl(detailProduct)}
          onClose={() => setDetailProduct(null)}
        />
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  icon: Icon,
  value,
  label,
  bgClass,
  textClass
}: {
  icon: typeof Package
  value: number
  label: string
  bgClass: string
  textClass: string
}) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgClass}`}>
        <Icon className={`w-5 h-5 ${textClass}`} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  )
}

// Product Card Component
function ProductCard({
  product,
  shopifyUrl,
  onArchive,
  onViewDetails
}: {
  product: Product
  shopifyUrl: string | null
  onArchive: () => void
  onViewDetails: () => void
}) {
  const config = statusConfig[product.current_phase]
  const StatusIcon = config.icon

  return (
    <div className="card group hover:border-primary/50 transition-colors">
      {/* Image */}
      <div className="relative aspect-square bg-surface-highlight rounded-lg mb-4 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.product_title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-zinc-600" />
          </div>
        )}
        <div className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1
                        rounded-full text-xs font-medium ${config.bgClass} ${config.textClass}`}>
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </div>
      </div>

      {/* Info */}
      <h3 className="font-medium mb-1 truncate" title={product.product_title}>
        {product.product_title}
      </h3>
      <p className="text-sm text-zinc-400 mb-3">{product.niche_name || 'Keine Nische'}</p>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{product.price.toFixed(2)}€</span>
        <div className="flex items-center gap-3 text-zinc-400">
          <span className="flex items-center gap-1" title="Verkäufe">
            <ShoppingCart className="w-4 h-4" />
            {product.total_sales}
          </span>
          <span className="flex items-center gap-1" title="Umsatz">
            <DollarSign className="w-4 h-4" />
            {product.total_revenue.toFixed(0)}€
          </span>
        </div>
      </div>

      {/* Actions - immer sichtbar für Accessibility */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
        <button
          onClick={onViewDetails}
          className="flex-1 btn-secondary py-1.5 text-sm"
          aria-label={`Details für ${product.product_title} anzeigen`}
        >
          <Eye className="w-4 h-4" />
          Details
        </button>
        {shopifyUrl && (
          <a
            href={shopifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-zinc-400 hover:text-white hover:bg-surface-highlight rounded-lg transition"
            aria-label="In Shopify öffnen"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        {product.current_phase !== 'archived' && (
          <button
            onClick={onArchive}
            className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition"
            aria-label={`${product.product_title} archivieren`}
          >
            <Archive className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Product Row Component
function ProductRow({
  product,
  shopifyUrl,
  onArchive,
  onViewDetails
}: {
  product: Product
  shopifyUrl: string | null
  onArchive: () => void
  onViewDetails: () => void
}) {
  const config = statusConfig[product.current_phase]
  const StatusIcon = config.icon

  return (
    <tr className="border-b border-zinc-800 hover:bg-surface-highlight/50 transition">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-surface-highlight rounded-lg overflow-hidden flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-zinc-600" />
              </div>
            )}
          </div>
          <span className="font-medium truncate max-w-[200px]" title={product.product_title}>
            {product.product_title}
          </span>
        </div>
      </td>
      <td className="p-4 text-zinc-400">{product.niche_name || '—'}</td>
      <td className="p-4">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
                        font-medium ${config.bgClass} ${config.textClass}`}>
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
      </td>
      <td className="p-4 text-right font-medium">{product.price.toFixed(2)}€</td>
      <td className="p-4 text-right text-zinc-400">{product.total_sales}</td>
      <td className="p-4 text-right text-zinc-400">{product.total_revenue.toFixed(2)}€</td>
      <td className="p-4">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onViewDetails}
            className="p-2 text-zinc-400 hover:text-white hover:bg-surface-highlight rounded-lg transition"
            aria-label="Details anzeigen"
          >
            <Eye className="w-4 h-4" />
          </button>
          {shopifyUrl && (
            <a
              href={shopifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-zinc-400 hover:text-white hover:bg-surface-highlight rounded-lg transition"
              aria-label="In Shopify öffnen"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {product.current_phase !== 'archived' && (
            <button
              onClick={onArchive}
              className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition"
              aria-label="Archivieren"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// Product Detail Modal (vereinfacht)
function ProductDetailModal({
  product,
  shopifyUrl,
  onClose
}: {
  product: Product
  shopifyUrl: string | null
  onClose: () => void
}) {
  const config = statusConfig[product.current_phase]
  const StatusIcon = config.icon

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                   w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border
                   border-zinc-700 rounded-xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-800">
          <div className="flex-1 min-w-0">
            <h2 id="product-detail-title" className="text-xl font-bold truncate">
              {product.product_title}
            </h2>
            <p className="text-zinc-400 mt-1">{product.niche_name || 'Keine Nische'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-surface-highlight transition"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="aspect-square bg-surface-highlight rounded-lg overflow-hidden">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.product_title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-zinc-600" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Status */}
            <div>
              <p className="text-sm text-zinc-400 mb-1">Status</p>
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                              text-sm font-medium ${config.bgClass} ${config.textClass}`}>
                <StatusIcon className="w-4 h-4" />
                {config.label}
              </span>
            </div>

            {/* Preis */}
            <div>
              <p className="text-sm text-zinc-400 mb-1">Preis</p>
              <p className="text-2xl font-bold">{product.price.toFixed(2)}€</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-surface-highlight rounded-lg">
                <p className="text-sm text-zinc-400 mb-1">Verkäufe</p>
                <p className="text-xl font-bold">{product.total_sales}</p>
              </div>
              <div className="p-4 bg-surface-highlight rounded-lg">
                <p className="text-sm text-zinc-400 mb-1">Umsatz</p>
                <p className="text-xl font-bold">{product.total_revenue.toFixed(2)}€</p>
              </div>
            </div>

            {/* Erstellt */}
            <div>
              <p className="text-sm text-zinc-400 mb-1">Erstellt am</p>
              <p>{new Date(product.created_at).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}</p>
            </div>

            {/* Actions */}
            {shopifyUrl && (
              <a
                href={shopifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full"
              >
                <ExternalLink className="w-5 h-5" />
                In Shopify öffnen
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
```

---

## Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/hooks/useProducts.ts` | Hooks für Produkt-Daten mit Pagination |
| `src/components/ui/Pagination.tsx` | Wiederverwendbare Pagination |

## Verifizierung

- [ ] **Keine Mock-Daten** - Echte Datenbank-Queries
- [ ] **Keine Tailwind dynamische Klassen** - `statusConfig` mit vollständigen Klassen
- [ ] **Korrekte Shopify URL** - Mit Shop-Domain
- [ ] **Pagination** - Mit `keepPreviousData` für flüssige UX
- [ ] **ARIA Labels** - Alle interaktiven Elemente
- [ ] **Buttons immer sichtbar** - Nicht nur bei Hover
- [ ] **Archive-Funktion** - Mit ConfirmDialog
- [ ] **Detail-Modal** - Zeigt alle Produkt-Infos
- [ ] **Filter funktionieren** - Status, Nische, Suche
- [ ] **Responsive Layout** - Grid/List-Toggle
- [ ] **Loading States** - Während Daten laden
- [ ] **Leerer Zustand** - Hilfreiche Meldung mit Filter-Reset

## Abhängigkeiten

- Phase 3.1 (Dashboard Layout mit Store)
- Phase 3.3 (ConfirmDialog, Toast)
- Phase 1.4 (Datenbank mit `product_analytics` Tabelle)
- `@tanstack/react-query` mit `keepPreviousData`

## Nächster Schritt
→ Phase 4.1 - Bestehende Cron-Jobs anpassen
