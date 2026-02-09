import { useQuery } from '@tanstack/react-query'
import { supabase } from '@src/lib/supabase'
import type { CatalogProduct } from '@src/components/catalog/ProductCard'

// Database row type for pod_autom_catalog
interface CatalogRow {
  id: string
  product_type: string
  product_code: string | null
  display_name: string | null
  description: string | null
  image_url: string | null
  sizes: string[] | null
  colors: unknown
  materials: string | null
  base_price: number
  shipping_prices: unknown
  production_time_days: number | null
  category: string | null
  is_active: boolean | null
  is_featured: boolean | null
  stock_status: string | null
  sort_order: number | null
}

// =====================================================
// TYPES
// =====================================================

interface CatalogResponse {
  products: CatalogProduct[]
  categories: string[]
}

// =====================================================
// MOCK DATA (fallback when DB is empty)
// =====================================================

const MOCK_CATALOG: CatalogProduct[] = [
  {
    id: '1',
    product_type: 'T-Shirt Premium',
    product_code: 'TSH-PREM-001',
    display_name: 'Premium T-Shirt',
    description: 'Hochwertiges Premium T-Shirt aus 100% Bio-Baumwolle. Perfekt fuer hochaufloesende Drucke.',
    image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    colors: [
      { name: 'Schwarz', hex: '#000000', available: true },
      { name: 'Weiss', hex: '#FFFFFF', available: true },
      { name: 'Navy', hex: '#1e3a5f', available: true },
      { name: 'Grau Meliert', hex: '#6b7280', available: true },
      { name: 'Burgund', hex: '#800020', available: true },
    ],
    materials: '100% Bio-Baumwolle, 180g/m2, Rundhals',
    base_price: 12.50,
    shipping_prices: { DE: 4.90, AT: 5.90, CH: 8.90, EU: 7.90, US: 12.90 },
    production_time_days: 3,
    category: 'Textilien',
    is_featured: true,
    stock_status: 'in_stock',
  },
  {
    id: '2',
    product_type: 'Hoodie Classic',
    product_code: 'HOD-CLAS-001',
    display_name: 'Classic Hoodie',
    description: 'Kuscheliger Hoodie mit Kaengurutasche. Ideal fuer kaeltere Tage.',
    image_url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Schwarz', hex: '#000000', available: true },
      { name: 'Navy', hex: '#1e3a5f', available: true },
      { name: 'Grau Meliert', hex: '#6b7280', available: true },
      { name: 'Forest Green', hex: '#228B22', available: true },
    ],
    materials: '80% Baumwolle, 20% Polyester, 300g/m2',
    base_price: 24.90,
    shipping_prices: { DE: 5.90, AT: 6.90, CH: 9.90, EU: 8.90, US: 14.90 },
    production_time_days: 4,
    category: 'Textilien',
    is_featured: true,
    stock_status: 'in_stock',
  },
  {
    id: '3',
    product_type: 'Sweatshirt Basic',
    product_code: 'SWE-BASI-001',
    display_name: 'Basic Sweatshirt',
    description: 'Klassischer Sweatshirt ohne Kapuze. Minimalistisch und vielseitig.',
    image_url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Schwarz', hex: '#000000', available: true },
      { name: 'Weiss', hex: '#FFFFFF', available: true },
      { name: 'Grau', hex: '#6b7280', available: true },
    ],
    materials: '80% Baumwolle, 20% Polyester, 280g/m2',
    base_price: 19.90,
    shipping_prices: { DE: 5.90, AT: 6.90, CH: 9.90, EU: 8.90, US: 14.90 },
    production_time_days: 4,
    category: 'Textilien',
    is_featured: false,
    stock_status: 'in_stock',
  },
  {
    id: '4',
    product_type: 'Snapback Cap',
    product_code: 'CAP-SNAP-001',
    display_name: 'Snapback Cap',
    description: 'Trendige Snapback Cap mit verstellbarem Verschluss.',
    image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80',
    sizes: ['One Size'],
    colors: [
      { name: 'Schwarz', hex: '#000000', available: true },
      { name: 'Weiss', hex: '#FFFFFF', available: true },
      { name: 'Navy', hex: '#1e3a5f', available: true },
    ],
    materials: 'Baumwolle/Polyester Mix',
    base_price: 8.90,
    shipping_prices: { DE: 3.90, AT: 4.90, CH: 6.90, EU: 5.90, US: 8.90 },
    production_time_days: 2,
    category: 'Accessoires',
    is_featured: false,
    stock_status: 'in_stock',
  },
  {
    id: '5',
    product_type: 'Stofftasche Bio',
    product_code: 'BAG-STOF-001',
    display_name: 'Bio Stofftasche',
    description: 'Nachhaltige Stofftasche aus Bio-Baumwolle. Perfekt fuer den Alltag.',
    image_url: 'https://images.unsplash.com/photo-1597633125097-5a9ae3a22e13?w=800&q=80',
    sizes: ['One Size'],
    colors: [
      { name: 'Natur', hex: '#f5f5dc', available: true },
      { name: 'Schwarz', hex: '#000000', available: true },
    ],
    materials: '100% Bio-Baumwolle, 140g/m2',
    base_price: 4.90,
    shipping_prices: { DE: 2.90, AT: 3.90, CH: 5.90, EU: 4.90, US: 6.90 },
    production_time_days: 2,
    category: 'Accessoires',
    is_featured: false,
    stock_status: 'in_stock',
  },
  {
    id: '6',
    product_type: 'Poster Premium A3',
    product_code: 'POS-A3-001',
    display_name: 'Premium Poster A3',
    description: 'Hochqualitatives Poster auf 200g/m2 Fotopapier. Brillante Farben.',
    image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800&q=80',
    sizes: ['A3 (29.7 x 42 cm)'],
    colors: [],
    materials: '200g/m2 Premium Fotopapier, matt',
    base_price: 6.90,
    shipping_prices: { DE: 4.90, AT: 5.90, CH: 8.90, EU: 6.90, US: 10.90 },
    production_time_days: 2,
    category: 'Deko',
    is_featured: false,
    stock_status: 'in_stock',
  },
  {
    id: '7',
    product_type: 'Keramik Tasse',
    product_code: 'MUG-CERA-001',
    display_name: 'Keramik Tasse 325ml',
    description: 'Klassische Keramiktasse fuer den morgendlichen Kaffee.',
    image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
    sizes: ['325ml'],
    colors: [
      { name: 'Weiss', hex: '#FFFFFF', available: true },
    ],
    materials: 'Keramik, spuelmaschinenfest',
    base_price: 7.90,
    shipping_prices: { DE: 4.90, AT: 5.90, CH: 8.90, EU: 6.90, US: 10.90 },
    production_time_days: 3,
    category: 'Accessoires',
    is_featured: false,
    stock_status: 'in_stock',
  },
  {
    id: '8',
    product_type: 'Poster Premium A2',
    product_code: 'POS-A2-001',
    display_name: 'Premium Poster A2',
    description: 'Grossformatiges Poster auf Premium Fotopapier.',
    image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80',
    sizes: ['A2 (42 x 59.4 cm)'],
    colors: [],
    materials: '200g/m2 Premium Fotopapier, matt',
    base_price: 9.90,
    shipping_prices: { DE: 5.90, AT: 6.90, CH: 9.90, EU: 7.90, US: 12.90 },
    production_time_days: 2,
    category: 'Deko',
    is_featured: false,
    stock_status: 'in_stock',
  },
]

// =====================================================
// FETCH FUNCTIONS
// =====================================================

async function fetchCatalog(): Promise<CatalogResponse> {
  try {
    // Query catalog - table may not exist in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase as any)
      .from('pod_autom_catalog')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    const data = result.data as CatalogRow[] | null
    const error = result.error

    if (error) {
      console.error('Error fetching catalog:', error)
      // Return mock data as fallback
      return {
        products: MOCK_CATALOG,
        categories: [...new Set(MOCK_CATALOG.map(p => p.category))],
      }
    }

    // If no data in DB, return mock
    if (!data || data.length === 0) {
      return {
        products: MOCK_CATALOG,
        categories: [...new Set(MOCK_CATALOG.map(p => p.category))],
      }
    }

    // Transform DB data to component format
    const products: CatalogProduct[] = data.map(item => ({
      id: item.id,
      product_type: item.product_type,
      product_code: item.product_code ?? '',
      display_name: item.display_name ?? item.product_type,
      description: item.description ?? '',
      image_url: item.image_url,
      sizes: item.sizes ?? [],
      colors: (item.colors as Array<{ name: string; hex: string; available: boolean }>) ?? [],
      materials: item.materials,
      base_price: Number(item.base_price),
      shipping_prices: (item.shipping_prices as Record<string, number>) ?? {},
      production_time_days: item.production_time_days ?? 3,
      category: item.category ?? 'Sonstiges',
      is_featured: item.is_featured ?? false,
      stock_status: (item.stock_status as 'in_stock' | 'low_stock' | 'out_of_stock') ?? 'in_stock',
    }))

    const categories = [...new Set(products.map(p => p.category))]

    return { products, categories }
  } catch (err) {
    console.error('Catalog fetch error:', err)
    // Return mock on any error
    return {
      products: MOCK_CATALOG,
      categories: [...new Set(MOCK_CATALOG.map(p => p.category))],
    }
  }
}

// =====================================================
// HOOK
// =====================================================

export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalog,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (renamed from cacheTime in v5)
    refetchOnWindowFocus: false,
  })
}

// Export mock for testing
export { MOCK_CATALOG }
