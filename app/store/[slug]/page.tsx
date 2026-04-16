'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2, MapPin, Share2, Store, Tag, ShoppingBag, ExternalLink, ShoppingCart, CheckCircle2, Heart } from 'lucide-react'
import { formatNaira } from '@/lib/currency-utils'
import { extractMerchantIdFromSlug, type WebsiteLayout, type WebsiteTheme } from '@/lib/merchant-website'
import { useCart } from '@/lib/cart-context'
import { useWishlist } from '@/lib/wishlist-context'

const themeMap: Record<WebsiteTheme, { hero: string; button: string; badge: string; soft: string }> = {
  emerald: {
    hero: 'from-emerald-600 via-green-600 to-lime-500',
    button: 'bg-emerald-600 hover:bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    soft: 'bg-emerald-50 border-emerald-100',
  },
  midnight: {
    hero: 'from-slate-900 via-slate-800 to-indigo-900',
    button: 'bg-slate-900 hover:bg-slate-800',
    badge: 'bg-slate-100 text-slate-700',
    soft: 'bg-slate-50 border-slate-200',
  },
  sunset: {
    hero: 'from-orange-500 via-rose-500 to-fuchsia-600',
    button: 'bg-rose-600 hover:bg-rose-500',
    badge: 'bg-orange-100 text-orange-700',
    soft: 'bg-orange-50 border-orange-100',
  },
}

export default function MerchantMiniWebsitePage() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<any | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addedProduct, setAddedProduct] = useState<any | null>(null)
  const { addItem, getItemCount, getTotal } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()

  const merchantId = useMemo(() => extractMerchantIdFromSlug(params?.slug || ''), [params])
  const theme = (searchParams.get('theme') || 'emerald') as WebsiteTheme
  const layout = (searchParams.get('layout') || 'classic') as WebsiteLayout
  const themeStyle = themeMap[theme] || themeMap.emerald
  const cartCount = getItemCount()
  const cartTotal = getTotal()
  const marketplaceCheckoutPath = '/marketplace?view=cart'

  useEffect(() => {
    const loadStorefront = async () => {
      if (!merchantId) {
        setLoading(false)
        return
      }

      try {
        const [profileResponse, productResponse] = await Promise.all([
          fetch(`/api/user/profile?userId=${encodeURIComponent(merchantId)}`, { cache: 'no-store' }),
          fetch(`/api/products/merchant?merchantId=${encodeURIComponent(merchantId)}`, { cache: 'no-store' }),
        ])

        const profileResult = await profileResponse.json()
        const productResult = await productResponse.json()

        if (profileResult.success) setProfile(profileResult.data)
        if (productResult.success && Array.isArray(productResult.data)) setProducts(productResult.data)
      } catch {
        // ignore and show fallback UI
      } finally {
        setLoading(false)
      }
    }

    loadStorefront()
  }, [merchantId])

  const handleShare = async () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
    const shareData = {
      title: profile?.business_name || 'Merchant storefront',
      text: `Check out ${profile?.business_name || 'this merchant'} on BigCat`,
      url: currentUrl,
    }

    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await navigator.clipboard.writeText(currentUrl)
      alert('Store link copied to clipboard.')
    }
  }

  const handleAddToCart = (product: any) => {
    if (Number(product.stock || 0) <= 0) {
      return
    }

    addItem({
      id: String(product.id),
      productId: String(product.id),
      name: product.name,
      price: Number(product.price || 0),
      quantity: 1,
      merchantId,
      merchantName: profile?.business_name || profile?.full_name || 'Merchant',
    })
    setAddedProduct(product)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-xl font-bold text-foreground mb-2">Storefront unavailable</h1>
          <p className="text-muted-foreground mb-4">This merchant website could not be loaded right now.</p>
          <Link href="/marketplace" className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Go to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  const gridClass = layout === 'bold'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
    : layout === 'minimal'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'
      : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'

  return (
    <div className="min-h-screen bg-background">
      <section className={`bg-gradient-to-r ${themeStyle.hero} px-4 py-8 text-white`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80 mb-2">BigCat Mini Website</p>
              <h1 className="text-3xl md:text-5xl font-bold mb-3">{profile.business_name || profile.full_name || 'Merchant Store'}</h1>
              <p className="max-w-2xl text-sm md:text-base text-white/85">
                {profile.business_description || 'Trusted merchant on BigCat Marketplace.'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {profile.business_category && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${themeStyle.badge}`}>
                    <Tag className="w-3 h-3" />
                    {profile.business_category}
                  </span>
                )}
                {profile.location && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <MapPin className="w-3 h-3" />
                    {profile.location}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[140px]">
              <button onClick={handleShare} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25 transition-colors flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <Link href="/marketplace" className={`rounded-xl ${themeStyle.button} px-4 py-2 text-sm font-semibold text-center transition-colors flex items-center justify-center gap-2`}>
                <ShoppingBag className="w-4 h-4" />
                Shop on BigCat
              </Link>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Cart</p>
                <p className="text-xs text-muted-foreground">{cartCount} item{cartCount !== 1 ? 's' : ''} ready for checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-primary">{formatNaira(cartTotal)}</p>
              <Link href={marketplaceCheckoutPath} className={`rounded-xl ${themeStyle.button} px-4 py-2 text-sm font-semibold text-white`}>
                Checkout on Marketplace
              </Link>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-4 ${themeStyle.soft}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">About this store</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This mini website is auto-generated for the merchant and can be customized from their dashboard.
              </p>
            </div>
            <a
              href={`mailto:${profile.email || 'support@bigcat.ng'}`}
              className={`rounded-xl ${themeStyle.button} px-4 py-2 text-sm font-semibold text-white inline-flex items-center justify-center gap-2`}
            >
              Contact Store
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-foreground">Featured products</h2>
            <span className="text-sm text-muted-foreground">{products.length} item{products.length !== 1 ? 's' : ''}</span>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Products will appear here as the merchant updates their storefront.</p>
            </div>
          ) : (
            <div className={gridClass}>
              {products.slice(0, 12).map((product) => {
                const availableStock = Math.max(0, Number(product.stock || 0))
                const isOutOfStock = availableStock <= 0

                return (
                <div key={product.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  <div className="aspect-[4/3] bg-secondary overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground line-clamp-2">{product.name}</p>
                      <button
                        onClick={() =>
                          toggleItem({
                            id: String(product.id),
                            productId: String(product.id),
                            name: product.name,
                            price: Number(product.price || 0),
                            category: product.category || 'General',
                            image: product.images?.[0] || product.image_url || null,
                            merchant: {
                              id: merchantId,
                              business_name: profile.business_name || profile.full_name || 'Merchant',
                              logo_url: profile.logo_url || profile.avatar_url || '',
                              location: profile.location || 'Nigeria',
                            },
                          })
                        }
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                          isInWishlist(String(product.id))
                            ? 'border-rose-200 bg-rose-50 text-rose-500'
                            : 'border-border bg-card text-muted-foreground hover:text-rose-500'
                        }`}
                        aria-label={isInWishlist(String(product.id)) ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart className={`w-4 h-4 ${isInWishlist(String(product.id)) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <p className="text-primary font-bold mt-1">{formatNaira(Number(product.price || 0))}</p>
                    <p className={`mt-1 text-xs ${isOutOfStock ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {isOutOfStock ? 'Out of stock' : `${availableStock} available`}
                    </p>
                    <div className="mt-3 space-y-2">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock}
                        className={`w-full rounded-xl py-2 text-sm font-semibold text-white ${isOutOfStock ? 'bg-slate-300 cursor-not-allowed' : themeStyle.button}`}
                      >
                        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                      <Link
                        href={marketplaceCheckoutPath}
                        className="block w-full rounded-xl border border-border bg-secondary py-2 text-center text-sm font-medium text-foreground"
                      >
                        Checkout
                      </Link>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </main>

      {addedProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                {addedProduct.images?.[0] ? (
                  <img src={addedProduct.images[0]} alt={addedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    Item
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-foreground">Added to cart</p>
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2">{addedProduct.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{profile.business_name || 'Merchant store'}</p>
                <p className="text-sm font-bold text-primary mt-2">{formatNaira(Number(addedProduct.price || 0))}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link
                href={marketplaceCheckoutPath}
                onClick={() => setAddedProduct(null)}
                className={`block w-full rounded-xl ${themeStyle.button} py-3 text-center text-sm font-semibold text-white`}
              >
                Proceed to Marketplace Checkout
              </Link>
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
