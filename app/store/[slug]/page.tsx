'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Loader2, MapPin, Share2, Store, Tag, ShoppingBag, ExternalLink, ShoppingCart, CheckCircle2, Heart, UserPlus, UserCheck, Users } from 'lucide-react'
import { useRole } from '@/lib/role-context'
import { formatNaira } from '@/lib/currency-utils'
import { extractMerchantIdFromSlug, normalizeWebsiteBannerConfig, type WebsiteLayout, type WebsiteTheme } from '@/lib/merchant-website'
import { useCart } from '@/lib/cart-context'
import { useWishlist } from '@/lib/wishlist-context'

const themeMap: Record<WebsiteTheme, { hero: string; button: string; badge: string; soft: string; accent: string }> = {
  emerald: {
    hero: 'from-emerald-600 via-green-600 to-lime-500',
    button: 'bg-emerald-600 hover:bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    soft: 'bg-emerald-50 border-emerald-100',
    accent: 'text-emerald-600',
  },
  midnight: {
    hero: 'from-slate-900 via-slate-800 to-indigo-900',
    button: 'bg-slate-900 hover:bg-slate-800',
    badge: 'bg-slate-100 text-slate-700',
    soft: 'bg-slate-50 border-slate-200',
    accent: 'text-slate-900',
  },
  sunset: {
    hero: 'from-orange-500 via-rose-500 to-fuchsia-600',
    button: 'bg-rose-600 hover:bg-rose-500',
    badge: 'bg-orange-100 text-orange-700',
    soft: 'bg-orange-50 border-orange-100',
    accent: 'text-rose-600',
  },
  sapphire: {
    hero: 'from-blue-600 via-cyan-500 to-teal-500',
    button: 'bg-blue-600 hover:bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    soft: 'bg-blue-50 border-blue-100',
    accent: 'text-blue-600',
  },
  rose: {
    hero: 'from-rose-500 via-pink-500 to-red-500',
    button: 'bg-rose-600 hover:bg-rose-500',
    badge: 'bg-rose-100 text-rose-700',
    soft: 'bg-rose-50 border-rose-100',
    accent: 'text-rose-600',
  },
  gold: {
    hero: 'from-yellow-600 via-amber-500 to-orange-500',
    button: 'bg-amber-600 hover:bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    soft: 'bg-amber-50 border-amber-100',
    accent: 'text-amber-600',
  },
  slate: {
    hero: 'from-gray-700 via-gray-600 to-gray-800',
    button: 'bg-gray-700 hover:bg-gray-600',
    badge: 'bg-gray-200 text-gray-800',
    soft: 'bg-gray-50 border-gray-200',
    accent: 'text-gray-700',
  },
  violet: {
    hero: 'from-violet-600 via-purple-600 to-fuchsia-500',
    button: 'bg-violet-600 hover:bg-violet-500',
    badge: 'bg-violet-100 text-violet-700',
    soft: 'bg-violet-50 border-violet-100',
    accent: 'text-violet-600',
  },
  teal: {
    hero: 'from-teal-600 via-cyan-500 to-blue-500',
    button: 'bg-teal-600 hover:bg-teal-500',
    badge: 'bg-teal-100 text-teal-700',
    soft: 'bg-teal-50 border-teal-100',
    accent: 'text-teal-600',
  },
}

const THEME_IDS: WebsiteTheme[] = ['emerald', 'midnight', 'sunset', 'sapphire', 'rose', 'gold', 'slate', 'violet', 'teal']
const LAYOUT_IDS: WebsiteLayout[] = ['classic', 'minimal', 'bold', 'modern', 'elegant', 'playful', 'professional', 'showcase']

function isWebsiteTheme(value: string | null | undefined): value is WebsiteTheme {
  return THEME_IDS.includes(value as WebsiteTheme)
}

function isWebsiteLayout(value: string | null | undefined): value is WebsiteLayout {
  return LAYOUT_IDS.includes(value as WebsiteLayout)
}

function getBannerStyles(template: string | undefined) {
  if (template === 'promo') {
    return {
      shell: 'border-fuchsia-200 bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-400 text-white',
      badge: 'bg-white/15 text-white',
      button: 'bg-white text-fuchsia-700 hover:bg-white/90',
    }
  }

  if (template === 'product') {
    return {
      shell: 'border-amber-200 bg-gradient-to-r from-zinc-950 via-amber-900 to-orange-500 text-white',
      badge: 'bg-white/15 text-white',
      button: 'bg-white text-amber-700 hover:bg-white/90',
    }
  }

  return {
    shell: 'border-emerald-200 bg-gradient-to-r from-emerald-600 via-lime-500 to-teal-500 text-white',
    badge: 'bg-white/15 text-white',
    button: 'bg-white text-emerald-700 hover:bg-white/90',
  }
}

export default function MerchantMiniWebsitePage() {
  const params = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<any | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [storeItemType, setStoreItemType] = useState<'products' | 'services'>('products')
  const [loading, setLoading] = useState(true)
  const [addedProduct, setAddedProduct] = useState<any | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [followMessage, setFollowMessage] = useState('')
  const { user } = useRole()
  const { addItem, getItemCount, getTotal } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()

  const merchantId = useMemo(() => extractMerchantIdFromSlug(params?.slug || ''), [params])

  const theme: WebsiteTheme = isWebsiteTheme(profile?.website_theme)
    ? profile.website_theme
    : 'emerald'

  const layout: WebsiteLayout = isWebsiteLayout(profile?.website_layout)
    ? profile.website_layout
    : 'classic'

  const themeStyle = themeMap[theme] || themeMap.emerald
  const banner = normalizeWebsiteBannerConfig(profile?.website_banner)
  const [bannerVariant, setBannerVariant] = useState<'A' | 'B'>('A')
  const bannerStyles = getBannerStyles(banner.template)
  const activeBanner = bannerVariant === 'B' && banner.abTestEnabled && banner.variantB
    ? {
        badge: banner.variantB.badge,
        headline: banner.variantB.headline,
        subheadline: banner.variantB.subheadline,
        ctaText: banner.variantB.ctaText,
      }
    : {
        badge: banner.badge,
        headline: banner.headline,
        subheadline: banner.subheadline,
        ctaText: banner.ctaText,
      }
  const cartCount = getItemCount()
  const cartTotal = getTotal()
  const isServiceStore = storeItemType === 'services'
  const marketplaceCheckoutPath = '/marketplace?view=cart'
  const marketplaceServicesPath = '/marketplace?view=services'

  useEffect(() => {
    const loadStorefront = async () => {
      if (!merchantId) {
        setLoading(false)
        return
      }

      try {
         const profileResponse = await fetch(`/api/user/profile?userId=${encodeURIComponent(merchantId)}`, { cache: 'no-store' })
         const profileResult = await profileResponse.json()

         if (profileResult.success) {
           setProfile(profileResult.data)

           // Load products or services based on merchant_type
           const merchantType = profileResult.data.merchant_type === 'services' ? 'services' : 'products'

           if (merchantType === 'services') {
             const servicesResponse = await fetch(`/api/services?merchantId=${encodeURIComponent(merchantId)}`, { cache: 'no-store' })
             const servicesResult = await servicesResponse.json()
             if (servicesResult.success && Array.isArray(servicesResult.data) && servicesResult.data.length > 0) {
               setStoreItemType('services')
               setProducts(servicesResult.data)
             } else {
               // Fallback for merchants with stale profile metadata.
               const productResponse = await fetch(`/api/products/merchant?merchantId=${encodeURIComponent(merchantId)}`, { cache: 'no-store' })
               const productResult = await productResponse.json()
               setStoreItemType('products')
               setProducts(productResult.success && Array.isArray(productResult.data) ? productResult.data : [])
             }
           } else {
             const productResponse = await fetch(`/api/products/merchant?merchantId=${encodeURIComponent(merchantId)}`, { cache: 'no-store' })
             const productResult = await productResponse.json()
             const productRows = productResult.success && Array.isArray(productResult.data) ? productResult.data : []

             if (productRows.length > 0) {
               setStoreItemType('products')
               setProducts(productRows)
             } else {
               // If products are empty, try services so service merchants still render correctly.
               const servicesResponse = await fetch(`/api/services?merchantId=${encodeURIComponent(merchantId)}`, { cache: 'no-store' })
               const servicesResult = await servicesResponse.json()
               const serviceRows = servicesResult.success && Array.isArray(servicesResult.data) ? servicesResult.data : []

               if (serviceRows.length > 0) {
                 setStoreItemType('services')
                 setProducts(serviceRows)
               } else {
                 setStoreItemType('products')
                 setProducts([])
               }
             }
           }
         }
      } catch {
        // ignore and show fallback UI
      } finally {
        setLoading(false)
      }
    }

    loadStorefront()
  }, [merchantId])

  useEffect(() => {
    if (!merchantId || !banner.abTestEnabled) {
      setBannerVariant('A')
      return
    }

    const bucketKey = `merchant-banner-ab:${merchantId}`
    const existing = typeof window !== 'undefined' ? localStorage.getItem(bucketKey) : null
    const selected = existing === 'B' || existing === 'A'
      ? existing
      : (Math.random() < 0.5 ? 'A' : 'B')

    if (typeof window !== 'undefined') {
      localStorage.setItem(bucketKey, selected)
    }

    setBannerVariant(selected)

    void fetch('/api/merchant/banner-ab/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId,
        variant: selected,
        eventType: 'view',
      }),
    }).catch(() => null)
  }, [merchantId, banner.abTestEnabled])

  useEffect(() => {
    const loadFollowSummary = async () => {
      if (!merchantId) return

      try {
        const buyerQuery = user?.userId ? `&buyerId=${encodeURIComponent(user.userId)}` : ''
        const response = await fetch(`/api/merchant/follow?merchantId=${encodeURIComponent(merchantId)}${buyerQuery}`, { cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (result?.success && result?.data) {
          setIsFollowing(Boolean(result.data.isFollowing))
          setFollowerCount(Number(result.data.followerCount || 0))
        }
      } catch {
        // ignore follow summary errors
      }
    }

    loadFollowSummary()
  }, [merchantId, user?.userId])

  const handleToggleFollow = async () => {
    if (!user?.userId) {
      setFollowMessage('Please sign in as a buyer to follow this merchant.')
      return
    }

    if (!merchantId) return

    setFollowLoading(true)
    try {
      const response = await fetch(`/api/merchant/follow?merchantId=${encodeURIComponent(merchantId)}&buyerId=${encodeURIComponent(user.userId)}`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId: user.userId, merchantId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!result?.success) {
        setFollowMessage(String(result?.error || 'Could not update follow status right now.'))
        return
      }

      setIsFollowing(Boolean(result?.data?.isFollowing))
      setFollowerCount(Number(result?.data?.followerCount || 0))
      setFollowMessage(isFollowing ? 'You unfollowed this merchant.' : 'You are now following this merchant.')
    } catch {
      setFollowMessage('Could not update follow status right now.')
    } finally {
      setFollowLoading(false)
    }
  }

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

            <div className="flex flex-col gap-2 min-w-[160px]">
              <button onClick={handleShare} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25 transition-colors flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isFollowing
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <span className="text-xs text-white/90 inline-flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {followerCount.toLocaleString('en-NG')} follower{followerCount === 1 ? '' : 's'}
              </span>
              <Link href={isServiceStore ? marketplaceServicesPath : '/marketplace'} className={`rounded-xl ${themeStyle.button} px-4 py-2 text-sm font-semibold text-center transition-colors flex items-center justify-center gap-2`}>
                <ShoppingBag className="w-4 h-4" />
                {isServiceStore ? 'Browse Services' : 'Shop on BigCat'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {banner.enabled && (
        <section className="px-4 pt-5">
          <div className={`max-w-6xl mx-auto rounded-[28px] border overflow-hidden shadow-sm ${bannerStyles.shell}`}>
            {/* Banner with optional product image */}
            <div className={`relative w-full ${banner.productImageUrl && banner.productImageLayout === 'full-bleed' ? 'min-h-96' : 'p-6'}`}>
              {/* Background image if full-bleed */}
              {banner.productImageUrl && banner.productImageLayout === 'full-bleed' && (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url('${banner.productImageUrl}')`,
                      backgroundSize: 'cover',
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/20" />
                </>
              )}
              
              {/* Content wrapper - responsive layout */}
              <div className={`relative flex flex-col gap-5 ${banner.productImageUrl && banner.productImageLayout !== 'full-bleed' ? 'md:flex-row md:items-end md:justify-between' : ''}`}>
                {/* Left side: Text content with safe zone */}
                <div className={`max-w-2xl ${banner.productImageUrl && banner.productImageLayout === 'left' ? 'md:order-2' : ''}`}>
                  <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${bannerStyles.badge}`}>
                    {activeBanner.badge}
                  </div>
                  <h2 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">{activeBanner.headline}</h2>
                  <p className="mt-2 text-sm text-white/85 md:text-base">{activeBanner.subheadline}</p>
                  <div className="mt-4">
                    <Link
                      href="#store-items"
                      onClick={() => {
                        if (!merchantId || !banner.abTestEnabled) return
                        void fetch('/api/merchant/banner-ab/track', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            merchantId,
                            variant: bannerVariant,
                            eventType: 'click',
                          }),
                        }).catch(() => null)
                      }}
                      className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-colors ${bannerStyles.button}`}
                    >
                      {activeBanner.ctaText}
                    </Link>
                  </div>
                </div>

                {/* Right/left side: Product image if side layout */}
                {banner.productImageUrl && banner.productImageLayout !== 'full-bleed' && (
                  <div className={`w-full md:w-80 h-64 md:h-80 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 ${banner.productImageLayout === 'left' ? 'md:order-1' : 'md:order-2'}`}>
                    <img
                      src={banner.productImageUrl}
                      alt="Promoted product"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {followMessage && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-foreground">
            {followMessage}
          </div>
        )}
        {!isServiceStore && (
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
        )}

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

        <div id="store-items">
          <div className="flex items-center justify-between mb-3">
             <h2 className="text-xl font-bold text-foreground">Featured {isServiceStore ? 'services' : 'products'}</h2>
            <span className="text-sm text-muted-foreground">{products.length} item{products.length !== 1 ? 's' : ''}</span>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
               <p className="text-sm text-muted-foreground">{isServiceStore ? 'Services will appear here as the merchant updates their storefront.' : 'Products will appear here as the merchant updates their storefront.'}</p>
            </div>
          ) : isServiceStore ? (
            <div className={gridClass}>
              {products.slice(0, 12).map((service) => {
                const workingDays = Array.isArray(service.working_days) ? service.working_days : []
                const location = [service.service_city, service.service_state].filter(Boolean).join(', ')

                return (
                  <div key={service.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground line-clamp-2">{service.title || service.name || 'Service'}</p>
                      {service.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                          {service.category}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{service.description || 'No description provided yet.'}</p>

                    {location && (
                      <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {location}
                      </p>
                    )}

                    {workingDays.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {workingDays.join(', ')}{service.working_hours ? ` • ${service.working_hours}` : ''}
                      </p>
                    )}

                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-2">
                      <p className="text-[11px] font-semibold text-primary">Pricing by agreement</p>
                      <p className="text-[11px] text-muted-foreground">Discuss scope and price in chat, then pay safely in checkout.</p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link
                        href={marketplaceServicesPath}
                        className={`block w-full rounded-xl ${themeStyle.button} py-2 text-center text-sm font-semibold text-white`}
                      >
                        Open Services
                      </Link>
                      <Link
                        href={marketplaceServicesPath}
                        className="block w-full rounded-xl border border-border bg-secondary py-2 text-center text-sm font-medium text-foreground"
                      >
                        Request Quote
                      </Link>
                    </div>
                  </div>
                )
              })}
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
                      <img src={product.images[0]} alt={product.name || product.title || 'Item'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground line-clamp-2">{product.name || product.title || 'Product'}</p>
                      <button
                        onClick={() =>
                          toggleItem({
                            id: String(product.id),
                            productId: String(product.id),
                            name: product.name || product.title || 'Product',
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
