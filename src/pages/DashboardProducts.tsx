import { useState } from 'react'
import { DashboardLayout } from '@src/components/layout'
import { ProductQueue } from '@src/components/dashboard/ProductQueue'
import { useShops } from '@src/hooks/useShopify'
import { useProductQueue } from '@src/hooks/useProductQueue'
import { Loader2 } from 'lucide-react'

// =====================================================
// PRODUCT DETAIL MODAL
// =====================================================

interface ProductDetailModalProps {
  productId: string | null
  onClose: () => void
}

function ProductDetailModal({ productId, onClose }: ProductDetailModalProps) {
  if (!productId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          ✕
        </button>
        <h3 className="text-xl font-bold text-white mb-4">Produkt-Details</h3>
        <p className="text-zinc-400">
          Produkt-ID: {productId}
        </p>
        <p className="text-zinc-500 mt-4 text-sm">
          Detailansicht wird in Phase 4 implementiert.
        </p>
      </div>
    </div>
  )
}

// =====================================================
// DASHBOARD PRODUCTS PAGE
// =====================================================

export default function DashboardProducts() {
  const { shops, isLoading: shopsLoading } = useShops()
  const currentShopId = shops[0]?.id || null
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

  const {
    products,
    isLoading: productsLoading,
    retryProduct,
    deleteProduct,
  } = useProductQueue(currentShopId)

  const isLoading = shopsLoading || productsLoading

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <ProductQueue
        products={products}
        isLoading={isLoading}
        onRetry={retryProduct}
        onDelete={deleteProduct}
        onView={(id) => setSelectedProductId(id)}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />
    </DashboardLayout>
  )
}
