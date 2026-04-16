'use client'

import { useState } from 'react'
import { ShoppingCart, Heart, MapPin, Package, Check } from 'lucide-react'
import { formatNaira } from '@/lib/currency-utils'
import { useCart } from '@/lib/cart-context'
import { useWishlist } from '@/lib/wishlist-context'
import Image from 'next/image'

interface ProductCardProps {
  id: string
  name: string
  price: number
  category: string
  image?: string | null
  stock?: number
  merchant: {
    id: string
    business_name: string
    logo_url?: string
    location?: string
    distance_km?: number | null
  }
  onClick?: () => void
  onAddToCart?: (product: {
    id: string
    name: string
    price: number
    category: string
    image?: string | null
    stock?: number
    merchant: {
      id: string
      business_name: string
      logo_url?: string
      location?: string
      distance_km?: number | null
    }
  }) => void
}

export function ProductCard({
  id,
  name,
  price,
  category,
  image,
  stock = 0,
  merchant,
  onClick,
  onAddToCart,
}: ProductCardProps) {
  const [addedToCart, setAddedToCart] = useState(false)
  const { addItem } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()

  const wishlistItem = {
    id,
    productId: id,
    name,
    price,
    category,
    image,
    stock,
    merchant,
  }

  const savedToWishlist = isInWishlist(id)
  const availableStock = Math.max(0, Number(stock || 0))
  const isOutOfStock = availableStock <= 0
  const distanceLabel = Number.isFinite(Number(merchant.distance_km))
    ? `${Number(merchant.distance_km) < 1 ? '<1' : Number(merchant.distance_km).toFixed(1)} km away`
    : null

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOutOfStock) return

    addItem({
      id,
      productId: id,
      name,
      price,
      quantity: 1,
      merchantId: merchant.id,
      merchantName: merchant.business_name,
    })
    onAddToCart?.(wishlistItem)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  return (
    <div
      onClick={onClick}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
    >
      {/* Product Image */}
      <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center overflow-hidden relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleItem(wishlistItem)
          }}
          className={`absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm transition-colors ${
            savedToWishlist
              ? 'border-rose-200 bg-white/90 text-rose-500'
              : 'border-white/70 bg-white/80 text-muted-foreground hover:text-rose-500'
          }`}
          aria-label={savedToWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          title={savedToWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-4 h-4 ${savedToWishlist ? 'fill-current' : ''}`} />
        </button>

        {image ? (
          image.startsWith('http') ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              loading="lazy"
            />
          ) : (
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 16vw"
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
            <Package className="w-12 h-12 opacity-50" />
            <span className="text-xs mt-2 text-center px-2">{category}</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 space-y-2.5">
        <div>
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
            {name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <p className="text-lg font-bold text-foreground">
              {formatNaira(price)}
            </p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${isOutOfStock ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
              {isOutOfStock ? 'Out of stock' : `${availableStock} in stock`}
            </span>
          </div>
        </div>

        {/* Merchant Info */}
        <div className="flex items-center gap-2 py-2 border-t border-border">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary flex-shrink-0">
            {merchant.business_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {merchant.business_name}
            </p>
            {(merchant.location || distanceLabel) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">
                  {distanceLabel ? `${distanceLabel}${merchant.location ? ` • ${merchant.location}` : ''}` : merchant.location}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <button 
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`w-full py-2 rounded-lg transition-colors font-medium text-xs flex items-center justify-center gap-1.5 ${
            isOutOfStock
              ? 'bg-secondary text-muted-foreground cursor-not-allowed'
              : addedToCart 
                ? 'bg-green-500 text-white' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {isOutOfStock ? (
            <>
              <Package className="w-4 h-4" />
              Out of stock
            </>
          ) : addedToCart ? (
            <>
              <Check className="w-4 h-4" />
              Added!
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  )
}

interface ProductGridProps {
  products: ProductCardProps[]
  onProductClick?: (productId: string) => void
  onAddToCart?: (product: {
    id: string
    name: string
    price: number
    category: string
    image?: string | null
    stock?: number
    merchant: {
      id: string
      business_name: string
      logo_url?: string
      location?: string
      distance_km?: number | null
    }
  }) => void
  loading?: boolean
}

export function ProductGrid({
  products,
  onProductClick,
  onAddToCart,
  loading,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {Array(12)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl aspect-square animate-pulse"
            />
          ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">No products found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          {...product}
          onClick={() => onProductClick?.(product.id)}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  )
}
