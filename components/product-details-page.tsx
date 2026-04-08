'use client'

import { useState, useEffect } from 'react'
import { getProductById } from '@/lib/product-actions'
import { formatNaira } from '@/lib/currency-utils'
import { useCart } from '@/lib/cart-context'
import { ArrowLeft, ShoppingCart, MapPin, Package, Loader2, AlertCircle, Truck, CheckCircle2, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { ProductReviews, StarRating } from './product-reviews'
import Image from 'next/image'

interface ProductDetailsPageProps {
  productId: string
  onBack?: () => void
}

export function ProductDetailsPage({ productId, onBack }: ProductDetailsPageProps) {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { addItem } = useCart()

  useEffect(() => {
    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    setLoading(true)
    const result = await getProductById(productId)
    if (result.success) {
      setProduct(result.data)
    } else {
      setError(result.error || 'Failed to load product')
    }
    setLoading(false)
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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
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
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs px-2 py-1 bg-secondary rounded-full text-foreground">
                {product.category}
              </span>
              <h1 className="text-3xl font-bold text-foreground mt-4">{product.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-2xl font-bold text-foreground">{formatNaira(product.price)}</p>
            {product.average_rating > 0 && (
              <StarRating rating={product.average_rating} reviews={product.review_count} />
            )}
          </div>
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

          {product.status === 'active' && (
            <div className="flex items-center gap-3 text-sm text-primary">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>In Stock</span>
            </div>
          )}

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
          <h2 className="text-sm font-semibold text-foreground mb-3">Seller Information</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              {merchant.business_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{merchant.business_name}</p>
              {merchant.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{merchant.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">Quantity</label>
          <div className="flex items-center gap-3 bg-secondary rounded-lg p-3 w-fit">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 flex items-center justify-center bg-card rounded hover:bg-border transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold text-foreground">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 flex items-center justify-center bg-card rounded hover:bg-border transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Customer Reviews</h2>
          <ProductReviews productId={product.id} productName={product.name} />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={() => {
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
              setTimeout(() => setAddedToCart(false), 2000)
            }}
            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              addedToCart
                ? 'bg-green-500 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {addedToCart ? (
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
        </div>
      </main>
    </div>
  )
}
