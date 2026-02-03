import { Link } from 'react-router-dom'
import {
  Package,
  Eye,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'

// =====================================================
// TYPES
// =====================================================

export interface RecentProduct {
  id: string
  title: string
  imageUrl?: string
  status: 'active' | 'pending' | 'draft' | 'winner' | 'loser'
  impressions: number
  sales: number
  revenue: number
  trend: 'up' | 'down' | 'neutral'
  createdAt: string
}

interface RecentProductsProps {
  products: RecentProduct[]
  isLoading: boolean
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ status }: { status: RecentProduct['status'] }) {
  const config = {
    active: {
      label: 'Aktiv',
      icon: <CheckCircle className="w-3 h-3" />,
      className: 'bg-emerald-500/20 text-emerald-400',
    },
    pending: {
      label: 'Wartend',
      icon: <Clock className="w-3 h-3" />,
      className: 'bg-amber-500/20 text-amber-400',
    },
    draft: {
      label: 'Entwurf',
      icon: <Package className="w-3 h-3" />,
      className: 'bg-zinc-700 text-zinc-400',
    },
    winner: {
      label: 'Winner',
      icon: <TrendingUp className="w-3 h-3" />,
      className: 'bg-violet-500/20 text-violet-400',
    },
    loser: {
      label: 'Loser',
      icon: <TrendingDown className="w-3 h-3" />,
      className: 'bg-red-500/20 text-red-400',
    },
  }

  const { label, icon, className } = config[status]

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {icon}
      {label}
    </span>
  )
}

// =====================================================
// PRODUCT ROW
// =====================================================

function ProductRow({ product }: { product: RecentProduct }) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('de-DE').format(value)

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors">
      {/* Image */}
      <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
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
            <Package className="w-5 h-5 text-zinc-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{product.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <StatusBadge status={product.status} />
          <span className="text-xs text-zinc-500">
            {new Date(product.createdAt).toLocaleDateString('de-DE')}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6 text-right">
        <div>
          <p className="text-sm font-medium text-white flex items-center gap-1 justify-end">
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            {formatNumber(product.impressions)}
          </p>
          <p className="text-xs text-zinc-500">Impressionen</p>
        </div>
        <div>
          <p className="text-sm font-medium text-white flex items-center gap-1 justify-end">
            <ShoppingCart className="w-3.5 h-3.5 text-zinc-500" />
            {product.sales}
          </p>
          <p className="text-xs text-zinc-500">Verkäufe</p>
        </div>
        <div className="w-20">
          <p className="text-sm font-medium text-white">{formatCurrency(product.revenue)}</p>
          <p className="text-xs text-zinc-500">Umsatz</p>
        </div>
      </div>

      {/* Trend */}
      <div className="hidden md:block">
        {product.trend === 'up' && (
          <TrendingUp className="w-5 h-5 text-emerald-400" />
        )}
        {product.trend === 'down' && (
          <TrendingDown className="w-5 h-5 text-red-400" />
        )}
        {product.trend === 'neutral' && (
          <div className="w-5 h-1 bg-zinc-600 rounded" />
        )}
      </div>
    </div>
  )
}

// =====================================================
// RECENT PRODUCTS COMPONENT
// =====================================================

export function RecentProducts({ products, isLoading }: RecentProductsProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h3 className="text-lg font-semibold text-white">Neueste Produkte</h3>
        <Link
          to="/dashboard/products"
          className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
        >
          Alle anzeigen
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Content */}
      <div className="p-2">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-zinc-400">Noch keine Produkte erstellt</p>
            <p className="text-sm text-zinc-500 mt-1">
              Starte die Automatisierung, um Produkte zu generieren.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecentProducts
