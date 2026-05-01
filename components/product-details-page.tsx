'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatNaira } from '@/lib/currency-utils'
import { useCart } from '@/lib/cart-context'
import { useWishlist } from '@/lib/wishlist-context'
import { ArrowLeft, ShoppingCart, MapPin, Package, Loader2, AlertCircle, Truck, CheckCircle2, ChevronLeft, ChevronRight, ImageIcon, Store, Heart, Bell, BellOff } from 'lucide-react'
import { ProductReviews, StarRating } from './product-reviews'
import { BrandWordmark } from './brand-wordmark'
import Image from 'next/image'

interface ProductDetailsPageProps {
  productId: string
  onBack?: () => void
  onViewProduct?: (productId: string) => void
  onViewMerchant?: (merchant: any) => void
  onOpenCart?: () => void
  onCheckout?: () => void
}

export function ProductDetailsPage({ productId, onBack, onViewProduct, onViewMerchant, onOpenCart, onCheckout }: ProductDetailsPageProps) {
  const [product, setProduct] = useState<any>(null)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [loadingRelated, setLoadingRelated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [showAddedPopup, setShowAddedPopup] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { addItem, getItemCount, getTotal } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const [priceAlertActive, setPriceAlertActive] = useState(false)
  const [priceAlertFeedback, setPriceAlertFeedback] = useState('')

  useEffect(() => {
    loadProduct()
  }, [productId])

  useEffect(() => {
    if (!product) return

    const stockCount = Math.max(0, Number(product.stock || 0))
    setQuantity((current) => (stockCount > 0 ? Math.min(Math.max(1, current), stockCount) : 1))
  }, [product])

  useEffect(() => {
    if (!product) {
      setRelatedProducts([])
      return
    }

    loadRelatedProducts(product)
  }, [product])

  // Price alert — must be before any early returns (Rules of Hooks)
  useEffect(() => {
    if (!product) return
    try {
      const alerts = JSON.parse(localStorage.getItem('bigcat_price_alerts') || '[]') as any[]
      setPriceAlertActive(alerts.some((a: any) => a.productId === String(product.id)))
    } catch { /* ignore */ }
  }, [product?.id])

  const togglePriceAlert = useCallback(() => {
    if (!product) return
    try {
      const key = 'bigcat_price_alerts'
      const alerts = JSON.parse(localStorage.getItem(key) || '[]') as any[]
      const productIdStr = String(product.id)
      const existing = alerts.findIndex((a: any) => a.productId === productIdStr)
      if (existing >= 0) {
        alerts.splice(existing, 1)
        localStorage.setItem(key, JSON.stringify(alerts))
        setPriceAlertActive(false)
        setPriceAlertFeedback('Price alert removed.')
      } else {
        alerts.push({ productId: productIdStr, name: product.name, price: Number(product.price), setAt: Date.now() })
        localStorage.setItem(key, JSON.stringify(alerts))
        setPriceAlertActive(true)
        setPriceAlertFeedback("You'll be notified if this item's price drops!")
      }
      setTimeout(() => setPriceAlertFeedback(''), 3000)
    } catch { /* ignore */ }
  }, [product])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/products/${productId}`)
      const result = await response.json()
      if (result.success) {
        setProduct(result.data)
      } else {
        setError(result.error || 'Failed to load product')
      }
    } catch (error) {
      setError('Failed to load product')
    }
    setLoading(false)
  }

  const loadRelatedProducts = async (currentProduct: any) => {
    setLoadingRelated(true)
    try {
      const response = await fetch('/api/products', { cache: 'no-store' })
      const result = await response.json()

      if (!result.success || !Array.isArray(result.data)) {
        setRelatedProducts([])
        return
      }

      const currentId = String(currentProduct.id)
      const currentCategory = String(currentProduct.category || '').toLowerCase()
      const currentNameTokens = String(currentProduct.name || '')
        .toLowerCase()
        .split(/\s+/)
        .filter((token: string) => token.length > 3)

      const ranked = result.data
        .filter((item: any) => String(item.id) !== currentId)
        .map((item: any) => {
          const itemCategory = String(item.category || '').toLowerCase()
          const itemName = String(item.name || '').toLowerCase()
          const sharedTokens = currentNameTokens.reduce((count: number, token: string) => {
            return itemName.includes(token) ? count + 1 : count
          }, 0)

          let score = 0
          if (currentCategory && itemCategory === currentCategory) score += 10
          if (String(item.merchant_id || '') === String(currentProduct.merchant_id || '')) score += 3
          score += sharedTokens

          return { ...item, relatedScore: score }
        })
        .sort((a: any, b: any) => {
          if (b.relatedScore !== a.relatedScore) return b.relatedScore - a.relatedScore
          return Number(b.review_count || 0) - Number(a.review_count || 0)
        })
        .slice(0, 6)

      setRelatedProducts(ranked)
    } catch {
      setRelatedProducts([])
    } finally {
      setLoadingRelated(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error || 'Product not found'}</p>
        </div>
      </div>
    )
  }

  const merchant = product.merchant_profiles || {}
  const cartCount = getItemCount()
  const cartTotal = getTotal()
  const savedToWishlist = isInWishlist(String(product.id))
  const availableStock = Math.max(0, Number(product.stock || 0))
  const isOutOfStock = availableStock <= 0

  const wishlistItem = {
    id: String(product.id),
    productId: String(product.id),
    name: product.name,
    price: Number(product.price || 0),
    category: product.category || 'General',
    image: product.images?.[0] || product.image_url || null,
    stock: availableStock,
    merchant: {
      id: String(product.merchant_id || ''),
      business_name: merchant.business_name || merchant.name || 'Merchant',
      logo_url: merchant.logo_url || merchant.avatar_url || '',
      location: merchant.location || 'Nigeria',
    },
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <BrandWordmark compact />
          </div>
          <button
            onClick={() => onOpenCart?.()}
            className="relative flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-2 text-foreground hover:bg-secondary/80 transition-colors"
            aria-label="Open cart"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm font-semibold">{cartCount}</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Product Image Gallery */}
        <div className="relative">
          <div className="aspect-square bg-gradient-to-br from-secondary to-secondary/50 rounded-xl overflow-hidden relative">
            {product.images && product.images.length > 0 ? (
              <Image
                src={product.images[currentImageIndex]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-24 h-24 text-muted-foreground opacity-50" />
              </div>
            )}
          </div>
          
          {/* Image Navigation */}
          {product.images && product.images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex((i) => (i === 0 ? product.images.length - 1 : i - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center text-foreground hover:bg-background transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentImageIndex((i) => (i === product.images.length - 1 ? 0 : i + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center text-foreground hover:bg-background transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              {/* Image Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {product.images.map((_: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === currentImageIndex ? 'bg-primary' : 'bg-background/60'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs px-2 py-1 bg-secondary rounded-full text-foreground">
                {product.category}
              </span>
              <h1 className="text-3xl font-bold text-foreground mt-4">{product.name}</h1>
            </div>
            <button
              onClick={() => toggleItem(wishlistItem)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                savedToWishlist
                  ? 'border-rose-200 bg-rose-50 text-rose-600'
                  : 'border-border bg-card text-muted-foreground hover:text-rose-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${savedToWishlist ? 'fill-current' : ''}`} />
              {savedToWishlist ? 'Saved' : 'Save'}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-2xl font-bold text-foreground">{formatNaira(product.price)}</p>
            {product.average_rating > 0 && (
              <StarRating rating={product.average_rating} reviews={product.review_count} />
            )}
          </div>
        </div>

        {/* Price Drop Alert */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePriceAlert}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
              priceAlertActive
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-border bg-card text-muted-foreground hover:text-amber-600'
            }`}
          >
            {priceAlertActive ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            {priceAlertActive ? 'Alert On' : 'Price Drop Alert'}
          </button>
          {priceAlertFeedback && (
            <span className="text-xs text-amber-700">{priceAlertFeedback}</span>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">About this product</h2>
          <p className="text-foreground leading-relaxed text-sm">{product.description}</p>
        </div>

        {/* Product Details */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>
          
          {product.weight && (
            <div className="flex items-center gap-3 text-sm">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">Weight: {product.weight}kg</span>
            </div>
          )}

          <div className={`flex items-center gap-3 text-sm ${isOutOfStock ? 'text-destructive' : availableStock <= 5 ? 'text-chart-4' : 'text-primary'}`}>
            <div className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-destructive' : availableStock <= 5 ? 'bg-chart-4' : 'bg-primary'}`} />
            <span>
              {isOutOfStock ? 'Out of stock' : `${availableStock} item${availableStock !== 1 ? 's' : ''} available`}
            </span>
          </div>

          {product.status === 'pending_weight_verification' && (
            <div className="flex items-center gap-3 text-sm text-chart-4">
              <AlertCircle className="w-4 h-4" />
              <span>Pending weight verification</span>
            </div>
          )}
        </div>

        {/* Delivery Estimation */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Estimated Delivery</h3>
          </div>
          <p className="text-sm text-foreground">
            Delivery time will be calculated based on your location and the item weight.
          </p>
        </div>

        {/* Merchant Info */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">SME/Merchant Information</h2>
          <button
            type="button"
            onClick={() => onViewMerchant?.({
              id: String(product.merchant_id || ''),
              name: merchant.business_name || merchant.name || 'Merchant',
              category: merchant.business_category || product.category || 'General',
                rating: Number.isFinite(Number(product.average_rating)) ? Number(product.average_rating) : null,
                reviews: Number.isFinite(Number(product.review_count)) ? Number(product.review_count) : 0,
              location: merchant.location || 'Nigeria',
              badge: 'Verified',
              badgeColor: 'bg-primary/15 text-primary',
              bgColor: 'bg-blue-100',
              initials: (merchant.business_name || merchant.name || 'M').substring(0, 2).toUpperCase(),
              iconColor: 'text-blue-600',
              description: merchant.business_description || 'Quality products and services',
              logo_url: merchant.logo_url || merchant.avatar_url || '',
              avatar_url: merchant.avatar_url || merchant.logo_url || '',
            })}
            className="w-full flex items-center gap-3 text-left rounded-lg hover:bg-secondary/40 transition-colors p-1"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              {(merchant.business_name || merchant.name || 'M').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground underline-offset-2 hover:underline">
                {merchant.business_name || merchant.name || 'Merchant'}
              </p>
              {merchant.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{merchant.location}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-primary font-medium flex-shrink-0">
              <Store className="w-4 h-4" />
              <span>View Store</span>
            </div>
          </button>
        </div>

        {/* Related Products */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Related Products</h2>
          {loadingRelated ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-48 rounded-xl border border-border bg-card animate-pulse" />
              ))}
            </div>
          ) : relatedProducts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              No related products available right now.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {relatedProducts.map((related) => (
                <button
                  key={related.id}
                  type="button"
                  onClick={() => {
                    setCurrentImageIndex(0)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                    onViewProduct?.(String(related.id))
                  }}
                  className="text-left rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="aspect-[4/3] bg-secondary relative">
                    {related.images?.[0] || related.image_url ? (
                      <Image
                        src={related.images?.[0] || related.image_url}
                        alt={related.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <p className="text-xs text-muted-foreground">{related.category || 'General'}</p>
                    <p className="text-sm font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">{related.name}</p>
                    <p className="text-sm font-bold text-primary">{formatNaira(Number(related.price || 0))}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quantity Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-foreground">Quantity</label>
            <span className={`text-xs ${isOutOfStock ? 'text-destructive' : 'text-muted-foreground'}`}>
              {isOutOfStock ? 'Unavailable right now' : `Up to ${availableStock} available`}
            </span>
          </div>
          <div className="flex items-center gap-3 bg-secondary rounded-lg p-3 w-fit">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={isOutOfStock}
              className="w-8 h-8 flex items-center justify-center bg-card rounded hover:bg-border transition-colors disabled:opacity-50"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold text-foreground">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
              disabled={isOutOfStock || quantity >= availableStock}
              className="w-8 h-8 flex items-center justify-center bg-card rounded hover:bg-border transition-colors disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>

        {/* Cart Summary */}
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
              <p className="text-xs text-muted-foreground">{cartCount} item{cartCount !== 1 ? 's' : ''} ready</p>
            </div>
          </div>
          <p className="text-sm font-bold text-primary">{formatNaira(cartTotal)}</p>
        </button>

        {/* Reviews Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Customer Reviews</h2>
          <ProductReviews productId={product.id} productName={product.name} />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={() => {
              if (isOutOfStock) return

              addItem({
                id: product.id,
                productId: product.id,
                name: product.name,
                price: parseFloat(product.price),
                quantity: quantity,
                merchantId: product.merchant_id,
                merchantName: product.merchant_profiles?.business_name || 'Unknown',
              })
              setAddedToCart(true)
              setShowAddedPopup(true)
              setTimeout(() => setAddedToCart(false), 2000)
            }}
            disabled={isOutOfStock}
            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              isOutOfStock
                ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                : addedToCart
                  ? 'bg-green-500 text-white'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isOutOfStock ? (
              <>
                <Package className="w-5 h-5" />
                Out of stock
              </>
            ) : addedToCart ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Added to Cart ✓
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </>
            )}
          </button>

          <button
            onClick={() => toggleItem(wishlistItem)}
            className={`w-full py-3 rounded-lg font-semibold border transition-colors flex items-center justify-center gap-2 ${
              savedToWishlist
                ? 'border-rose-200 bg-rose-50 text-rose-600'
                : 'border-border bg-card text-foreground hover:bg-secondary'
            }`}
          >
            <Heart className={`w-5 h-5 ${savedToWishlist ? 'fill-current' : ''}`} />
            {savedToWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
          </button>

          <button
            onClick={() => onOpenCart?.()}
            className="w-full py-3 rounded-lg font-semibold border border-border bg-card text-foreground hover:bg-secondary transition-colors"
          >
            View Cart
          </button>
        </div>
      </main>

      {showAddedPopup && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground px-2 text-center">
                    {product.category}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-foreground">Added to cart</p>
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2">{product.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Quantity: {quantity}</p>
                <p className="text-sm font-bold text-primary mt-2">{formatNaira(Number(product.price) * quantity)}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => {
                  setShowAddedPopup(false)
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
                onClick={() => setShowAddedPopup(false)}
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
