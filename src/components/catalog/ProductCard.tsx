import { memo } from 'react'
import { Package } from 'lucide-react'

export interface CatalogProduct {
  id: string
  product_type: string
  product_code: string
  display_name: string
  description: string
  image_url: string | null
  sizes: string[]
  colors: Array<{ name: string; hex: string; available: boolean }>
  materials: string | null
  base_price: number
  shipping_prices: Record<string, number>
  production_time_days: number
  category: string
  is_featured: boolean
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

interface ProductCardProps {
  product: CatalogProduct
  onClick: () => void
}

export const ProductCard = memo(function ProductCard({ product, onClick }: ProductCardProps) {
  const availableColors = product.colors.filter(c => c.available)

  return (
    <div
      onClick={onClick}
      className="group bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden cursor-pointer
                 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-square bg-zinc-800 relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.display_name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-zinc-600" />
          </div>
        )}

        {/* Featured Badge */}
        {product.is_featured && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-violet-500 text-white text-xs font-medium rounded">
            Beliebt
          </div>
        )}

        {/* Stock Status */}
        {product.stock_status === 'low_stock' && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-amber-500/90 text-white text-xs font-medium rounded">
            Wenig auf Lager
          </div>
        )}
        {product.stock_status === 'out_of_stock' && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-red-500/90 text-white text-xs font-medium rounded">
            Ausverkauft
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
          {product.category}
        </p>

        {/* Title */}
        <h3 className="text-white font-medium mb-2 group-hover:text-violet-400 transition-colors">
          {product.display_name}
        </h3>

        {/* Colors */}
        {availableColors.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {availableColors.slice(0, 5).map((color, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-zinc-700"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
            {availableColors.length > 5 && (
              <span className="text-xs text-zinc-500 ml-1">
                +{availableColors.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Sizes */}
        {product.sizes.length > 0 && (
          <p className="text-xs text-zinc-500 mb-3">
            Groessen: {product.sizes.join(', ')}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-white">
            ab {product.base_price.toFixed(2).replace('.', ',')} EUR
          </span>
          <span className="text-xs text-zinc-500">
            zzgl. Versand
          </span>
        </div>
      </div>
    </div>
  )
})
