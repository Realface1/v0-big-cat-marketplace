'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X, ArrowLeft, ShoppingCart, CheckCircle2 } from 'lucide-react'
import { ProductGrid } from './product-card'
import { BrandWordmark } from './brand-wordmark'
import { useCart } from '@/lib/cart-context'
import { formatNaira } from '@/lib/currency-utils'

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Food & Drinks',
  'Health & Beauty',
  'Home & Living',
  'Agriculture',
  'Sports',
  'Baby & Kids',
  'Automotive',
  'Books & Media',
  'Other'
]

interface ProductsMarketplaceProps {
  onProductClick?: (productId: string) => void
  onBack?: () => void
  initialCategory?: string | null
  initialSearch?: string
  onOpenCart?: () => void
  onCheckout?: () => void
  buyerLatitude?: number | null
  buyerLongitude?: number | null
  buyerLocationLabel?: string
  locationStatus?: 'idle' | 'detecting' | 'ready' | 'fallback' | 'denied'
}

export function ProductsMarketplace({
  onProductClick,
  onBack,
  initialCategory,
  initialSearch,
  onOpenCart,
  onCheckout,
  buyerLatitude,
  buyerLongitude,
  buyerLocationLabel,
  locationStatus = 'idle',
}: ProductsMarketplaceProps) {
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialSearch || '')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || '')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [addedProduct, setAddedProduct] = useState<any | null>(null)
  const { getItemCount, getTotal } = useCart()
  const ITEMS_PER_PAGE = 24

  // Load products and re-sort when live buyer coordinates become available
  useEffect(() => {
    loadProducts()
  }, [buyerLatitude, buyerLongitude])

  // Filter products when search query or category changes
  useEffect(() => {
    filterProducts()
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchQuery, selectedCategory, products])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const searchParams = new URLSearchParams()
      if (Number.isFinite(Number(buyerLatitude)) && Number.isFinite(Number(buyerLongitude))) {
        searchParams.set('buyerLat', String(buyerLatitude))
        searchParams.set('buyerLng', String(buyerLongitude))
      }

      const endpoint = searchParams.toString() ? `/api/products?${searchParams.toString()}` : '/api/products'
      const response = await fetch(endpoint, { cache: 'no-store' })
      const result = await response.json()
      if (result.success) {
        setProducts(result.data)
      }
    } catch (error) {
      console.error('Failed to load products')
    }
    setLoading(false)
  }

  const filterProducts = () => {
    let filtered = [...products]

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.merchant_profiles?.business_name?.toLowerCase().includes(query)
      )
    }

    setFilteredProducts(filtered)
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
  }

  const hasActiveFilters = searchQuery || selectedCategory
  const cartCount = getItemCount()
  const cartTotal = getTotal()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      {onBack && (
        <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <BrandWordmark compact />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-foreground">Products</h1>
              <button
                onClick={() => onOpenCart?.()}
                className="relative flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-2 text-foreground hover:bg-secondary/80 transition-colors"
                aria-label="Open cart"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-semibold">{cartCount}</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Search Bar */}
      <div className="sticky top-14 z-40 bg-background px-4 py-4 border-b border-border">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search products or SME/Merchants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
              hasActiveFilters || showFilters
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
          </button>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {searchQuery && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm">
                <span>Search: {searchQuery}</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:bg-primary/20 rounded p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {selectedCategory && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm">
                <span>{selectedCategory}</span>
                <button
                  onClick={() => setSelectedCategory('')}
                  className="hover:bg-primary/20 rounded p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="px-4 pb-4 border-b border-border">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-4">Filter by Category</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {CATEGORIES.map((category) => (
                <label key={category} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    value={category}
                    checked={selectedCategory === category}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {category}
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="category"
                  value=""
                  checked={selectedCategory === ''}
                  onChange={() => setSelectedCategory('')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                  All Categories
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="px-4 space-y-3">
        {(buyerLocationLabel || locationStatus === 'detecting' || locationStatus === 'denied') && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${locationStatus === 'ready' || locationStatus === 'fallback' ? 'border-primary/20 bg-primary/5 text-foreground' : 'border-border bg-card text-muted-foreground'}`}>
            {locationStatus === 'detecting'
              ? 'Detecting your live location to show the nearest merchants...'
              : buyerLocationLabel
                ? `Showing merchants closest to ${buyerLocationLabel}.`
                : 'Allow location access to see merchants nearest to you.'}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {loading
            ? 'Loading products...'
            : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} found`}
        </p>
        <button
          onClick={() => onOpenCart?.()}
          className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Cart</p>
              <p className="text-xs text-muted-foreground">{cartCount} item{cartCount !== 1 ? 's' : ''} in cart</p>
            </div>
          </div>
          <p className="text-sm font-bold text-primary">{formatNaira(cartTotal)}</p>
        </button>
      </div>

      {/* Products Grid */}
      <div className="px-4 pb-6">
        <ProductGrid
          products={paginatedProducts.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category,
            image: p.images?.[0] || null,
            stock: Number(p.stock || 0),
            merchant: {
              id: p.merchant_profiles?.id || '',
              business_name: p.merchant_profiles?.business_name || 'Unknown',
              logo_url: p.merchant_profiles?.logo_url,
              location: p.merchant_profiles?.location,
              distance_km: p.merchant_profiles?.distance_km ?? p.distance_km ?? null,
            },
          }))}
          onProductClick={onProductClick}
          onAddToCart={setAddedProduct}
          loading={loading}
        />
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 pb-20 flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Results info */}
      {!loading && filteredProducts.length > 0 && (
        <div className="px-4 pb-4 text-center text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} products
        </div>
      )}

      {addedProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                {addedProduct.image ? (
                  <img src={addedProduct.image} alt={addedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground px-2 text-center">
                    {addedProduct.category}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-foreground">Added to cart</p>
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2">{addedProduct.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{addedProduct.merchant.business_name}</p>
                <p className="text-sm font-bold text-primary mt-2">{formatNaira(addedProduct.price)}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => {
                  setAddedProduct(null)
                  if (onCheckout) {
                    onCheckout()
                    return
                  }
                  onOpenCart?.()
                }}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Proceed to Checkout
              </button>
              <button
                onClick={() => setAddedProduct(null)}
                className="w-full rounded-xl bg-secondary py-3 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
