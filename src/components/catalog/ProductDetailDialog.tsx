import { X, Package, Clock, Info } from 'lucide-react'
import { useState } from 'react'
import { CatalogProduct } from './ProductCard'
import { CountrySelector, SUPPORTED_COUNTRIES } from './CountrySelector'

interface ProductDetailDialogProps {
  product: CatalogProduct
  isOpen: boolean
  onClose: () => void
}

export function ProductDetailDialog({ product, isOpen, onClose }: ProductDetailDialogProps) {
  const [selectedCountry, setSelectedCountry] = useState('DE')

  if (!isOpen) return null

  const availableColors = product.colors.filter(c => c.available)
  const shippingPrice = product.shipping_prices[selectedCountry] ?? product.shipping_prices['EU'] ?? 0
  const totalPrice = product.base_price + shippingPrice
  const countryName = SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-top safe-bottom">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overscroll-contain bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2.5 text-zinc-400 hover:text-white
                     hover:bg-zinc-800 active:bg-zinc-700 rounded-xl transition-colors z-10 touch-manipulation"
          aria-label="Dialog schliessen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="w-full md:w-1/2 aspect-square bg-zinc-800 flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.display_name}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-24 h-24 text-zinc-600" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="w-full md:w-1/2 p-4 sm:p-6">
            {/* Category */}
            <p className="text-xs text-violet-400 uppercase tracking-wider mb-1">
              {product.category}
            </p>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 pr-8">
              {product.display_name}
            </h2>

            {/* Description */}
            {product.description && (
              <p className="text-zinc-400 text-sm mb-6">
                {product.description}
              </p>
            )}

            {/* Sizes */}
            {product.sizes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-2">Verfuegbare Groessen</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {product.sizes.map((size) => (
                    <span
                      key={size}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {availableColors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-2">Verfuegbare Farben</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {availableColors.map((color) => (
                    <div
                      key={color.name}
                      className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-zinc-600"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-sm text-white">{color.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Materials */}
            {product.materials && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-2">Material</h3>
                <p className="text-sm text-zinc-400">{product.materials}</p>
              </div>
            )}

            {/* Production Time */}
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
              <Clock className="w-4 h-4" />
              <span>Produktionszeit: {product.production_time_days} Werktage</span>
            </div>

            {/* Country Selector */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Lieferland</h3>
              <CountrySelector
                value={selectedCountry}
                onChange={setSelectedCountry}
              />
            </div>

            {/* Price Breakdown */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Produktpreis</span>
                  <span className="text-white">{product.base_price.toFixed(2).replace('.', ',')} EUR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Versand ({countryName})</span>
                  <span className="text-white">{shippingPrice.toFixed(2).replace('.', ',')} EUR</span>
                </div>
              </div>
              <div className="border-t border-zinc-700 pt-3">
                <div className="flex justify-between">
                  <span className="font-medium text-white">Gesamt</span>
                  <span className="text-xl font-bold text-violet-400">
                    {totalPrice.toFixed(2).replace('.', ',')} EUR
                  </span>
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="flex items-start gap-2 mt-4 p-3 bg-zinc-800/30 rounded-lg">
              <Info className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-500">
                Dies ist eine Preisliste fuer unsere Fulfillment-Partner.
                Bestellungen werden automatisch ueber dein POD AutoM Dashboard abgewickelt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
