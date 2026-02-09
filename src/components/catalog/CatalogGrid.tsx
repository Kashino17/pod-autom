import { useState } from 'react'
import { Search, Filter, Package } from 'lucide-react'
import { ProductCard, CatalogProduct } from './ProductCard'
import { ProductDetailDialog } from './ProductDetailDialog'

interface CatalogGridProps {
  products: CatalogProduct[]
  isLoading?: boolean
}

// Get unique categories from products
function getCategories(products: CatalogProduct[]): string[] {
  const categories = new Set(products.map(p => p.category))
  return ['Alle', ...Array.from(categories).sort()]
}

export function CatalogGrid({ products, isLoading }: CatalogGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Alle')
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null)

  const categories = getCategories(products)

  // Filter products
  const filteredProducts = products.filter(product => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      product.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())

    // Category filter
    const matchesCategory = selectedCategory === 'Alle' ||
      product.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Sort: featured first, then by sort_order
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1
    if (!a.is_featured && b.is_featured) return 1
    return 0
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-zinc-800 rounded-t-xl" />
            <div className="bg-zinc-900 rounded-b-xl p-4 space-y-3">
              <div className="h-3 bg-zinc-800 rounded w-1/4" />
              <div className="h-5 bg-zinc-800 rounded w-3/4" />
              <div className="h-4 bg-zinc-800 rounded w-1/2" />
              <div className="h-6 bg-zinc-800 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Produkte suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-white placeholder:text-zinc-500
                       focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-zinc-500 hidden sm:block" />
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                           ${selectedCategory === category
                             ? 'bg-violet-500 text-white'
                             : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                           }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-zinc-500 mb-4">
        {sortedProducts.length} {sortedProducts.length === 1 ? 'Produkt' : 'Produkte'} gefunden
      </p>

      {/* Grid */}
      {sortedProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">Keine Produkte gefunden</h3>
          <p className="text-zinc-500">
            Versuche einen anderen Suchbegriff oder Filter.
          </p>
        </div>
      )}

      {/* Detail Dialog */}
      {selectedProduct && (
        <ProductDetailDialog
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
