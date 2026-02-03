# Phase 4.4 - Fulfillment-Katalog Seite (Digitale Broschüre)

## Ziel
Erstellen einer öffentlichen, barrierefreien Katalog-Seite für das Fulfillment-Produktsortiment mit modernem Design und optimaler User Experience.

## Kritische Anforderungen
- **Accessibility (WCAG 2.1 AA)**: ARIA-Labels, Keyboard-Navigation, Fokus-Management
- **SEO**: Meta-Tags für öffentliche Seite
- **Performance**: Lazy Loading, optimierte Bilder
- **UX**: Body-Scroll-Lock bei Dialog, Escape zum Schließen

---

## 1. Zentralisierte Typen

### src/types/catalog.types.ts
```typescript
/**
 * Zentrale Typ-Definitionen für den Fulfillment-Katalog.
 * Werden in allen Catalog-Komponenten verwendet.
 */

export interface ProductColor {
  name: string
  hex: string
}

export interface CatalogProduct {
  id: string
  product_type: string
  image_url: string | null
  sizes: string[]
  colors: ProductColor[]
  base_price: number
  shipping_prices: Record<string, number>
  description: string | null
  sort_order: number
}

export interface CountryInfo {
  code: string
  name: string
  flag: string
}

// Vollständige EU-Länderliste + wichtige Märkte
export const COUNTRY_DATA: Record<string, CountryInfo> = {
  // DACH-Region (priorisiert)
  DE: { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
  AT: { code: 'AT', name: 'Österreich', flag: '🇦🇹' },
  CH: { code: 'CH', name: 'Schweiz', flag: '🇨🇭' },

  // Westeuropa
  NL: { code: 'NL', name: 'Niederlande', flag: '🇳🇱' },
  BE: { code: 'BE', name: 'Belgien', flag: '🇧🇪' },
  LU: { code: 'LU', name: 'Luxemburg', flag: '🇱🇺' },
  FR: { code: 'FR', name: 'Frankreich', flag: '🇫🇷' },

  // Südeuropa
  IT: { code: 'IT', name: 'Italien', flag: '🇮🇹' },
  ES: { code: 'ES', name: 'Spanien', flag: '🇪🇸' },
  PT: { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  GR: { code: 'GR', name: 'Griechenland', flag: '🇬🇷' },

  // Nordeuropa
  DK: { code: 'DK', name: 'Dänemark', flag: '🇩🇰' },
  SE: { code: 'SE', name: 'Schweden', flag: '🇸🇪' },
  FI: { code: 'FI', name: 'Finnland', flag: '🇫🇮' },
  NO: { code: 'NO', name: 'Norwegen', flag: '🇳🇴' },

  // Osteuropa
  PL: { code: 'PL', name: 'Polen', flag: '🇵🇱' },
  CZ: { code: 'CZ', name: 'Tschechien', flag: '🇨🇿' },
  SK: { code: 'SK', name: 'Slowakei', flag: '🇸🇰' },
  HU: { code: 'HU', name: 'Ungarn', flag: '🇭🇺' },
  RO: { code: 'RO', name: 'Rumänien', flag: '🇷🇴' },
  BG: { code: 'BG', name: 'Bulgarien', flag: '🇧🇬' },
  HR: { code: 'HR', name: 'Kroatien', flag: '🇭🇷' },
  SI: { code: 'SI', name: 'Slowenien', flag: '🇸🇮' },

  // Baltikum
  EE: { code: 'EE', name: 'Estland', flag: '🇪🇪' },
  LV: { code: 'LV', name: 'Lettland', flag: '🇱🇻' },
  LT: { code: 'LT', name: 'Litauen', flag: '🇱🇹' },

  // Weitere EU
  IE: { code: 'IE', name: 'Irland', flag: '🇮🇪' },
  MT: { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  CY: { code: 'CY', name: 'Zypern', flag: '🇨🇾' },

  // International
  UK: { code: 'UK', name: 'Großbritannien', flag: '🇬🇧' },
  US: { code: 'US', name: 'USA', flag: '🇺🇸' },
  CA: { code: 'CA', name: 'Kanada', flag: '🇨🇦' },
  AU: { code: 'AU', name: 'Australien', flag: '🇦🇺' },

  // Fallback
  EU: { code: 'EU', name: 'EU (andere)', flag: '🇪🇺' },
  WORLD: { code: 'WORLD', name: 'Weltweit', flag: '🌍' }
}

// Sortierte Länder-Priorität (DACH zuerst)
export const COUNTRY_PRIORITY = ['DE', 'AT', 'CH']
```

---

## 2. Custom Hooks

### src/hooks/useBodyScrollLock.ts
```typescript
import { useEffect } from 'react'

/**
 * Blockiert Body-Scroll wenn ein Modal/Dialog geöffnet ist.
 * Verhindert unerwünschtes Scrollen im Hintergrund.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return

    // Aktuelle Scroll-Position speichern
    const scrollY = window.scrollY
    const body = document.body

    // Body fixieren
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.overflow = 'hidden'

    return () => {
      // Body wiederherstellen
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.overflow = ''

      // Scroll-Position wiederherstellen
      window.scrollTo(0, scrollY)
    }
  }, [isLocked])
}
```

### src/hooks/useFocusTrap.ts
```typescript
import { useEffect, useRef, type RefObject } from 'react'

/**
 * Fängt den Fokus innerhalb eines Containers (z.B. Dialog).
 * Wichtig für Accessibility bei Modals.
 */
export function useFocusTrap<T extends HTMLElement>(
  isActive: boolean
): RefObject<T | null> {
  const containerRef = useRef<T>(null)
  const previousActiveElement = useRef<Element | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    // Vorheriges Element speichern
    previousActiveElement.current = document.activeElement

    // Fokussierbare Elemente finden
    const focusableSelector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Erstes Element fokussieren
    firstElement?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        // Shift+Tab: Wenn am Anfang, zum Ende springen
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab: Wenn am Ende, zum Anfang springen
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      // Fokus wiederherstellen
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive])

  return containerRef
}
```

---

## 3. Haupt-Seite

### src/pages/Catalog.tsx
```typescript
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Zap, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'

import { API_URL } from '@src/lib/constants'
import type { CatalogProduct } from '@src/types/catalog.types'
import CatalogGrid from '@src/components/catalog/CatalogGrid'
import ProductDetailDialog from '@src/components/catalog/ProductDetailDialog'

export default function Catalog() {
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null)

  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ['catalog'],
    queryFn: async (): Promise<CatalogProduct[]> => {
      const response = await fetch(`${API_URL}/pod-autom/catalog`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      return data.data || data
    },
    staleTime: 1000 * 60 * 10, // 10 Minuten Cache
    retry: 2
  })

  const handleProductClick = useCallback((product: CatalogProduct) => {
    setSelectedProduct(product)
  }, [])

  const handleCloseDialog = useCallback(() => {
    setSelectedProduct(null)
  }, [])

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>Produktkatalog | POD AutoM - Print-on-Demand Fulfillment</title>
        <meta
          name="description"
          content="Übersicht aller verfügbaren Print-on-Demand Produkte: T-Shirts, Hoodies, Poster und mehr. Qualitativ hochwertige Artikel mit schneller Lieferung in ganz Europa."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pod-autom.com/katalog" />

        {/* Open Graph */}
        <meta property="og:title" content="Produktkatalog | POD AutoM" />
        <meta property="og:description" content="Print-on-Demand Produkte für dein Business. Über 50 Produkte mit europaweitem Versand." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pod-autom.com/katalog" />

        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'POD AutoM Produktkatalog',
            description: 'Print-on-Demand Fulfillment Produkte',
            numberOfItems: products?.length || 0,
            itemListElement: products?.slice(0, 10).map((product, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: {
                '@type': 'Product',
                name: product.product_type,
                image: product.image_url,
                offers: {
                  '@type': 'Offer',
                  price: product.base_price,
                  priceCurrency: 'EUR'
                }
              }
            })) || []
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-lg border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <nav className="flex items-center justify-between" aria-label="Hauptnavigation">
              <Link
                to="/"
                className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
                aria-label="POD AutoM - Zur Startseite"
              >
                <Zap className="w-8 h-8 text-primary" aria-hidden="true" />
                <span className="text-xl font-bold">POD AutoM</span>
              </Link>

              <Link
                to="/"
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-3 py-2"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Zurück zur Startseite</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section
          className="bg-gradient-to-b from-primary/10 via-surface to-background py-16"
          aria-labelledby="catalog-heading"
        >
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1
              id="catalog-heading"
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Produktkatalog
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Übersicht aller verfügbaren Produkte unseres Fulfillment-Partners.
              Qualitativ hochwertige Artikel für dein Print-on-Demand Business.
            </p>
          </div>
        </section>

        {/* Catalog Content */}
        <main
          className="max-w-7xl mx-auto px-4 py-12"
          aria-label="Produktkatalog"
        >
          {isLoading ? (
            <div
              className="flex flex-col items-center justify-center py-20 gap-4"
              role="status"
              aria-label="Lade Produkte"
            >
              <Loader2 className="w-10 h-10 animate-spin text-primary" aria-hidden="true" />
              <p className="text-zinc-400">Produkte werden geladen...</p>
            </div>
          ) : error ? (
            <div
              className="text-center py-20"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" aria-hidden="true" />
              <p className="text-red-400 mb-2 font-medium">Fehler beim Laden des Katalogs</p>
              <p className="text-zinc-500 text-sm mb-6">
                {error instanceof Error ? error.message : 'Unbekannter Fehler'}
              </p>
              <button
                onClick={() => refetch()}
                className="btn-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Erneut versuchen
              </button>
            </div>
          ) : products && products.length > 0 ? (
            <>
              <p className="text-zinc-500 mb-6" aria-live="polite">
                {products.length} {products.length === 1 ? 'Produkt' : 'Produkte'} verfügbar
              </p>
              <CatalogGrid
                products={products}
                onProductClick={handleProductClick}
              />
            </>
          ) : (
            <div className="text-center py-20 text-zinc-400" role="status">
              <p>Keine Produkte verfügbar</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-surface border-t border-zinc-800 py-8" role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-zinc-500">
            <p className="mb-2">
              Dies ist eine Übersicht der verfügbaren Produkte.
              Bestellungen erfolgen automatisch über das POD AutoM System.
            </p>
            <p>
              © {new Date().getFullYear()} POD AutoM. Alle Rechte vorbehalten.
            </p>
          </div>
        </footer>

        {/* Product Detail Dialog */}
        {selectedProduct && (
          <ProductDetailDialog
            product={selectedProduct}
            onClose={handleCloseDialog}
          />
        )}
      </div>
    </>
  )
}
```

---

## 4. Katalog-Grid

### src/components/catalog/CatalogGrid.tsx
```typescript
import type { CatalogProduct } from '@src/types/catalog.types'
import ProductCard from './ProductCard'

interface CatalogGridProps {
  products: CatalogProduct[]
  onProductClick: (product: CatalogProduct) => void
}

export default function CatalogGrid({ products, onProductClick }: CatalogGridProps) {
  return (
    <ul
      className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 list-none p-0 m-0"
      role="list"
      aria-label="Produktliste"
    >
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            onClick={() => onProductClick(product)}
          />
        </li>
      ))}
    </ul>
  )
}
```

---

## 5. Produkt-Karte

### src/components/catalog/ProductCard.tsx
```typescript
import { useState } from 'react'
import { Package } from 'lucide-react'
import type { CatalogProduct } from '@src/types/catalog.types'

interface ProductCardProps {
  product: CatalogProduct
  onClick: () => void
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const formattedPrice = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(product.base_price)

  return (
    <button
      onClick={onClick}
      className="card text-left hover:border-primary/50 transition-all group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${product.product_type} - ${formattedPrice} - Details anzeigen`}
    >
      {/* Product Image */}
      <div className="aspect-square bg-surface-highlight rounded-lg mb-4 overflow-hidden relative">
        {/* Loading Skeleton */}
        {!imageLoaded && !imageError && product.image_url && (
          <div
            className="absolute inset-0 bg-surface-highlight animate-pulse"
            aria-hidden="true"
          />
        )}

        {product.image_url && !imageError ? (
          <img
            src={product.image_url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            aria-hidden="true"
          >
            <Package className="w-16 h-16 text-zinc-600" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <h3 className="font-semibold text-lg mb-2">{product.product_type}</h3>

      {/* Colors Preview */}
      {product.colors && product.colors.length > 0 && (
        <div className="flex items-center gap-1 mb-3" aria-label={`${product.colors.length} Farben verfügbar`}>
          {product.colors.slice(0, 5).map((color, i) => (
            <span
              key={i}
              className="w-5 h-5 rounded-full border border-zinc-600 inline-block"
              style={{ backgroundColor: color.hex }}
              title={color.name}
              aria-label={color.name}
            />
          ))}
          {product.colors.length > 5 && (
            <span className="text-xs text-zinc-500 ml-1" aria-hidden="true">
              +{product.colors.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Sizes */}
      <p className="text-sm text-zinc-400 mb-3">
        Größen: {product.sizes.join(', ')}
      </p>

      {/* Price */}
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-primary">
          {formattedPrice}
        </span>
        <span className="text-sm text-zinc-500">+ Versand</span>
      </div>
    </button>
  )
}
```

---

## 6. Produkt-Detail Dialog

### src/components/catalog/ProductDetailDialog.tsx
```typescript
import { useState, useEffect, useCallback } from 'react'
import { X, Package, Truck, Info } from 'lucide-react'
import type { CatalogProduct } from '@src/types/catalog.types'
import { useBodyScrollLock } from '@src/hooks/useBodyScrollLock'
import { useFocusTrap } from '@src/hooks/useFocusTrap'
import CountrySelector from './CountrySelector'

interface ProductDetailDialogProps {
  product: CatalogProduct
  onClose: () => void
}

export default function ProductDetailDialog({ product, onClose }: ProductDetailDialogProps) {
  const [selectedCountry, setSelectedCountry] = useState('DE')

  // Body-Scroll blockieren
  useBodyScrollLock(true)

  // Fokus im Dialog einfangen
  const dialogRef = useFocusTrap<HTMLDivElement>(true)

  // Escape-Taste zum Schließen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    // Nur schließen wenn direkt auf Backdrop geklickt
    if (event.target === event.currentTarget) {
      onClose()
    }
  }, [onClose])

  const shippingPrice = product.shipping_prices[selectedCountry]
    ?? product.shipping_prices['EU']
    ?? product.shipping_prices['WORLD']
    ?? 0
  const totalPrice = product.base_price + shippingPrice

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-dialog-title"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative bg-surface border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-dialog-enter"
        role="document"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-surface-highlight rounded-lg transition z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Dialog schließen"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image */}
            <div className="aspect-square bg-surface-highlight rounded-xl overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.product_type}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  aria-hidden="true"
                >
                  <Package className="w-24 h-24 text-zinc-600" />
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              <h2
                id="product-dialog-title"
                className="text-2xl font-bold mb-4"
              >
                {product.product_type}
              </h2>

              {/* Description */}
              {product.description && (
                <p className="text-zinc-400 mb-6">{product.description}</p>
              )}

              {/* Sizes */}
              <div className="mb-6">
                <span className="text-sm font-medium text-zinc-400 mb-2 block">
                  Verfügbare Größen
                </span>
                <div className="flex flex-wrap gap-2" role="list" aria-label="Größen">
                  {product.sizes.map((size) => (
                    <span
                      key={size}
                      className="px-3 py-1 bg-surface-highlight rounded-lg text-sm"
                      role="listitem"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>

              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-6">
                  <span className="text-sm font-medium text-zinc-400 mb-2 block">
                    Verfügbare Farben ({product.colors.length})
                  </span>
                  <div className="flex flex-wrap gap-2" role="list" aria-label="Farben">
                    {product.colors.map((color, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 bg-surface-highlight rounded-lg"
                        role="listitem"
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-zinc-600"
                          style={{ backgroundColor: color.hex }}
                          aria-hidden="true"
                        />
                        <span className="text-sm">{color.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Country Selector */}
              <div className="mb-6">
                <label
                  htmlFor="country-select"
                  className="text-sm font-medium text-zinc-400 mb-2 block"
                >
                  Lieferland
                </label>
                <CountrySelector
                  id="country-select"
                  value={selectedCountry}
                  onChange={setSelectedCountry}
                  availableCountries={Object.keys(product.shipping_prices)}
                />
              </div>

              {/* Price Breakdown */}
              <div
                className="bg-surface-highlight rounded-xl p-4"
                aria-label="Preisübersicht"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400">Produktpreis</span>
                  <span className="font-medium">{formatPrice(product.base_price)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Truck className="w-4 h-4" aria-hidden="true" />
                    Versand ({selectedCountry})
                  </span>
                  <span className="font-medium">{formatPrice(shippingPrice)}</span>
                </div>
                <div className="border-t border-zinc-700 my-3" aria-hidden="true" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Gesamt</span>
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Info Note */}
              <div
                className="flex items-start gap-2 mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg"
                role="note"
              >
                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-xs text-zinc-400">
                  Dies sind die Kosten pro Produkt für dein Business. Der Verkaufspreis in deinem Shop
                  wird automatisch mit deiner gewünschten Marge kalkuliert.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 7. Länder-Auswahl

### src/components/catalog/CountrySelector.tsx
```typescript
import { ChevronDown } from 'lucide-react'
import { COUNTRY_DATA, COUNTRY_PRIORITY, type CountryInfo } from '@src/types/catalog.types'

interface CountrySelectorProps {
  id: string
  value: string
  onChange: (country: string) => void
  availableCountries: string[]
}

export default function CountrySelector({
  id,
  value,
  onChange,
  availableCountries
}: CountrySelectorProps) {
  // Länder sortieren: Priorität zuerst, dann alphabetisch
  const sortedCountries = [...availableCountries].sort((a, b) => {
    const aPriority = COUNTRY_PRIORITY.indexOf(a)
    const bPriority = COUNTRY_PRIORITY.indexOf(b)

    // Beide haben Priorität
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority
    }
    // Nur a hat Priorität
    if (aPriority !== -1) return -1
    // Nur b hat Priorität
    if (bPriority !== -1) return 1

    // Alphabetisch nach deutschem Namen
    const aName = COUNTRY_DATA[a]?.name || a
    const bName = COUNTRY_DATA[b]?.name || b
    return aName.localeCompare(bName, 'de')
  })

  const getCountryLabel = (code: string): string => {
    const country = COUNTRY_DATA[code]
    if (country) {
      return `${country.flag} ${country.name}`
    }
    return code
  }

  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input appearance-none pr-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-describedby={`${id}-description`}
      >
        {sortedCountries.map((country) => (
          <option key={country} value={country}>
            {getCountryLabel(country)}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none"
        aria-hidden="true"
      />
      <span id={`${id}-description`} className="sr-only">
        Wähle das Lieferland für die Versandkostenberechnung
      </span>
    </div>
  )
}
```

---

## 8. CSS Animation (in index.css)

### Tailwind-Erweiterung
```css
/* In src/index.css - Animation für Dialog */
@keyframes dialog-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-dialog-enter {
  animation: dialog-enter 0.2s ease-out;
}

/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## 9. Backend API Route

### backend/api/routes/pod_autom.py (Ergänzung)
```python
@bp.route('/pod-autom/catalog', methods=['GET'])
def get_catalog():
    """
    Öffentlicher Endpoint für Fulfillment-Katalog.
    Keine Authentifizierung erforderlich.
    """
    try:
        result = supabase.table('pod_autom_catalog') \
            .select('*') \
            .eq('is_active', True) \
            .order('sort_order') \
            .execute()

        return jsonify({
            'data': result.data or [],
            'count': len(result.data or [])
        })

    except Exception as e:
        logger.error(f'Catalog fetch error: {e}')
        return jsonify({'error': 'Failed to fetch catalog'}), 500
```

---

## 10. Datenbank-Tabelle

### SQL Migration
```sql
-- Fulfillment-Katalog Tabelle
CREATE TABLE IF NOT EXISTS pod_autom_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type VARCHAR(100) NOT NULL,
  image_url TEXT,
  sizes TEXT[] NOT NULL DEFAULT '{}',
  colors JSONB NOT NULL DEFAULT '[]',
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
  shipping_prices JSONB NOT NULL DEFAULT '{"DE": 4.90, "EU": 6.90}',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für aktive Produkte und Sortierung
CREATE INDEX IF NOT EXISTS idx_catalog_active_sort
ON pod_autom_catalog (is_active, sort_order)
WHERE is_active = TRUE;

-- Trigger für updated_at
CREATE OR REPLACE TRIGGER update_catalog_timestamp
BEFORE UPDATE ON pod_autom_catalog
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- RLS Policy (öffentlich lesbar)
ALTER TABLE pod_autom_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog is publicly readable"
ON pod_autom_catalog FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

-- Beispiel-Daten einfügen
INSERT INTO pod_autom_catalog (product_type, image_url, sizes, colors, base_price, shipping_prices, description, sort_order)
VALUES
  (
    'T-Shirt Premium',
    'https://example.com/tshirt.jpg',
    ARRAY['S', 'M', 'L', 'XL', 'XXL'],
    '[{"name": "Schwarz", "hex": "#000000"}, {"name": "Weiß", "hex": "#FFFFFF"}, {"name": "Navy", "hex": "#1e3a5f"}, {"name": "Grau", "hex": "#6b7280"}]'::jsonb,
    12.50,
    '{"DE": 4.90, "AT": 5.90, "CH": 8.90, "EU": 6.90, "UK": 7.90, "US": 9.90}'::jsonb,
    'Premium-Baumwoll-T-Shirt mit softem Griff und langlebiger Qualität. 180g/m², 100% Baumwolle.',
    1
  ),
  (
    'Hoodie Classic',
    'https://example.com/hoodie.jpg',
    ARRAY['S', 'M', 'L', 'XL', 'XXL'],
    '[{"name": "Schwarz", "hex": "#000000"}, {"name": "Navy", "hex": "#1e3a5f"}, {"name": "Grau Meliert", "hex": "#9ca3af"}]'::jsonb,
    24.90,
    '{"DE": 5.90, "AT": 6.90, "CH": 9.90, "EU": 7.90, "UK": 8.90, "US": 11.90}'::jsonb,
    'Kuschelweicher Hoodie mit Kängurutasche und Kordelzug. 280g/m², 80% Baumwolle, 20% Polyester.',
    2
  ),
  (
    'Poster Matt',
    'https://example.com/poster.jpg',
    ARRAY['A4', 'A3', 'A2', 'A1'],
    '[]'::jsonb,
    8.90,
    '{"DE": 3.90, "AT": 4.90, "CH": 6.90, "EU": 5.90, "UK": 6.90, "US": 8.90}'::jsonb,
    'Premium-Posterdruck auf mattem 200g/m² Papier. Lebendige Farben, keine Reflexionen.',
    3
  );
```

---

## 11. Notwendige Dependencies

### package.json (Ergänzung)
```json
{
  "dependencies": {
    "react-helmet-async": "^2.0.5"
  }
}
```

### Provider in main.tsx
```typescript
import { HelmetProvider } from 'react-helmet-async'

// In render:
<HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</HelmetProvider>
```

---

## Verifizierung

### Funktional
- [ ] Katalog-Seite lädt unter /katalog
- [ ] Produkte werden aus API geladen
- [ ] Grid-Ansicht zeigt alle Produkte
- [ ] Klick öffnet Detail-Dialog
- [ ] Größen und Farben werden angezeigt
- [ ] Länderauswahl funktioniert (alle EU-Länder)
- [ ] Preisberechnung ist korrekt
- [ ] Dialog kann geschlossen werden (X-Button, Escape, Backdrop)
- [ ] Responsive auf Mobile (Grid passt sich an)
- [ ] Navigation zurück zur Startseite

### Accessibility (WCAG 2.1 AA)
- [ ] Alle interaktiven Elemente sind per Tastatur erreichbar
- [ ] Focus-Trap im Dialog funktioniert
- [ ] Escape schließt Dialog
- [ ] ARIA-Labels vorhanden
- [ ] Farbkontraste ausreichend
- [ ] Screen Reader kann Inhalte vorlesen

### Performance
- [ ] Bilder laden lazy
- [ ] Body-Scroll blockiert bei Dialog
- [ ] Keine Layout-Shifts (CLS < 0.1)
- [ ] Initial Load < 200KB (ohne Bilder)

### SEO
- [ ] Meta-Title und Description gesetzt
- [ ] Open Graph Tags vorhanden
- [ ] Structured Data (Schema.org) korrekt
- [ ] Canonical URL gesetzt

---

## Abhängigkeiten

| Phase | Beschreibung | Status |
|-------|--------------|--------|
| Phase 4.2 | API Route `/pod-autom/catalog` | Erforderlich |
| Phase 1.4 | Datenbank-Tabelle `pod_autom_catalog` | Erforderlich |
| Phase 6.5 | Performance-Optimierung | Optional |

---

## Nächster Schritt
→ Phase 5.1 - Pinterest Integration
