"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/lib/role-context"
import {
  ArrowLeft,
  Star,
  MapPin,
  MessageCircle,
  ShoppingBag,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Share2,
  Heart,
  Shield,
  Loader2,
  Package,
  ImageIcon,
  ShoppingCart,
  Globe,
  ExternalLink,
  UserPlus,
  UserCheck,
  Users,
} from "lucide-react"
import Image from "next/image"
import { formatNaira } from "@/lib/currency-utils"
import { BrandWordmark } from "./brand-wordmark"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { isUserSuspended } from "@/lib/trust-safety"
import { getMerchantMiniWebsitePath } from "@/lib/merchant-website"

interface VendorPageProps {
  vendor: {
    id: string | number
    name: string
    category: string
    rating?: number | null
    reviews?: number
    location: string
    badge: string
    badgeColor: string
    bgColor: string
    initials: string
    iconColor: string
    description: string
    logo_url?: string
    avatar_url?: string
  }
  onBack: () => void
  onChatVendor?: (conversation?: any) => void
  onBrowseMore?: () => void
  onViewProduct?: (productId: string) => void
  onOpenCart?: () => void
  onCheckout?: () => void
}

export function VendorPage({ vendor, onBack, onChatVendor, onBrowseMore, onViewProduct, onOpenCart, onCheckout }: VendorPageProps) {
  const { user } = useRole()
  const [addedToCart, setAddedToCart] = useState<string | null>(null)
  const [popupProduct, setPopupProduct] = useState<any | null>(null)
  const { addItem, getItemCount, getTotal } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [isSuspended, setIsSuspended] = useState(false)
  const [policyNotice, setPolicyNotice] = useState("")
  const [saved, setSaved] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [vendor.id])

  useEffect(() => {
    setIsSuspended(isUserSuspended(user?.userId))
  }, [user?.userId])

  useEffect(() => {
    loadFollowSummary()
  }, [vendor?.id, user?.userId])

  const loadFollowSummary = async () => {
    const merchantId = String(vendor?.id || '').trim()
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

  const handleToggleFollow = async () => {
    if (!user?.userId) {
      setPolicyNotice('Please sign in as a buyer to follow this merchant.')
      return
    }

    const merchantId = String(vendor?.id || '').trim()
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
        setPolicyNotice(String(result?.error || 'Could not update follow status right now.'))
        return
      }

      setIsFollowing(Boolean(result?.data?.isFollowing))
      setFollowerCount(Number(result?.data?.followerCount || 0))
      setPolicyNotice(isFollowing ? 'You unfollowed this merchant.' : 'You are now following this merchant.')
    } catch {
      setPolicyNotice('Could not update follow status right now.')
    } finally {
      setFollowLoading(false)
    }
  }

  const loadProducts = async () => {
    const merchantId = String(vendor?.id || '').trim()
    if (!merchantId) {
      setProducts([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/products/merchant?merchantId=${encodeURIComponent(merchantId)}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Merchant products endpoint returned ${response.status}`)
      }

      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setProducts(result.data)
        return
      }

      throw new Error(result.error || 'Merchant products endpoint failed')
    } catch (error) {
      console.error("Error loading products from merchant endpoint:", error)

      // Fallback path: fetch marketplace products and filter by merchant_id.
      try {
        const fallbackResponse = await fetch('/api/products', { cache: 'no-store' })
        if (!fallbackResponse.ok) throw new Error(`Fallback products endpoint returned ${fallbackResponse.status}`)

        const fallbackResult = await fallbackResponse.json()
        if (fallbackResult.success && Array.isArray(fallbackResult.data)) {
          const filtered = fallbackResult.data.filter((product: any) => String(product.merchant_id) === merchantId)
          setProducts(filtered)
          if (filtered.length === 0) {
            setPolicyNotice('No products found for this vendor yet.')
          }
        } else {
          setProducts([])
          setPolicyNotice('Could not load vendor products right now. Please try again.')
        }
      } catch (fallbackError) {
        console.error('Fallback product load failed:', fallbackError)
        setProducts([])
        setPolicyNotice('Could not load vendor products right now. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChatVendor = async () => {
    if (isSuspended) {
      setPolicyNotice("Your account has been temporarily suspended for violating platform policies.")
      return
    }

    if (!user?.userId) {
      // console.error('[v0] User ID not found')
      onChatVendor?.()
      return
    }

    setChatLoading(true)
    try {
      const response = await fetch('/api/messages/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ buyerId: user.userId, merchantId: String(vendor.id) }),
      })
      const result = await response.json()
      if (result.success) {
        onChatVendor?.({
          id: result.data?.id,
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorLocation: vendor.location,
          vendorRating: vendor.rating,
          lastMessage: 'Start a conversation',
          timestamp: new Date(),
          unread: 0,
          avatar: vendor.initials?.charAt(0) || 'V',
        })
      }
    } catch (error) {
      // console.error('[v0] Error creating conversation:', error)
    } finally {
      setChatLoading(false)
    }
  }

  const handleShareVendor = async () => {
    const shareData = {
      title: vendor.name,
      text: `Check out ${vendor.name} on BigCat Marketplace`,
      url: window.location.href,
    }

    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setPolicyNotice("Vendor link copied to clipboard.")
    }
  }

  const handleAddToCart = (product: any) => {
    if (isSuspended) {
      setPolicyNotice("Your account has been temporarily suspended for violating platform policies.")
      return
    }

    if (Number(product.stock || 0) <= 0) {
      setPolicyNotice("This item is currently out of stock.")
      return
    }

    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: parseFloat(product.price),
      quantity: 1,
      merchantId: String(vendor.id),
      merchantName: vendor.name,
    })
    setPopupProduct(product)
    setAddedToCart(product.id)
    setTimeout(() => setAddedToCart(null), 2000)
  }

  const getAiRecommendation = () => {
    if (typeof vendor.rating === 'number' && vendor.rating >= 4.9) {
      return { text: "Top Rated This Week", icon: TrendingUp, color: "bg-amber-50 text-amber-700 border-amber-200" }
    } else if (Number(vendor.reviews || 0) > 1000) {
      return { text: "Highly Active Vendor", icon: Sparkles, color: "bg-primary/10 text-primary border-primary/20" }
    } else if (vendor.badge === "Fast Response") {
      return { text: "Quick Responder", icon: Clock, color: "bg-green-50 text-green-700 border-green-200" }
    }
    return { text: "Recommended by AI", icon: Sparkles, color: "bg-primary/10 text-primary border-primary/20" }
  }

  const aiRec = getAiRecommendation()
  const cartCount = getItemCount()
  const cartTotal = getTotal()
  const merchantWebsitePath = getMerchantMiniWebsitePath({
    merchantId: String(vendor.id),
    businessName: vendor.name,
  })
  const vendorImage =
    vendor.logo_url ||
    vendor.avatar_url ||
    products.find((product: any) => product?.merchant_profiles?.logo_url || product?.merchant_profiles?.avatar_url)?.merchant_profiles?.logo_url ||
    products.find((product: any) => product?.merchant_profiles?.logo_url || product?.merchant_profiles?.avatar_url)?.merchant_profiles?.avatar_url ||
    null

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3">
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenCart?.()}
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={handleShareVendor}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setSaved((prev) => !prev)
                setPolicyNotice(saved ? 'Vendor removed from saved list.' : 'Vendor saved to your favorites.')
              }}
              className="p-2 text-muted-foreground hover:text-rose-500 transition-colors"
              aria-label="Save"
            >
              <Heart className={`w-5 h-5 ${saved ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-28">
        {policyNotice && (
          <div className="px-4 pt-4">
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {policyNotice}
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="px-4 pt-6 pb-5">
          {/* AI Recommendation Badge */}
          <div className="flex justify-center mb-5">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${aiRec.color} text-sm font-medium shadow-sm`}>
              <aiRec.icon className="w-4 h-4" />
              {aiRec.text}
            </div>
          </div>

          {/* Vendor Info Card */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className={`w-20 h-20 rounded-2xl ${vendor.bgColor} flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden`}>
                {vendorImage ? (
                  <Image
                    src={vendorImage}
                    alt={vendor.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={`font-bold text-2xl ${vendor.iconColor}`}>{vendor.initials}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="font-bold text-xl text-foreground">{vendor.name}</h1>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mb-3">{vendor.category}</p>
                
                {/* Stats Row */}
                <div className="flex items-center gap-4 flex-wrap">
                  {typeof vendor.rating === 'number' && vendor.rating > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-semibold text-foreground">{vendor.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground text-sm">({vendor.reviews || 0} reviews)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">{vendor.location}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <a
                href={merchantWebsitePath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Visit Website
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  isFollowing
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <UserCheck className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                {followerCount.toLocaleString('en-NG')} follower{followerCount === 1 ? '' : 's'}
              </span>
            </div>

            {/* Trust Indicators */}
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center gap-6 justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Secure</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-1">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Fast Reply</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-1">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">Trending</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="px-4 mb-6">
          <h2 className="font-semibold text-foreground text-lg mb-3">About</h2>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-muted-foreground leading-relaxed">{vendor.description}</p>
          </div>
        </section>

        {/* Cart Summary */}
        <section className="px-4 mb-6">
          <button
            onClick={() => onOpenCart?.()}
            className="w-full flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm hover:border-primary/30 transition-colors"
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
        </section>

        {/* Products/Services */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground text-lg">Products & Services</h2>
            <button 
              onClick={onBrowseMore}
              className="text-sm text-primary font-medium flex items-center gap-0.5"
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No products yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {product.images && product.images[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{product.description}</p>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-foreground">{formatNaira(parseFloat(product.price))}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`${Number(product.stock || 0) > 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                          {Number(product.stock || 0) > 0 ? `${Number(product.stock || 0)} in stock` : 'Out of stock'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() =>
                          toggleItem({
                            id: String(product.id),
                            productId: String(product.id),
                            name: product.name,
                            price: Number(product.price || 0),
                            category: product.category || vendor.category || 'General',
                            image: product.images?.[0] || product.image_url || null,
                            merchant: {
                              id: String(vendor.id),
                              business_name: vendor.name,
                              logo_url: vendor.logo_url || vendor.avatar_url || '',
                              location: vendor.location,
                            },
                          })
                        }
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                          isInWishlist(String(product.id))
                            ? 'border-rose-200 bg-rose-50 text-rose-500'
                            : 'border-border bg-card text-muted-foreground hover:text-rose-500'
                        }`}
                        aria-label={isInWishlist(String(product.id)) ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart className={`w-4 h-4 ${isInWishlist(String(product.id)) ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={Number(product.stock || 0) <= 0}
                        className={`flex-shrink-0 px-4 py-2 h-fit text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                          Number(product.stock || 0) <= 0
                            ? "bg-secondary text-muted-foreground cursor-not-allowed"
                            : addedToCart === product.id
                              ? "bg-green-500 text-white"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {Number(product.stock || 0) <= 0 ? "Out of Stock" : addedToCart === product.id ? "Added ✓" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {popupProduct && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <p className="font-semibold text-foreground mb-1">Added to cart</p>
            <p className="text-sm font-medium text-foreground line-clamp-2">{popupProduct.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{vendor.name}</p>
            <p className="text-sm font-bold text-primary mt-2">{formatNaira(parseFloat(popupProduct.price || 0))}</p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => {
                  setPopupProduct(null)
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
                onClick={() => setPopupProduct(null)}
                className="w-full rounded-xl bg-secondary py-3 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky CTA Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-4 shadow-lg">
        <div className="flex gap-3">
          <button 
            onClick={handleChatVendor}
            disabled={chatLoading || isSuspended}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-secondary text-foreground font-semibold rounded-2xl hover:bg-secondary/80 transition-colors shadow-sm disabled:opacity-50"
          >
            {chatLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5" />
                Chat Vendor
              </>
            )}
          </button>
          <button 
            onClick={onBrowseMore}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-primary text-primary-foreground font-semibold rounded-2xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
          >
            <ShoppingBag className="w-5 h-5" />
            Browse More
          </button>
        </div>
      </div>

      {/* Checkout Drawer - Removed */}
    </div>
  )
}
