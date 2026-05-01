"use client"

import { useRole } from "@/lib/role-context"
import { logout } from "@/lib/auth-client"
import { BuyerAuth } from "@/components/buyer-auth"
import { VendorPage } from "@/components/vendor-page"
import { ChatInterface } from "@/components/chat-interface"
import { ProductsMarketplace } from "@/components/products-marketplace"
import { CartView } from "@/components/cart-view"
import { CheckoutPage } from "@/components/checkout-page"
import { BuyerOrders } from "@/components/buyer-orders"
import { ServicesMarketplace } from "@/components/services-marketplace"
import { ProductDetailsPage } from "@/components/product-details-page"
import { ProfilePage } from "@/components/profile-page"
import { SettingsPage } from "@/components/settings-page"
import { PaymentMethodsPage } from "@/components/payment-methods-page"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import {
  Home,
  Search,
  ShoppingBag,
  ShoppingCart,
  User,
  Bell,
  MessageSquare,
  Heart,
  ArrowLeft,
  Mic,
  Sparkles,
  Star,
  MapPin,
  ChevronRight,
  Package,
  Zap,
  X,
  LogOut,
  Loader2,
} from "lucide-react"
import { useState, useEffect } from "react"
import { formatNaira } from "@/lib/currency-utils"
import { NotificationsPanel } from "./notifications-panel"
import { ProductGrid } from "./product-card"
import { BrandWordmark } from "./brand-wordmark"
import { NigeriaAiAssistant } from "./nigeria-ai-assistant"
import { getUserStrikeCount, isUserSuspended, resetSafetyState } from "@/lib/trust-safety"

const categories = [
  { name: "Fashion", icon: "👗", color: "bg-rose-50" },
  { name: "Electronics", icon: "💻", color: "bg-blue-50" },
  { name: "Services", icon: "🛠️", color: "bg-amber-50", target: "services" },
  { name: "Beauty", icon: "💄", color: "bg-purple-50" },
  { name: "Sports", icon: "⚽", color: "bg-green-50" },
  { name: "Food", icon: "🍔", color: "bg-orange-50" },
]

const aiSuggestions = [
  "Find a tailor near me",
  "I need a plumber in Lagos",
  "Best electronics deals today",
  "Compare prices for iPhone 15",
]

interface BuyerDashboardNotification {
  id: string
  type: "order" | "delivery" | "message" | "system" | "warning"
  title: string
  message: string
  time: string
  read: boolean
  createdAt?: string
}

export function BuyerDashboard({ onNeedsOnboarding }: { onNeedsOnboarding?: () => void } = {}) {
  const { setRole, setUser, user, isLoading } = useRole()
  const [activeTab, setActiveTab] = useState("home")
  const [searchQuery, setSearchQuery] = useState("")
  const [aiFullscreenOpen, setAiFullscreenOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null)
  const [showProducts, setShowProducts] = useState(false)
  const [showAllMerchants, setShowAllMerchants] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showOrders, setShowOrders] = useState(false)
  const [showServices, setShowServices] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)
  const { items: cartItems, getItemCount: getCartItemCount } = useCart()
  const { items: wishlistItems, getItemCount: getWishlistCount, clearWishlist } = useWishlist()
  const [merchants, setMerchants] = useState<any[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loadingMerchants, setLoadingMerchants] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [showChat, setShowChat] = useState(false)
  const [initialConversation, setInitialConversation] = useState<any | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [cartPopupProduct, setCartPopupProduct] = useState<any | null>(null)
  const [isSuspended, setIsSuspended] = useState(false)
  const [strikeCount, setStrikeCount] = useState(0)
  const [policyNotice, setPolicyNotice] = useState("")
  const [aiSearching, setAiSearching] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [buyerCoordinates, setBuyerCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'ready' | 'fallback' | 'denied'>('idle')
  const [buyerLocationLabel, setBuyerLocationLabel] = useState('')

  const getBuyerNotificationStorageKey = (buyerId: string) => `app_notifications_buyer_${buyerId}`
  const getBuyerOrdersInitKey = (buyerId: string) => `buyer_notif_orders_initialized_${buyerId}`
  const getBuyerOrderStatusKey = (buyerId: string) => `buyer_notif_order_status_${buyerId}`
  const getBuyerUnreadInitKey = (buyerId: string) => `buyer_notif_unread_initialized_${buyerId}`
  const getBuyerUnreadCountKey = (buyerId: string) => `buyer_notif_unread_count_${buyerId}`

  const appendBuyerNotification = (notification: BuyerDashboardNotification) => {
    if (typeof window === "undefined" || !user?.userId) return

    const storageKey = getBuyerNotificationStorageKey(user.userId)
    const existing = JSON.parse(localStorage.getItem(storageKey) || "[]") as BuyerDashboardNotification[]

    if (existing.some((item) => item.id === notification.id)) {
      return
    }

    const nextNotifications = [notification, ...existing].slice(0, 100)
    localStorage.setItem(storageKey, JSON.stringify(nextNotifications))
    window.dispatchEvent(new Event("bigcat-notifications-updated"))
  }

  const trackBuyerOrderNotifications = (orders: any[]) => {
    if (typeof window === "undefined" || !user?.userId) return

    const initKey = getBuyerOrdersInitKey(user.userId)
    const statusKey = getBuyerOrderStatusKey(user.userId)
    const existingMap = JSON.parse(localStorage.getItem(statusKey) || "{}") as Record<string, string>
    const nextMap: Record<string, string> = { ...existingMap }
    const isInitialized = localStorage.getItem(initKey) === "true"

    orders.forEach((order) => {
      const orderId = String(order?.id || "")
      if (!orderId) return

      const nextStatus = String(order?.status || "pending").toLowerCase().trim()
      const prevStatus = existingMap[orderId]

      if (isInitialized && !prevStatus) {
        appendBuyerNotification({
          id: `buyer-order-created-${orderId}`,
          type: "order",
          title: "New order placed",
          message: `Your order ${orderId.slice(0, 8)} has been placed successfully.`,
          time: "Just now",
          read: false,
          createdAt: new Date().toISOString(),
        })
      }

      if (isInitialized && prevStatus && prevStatus !== nextStatus) {
        appendBuyerNotification({
          id: `buyer-order-status-${orderId}-${nextStatus}`,
          type: "delivery",
          title: "Order status updated",
          message: `Order ${orderId.slice(0, 8)} is now ${nextStatus}.`,
          time: "Just now",
          read: false,
          createdAt: new Date().toISOString(),
        })
      }

      nextMap[orderId] = nextStatus
    })

    localStorage.setItem(statusKey, JSON.stringify(nextMap))
    if (!isInitialized) {
      localStorage.setItem(initKey, "true")
    }
  }

  const trackBuyerUnreadMessageNotifications = (totalUnread: number) => {
    if (typeof window === "undefined" || !user?.userId) return

    const initKey = getBuyerUnreadInitKey(user.userId)
    const countKey = getBuyerUnreadCountKey(user.userId)
    const initialized = localStorage.getItem(initKey) === "true"
    const previousCount = Number(localStorage.getItem(countKey) || 0)

    if (!initialized) {
      localStorage.setItem(initKey, "true")
      localStorage.setItem(countKey, String(totalUnread))
      return
    }

    if (totalUnread > previousCount) {
      const incomingCount = totalUnread - previousCount
      appendBuyerNotification({
        id: `buyer-unread-message-${Date.now()}-${totalUnread}`,
        type: "message",
        title: "New message",
        message: incomingCount === 1
          ? "You received a new message from a merchant."
          : `You received ${incomingCount} new messages from merchants.`,
        time: "Just now",
        read: false,
        createdAt: new Date().toISOString(),
      })
    }

    localStorage.setItem(countKey, String(totalUnread))
  }

  useEffect(() => {
    detectBuyerLocation()
  }, [user?.userId])

  useEffect(() => {
    loadMerchants()
    loadProducts()
    loadOrders()
    loadUnreadMessages()
  }, [user?.userId, buyerCoordinates?.latitude, buyerCoordinates?.longitude])

  useEffect(() => {
    loadUnreadMessages()
  }, [activeTab, showChat, user?.userId])

  useEffect(() => {
    const suspended = isUserSuspended(user?.userId)
    setIsSuspended(suspended)
    setStrikeCount(getUserStrikeCount(user?.userId))
  }, [user?.userId])

  // Close the auth prompt immediately once the buyer is signed in.
  useEffect(() => {
    if (user) {
      setShowAuthPrompt(false)
    }
  }, [user])

  // After guest signs in with checkout pending, automatically proceed
  useEffect(() => {
    if (user && pendingCheckout) {
      setPendingCheckout(false)
      setShowAuthPrompt(false)
      setShowCart(false)
      setShowProducts(false)
      setSelectedProductId(null)
      setSelectedVendor(null)
      setShowCheckout(true)
    }
  }, [user, pendingCheckout])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')

    if (view === 'cart') {
      setShowCart(true)
      window.history.replaceState({}, '', '/marketplace')
    }
  }, [])

  const guardSuspendedAction = (): boolean => {
    if (isSuspended) {
      return true
    }
    return false
  }

  // Show loading spinner while session restores
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const syncDetectedLocation = async (payload: {
    latitude: number
    longitude: number
    city?: string
    state?: string
    displayName?: string
  }) => {
    const city = String(payload.city || '').trim()
    const state = String(payload.state || '').trim()

    const displayParts = String(payload.displayName || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !/^\d+$/.test(part))

    const broadDisplayTail = displayParts
      .filter((part) => !/^(nigeria|federal republic of nigeria)$/i.test(part))
      .slice(-3)
      .join(', ')

    const label = [city, state].filter(Boolean).join(', ') || city || state || broadDisplayTail

    setBuyerCoordinates({ latitude: payload.latitude, longitude: payload.longitude })
    setBuyerLocationLabel(label)

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'bigcat_buyer_location_cache',
        JSON.stringify({
          latitude: payload.latitude,
          longitude: payload.longitude,
          label,
          updatedAt: Date.now(),
        }),
      )
    }

    if (!user?.userId) return

    const nextUser = {
      ...user,
      city: city || user.city,
      state: state || user.state,
      location: label || user.location,
      latitude: payload.latitude,
      longitude: payload.longitude,
    }

    setUser(nextUser)

    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          updates: {
            city: city || user.city,
            state: state || user.state,
            location: label || user.location,
          },
        }),
      })
    } catch {
      // Ignore location persistence failures and keep the live coordinates in memory.
    }
  }

  const detectBuyerLocation = async () => {
    if (typeof window === 'undefined') return

    let hasFreshCache = false

    try {
      const cached = localStorage.getItem('bigcat_buyer_location_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (
          Number.isFinite(Number(parsed?.latitude)) &&
          Number.isFinite(Number(parsed?.longitude)) &&
          Date.now() - Number(parsed?.updatedAt || 0) < 1000 * 60 * 5
        ) {
          setBuyerCoordinates({ latitude: Number(parsed.latitude), longitude: Number(parsed.longitude) })
          setBuyerLocationLabel(parsed.label || '')
          setLocationStatus('ready')
          hasFreshCache = true
        }
      }
    } catch {
      // Ignore malformed cached location data.
    }

    if (!navigator.geolocation) {
      setBuyerCoordinates(null)
      setBuyerLocationLabel('Location services are unavailable on this device/browser.')
      setLocationStatus('denied')
      return
    }

    setLocationStatus('detecting')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude
          const longitude = position.coords.longitude

          // Clear previously cached/saved label so stale city names don't linger.
          setBuyerLocationLabel('')

          const response = await fetch(`/api/location?latitude=${latitude}&longitude=${longitude}`, { cache: 'no-store' })
          const result = await response.json()

          if (result.success && result.data) {
            await syncDetectedLocation({
              latitude,
              longitude,
              city: result.data.city,
              state: result.data.state,
              displayName: result.data.displayName,
            })
          } else {
            setBuyerCoordinates({ latitude, longitude })

            const coordinateLabel = `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`
            setBuyerLocationLabel(coordinateLabel)

            localStorage.setItem(
              'bigcat_buyer_location_cache',
              JSON.stringify({
                latitude,
                longitude,
                label: coordinateLabel,
                updatedAt: Date.now(),
              }),
            )
          }

          setLocationStatus('ready')
        } catch {
          setBuyerLocationLabel(hasFreshCache ? buyerLocationLabel : '')
          setLocationStatus('ready')
        }
      },
      () => {
        setBuyerCoordinates(null)
        setBuyerLocationLabel('Live GPS permission denied. Please allow location access in browser settings.')
        setLocationStatus('denied')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  const loadMerchants = async () => {
    setLoadingMerchants(true)
    try {
      const searchParams = new URLSearchParams()
      if (buyerCoordinates?.latitude && buyerCoordinates?.longitude) {
        searchParams.set('buyerLat', String(buyerCoordinates.latitude))
        searchParams.set('buyerLng', String(buyerCoordinates.longitude))
      }

      const endpoint = searchParams.toString() ? `/api/admin/merchants?${searchParams.toString()}` : '/api/admin/merchants'
      const response = await fetch(endpoint, { cache: 'no-store' })
      const result = await response.json()
      if (result.success) {
        const merchantsData = result.data.map((m: any) => {
          const numericDistance = Number(m.distance_km)
          const hasDistance = Number.isFinite(numericDistance)
          const isNearby = hasDistance && numericDistance <= 50
          const ratingValue = Number(m.average_rating)
          const reviewCountValue = Number(m.review_count)

          return {
            id: m.id,
            name: m.business_name || m.full_name || "Unknown",
            category: m.business_category || "General",
            rating: Number.isFinite(ratingValue) && ratingValue > 0 ? ratingValue : null,
            reviews: Number.isFinite(reviewCountValue) && reviewCountValue >= 0 ? reviewCountValue : 0,
            location: m.location || [m.city, m.state].filter(Boolean).join(', ') || "Nigeria",
            badge: isNearby ? "Near you" : "Verified",
            badgeColor: isNearby ? "bg-emerald-100 text-emerald-700" : "bg-primary/15 text-primary",
            bgColor: "bg-blue-100",
            initials: (m.business_name || m.full_name || "UN").substring(0, 2).toUpperCase(),
            iconColor: "text-blue-600",
            description: m.business_description || "Quality products and services",
            logo_url: m.logo_url || m.avatar_url || "",
            avatar_url: m.avatar_url || m.logo_url || "",
            distance_km: hasDistance ? numericDistance : null,
          }
        })
        setMerchants(merchantsData)
      }
    } catch (error) {
      console.error("Error loading merchants:", error)
    } finally {
      setLoadingMerchants(false)
    }
  }

  const loadProducts = async () => {
    setLoadingProducts(true)
    try {
      const searchParams = new URLSearchParams()
      if (buyerCoordinates?.latitude && buyerCoordinates?.longitude) {
        searchParams.set('buyerLat', String(buyerCoordinates.latitude))
        searchParams.set('buyerLng', String(buyerCoordinates.longitude))
      }

      const endpoint = searchParams.toString() ? `/api/products?${searchParams.toString()}` : '/api/products'
      const response = await fetch(endpoint, { cache: 'no-store' })
      const result = await response.json()
      if (result.success) {
        setFeaturedProducts((result.data || []).slice(0, 6))
      }
    } catch (error) {
      console.error("Error loading products:", error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const loadUnreadMessages = async () => {
    if (!user?.userId) {
      setUnreadMessages(0)
      trackBuyerUnreadMessageNotifications(0)
      return
    }

    try {
      const response = await fetch(`/api/messages/conversation?userId=${encodeURIComponent(user.userId)}`)
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        const totalUnread = result.data.reduce((sum: number, conv: any) => sum + Number(conv.unread_count || 0), 0)
        setUnreadMessages(totalUnread)
        trackBuyerUnreadMessageNotifications(totalUnread)
      } else {
        setUnreadMessages(0)
        trackBuyerUnreadMessageNotifications(0)
      }
    } catch {
      setUnreadMessages(0)
      trackBuyerUnreadMessageNotifications(0)
    }
  }

  const loadOrders = async () => {
    setLoadingOrders(true)
    try {
      if (user?.userId) {
        const response = await fetch(`/api/orders/buyer?buyerId=${user.userId}`)
        const result = await response.json()
        const allOrders = Array.isArray(result.data) ? result.data : []

        if (result.success) {
          trackBuyerOrderNotifications(allOrders)
        }

        if (result.success && result.data && result.data.length > 0) {
          const ordersData = result.data.slice(0, 3).map((o: any) => ({
            id: o.id?.substring(0, 8) || "NX-0000",
            item: `Order ${o.id?.substring(0, 4)}`,
            status: o.status === "delivered" ? "Delivered" : "In Transit",
            date: new Date(o.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            amount: o.total_amount || 0,
            icon: "📦",
          }))
          setRecentOrders(ordersData)
        }
      }
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      setUser(null)
      setRole(null)
    }
  }

  const handleSuggestionTap = (s: string) => {
    setSearchQuery(s)
    runAiSearch(s)
  }

  const runAiSearch = async (query: string) => {
    const clean = query.trim()
    if (!clean) return

    setAiSearching(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clean }),
      })
      const result = await response.json()

      if (!result.success) {
        setPolicyNotice(result.error || 'AI search failed. Please try again.')
        return
      }

      const productCount = (result.data?.products || []).length
      const vendorCount = (result.data?.vendors || []).length
      setPolicyNotice(result.reply || `Found ${productCount} products and ${vendorCount} vendors.`)

      if (productCount > 0) {
        setProductSearchQuery(clean)
        setShowProducts(true)
        return
      }

      if (vendorCount > 0) {
        const firstVendor = result.data.vendors[0]
        setSelectedVendor({
          id: firstVendor.id,
          name: firstVendor.name,
          category: firstVendor.category || 'General',
          rating: Number.isFinite(Number(firstVendor.average_rating)) ? Number(firstVendor.average_rating) : null,
          reviews: Number.isFinite(Number(firstVendor.review_count)) ? Number(firstVendor.review_count) : 0,
          location: firstVendor.location || 'Nigeria',
          badge: 'Verified',
          badgeColor: 'bg-primary/15 text-primary',
          bgColor: 'bg-blue-100',
          initials: (firstVendor.name || 'VN').substring(0, 2).toUpperCase(),
          iconColor: 'text-blue-600',
          description: firstVendor.description || 'Quality products and services',
        })
      }
    } catch {
      setPolicyNotice('AI search failed. Please try again.')
    } finally {
      setAiSearching(false)
    }
  }

  const handleVoiceSearch = () => {
    if (typeof window === "undefined") return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setPolicyNotice("Voice search is not supported on this browser.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript
      if (transcript) {
        setSearchQuery(transcript)
        runAiSearch(transcript)
      }
    }
    recognition.start()
  }

  const handleSupportAction = (label: string) => {
    if (typeof window === "undefined") return
    switch (label) {
      case "Help Center":
        window.location.href = "/help"
        break
      case "Contact Us":
        window.location.href = "/contact"
        break
      case "Terms of Service":
        window.location.href = "/terms"
        break
      case "Privacy Policy":
        window.location.href = "/privacy"
        break
      default:
        break
    }
  }

  const openAiAssistant = () => {
    setAiFullscreenOpen(true)
  }

  const closeAiAssistant = () => {
    setAiFullscreenOpen(false)
  }

  const authModal = showAuthPrompt ? (
    <div className="fixed inset-0 z-[85] bg-black/50 p-4 py-6 flex items-start sm:items-center justify-center overflow-y-auto">
      <BuyerAuth
        mode="modal"
        onBack={() => {
          setShowAuthPrompt(false)
          setPendingCheckout(false)
        }}
        onSuccess={() => {
          setShowAuthPrompt(false)
        }}
      />
    </div>
  ) : null

  if (showProfile) {
    return <ProfilePage onBack={() => setShowProfile(false)} />
  }

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />
  }

  if (showPaymentMethods) {
    return <PaymentMethodsPage onBack={() => setShowPaymentMethods(false)} />
  }

  if (selectedProductId) {
    return (
      <>
        <ProductDetailsPage 
          productId={selectedProductId} 
          onBack={() => setSelectedProductId(null)}
          onViewProduct={(productId) => setSelectedProductId(productId)}
          onViewMerchant={(merchant) => {
              if (guardSuspendedAction()) return
            setSelectedProductId(null)
            setSelectedVendor(merchant)
          }}
          onOpenCart={() => {
            setSelectedProductId(null)
            setShowCart(true)
          }}
          onCheckout={() => {
              if (guardSuspendedAction()) return
            if (!user) {
              setPendingCheckout(true)
              setShowAuthPrompt(true)
              return
            }
            setSelectedProductId(null)
            setShowCheckout(true)
          }}
        />
        {authModal}
      </>
    )
  }

  if (showChat) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowChat(false)}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-foreground">Messages</h1>
            <div className="w-9" />
          </div>
        </header>
        <div className="flex-1">
          <ChatInterface
            initialConversation={initialConversation}
            onUnreadChange={setUnreadMessages}
            onViewStore={(conv) => {
              setShowChat(false)
              setSelectedVendor({
                id: conv.vendorId,
                name: conv.vendorName,
                category: "General",
                rating: Number.isFinite(Number(conv.vendorRating)) ? Number(conv.vendorRating) : null,
                reviews: 0,
                location: conv.vendorLocation || "Nigeria",
                badge: "Verified",
                badgeColor: "bg-primary/15 text-primary",
                bgColor: "bg-blue-100",
                initials: (conv.vendorName || "MN").substring(0, 2).toUpperCase(),
                iconColor: "text-blue-600",
                description: "Quality products and services",
              })
            }}
            onPlaceOrder={(conv) => {
              setShowChat(false)
              setSelectedVendor({
                id: conv.vendorId,
                name: conv.vendorName,
                category: "General",
                rating: Number.isFinite(Number(conv.vendorRating)) ? Number(conv.vendorRating) : null,
                reviews: 0,
                location: conv.vendorLocation || "Nigeria",
                badge: "Verified",
                badgeColor: "bg-primary/15 text-primary",
                bgColor: "bg-blue-100",
                initials: (conv.vendorName || "MN").substring(0, 2).toUpperCase(),
                iconColor: "text-blue-600",
                description: "Quality products and services",
              })
            }}
          />
        </div>
      </div>
    )
  }

  if (selectedVendor) {
    return (
      <>
        <VendorPage 
          vendor={selectedVendor} 
          onBack={() => setSelectedVendor(null)}
          onChatVendor={(conversation) => {
            if (guardSuspendedAction()) return
            setSelectedVendor(null)
            setInitialConversation(conversation || null)
            setShowChat(true)
          }}
          onBrowseMore={() => {
            setSelectedVendor(null)
            setShowProducts(true)
          }}
          onOpenCart={() => {
            setSelectedVendor(null)
            setShowCart(true)
          }}
          onCheckout={() => {
              if (guardSuspendedAction()) return
            if (!user) {
              setPendingCheckout(true)
              setShowAuthPrompt(true)
              return
            }
            setSelectedVendor(null)
            setShowCheckout(true)
          }}
        />
        {authModal}
      </>
    )
  }

  if (showProducts) {
    return (
      <>
        <ProductsMarketplace 
          onBack={() => {
            setShowProducts(false)
            setSelectedCategory(null)
            setProductSearchQuery("")
          }}
          buyerLatitude={buyerCoordinates?.latitude}
          buyerLongitude={buyerCoordinates?.longitude}
          buyerLocationLabel={buyerLocationLabel}
          locationStatus={locationStatus}
          onProductClick={(productId) => {
            setShowProducts(false)
            setSelectedProductId(productId)
          }}
          onOpenCart={() => {
            setShowProducts(false)
            setShowCart(true)
          }}
          onCheckout={() => {
              if (guardSuspendedAction()) return
            if (!user) {
              setPendingCheckout(true)
              setShowAuthPrompt(true)
              return
            }
            setShowProducts(false)
            setShowCheckout(true)
          }}
          initialCategory={selectedCategory}
          initialSearch={productSearchQuery}
        />
        {authModal}
      </>
    )
  }

  if (showCart) {
    return (
      <>
        <CartView 
          onBack={() => setShowCart(false)} 
          onCheckout={() => {
            if (guardSuspendedAction()) return
            if (!user) {
              setPendingCheckout(true)
              setShowAuthPrompt(true)
              return
            }
            setShowCart(false)
            setShowCheckout(true)
          }}
        />
        {authModal}
      </>
    )
  }

  if (showCheckout) {
    return (
      <CheckoutPage 
        onBack={() => setShowCheckout(false)} 
        onSuccess={(orderId) => {
          setShowCheckout(false)
          setOrderSuccess(orderId)
          setShowOrders(true)
          loadOrders()
        }}
      />
    )
  }

  if (showOrders) {
    return <BuyerOrders onBack={() => setShowOrders(false)} />
  }

  if (showServices) {
    return (
      <ServicesMarketplace
        buyerId={user?.userId ?? 'guest'}
        onBack={() => setShowServices(false)}
        onNeedsAuth={() => { setShowServices(false); setShowAuthPrompt(true) }}
        onChatMerchant={(conversation) => {
            if (guardSuspendedAction()) return
          setShowServices(false)
          setInitialConversation(conversation || null)
          setShowChat(true)
        }}
      />
    )
  }

  const displayName = user?.name || (user ? "Customer" : "Guest")
  const displayMerchants = showAllMerchants ? merchants : merchants.slice(0, 6)
  const formatDistanceLabel = (distance: unknown) => {
    const numericDistance = Number(distance)
    if (!Number.isFinite(numericDistance)) return null
    return `${numericDistance < 1 ? '<1' : numericDistance.toFixed(1)} km away`
  }

  return (
    <>
    <NotificationsPanel 
      isOpen={showNotifications} 
      onClose={() => setShowNotifications(false)}
      onUnreadChange={setNotificationCount}
      onOpenOrders={() => {
        setShowNotifications(false)
        setShowOrders(false)
        setShowChat(false)
        setActiveTab("orders")
      }}
      onOpenMessages={() => {
        setShowNotifications(false)
        setShowOrders(false)
        setShowChat(false)
        setActiveTab("chat")
      }}
    />
    {isSuspended && (
      <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
        <p className="font-semibold text-red-700">Account Suspended</p>
        <p className="text-sm text-red-700 mt-1">
          Your account has been temporarily suspended for violating platform policies.
        </p>
        <p className="text-xs text-red-600 mt-1">Strikes: {strikeCount}</p>
        <button
          onClick={() => {
            resetSafetyState(user?.userId)
            setIsSuspended(false)
            setStrikeCount(0)
            setPolicyNotice("")
          }}
          className="mt-3 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-medium"
        >
          Reset Strikes (Demo)
        </button>
      </div>
    )}

    {policyNotice && (
      <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {policyNotice}
      </div>
    )}
    <div className="min-h-screen bg-background flex flex-col font-sans pb-24">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <BrandWordmark compact />
            <p className="text-xs text-muted-foreground mt-1">Good morning, {displayName}</p>
          </div>
          <div className="flex items-center gap-1">
            {user ? (
              <button
                onClick={handleLogout}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setShowAuthPrompt(true)}
                className="px-2 py-1 text-primary hover:text-primary/80 transition-colors text-xs font-semibold"
                aria-label="Sign In"
                title="Sign In"
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => setActiveTab("wishlist")}
              className={`relative p-2 transition-colors ${
                activeTab === "wishlist" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {getWishlistCount() > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {getWishlistCount() > 99 ? '99+' : getWishlistCount()}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cart"
              title="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {getCartItemCount() > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {getCartItemCount() > 99 ? '99+' : getCartItemCount()}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-32">
        {/* AI Assistant Hero Section */}
        {activeTab === "home" && (
          <>
        <section className="px-4 pt-5 pb-4">
          <div
            className="bg-primary rounded-3xl p-5 shadow-lg shadow-primary/20"
            onClick={openAiAssistant}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                openAiAssistant()
              }
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-primary-foreground text-lg">BigCat AI</h2>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs font-medium text-primary-foreground">
                    <Zap className="w-3 h-3" /> Smart
                  </span>
                </div>
                <p className="text-sm text-primary-foreground/80">Your personal shopping assistant</p>
              </div>
            </div>

            {/* Search Bar - Hero Position */}
            <div className="relative">
              <div className="flex items-center gap-3 px-4 py-4 bg-card rounded-2xl shadow-md">
                <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      runAiSearch(searchQuery)
                    }
                  }}
                  placeholder="Ask anything... find products, vendors, services"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
                />
                <button
                  onClick={handleVoiceSearch}
                  aria-label="Voice search"
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0 disabled:opacity-50"
                  disabled={aiSearching}
                >
                  {aiSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
              {aiSuggestions.slice(0, 3).map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionTap(s)}
                  className="flex-shrink-0 px-3 py-2 rounded-xl bg-primary-foreground/15 text-sm text-primary-foreground hover:bg-primary-foreground/25 transition-colors whitespace-nowrap"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-4">
          <div className={`rounded-2xl border px-4 py-3 ${locationStatus === 'ready' ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-card'}`}>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`w-4 h-4 ${locationStatus === 'ready' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              <span className="font-medium text-foreground">
                {locationStatus === 'detecting'
                  ? 'Finding your live location...'
                  : buyerLocationLabel
                    ? `Showing the closest merchants to ${buyerLocationLabel}`
                    : 'Allow location access to see merchants near you first'}
              </span>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-semibold text-foreground text-lg">Categories</h2>
            <button 
              onClick={() => setShowProducts(true)}
              className="text-sm text-primary font-medium flex items-center gap-0.5"
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {categories.map((cat: any) => (
              <button
                key={cat.name}
                onClick={() => {
                  if (cat.target === "services") {
                      if (user && guardSuspendedAction()) return
                    setShowServices(true)
                    return
                  }
                  setSelectedCategory(cat.name)
                  setShowProducts(true)
                }}
                className="flex flex-col items-center gap-2 flex-shrink-0"
              >
                <div className={`w-16 h-16 rounded-2xl ${cat.color} flex items-center justify-center text-2xl shadow-sm border border-border/50 hover:scale-105 transition-transform`}>
                  {cat.icon}
                </div>
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground text-lg">Featured Products</h2>
            <button 
              onClick={() => setShowProducts(true)}
              className="text-sm text-primary font-medium flex items-center gap-0.5"
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <ProductGrid
            products={featuredProducts.map((product: any) => ({
              id: String(product.id),
              name: product.name,
              price: Number(product.price || 0),
              category: product.category || "General",
              image: product.images?.[0] || product.image_url || null,
              stock: Number(product.stock || 0),
              merchant: {
                id: String(product.merchant_id || product.merchant?.id || ''),
                business_name: product.merchant_profiles?.business_name || product.merchant_profiles?.name || 'Merchant',
                location: product.merchant_profiles?.location || 'Nigeria',
                logo_url: product.merchant_profiles?.avatar_url,
                distance_km: product.merchant_profiles?.distance_km ?? product.distance_km ?? null,
              },
            }))}
            onProductClick={(productId) => setSelectedProductId(productId)}
            onAddToCart={setCartPopupProduct}
            loading={loadingProducts}
          />
        </section>

        {/* SME/Merchants */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground text-lg">SME/Merchants</h2>
            <button 
              onClick={() => setShowAllMerchants((current) => !current)}
              className="text-sm text-primary font-medium flex items-center gap-0.5"
            >
              {showAllMerchants ? 'Show less' : 'Browse all'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {loadingMerchants ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : displayMerchants.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No SME/Merchants yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {displayMerchants.map((vendor) => (
                <button
                  key={vendor.id}
                  onClick={async () => {
                    if (guardSuspendedAction()) return

                    if (user) {
                      try {
                        const response = await fetch('/api/merchant/tokens/charge-view', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ merchantId: String(vendor.id) }),
                        })

                        const result = await response.json()
                        if (!result.success) {
                          setPolicyNotice(result.error || 'This merchant has exhausted tokens and is temporarily unavailable.')
                          return
                        }
                      } catch {
                        setPolicyNotice('Unable to open vendor right now. Please try again.')
                        return
                      }
                    }

                    setSelectedVendor(vendor)
                  }}
                  className="p-3 bg-card border border-border rounded-2xl shadow-sm hover:border-primary/30 hover:shadow-md transition-all text-left"
                >
                  <div className={`w-12 h-12 rounded-2xl ${vendor.bgColor} flex items-center justify-center mb-3`}>
                    <span className={`font-bold text-base ${vendor.iconColor}`}>{vendor.initials}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2">{vendor.name}</h3>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium mb-2 ${vendor.badgeColor}`}>
                    {vendor.badge}
                  </span>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{vendor.description}</p>
                  <div className="space-y-1.5">
                    {typeof vendor.rating === 'number' && vendor.rating > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="font-medium text-foreground">{vendor.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({vendor.reviews || 0})</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">
                        {formatDistanceLabel(vendor.distance_km)
                          ? `${formatDistanceLabel(vendor.distance_km)} • ${vendor.location}`
                          : vendor.location}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent Orders */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Recent Orders
            </h2>
            <button 
              onClick={() => setShowOrders(true)}
              className="text-sm text-primary font-medium flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {loadingOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No orders yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl shadow-sm"
                >
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
                    {order.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{order.item}</p>
                    <p className="text-sm text-muted-foreground">{order.id} · {order.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">{formatNaira(order.amount)}</p>
                    <p className={`text-sm font-medium ${order.status === "Delivered" ? "text-primary" : "text-chart-4"}`}>
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
          </>
        )}

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <ChatInterface onUnreadChange={setUnreadMessages} />
        )}

        {/* Wishlist Tab */}
        {activeTab === "wishlist" && (
          <div className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">My Wishlist</h2>
                <p className="text-sm text-muted-foreground">
                  {getWishlistCount()} saved product{getWishlistCount() !== 1 ? 's' : ''}
                </p>
              </div>
              {wishlistItems.length > 0 && (
                <button
                  onClick={clearWishlist}
                  className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Clear All
                </button>
              )}
            </div>

            {wishlistItems.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Your wishlist is empty</h3>
                <p className="text-sm text-muted-foreground mb-4">Save products you love and come back to them anytime.</p>
                <button
                  onClick={() => {
                    setActiveTab("home")
                    setShowProducts(true)
                  }}
                  className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <ProductGrid
                products={wishlistItems}
                onProductClick={(productId) => setSelectedProductId(productId)}
                onAddToCart={setCartPopupProduct}
              />
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <BuyerOrders
            onBack={() => setActiveTab("home")}
            onOpenCart={() => {
              setActiveTab("home")
              setShowOrders(false)
              setShowCart(true)
            }}
          />
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="p-4 space-y-4">
            {/* Guest sign-in prompt */}
            {!user && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-1">You're browsing as a guest</h2>
                <p className="text-sm text-muted-foreground mb-4">Sign in or create an account to access your profile, orders, and more.</p>
                <button
                  onClick={() => setShowAuthPrompt(true)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
                >
                  Sign In / Sign Up
                </button>
                {onNeedsOnboarding && (
                  <button
                    onClick={onNeedsOnboarding}
                    className="w-full mt-3 py-3 bg-secondary text-foreground rounded-xl font-medium text-sm"
                  >
                    Are you a merchant? Go to merchant login →
                  </button>
                )}
              </div>
            )}

            {/* Signed-in profile */}
            {user && (
              <>
            {/* Profile Header */}
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-primary">
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground">{user?.name || "User"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email || "No email"}</p>
            </div>

            {/* Profile Options */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <h3 className="font-semibold text-foreground p-4 border-b border-border">Account</h3>
              <div className="divide-y divide-border">
                {[
                  { label: "Edit Profile", value: "Update your info", action: () => setShowProfile(true) },
                  { label: "Wallet", value: "Balance, funding and payments", action: () => setShowPaymentMethods(true) },
                  { label: "Settings", value: "App settings", action: () => setShowSettings(true) },
                ].map((item) => (
                  <button 
                    key={item.label} 
                    onClick={() => {
                      if (item.action) item.action()
                      else if (item.label === "Notifications") setShowNotifications(true)
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Support */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <h3 className="font-semibold text-foreground p-4 border-b border-border">Support</h3>
              <div className="divide-y divide-border">
                {[
                  { label: "Help Center", value: "FAQs & guides" },
                  { label: "Contact Us", value: "Get help" },
                  { label: "Terms of Service", value: "Legal" },
                  { label: "Privacy Policy", value: "Your data" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleSupportAction(item.label)}
                    className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Logout */}
            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-destructive/10 text-destructive rounded-2xl font-semibold hover:bg-destructive/20 transition-colors"
            >
              Log Out
            </button>
            </>
            )}
          </div>
        )}
      </main>

      {aiFullscreenOpen && (
        <div className="fixed inset-0 z-[70] bg-background">
          <div className="absolute top-3 right-3 z-[71]">
            <button
              onClick={closeAiAssistant}
              className="h-10 w-10 rounded-full bg-black/55 text-white flex items-center justify-center shadow-md"
              aria-label="Close AI assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
            <div className="h-full w-full pt-14">
              <NigeriaAiAssistant
                assistantMode="buyer"
                className="h-full"
                userLocation={buyerLocationLabel || user?.location || ""}
                onProductSelect={(productId) => {
                  setAiFullscreenOpen(false)
                  setSelectedProductId(productId)
                }}
                onVendorSelect={(vendor) => {
                  setAiFullscreenOpen(false)
                  setSelectedVendor(vendor)
                }}
                onServiceSelect={() => {
                  setAiFullscreenOpen(false)
                  setShowServices(true)
                }}
              />
            </div>
        </div>
      )}

      {cartPopupProduct && (
        <div className="fixed inset-0 z-[72] bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <p className="font-semibold text-foreground mb-1">Added to cart</p>
            <p className="text-sm font-medium text-foreground line-clamp-2">{cartPopupProduct.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{cartPopupProduct.merchant.business_name}</p>
            <p className="text-sm font-bold text-primary mt-2">{formatNaira(cartPopupProduct.price)}</p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => {
                  setCartPopupProduct(null)
                    if (guardSuspendedAction()) return
                  if (!user) {
                    setPendingCheckout(true)
                    setShowAuthPrompt(true)
                    return
                  }
                  setShowCheckout(true)
                }}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Proceed to Checkout
              </button>
              <button
                onClick={() => setCartPopupProduct(null)}
                className="w-full rounded-xl bg-secondary py-3 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {authModal}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around px-2 py-3 max-w-2xl mx-auto z-40">
        {/* Home */}
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
            activeTab === "home"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">Home</span>
        </button>

        {/* Orders */}
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
            activeTab === "orders"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingBag className="w-6 h-6" />
          <span className="text-xs font-medium">Orders</span>
        </button>

        {/* Messages */}
        <button
          onClick={() => setActiveTab("chat")}
          className={`relative flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
            activeTab === "chat"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="w-6 h-6" />
          {unreadMessages > 0 && (
            <span className="absolute top-1 right-2 min-w-[16px] h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
          <span className="text-xs font-medium">Messages</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
            activeTab === "profile"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>
    </div>
    </>
  )
}
