import { useState } from 'react'
import {
  Package,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  RotateCcw,
  Trash2,
  Filter,
  Search,
  ChevronDown,
  ExternalLink,
  Image,
  Sparkles,
  FileText,
} from 'lucide-react'

// =====================================================
// TYPES
// =====================================================

export type ProductStatus = 'pending' | 'generating' | 'optimizing' | 'publishing' | 'published' | 'failed'

export interface QueuedProduct {
  id: string
  title: string
  niche: string
  imageUrl?: string | undefined
  status: ProductStatus
  progress: number
  currentStep?: string | undefined
  shopifyUrl?: string | undefined
  error?: string | undefined
  createdAt: string
  updatedAt: string
}

interface ProductQueueProps {
  products: QueuedProduct[]
  isLoading: boolean
  onRetry: (id: string) => void
  onDelete: (id: string) => void
  onView: (id: string) => void
}

// =====================================================
// STATUS CONFIG
// =====================================================

const STATUS_CONFIG: Record<ProductStatus, {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}> = {
  pending: {
    label: 'Wartend',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/20',
  },
  generating: {
    label: 'Bild wird erstellt',
    icon: <Image className="w-4 h-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  optimizing: {
    label: 'Wird optimiert',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
  },
  publishing: {
    label: 'Wird veröffentlicht',
    icon: <FileText className="w-4 h-4" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  published: {
    label: 'Veröffentlicht',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  failed: {
    label: 'Fehlgeschlagen',
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
}

const FILTER_OPTIONS: { value: ProductStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'pending', label: 'Wartend' },
  { value: 'generating', label: 'Wird erstellt' },
  { value: 'optimizing', label: 'Wird optimiert' },
  { value: 'publishing', label: 'Wird veröffentlicht' },
  { value: 'published', label: 'Veröffentlicht' },
  { value: 'failed', label: 'Fehlgeschlagen' },
]

// =====================================================
// PRODUCT CARD COMPONENT
// =====================================================

interface ProductCardProps {
  product: QueuedProduct
  onRetry: () => void
  onDelete: () => void
  onView: () => void
}

function ProductCard({ product, onRetry, onDelete, onView }: ProductCardProps) {
  const config = STATUS_CONFIG[product.status]
  const isProcessing = ['generating', 'optimizing', 'publishing'].includes(product.status)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden hover:border-zinc-600 transition-colors">
      {/* Image */}
      <div className="aspect-square bg-zinc-900 relative">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-zinc-700" />
          </div>
        )}

        {/* Status Badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded-lg flex items-center gap-1.5 text-xs font-medium ${config.bgColor} ${config.color}`}
        >
          {isProcessing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            config.icon
          )}
          {config.label}
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${product.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-white truncate" title={product.title}>
          {product.title || 'Neues Produkt'}
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          {product.niche} · {formatDate(product.updatedAt)}
        </p>

        {/* Current Step */}
        {product.currentStep && isProcessing && (
          <p className="text-xs text-violet-400 mt-2 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {product.currentStep}
          </p>
        )}

        {/* Error Message */}
        {product.status === 'failed' && product.error && (
          <p className="text-xs text-red-400 mt-2 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{product.error}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-700">
          {product.status === 'published' && product.shopifyUrl && (
            <a
              href={product.shopifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 btn-secondary text-xs justify-center"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Shopify
            </a>
          )}
          {product.status === 'published' && (
            <button onClick={onView} className="flex-1 btn-secondary text-xs justify-center">
              <Eye className="w-3 h-3 mr-1" />
              Details
            </button>
          )}
          {product.status === 'failed' && (
            <>
              <button onClick={onRetry} className="flex-1 btn-secondary text-xs justify-center">
                <RotateCcw className="w-3 h-3 mr-1" />
                Erneut
              </button>
              <button
                onClick={onDelete}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
          {product.status === 'pending' && (
            <button
              onClick={onDelete}
              className="flex-1 btn-secondary text-xs justify-center text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Entfernen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// STATS BAR COMPONENT
// =====================================================

interface StatsBarProps {
  products: QueuedProduct[]
}

function StatsBar({ products }: StatsBarProps) {
  const stats = {
    total: products.length,
    pending: products.filter((p) => p.status === 'pending').length,
    processing: products.filter((p) =>
      ['generating', 'optimizing', 'publishing'].includes(p.status)
    ).length,
    published: products.filter((p) => p.status === 'published').length,
    failed: products.filter((p) => p.status === 'failed').length,
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-white">{stats.total}</p>
        <p className="text-xs text-zinc-500">Gesamt</p>
      </div>
      <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-zinc-400">{stats.pending}</p>
        <p className="text-xs text-zinc-500">Wartend</p>
      </div>
      <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-violet-400">{stats.processing}</p>
        <p className="text-xs text-zinc-500">In Arbeit</p>
      </div>
      <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-emerald-400">{stats.published}</p>
        <p className="text-xs text-zinc-500">Veröffentlicht</p>
      </div>
      <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
        <p className="text-xs text-zinc-500">Fehlgeschlagen</p>
      </div>
    </div>
  )
}

// =====================================================
// PRODUCT QUEUE COMPONENT
// =====================================================

export function ProductQueue({
  products,
  isLoading,
  onRetry,
  onDelete,
  onView,
}: ProductQueueProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.niche.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort: processing first, then pending, then published, then failed
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const statusOrder: Record<ProductStatus, number> = {
      generating: 0,
      optimizing: 1,
      publishing: 2,
      pending: 3,
      published: 4,
      failed: 5,
    }
    return statusOrder[a.status] - statusOrder[b.status]
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-violet-400" />
            Produkt-Pipeline
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Übersicht aller Produkte in der Erstellungs-Queue
          </p>
        </div>
      </div>

      {/* Stats */}
      <StatsBar products={products} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
            placeholder="Produkte suchen..."
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="btn-secondary w-full sm:w-auto justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}
            </div>
            <ChevronDown className="w-4 h-4 ml-2" />
          </button>

          {showFilterDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowFilterDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value)
                      setShowFilterDropdown(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      statusFilter === option.value
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Product Grid */}
      {sortedProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onRetry={() => onRetry(product.id)}
              onDelete={() => onDelete(product.id)}
              onView={() => onView(product.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchTerm || statusFilter !== 'all'
              ? 'Keine Produkte gefunden'
              : 'Keine Produkte in der Queue'}
          </h3>
          <p className="text-zinc-400">
            {searchTerm || statusFilter !== 'all'
              ? 'Versuche andere Filteroptionen.'
              : 'Produkte werden automatisch erstellt basierend auf deinen Nischen.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default ProductQueue
