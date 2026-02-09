# Phase 6.5 - Performance Optimierung

## Ziel
Optimierung der App-Performance für schnelle Ladezeiten, reaktive UX und exzellente Core Web Vitals.

---

## 1. TypeScript Types

```typescript
// src/types/performance.types.ts

export interface WebVitalsMetric {
  name: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender'
}

export interface PerformanceThresholds {
  CLS: { good: number; poor: number }
  FCP: { good: number; poor: number }
  INP: { good: number; poor: number }
  LCP: { good: number; poor: number }
  TTFB: { good: number; poor: number }
}

export interface VirtualListItem {
  id: string
  height?: number
}

export interface CacheConfig {
  staleTime: number
  gcTime: number
  retry: number
}
```

---

## 2. Code Splitting & Lazy Loading

### Route-basiertes Code Splitting

```typescript
// src/App.tsx
import { lazy, Suspense, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@src/components/ErrorBoundary'
import LoadingSpinner from '@src/components/ui/LoadingSpinner'

// Lazy load mit Webpack Magic Comments für bessere Chunk-Namen
const Landing = lazy(() => import(/* webpackChunkName: "landing" */ '@src/pages/Landing'))
const Login = lazy(() => import(/* webpackChunkName: "auth" */ '@src/pages/Login'))
const Register = lazy(() => import(/* webpackChunkName: "auth" */ '@src/pages/Register'))
const ForgotPassword = lazy(() => import(/* webpackChunkName: "auth" */ '@src/pages/ForgotPassword'))
const Dashboard = lazy(() => import(/* webpackChunkName: "dashboard" */ '@src/pages/Dashboard'))
const Onboarding = lazy(() => import(/* webpackChunkName: "onboarding" */ '@src/pages/Onboarding'))
const Catalog = lazy(() => import(/* webpackChunkName: "catalog" */ '@src/pages/Catalog'))
const Settings = lazy(() => import(/* webpackChunkName: "settings" */ '@src/pages/Settings'))

// Preload-Funktion für erwartete Navigation
const preloadDashboard = () => import('@src/pages/Dashboard')
const preloadOnboarding = () => import('@src/pages/Onboarding')

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing onAuthHover={preloadDashboard} />} />
            <Route path="/login" element={<Login onSuccess={preloadDashboard} />} />
            <Route path="/register" element={<Register onSuccess={preloadOnboarding} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/katalog" element={<Catalog />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </BrowserRouter>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
```

### Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Error an Monitoring senden
    if (import.meta.env.PROD) {
      this.reportError(error, errorInfo)
    }

    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // Sentry oder eigenes Error-Tracking
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {})
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          className="min-h-screen bg-background flex items-center justify-center p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-surface rounded-xl p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-error" aria-hidden="true" />
            </div>

            <h1 className="text-xl font-bold text-text-primary mb-2">
              Etwas ist schiefgelaufen
            </h1>

            <p className="text-text-secondary mb-6">
              Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-surface-highlight p-4 rounded-lg mb-6 overflow-auto max-h-32 text-error">
                {this.state.error.message}
              </pre>
            )}

            <button
              onClick={this.handleRetry}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Erneut versuchen
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

## 3. React Query Optimierung

```typescript
// src/lib/queryClient.ts
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { toast } from 'sonner'

// Globale Error Handler
const queryCache = new QueryCache({
  onError: (error, query) => {
    // Nur bei bereits gecachten Daten Toast zeigen
    if (query.state.data !== undefined) {
      toast.error(`Fehler beim Aktualisieren: ${error.message}`)
    }
  }
})

const mutationCache = new MutationCache({
  onError: (error) => {
    toast.error(`Aktion fehlgeschlagen: ${error.message}`)
  }
})

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Daten bleiben 5 Minuten "frisch"
      staleTime: 1000 * 60 * 5,

      // Cache für 30 Minuten
      gcTime: 1000 * 60 * 30,

      // Retry mit exponential backoff
      retry: (failureCount, error) => {
        // Nicht bei 4xx Fehlern retrien
        if (error instanceof Error && 'status' in error) {
          const status = (error as any).status
          if (status >= 400 && status < 500) return false
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Window Focus nur in Production
      refetchOnWindowFocus: import.meta.env.PROD,

      // Bei Mount nur refetchen wenn stale
      refetchOnMount: 'always',

      // Nicht bei Reconnect
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 0,
      // Optimistic Updates global konfigurierbar
    },
  },
})


// Prefetching Hook
// src/hooks/usePrefetch.ts
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { supabase } from '@src/lib/supabase'

export function usePrefetch() {
  const queryClient = useQueryClient()

  const prefetchProducts = useCallback(async (shopId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['products', shopId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('pod_autom_products')
          .select('*')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        return data
      },
      staleTime: 1000 * 60 * 5
    })
  }, [queryClient])

  const prefetchNiches = useCallback(async (settingsId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['niches', settingsId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('pod_autom_niches')
          .select('*')
          .eq('settings_id', settingsId)

        if (error) throw error
        return data
      },
      staleTime: 1000 * 60 * 5
    })
  }, [queryClient])

  // Prefetch bei Hover über Navigation
  const prefetchOnHover = useCallback((route: string) => {
    switch (route) {
      case '/dashboard':
        // Dashboard-Daten prefetchen
        break
      case '/settings':
        // Settings prefetchen
        break
    }
  }, [])

  return { prefetchProducts, prefetchNiches, prefetchOnHover }
}
```

---

## 4. React 18 Concurrent Features

```typescript
// src/hooks/useTransitionSearch.ts
import { useState, useTransition, useDeferredValue, useMemo } from 'react'

interface UseTransitionSearchOptions<T> {
  items: T[]
  searchFn: (item: T, query: string) => boolean
}

export function useTransitionSearch<T>({ items, searchFn }: UseTransitionSearchOptions<T>) {
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Deferred Value für nicht-kritische Updates
  const deferredQuery = useDeferredValue(query)

  // Gefilterte Items mit deferred Query
  const filteredItems = useMemo(() => {
    if (!deferredQuery.trim()) return items
    return items.filter(item => searchFn(item, deferredQuery))
  }, [items, deferredQuery, searchFn])

  const handleSearch = (value: string) => {
    // Sofortiges Update für Input
    setQuery(value)

    // Low-priority Update für Liste
    startTransition(() => {
      // React kümmert sich automatisch um das Update
    })
  }

  return {
    query,
    setQuery: handleSearch,
    filteredItems,
    isPending,
    isStale: query !== deferredQuery
  }
}


// Verwendung in Komponente
// src/components/dashboard/ProductSearch.tsx
import { useTransitionSearch } from '@src/hooks/useTransitionSearch'

interface Product {
  id: string
  title: string
  niche: string
}

export function ProductSearch({ products }: { products: Product[] }) {
  const { query, setQuery, filteredItems, isPending, isStale } = useTransitionSearch({
    items: products,
    searchFn: (product, q) =>
      product.title.toLowerCase().includes(q.toLowerCase()) ||
      product.niche.toLowerCase().includes(q.toLowerCase())
  })

  return (
    <div>
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Produkte suchen..."
          className="input w-full"
          aria-label="Produkte suchen"
        />
        {isPending && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2"
            aria-label="Suche läuft"
          >
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className={`mt-4 transition-opacity ${isStale ? 'opacity-70' : 'opacity-100'}`}>
        {filteredItems.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
```

---

## 5. Debounced Input (Korrigiert)

```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect, useRef } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// Callback-basierte Version für Actions
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Immer aktuelle Callback-Referenz
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return ((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }) as T
}


// src/components/ui/DebouncedInput.tsx
import { useState, useEffect, useId, forwardRef } from 'react'
import { useDebounce } from '@src/hooks/useDebounce'

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  delay?: number
  label?: string
}

const DebouncedInput = forwardRef<HTMLInputElement, DebouncedInputProps>(
  ({ value: externalValue, onValueChange, delay = 300, label, id: propId, ...props }, ref) => {
    const generatedId = useId()
    const id = propId || generatedId

    const [internalValue, setInternalValue] = useState(externalValue)
    const debouncedValue = useDebounce(internalValue, delay)

    // Ref für vorherigen debounced Wert
    const prevDebouncedRef = useRef(debouncedValue)

    // Externe Änderungen übernehmen
    useEffect(() => {
      setInternalValue(externalValue)
    }, [externalValue])

    // Debounced Wert nach außen geben (nur bei Änderung)
    useEffect(() => {
      if (debouncedValue !== prevDebouncedRef.current) {
        prevDebouncedRef.current = debouncedValue
        onValueChange(debouncedValue)
      }
    }, [debouncedValue, onValueChange])

    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type="text"
          value={internalValue}
          onChange={(e) => setInternalValue(e.target.value)}
          className="input"
          {...props}
        />
      </div>
    )
  }
)

DebouncedInput.displayName = 'DebouncedInput'
export default DebouncedInput
```

---

## 6. Virtualisierte Listen (Dynamische Höhen)

```typescript
// src/components/ui/VirtualList.tsx
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'

interface VirtualListProps<T> {
  items: T[]
  estimatedItemHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  getItemKey: (item: T, index: number) => string | number
  overscan?: number
  className?: string
  role?: string
  'aria-label'?: string
}

interface ItemMeasurement {
  offset: number
  height: number
}

export default function VirtualList<T>({
  items,
  estimatedItemHeight,
  renderItem,
  getItemKey,
  overscan = 3,
  className = '',
  role = 'list',
  'aria-label': ariaLabel
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measurementCacheRef = useRef<Map<number, number>>(new Map())

  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // Container-Größe beobachten
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0
      setContainerHeight(height)
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Scroll Handler mit RAF für Performance
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    requestAnimationFrame(() => {
      setScrollTop(target.scrollTop)
    })
  }, [])

  // Item-Höhe messen
  const measureItem = useCallback((index: number, element: HTMLElement | null) => {
    if (!element) return

    const height = element.getBoundingClientRect().height
    if (height > 0 && measurementCacheRef.current.get(index) !== height) {
      measurementCacheRef.current.set(index, height)
    }
  }, [])

  // Berechnungen mit gemessenen oder geschätzten Höhen
  const { visibleItems, totalHeight, offsetY, startIndex, endIndex } = useMemo(() => {
    const measurements: ItemMeasurement[] = []
    let currentOffset = 0

    // Offset für jedes Item berechnen
    for (let i = 0; i < items.length; i++) {
      const height = measurementCacheRef.current.get(i) ?? estimatedItemHeight
      measurements.push({ offset: currentOffset, height })
      currentOffset += height
    }

    const totalHeight = currentOffset

    // Start-Index finden (Binary Search)
    let startIndex = 0
    let low = 0
    let high = items.length - 1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      if (measurements[mid].offset + measurements[mid].height < scrollTop) {
        low = mid + 1
      } else {
        high = mid - 1
        startIndex = mid
      }
    }

    startIndex = Math.max(0, startIndex - overscan)

    // End-Index finden
    let endIndex = startIndex
    const viewportEnd = scrollTop + containerHeight

    while (endIndex < items.length && measurements[endIndex].offset < viewportEnd) {
      endIndex++
    }

    endIndex = Math.min(items.length, endIndex + overscan)

    const visibleItems = items.slice(startIndex, endIndex)
    const offsetY = measurements[startIndex]?.offset ?? 0

    return { visibleItems, totalHeight, offsetY, startIndex, endIndex }
  }, [items, scrollTop, containerHeight, estimatedItemHeight, overscan])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      role={role}
      aria-label={ariaLabel}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, localIndex) => {
            const actualIndex = startIndex + localIndex
            return (
              <div
                key={getItemKey(item, actualIndex)}
                ref={(el) => measureItem(actualIndex, el)}
                role="listitem"
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

---

## 7. Image Optimierung

```typescript
// src/components/ui/OptimizedImage.tsx
import { useState, useEffect, useRef } from 'react'

interface OptimizedImageProps {
  src: string | null
  alt: string
  className?: string
  fallback?: React.ReactNode
  sizes?: string
  priority?: boolean
  aspectRatio?: string
  onLoad?: () => void
  onError?: () => void
}

export default function OptimizedImage({
  src,
  alt,
  className = '',
  fallback,
  sizes = '100vw',
  priority = false,
  aspectRatio,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!src) {
      setError(true)
      return
    }

    // Reset bei src-Änderung
    setLoaded(false)
    setError(false)

    // Bei priority sofort laden
    if (priority) {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)

      return () => {
        document.head.removeChild(link)
      }
    }
  }, [src, priority])

  // Intersection Observer für Lazy Loading
  useEffect(() => {
    if (!imgRef.current || priority) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imgRef.current) {
            imgRef.current.src = src!
            observer.disconnect()
          }
        })
      },
      { rootMargin: '50px' }
    )

    observer.observe(imgRef.current)
    return () => observer.disconnect()
  }, [src, priority])

  const handleLoad = () => {
    setLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setError(true)
    onError?.()
  }

  if (!src || error) {
    return fallback ? <>{fallback}</> : (
      <div
        className={`bg-surface-highlight flex items-center justify-center ${className}`}
        style={aspectRatio ? { aspectRatio } : undefined}
        role="img"
        aria-label={alt}
      >
        <span className="text-text-muted text-sm">Kein Bild</span>
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Blur Placeholder */}
      {!loaded && (
        <div
          className="absolute inset-0 bg-surface-highlight animate-pulse"
          aria-hidden="true"
        />
      )}

      <img
        ref={imgRef}
        src={priority ? src : undefined}
        data-src={!priority ? src : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}


// Responsive Image Srcset Generator
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 768, 1024, 1280]
): string {
  // Für Supabase Storage oder ähnliche Services
  return widths
    .map(w => `${baseUrl}?width=${w}&quality=80 ${w}w`)
    .join(', ')
}
```

---

## 8. Memoization Best Practices

```typescript
// src/components/dashboard/ProductCard.tsx
import { memo, useMemo, useCallback } from 'react'
import type { Product } from '@src/types/product.types'

interface ProductCardProps {
  product: Product
  onSelect: (product: Product) => void
  onDelete: (productId: string) => void
  isSelected?: boolean
}

// Stable Formatter (außerhalb der Komponente)
const priceFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR'
})

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

const ProductCard = memo(function ProductCard({
  product,
  onSelect,
  onDelete,
  isSelected = false
}: ProductCardProps) {
  // Memoized Berechnungen
  const formattedPrice = useMemo(
    () => priceFormatter.format(product.price),
    [product.price]
  )

  const formattedDate = useMemo(
    () => dateFormatter.format(new Date(product.created_at)),
    [product.created_at]
  )

  // Stable Event Handlers mit useCallback
  const handleSelect = useCallback(() => {
    onSelect(product)
  }, [onSelect, product])

  const handleDelete = useCallback(() => {
    onDelete(product.id)
  }, [onDelete, product.id])

  return (
    <article
      className={`card p-4 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={handleSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleSelect()
        }
      }}
      aria-selected={isSelected}
    >
      <OptimizedImage
        src={product.image_url}
        alt={product.title}
        className="w-full h-40 rounded-lg mb-3"
        aspectRatio="4/3"
      />

      <h3 className="font-semibold text-text-primary line-clamp-2">
        {product.title}
      </h3>

      <div className="flex justify-between items-center mt-2">
        <span className="text-primary font-bold">{formattedPrice}</span>
        <time
          dateTime={product.created_at}
          className="text-text-muted text-sm"
        >
          {formattedDate}
        </time>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          handleDelete()
        }}
        className="mt-3 btn-ghost-danger w-full"
        aria-label={`${product.title} löschen`}
      >
        Löschen
      </button>
    </article>
  )
}, (prevProps, nextProps) => {
  // Custom Comparison für bessere Performance
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.title === nextProps.product.title &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.image_url === nextProps.product.image_url &&
    prevProps.isSelected === nextProps.isSelected
  )
})

export default ProductCard


// Parent-Komponente mit stabilen Callbacks
export function ProductList({ products }: { products: Product[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Stable Callbacks
  const handleSelect = useCallback((product: Product) => {
    setSelectedId(product.id)
  }, [])

  const handleDelete = useCallback((productId: string) => {
    // Delete Logic
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={handleSelect}
          onDelete={handleDelete}
          isSelected={product.id === selectedId}
        />
      ))}
    </div>
  )
}
```

---

## 9. Bundle Analyse & Optimierung

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    react(),

    // Bundle Visualizer (nur bei Analyse)
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true
    }),

    // Gzip & Brotli Compression
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/]
    }),
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/]
    })
  ],

  build: {
    // Target moderne Browser
    target: 'esnext',

    // Sourcemaps für Production Debugging
    sourcemap: true,

    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor Splitting nach Package
          if (id.includes('node_modules')) {
            // React Core
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            // Router
            if (id.includes('react-router')) {
              return 'vendor-router'
            }
            // State Management
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query'
            }
            if (id.includes('zustand')) {
              return 'vendor-zustand'
            }
            // Charts (groß, lazy laden)
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts'
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            // Stripe
            if (id.includes('@stripe')) {
              return 'vendor-stripe'
            }
            // Icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
          }
        }
      }
    },

    // Chunk Size Warnung
    chunkSizeWarningLimit: 500,

    // CSS Code Splitting
    cssCodeSplit: true,

    // Minification
    minify: 'esbuild'
  },

  // Dependency Optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand'
    ]
  }
})
```

---

## 10. Service Worker & PWA

```typescript
// src/sw.ts
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// App Shell (Navigation)
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'pages',
      networkTimeoutSeconds: 3,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] })
      ]
    }),
    {
      // Nicht cachen: API, Auth
      denylist: [/^\/api/, /^\/auth/]
    }
  )
)

// API Responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/pod-autom/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 5 // 5 Minuten
      })
    ]
  })
)

// Statische Assets (Fonts, Icons)
registerRoute(
  ({ request }) =>
    request.destination === 'font' ||
    request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365 // 1 Jahr
      })
    ]
  })
)

// Bilder
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Tage
      })
    ]
  })
)

// Background Sync für Offline-Actions
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions())
  }
})

async function syncPendingActions() {
  // Implementierung für Offline-Queue
}


// Service Worker Registrierung
// src/lib/registerSW.ts
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported')
    return
  }

  if (import.meta.env.DEV) {
    console.log('Service Worker disabled in development')
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    // Update Check
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing

      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Neue Version verfügbar
          showUpdateNotification()
        }
      })
    })

    console.log('Service Worker registered:', registration.scope)
  } catch (error) {
    console.error('Service Worker registration failed:', error)
  }
}

function showUpdateNotification() {
  // Toast oder Banner zeigen
  if (confirm('Eine neue Version ist verfügbar. Jetzt aktualisieren?')) {
    window.location.reload()
  }
}


// main.tsx
import { registerServiceWorker } from '@src/lib/registerSW'
import { reportWebVitals } from '@src/lib/performance'

// App rendern
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Nach dem Rendern
registerServiceWorker()
reportWebVitals()
```

---

## 11. Performance Monitoring (Web Vitals 2024)

```typescript
// src/lib/performance.ts
import { onCLS, onFCP, onINP, onLCP, onTTFB, Metric } from 'web-vitals'

// Schwellenwerte nach Google (2024/2026)
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 },   // Ersetzt FID seit März 2024
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 }
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS]
  if (!threshold) return 'needs-improvement'

  if (value <= threshold.good) return 'good'
  if (value >= threshold.poor) return 'poor'
  return 'needs-improvement'
}

function sendToAnalytics(metric: Metric) {
  const rating = getRating(metric.name, metric.value)

  // Console in Dev
  if (import.meta.env.DEV) {
    console.log(`[${metric.name}] ${metric.value.toFixed(2)} (${rating})`)
    return
  }

  // An Backend senden
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: Date.now()
  })

  // Beacon API für zuverlässiges Senden
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body)
  } else {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    })
  }
}

export function reportWebVitals() {
  // Core Web Vitals (2024: INP ersetzt FID)
  onCLS(sendToAnalytics)
  onINP(sendToAnalytics)  // Interaction to Next Paint
  onLCP(sendToAnalytics)

  // Zusätzliche Metriken
  onFCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
}


// Performance Mark/Measure für Custom Metrics
export function measureRender(componentName: string) {
  const startMark = `${componentName}-start`
  const endMark = `${componentName}-end`
  const measureName = `${componentName}-render`

  return {
    start: () => performance.mark(startMark),
    end: () => {
      performance.mark(endMark)
      performance.measure(measureName, startMark, endMark)

      const entries = performance.getEntriesByName(measureName)
      const duration = entries[entries.length - 1]?.duration ?? 0

      if (import.meta.env.DEV && duration > 16) {
        console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`)
      }

      // Cleanup
      performance.clearMarks(startMark)
      performance.clearMarks(endMark)
      performance.clearMeasures(measureName)

      return duration
    }
  }
}
```

---

## 12. Performance Ziele

| Metrik | Ziel | Beschreibung |
|--------|------|--------------|
| **LCP** | < 2.5s | Largest Contentful Paint |
| **INP** | < 200ms | Interaction to Next Paint (ersetzt FID seit 2024) |
| **CLS** | < 0.1 | Cumulative Layout Shift |
| **FCP** | < 1.8s | First Contentful Paint |
| **TTFB** | < 800ms | Time to First Byte |
| **TTI** | < 3.8s | Time to Interactive |
| **Bundle Size** | < 400KB | Initial JS (gzipped) |

---

## Verifizierung

- [ ] Lighthouse Score > 90 (Performance, Accessibility, Best Practices)
- [ ] Bundle Size < 400KB (initial, gzipped)
- [ ] Code Splitting funktioniert (separate Chunks pro Route)
- [ ] Lazy Loading aktiviert für alle Routes
- [ ] Error Boundary fängt Fehler ab
- [ ] React 18 Concurrent Features verwendet
- [ ] Images lazy loaded mit Intersection Observer
- [ ] VirtualList für Listen > 100 Items
- [ ] Debounced Inputs ohne Memory Leaks
- [ ] API Calls werden gecached (React Query)
- [ ] Service Worker registriert (Production)
- [ ] Web Vitals werden gemessen (INP statt FID)
- [ ] React DevTools zeigt keine unnötigen Re-Renders

---

## Abhängigkeiten

- web-vitals@^4.0.0 (für INP Support)
- workbox-precaching, workbox-routing, workbox-strategies
- rollup-plugin-visualizer (devDependency)
- vite-plugin-compression2 (devDependency)

---

## Abschluss

Nach Phase 6.5 ist die POD AutoM WebApp vollständig implementiert und optimiert.

### Nächste Schritte

1. **Testing**
   - Unit Tests mit Vitest
   - Integration Tests mit Testing Library
   - E2E Tests mit Playwright
   - Performance Tests mit Lighthouse CI

2. **Deployment**
   - Frontend: Vercel/Netlify mit Preview Deployments
   - Backend: Render (bereits vorhanden)
   - CDN für statische Assets

3. **Monitoring**
   - Error Tracking (Sentry)
   - Performance Monitoring (Web Vitals Dashboard)
   - User Analytics (Plausible/Umami)

4. **Launch**
   - Closed Beta mit 10-20 Testern
   - Soft Launch mit Warteliste
   - Marketing & Launch
