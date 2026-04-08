"use client"

import { useState, useEffect } from "react"
import { getOrCreateConversation } from "@/lib/message-actions"
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
} from "lucide-react"
import Image from "next/image"
import { formatNaira } from "@/lib/currency-utils"
import { useCart } from "@/lib/cart-context"
import { getMerchantProducts } from "@/lib/product-actions"

interface VendorPageProps {
  vendor: {
    id: string | number
    name: string
    category: string
    rating: number
    reviews: number
    location: string
    badge: string
    badgeColor: string
    bgColor: string
    initials: string
    iconColor: string
    description: string
  }
  onBack: () => void
  onChatVendor?: () => void
  onBrowseMore?: () => void
  onViewProduct?: (productId: string) => void
}

const portfolioImages = [
  { id: 1, label: "Formal Wear" },
  { id: 2, label: "Dresses" },
  { id: 3, label: "Casual" },
  { id: 4, label: "Accessories" },
]

const reviews = [
  {
    id: 1,
    name: "Adaeze O.",
    date: "2 days ago",
    rating: 5,
    comment: "Excellent service and quality products! Will definitely order again.",
    verified: true,
  },
  {
    id: 2,
    name: "Chidi M.",
    date: "1 week ago",
    rating: 4,
    comment: "Good quality, fast delivery. The packaging was also very nice.",
    verified: true,
  },
  {
    id: 3,
    name: "Funke A.",
    date: "2 weeks ago",
    rating: 5,
    comment: "This vendor is amazing! Very responsive and professional.",
    verified: false,
  },
]

export function VendorPage({ vendor, onBack, onChatVendor, onBrowseMore, onViewProduct }: VendorPageProps) {
  const { user } = useRole()
  const [addedToCart, setAddedToCart] = useState<string | null>(null)
  const { addItem } = useCart()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [vendor.id])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const result = await getMerchantProducts(String(vendor.id))
      if (result.success && result.data) {
        setProducts(result.data)
      }
    } catch (error) {
      console.error("Error loading products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChatVendor = async () => {
    if (!user?.userId) {
      // console.error('[v0] User ID not found')
      onChatVendor?.()
      return
    }

    setChatLoading(true)
    try {
      const result = await getOrCreateConversation(user.userId, String(vendor.id))
      if (result.success) {
        // Conversation created, now open chat
        onChatVendor?.()
      }
    } catch (error) {
      // console.error('[v0] Error creating conversation:', error)
    } finally {
      setChatLoading(false)
    }
  }

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: parseFloat(product.price),
      quantity: 1,
      merchantId: String(vendor.id),
      merchantName: vendor.name,
    })
    setAddedToCart(product.id)
    setTimeout(() => setAddedToCart(null), 2000)
  }

  const getAiRecommendation = () => {
    if (vendor.rating >= 4.9) {
      return { text: "Top Rated This Week", icon: TrendingUp, color: "bg-amber-50 text-amber-700 border-amber-200" }
    } else if (vendor.reviews > 1000) {
      return { text: "Highly Active Vendor", icon: Sparkles, color: "bg-primary/10 text-primary border-primary/20" }
    } else if (vendor.badge === "Fast Response") {
      return { text: "Quick Responder", icon: Clock, color: "bg-green-50 text-green-700 border-green-200" }
    }
    return { text: "Recommended by AI", icon: Sparkles, color: "bg-primary/10 text-primary border-primary/20" }
  }

  const aiRec = getAiRecommendation()

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-foreground">Vendor Profile</span>
          <div className="flex items-center gap-1">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Share">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted-foreground hover:text-rose-500 transition-colors" aria-label="Save">
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-28">
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
              <div className={`w-20 h-20 rounded-2xl ${vendor.bgColor} flex items-center justify-center flex-shrink-0 shadow-md`}>
                <span className={`font-bold text-2xl ${vendor.iconColor}`}>{vendor.initials}</span>
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
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-foreground">{vendor.rating}</span>
                    <span className="text-muted-foreground text-sm">({vendor.reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm">{vendor.location}</span>
                  </div>
                </div>
              </div>
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
            <p className="text-muted-foreground leading-relaxed">
              {vendor.description}. We specialize in premium quality products and services with over 5 years of experience. 
              Our commitment to excellence has earned us thousands of satisfied customers. 
              Every order is handled with care and attention to detail.
            </p>
          </div>
        </section>

        {/* Portfolio Gallery */}
        <section className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-semibold text-foreground text-lg">Portfolio</h2>
            <button 
              onClick={onBrowseMore}
              className="text-sm text-primary font-medium flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {portfolioImages.map((img) => (
              <div
                key={img.id}
                className="flex-shrink-0 relative group"
              >
                <div className="w-32 h-32 rounded-2xl bg-secondary border border-border overflow-hidden shadow-sm">
                  <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                    <span className="text-4xl opacity-50">
                      {img.id === 1 ? "👔" : img.id === 2 ? "👗" : img.id === 3 ? "👕" : "👜"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">{img.label}</p>
              </div>
            ))}
          </div>
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
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-muted-foreground">4.8</span>
                        </div>
                        <span className="text-muted-foreground">In stock</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`flex-shrink-0 px-4 py-2 h-fit text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                        addedToCart === product.id
                          ? "bg-green-500 text-white"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {addedToCart === product.id ? "Added ✓" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground text-lg">Reviews</h2>
            <button 
              onClick={onBrowseMore}
              className="text-sm text-primary font-medium flex items-center gap-0.5"
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-card border border-border rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                      <span className="font-medium text-foreground text-sm">{review.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm">{review.name}</span>
                        {review.verified && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky CTA Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-4 shadow-lg">
        <div className="flex gap-3">
          <button 
            onClick={handleChatVendor}
            disabled={chatLoading}
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
