'use client'

import { useState, useEffect } from 'react'
import { getAllProducts } from '@/lib/product-actions'
import { Search, Filter, X, ArrowLeft } from 'lucide-react'
import { ProductCard, ProductGrid } from './product-card'

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Food & Beverages',
  'Home & Garden',
  'Sports & Outdoors',
  'Books & Media',
  'Beauty & Personal Care',
  'Toys & Games',
  'Automotive',
  'Health & Wellness',
  'Other'
]

interface ProductsMarketplaceProps {
  onProductClick?: (productId: string) => void
  onBack?: () => void
  initialCategory?: string | null
  initialSearch?: string
}

export function ProductsMarketplace({ onProductClick, onBack, initialCategory, initialSearch }: ProductsMarketplaceProps) {
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialSearch || '')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || '')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  // Load all products on mount
  useEffect(() => {
    loadProducts()
  }, [])

  // Filter products when search query or category changes
  useEffect(() => {
    filterProducts()
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchQuery, selectedCategory, products])

  const loadProducts = async () => {
    setLoading(true)
    const result = await getAllProducts()
    if (result.success) {
      setProducts(result.data)
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      {onBack && (
        <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-foreground">Products</h1>
            <div className="w-9" />
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
              placeholder="Search products or sellers..."
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
      <div className="px-4">
        <p className="text-sm text-muted-foreground">
          {loading
            ? 'Loading products...'
            : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} found`}
        </p>
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
            merchant: {
              id: p.merchant_profiles?.id || '',
              business_name: p.merchant_profiles?.business_name || 'Unknown',
              logo_url: p.merchant_profiles?.logo_url,
              location: p.merchant_profiles?.location,
            },
          }))}
          onProductClick={onProductClick}
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
    </div>
  )
}
