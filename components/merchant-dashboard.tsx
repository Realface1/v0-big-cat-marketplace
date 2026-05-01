"use client"

// Force rebuild

import { useRole } from "@/lib/role-context"
import { logout } from "@/lib/auth-client"
import { MerchantProducts } from "@/components/merchant-products"
import { MerchantOrders } from "@/components/merchant-orders"
import { MerchantServices } from "@/components/merchant-services"
import { ProfilePage } from "@/components/profile-page"
import { MerchantProfilePage } from "@/components/merchant-profile-page"
import { SettingsPage } from "@/components/settings-page"
import { PaymentMethodsPage } from "@/components/payment-methods-page"
import { MerchantWithdrawal } from "@/components/merchant-withdrawal"
import { ChatInterface } from "@/components/chat-interface"
import { formatNaira } from "@/lib/currency-utils"
import { BrandWordmark } from "./brand-wordmark"
import { NigeriaAiAssistant } from "./nigeria-ai-assistant"
import { ClipboardList } from "lucide-react"
import {
  ArrowLeft,
  Bell,
  Home,
  Package,
  BarChart3,
  Settings,
  Plus,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ChevronRight,
  Sparkles,
  Coins,
  Eye,
  Percent,
  MoreHorizontal,
  Pencil,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
  Truck,
  LogOut,
  Loader2,
  Download,
  User,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { NotificationsPanel } from "./notifications-panel"

function NairaIcon({ className = "" }: { className?: string }) {
  return <span className={`font-black leading-none ${className}`}>₦</span>
}

interface MerchantTodo {
  id: string
  title: string
  dueAt: string
  completed: boolean
  notified: boolean
  createdAt: string
}

interface DashboardNotification {
  id: string
  type: "order" | "delivery" | "message" | "system" | "warning"
  title: string
  message: string
  time: string
  read: boolean
  createdAt?: string
}

function toAmount(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function MerchantDashboard() {
  const { setRole, setUser, user, isLoading } = useRole()
  const [activeTab, setActiveTab] = useState("home")
  const [currentInsight, setCurrentInsight] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [showWithdrawal, setShowWithdrawal] = useState(false)
  
  // Real data states
  const [stats, setStats] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [allOrders, setAllOrders] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [tokenBalance, setTokenBalance] = useState(0)
  const [walletBalance, setWalletBalance] = useState(0)
  const [cardBalance, setCardBalance] = useState(0)
  const [bankBalance, setBankBalance] = useState(0)
  const [tokenPaymentMethod, setTokenPaymentMethod] = useState<"wallet" | "card" | "bank">("wallet")
  const [tokenDialogError, setTokenDialogError] = useState("")
  const [tokenBuying, setTokenBuying] = useState(false)
  const [merchantTodos, setMerchantTodos] = useState<MerchantTodo[]>([])
  const [todoForm, setTodoForm] = useState({ title: "", dueDate: "", dueTime: "" })
  const [todoError, setTodoError] = useState("")
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default")
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [reportMonth, setReportMonth] = useState(() => formatMonthValue(new Date()))
  const merchantKind = user?.merchantType || user?.merchantProfile?.merchant_type || 'products'
  const walletMerchantId = String(user?.email || user?.userId || '').trim()
  const isServiceMerchant = merchantKind === 'services'

  useEffect(() => {
    if (isServiceMerchant && activeTab === 'products') {
      setActiveTab('services')
    }

    if (!isServiceMerchant && activeTab === 'services') {
      setActiveTab('products')
    }
  }, [activeTab, isServiceMerchant])

  const getTodoStorageKey = (merchantId: string) => `merchant_todos_${merchantId}`
  const getNotificationStorageKey = (merchantId: string) => `app_notifications_merchant_${merchantId}`

  const syncTodosToStorage = (nextTodos: MerchantTodo[]) => {
    setMerchantTodos(nextTodos)
    if (typeof window !== "undefined" && user?.userId) {
      localStorage.setItem(getTodoStorageKey(user.userId), JSON.stringify(nextTodos))
      window.dispatchEvent(new Event("bigcat-notifications-updated"))
    }
  }

  const formatReminderTime = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Invalid date"
    return date.toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    })
  }

  const appendReminderNotification = (todo: MerchantTodo) => {
    if (typeof window === "undefined" || !user?.userId) return

    const storageKey = getNotificationStorageKey(user.userId)
    const existing = JSON.parse(localStorage.getItem(storageKey) || "[]") as DashboardNotification[]

    if (existing.some((item) => item.id === `todo-${todo.id}`)) {
      return
    }

    const nextNotifications: DashboardNotification[] = [
      {
        id: `todo-${todo.id}`,
        type: "warning",
        title: "Task reminder",
        message: `It is time for: ${todo.title}`,
        time: "Just now",
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...existing,
    ]

    localStorage.setItem(storageKey, JSON.stringify(nextNotifications))
    window.dispatchEvent(new Event("bigcat-notifications-updated"))
  }

  const getMerchantOrdersInitKey = (merchantId: string) => `merchant_notif_orders_initialized_${merchantId}`
  const getMerchantOrderStatusKey = (merchantId: string) => `merchant_notif_order_status_${merchantId}`
  const getMerchantUnreadInitKey = (merchantId: string) => `merchant_notif_unread_initialized_${merchantId}`
  const getMerchantUnreadCountKey = (merchantId: string) => `merchant_notif_unread_count_${merchantId}`

  const appendMerchantNotification = (notification: DashboardNotification) => {
    if (typeof window === "undefined" || !user?.userId) return

    const storageKey = getNotificationStorageKey(user.userId)
    const existing = JSON.parse(localStorage.getItem(storageKey) || "[]") as DashboardNotification[]

    if (existing.some((item) => item.id === notification.id)) {
      return
    }

    const nextNotifications = [notification, ...existing].slice(0, 100)
    localStorage.setItem(storageKey, JSON.stringify(nextNotifications))
    window.dispatchEvent(new Event("bigcat-notifications-updated"))
  }

  const trackMerchantOrderNotifications = (orders: any[]) => {
    if (typeof window === "undefined" || !user?.userId) return

    const initKey = getMerchantOrdersInitKey(user.userId)
    const statusKey = getMerchantOrderStatusKey(user.userId)
    const existingMap = JSON.parse(localStorage.getItem(statusKey) || "{}") as Record<string, string>
    const nextMap: Record<string, string> = { ...existingMap }
    const isInitialized = localStorage.getItem(initKey) === "true"

    orders.forEach((order) => {
      const orderId = String(order?.id || "")
      if (!orderId) return

      const nextStatus = String(order?.status || "pending").toLowerCase().trim()
      const prevStatus = existingMap[orderId]

      if (isInitialized && !prevStatus) {
        appendMerchantNotification({
          id: `merchant-order-created-${orderId}`,
          type: "order",
          title: "New buyer order",
          message: `You received a new order ${orderId.slice(0, 8)}.`,
          time: "Just now",
          read: false,
          createdAt: new Date().toISOString(),
        })
      }

      if (isInitialized && prevStatus && prevStatus !== nextStatus) {
        appendMerchantNotification({
          id: `merchant-order-status-${orderId}-${nextStatus}`,
          type: "delivery",
          title: "Order status changed",
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

  const trackMerchantUnreadMessageNotifications = (totalUnread: number) => {
    if (typeof window === "undefined" || !user?.userId) return

    const initKey = getMerchantUnreadInitKey(user.userId)
    const countKey = getMerchantUnreadCountKey(user.userId)
    const initialized = localStorage.getItem(initKey) === "true"
    const previousCount = Number(localStorage.getItem(countKey) || 0)

    if (!initialized) {
      localStorage.setItem(initKey, "true")
      localStorage.setItem(countKey, String(totalUnread))
      return
    }

    if (totalUnread > previousCount) {
      const incomingCount = totalUnread - previousCount
      appendMerchantNotification({
        id: `merchant-unread-message-${Date.now()}-${totalUnread}`,
        type: "message",
        title: "New customer message",
        message: incomingCount === 1
          ? "You received a new message from a customer."
          : `You received ${incomingCount} new messages from customers.`,
        time: "Just now",
        read: false,
        createdAt: new Date().toISOString(),
      })
    }

    localStorage.setItem(countKey, String(totalUnread))
  }

  const requestNotificationAccess = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported")
      return
    }

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      return
    }

    setNotificationPermission(Notification.permission)
  }

  const handleAddTodo = async () => {
    setTodoError("")

    if (!todoForm.title.trim() || !todoForm.dueDate || !todoForm.dueTime) {
      setTodoError("Add a task, date, and time.")
      return
    }

    const dueAt = new Date(`${todoForm.dueDate}T${todoForm.dueTime}`)
    if (Number.isNaN(dueAt.getTime())) {
      setTodoError("Choose a valid date and time.")
      return
    }

    const nextTodo: MerchantTodo = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: todoForm.title.trim(),
      dueAt: dueAt.toISOString(),
      completed: false,
      notified: false,
      createdAt: new Date().toISOString(),
    }

    const nextTodos = [nextTodo, ...merchantTodos].sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    )

    syncTodosToStorage(nextTodos)
    setTodoForm({ title: "", dueDate: "", dueTime: "" })
    await requestNotificationAccess()
  }

  const toggleTodoCompletion = (todoId: string) => {
    const nextTodos = merchantTodos.map((todo) =>
      todo.id === todoId
        ? { ...todo, completed: !todo.completed }
        : todo,
    )
    syncTodosToStorage(nextTodos)
  }

  const deleteTodo = (todoId: string) => {
    const nextTodos = merchantTodos.filter((todo) => todo.id !== todoId)
    syncTodosToStorage(nextTodos)
  }
  
  // Guard against undefined user during initial load - AFTER all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No user session found</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (user?.userId) {
      loadStats()
      loadProducts()
      loadOrders()
      loadUnreadMessages()
    }
  }, [user])

  useEffect(() => {
    if (!user?.userId) return

    const intervalId = window.setInterval(() => {
      loadOrders()
      loadUnreadMessages()
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [user?.userId])

  useEffect(() => {
    if (typeof window === "undefined") return

    if ("Notification" in window) {
      setNotificationPermission(Notification.permission)
    } else {
      setNotificationPermission("unsupported")
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !user?.userId) return

    const storedTodos = localStorage.getItem(getTodoStorageKey(user.userId))
    if (!storedTodos) {
      setMerchantTodos([])
      return
    }

    try {
      const parsedTodos = JSON.parse(storedTodos) as MerchantTodo[]
      setMerchantTodos(Array.isArray(parsedTodos) ? parsedTodos : [])
    } catch {
      setMerchantTodos([])
    }
  }, [user?.userId])

  useEffect(() => {
    if (typeof window === "undefined" || !user?.userId) return

    const checkReminders = () => {
      setMerchantTodos((currentTodos) => {
        const now = Date.now()
        let hasUpdates = false

        const nextTodos = currentTodos.map((todo) => {
          if (todo.completed || todo.notified) return todo

          if (new Date(todo.dueAt).getTime() <= now) {
            hasUpdates = true
            appendReminderNotification(todo)

            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("BigCat reminder", {
                body: todo.title,
              })
            }

            return { ...todo, notified: true }
          }

          return todo
        })

        if (hasUpdates) {
          localStorage.setItem(getTodoStorageKey(user.userId), JSON.stringify(nextTodos))
          window.dispatchEvent(new Event("bigcat-notifications-updated"))
        }

        return nextTodos
      })
    }

    checkReminders()
    const intervalId = window.setInterval(checkReminders, 30000)
    return () => window.clearInterval(intervalId)
  }, [user?.userId])

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      let nextTokenBalance = 0
      let merchantOrders: any[] = []
      let merchantProducts: any[] = []

      if (user?.userId) {
        const [tokenResponse, walletResponse, ordersResponse, productsResponse] = await Promise.all([
          fetch(`/api/merchant/tokens?merchantId=${encodeURIComponent(user.userId)}`, {
            cache: 'no-store',
          }),
          fetch(`/api/merchant/wallet?merchantId=${encodeURIComponent(walletMerchantId || user.userId)}`, {
            cache: 'no-store',
          }),
          fetch(`/api/orders/merchant?merchantId=${encodeURIComponent(user.userId)}`, {
            cache: 'no-store',
          }),
          fetch(`/api/products/merchant?merchantId=${encodeURIComponent(user.userId)}&includePrivate=1`, {
            cache: 'no-store',
          }),
        ])

        const tokenResult = await tokenResponse.json()
        const walletResult = await walletResponse.json()
        const ordersResult = await ordersResponse.json()
        const productsResult = await productsResponse.json()

        if (tokenResult.success) {
          nextTokenBalance = Number(tokenResult.balance || 0)
          setTokenBalance(nextTokenBalance)
        }

        if (walletResult?.success) {
          setWalletBalance(Number(walletResult.balance || 0))
        }

        merchantOrders = Array.isArray(ordersResult.data)
          ? ordersResult.data
          : Array.isArray(ordersResult.orders)
            ? ordersResult.orders
            : []

        merchantProducts = Array.isArray(productsResult.data) ? productsResult.data : []
        setAllOrders(merchantOrders)
        setAllProducts(merchantProducts)
      }

      const getMerchantAmount = (order: any) => {
        const orderItems = Array.isArray(order?.order_items)
          ? order.order_items
          : Array.isArray(order?.items)
            ? order.items
            : []

        const itemsTotal = orderItems.reduce((sum: number, item: any) => {
          const quantity = Math.max(1, toAmount(item?.quantity || 1))
          const lineTotal = toAmount(item?.total_price || 0)
          const unitAmount = toAmount(item?.unit_price || item?.price || 0)

          if (lineTotal > 0) return sum + lineTotal
          if (unitAmount > 0) return sum + (unitAmount * quantity)
          return sum
        }, 0)

        const deliveryFee = toAmount(order?.delivery_fee || 0)
        const productTotal = toAmount(order?.product_total || 0)
        const grandTotal = toAmount(order?.grand_total || order?.total_amount || itemsTotal || 0)

        if (itemsTotal > 0) return Math.max(0, itemsTotal)
        if (productTotal > 0) return Math.max(0, productTotal)
        return Math.max(0, grandTotal - deliveryFee)
      }

      const getOrderSellingTotal = (order: any) => {
        const orderItems = Array.isArray(order?.order_items)
          ? order.order_items
          : Array.isArray(order?.items)
            ? order.items
            : []

        const itemsTotal = orderItems.reduce((sum: number, item: any) => {
          const quantity = Math.max(1, toAmount(item?.quantity || 1))
          const lineTotal = toAmount(item?.total_price || 0)
          const unitAmount = toAmount(item?.unit_price || item?.price || 0)

          if (lineTotal > 0) return sum + lineTotal
          if (unitAmount > 0) return sum + (unitAmount * quantity)
          return sum
        }, 0)

        if (itemsTotal > 0) return itemsTotal
        return getMerchantAmount(order)
      }

      const getItemSellingAmount = (item: any) => {
        const quantity = Math.max(1, toAmount(item?.quantity || 1))
        const lineTotal = toAmount(item?.total_price || 0)
        const unitAmount = toAmount(item?.unit_price || item?.price || 0)

        if (lineTotal > 0) return Math.max(0, lineTotal)
        return Math.max(0, unitAmount * quantity)
      }

      const costMap = new Map(
        merchantProducts.map((product) => [String(product.id), Number(product.cost_price || 0)]),
      )

      const getItemCost = (item: any) => {
        const quantity = Math.max(1, Number(item?.quantity || 1))
        const productId = String(item?.product_id || item?.products?.id || '')
        const unitCost = Number(item?.products?.cost_price ?? costMap.get(productId) ?? 0)
        return Math.max(0, unitCost * quantity)
      }

      const releasedOrders = merchantOrders.filter((order) => {
        const status = String(order?.status || '').toLowerCase()
        const escrowStatus = String(order?.escrow_status || '').toLowerCase()
        return status === 'delivered' || status === 'completed' || escrowStatus === 'released'
      })
      const completedOrders = releasedOrders

      const isOrderHeldInEscrow = (order: any) => {
        const status = String(order?.status || '').toLowerCase()
        const paymentStatus = String(order?.payment_status || '').toLowerCase()
        const escrowStatus = String(order?.escrow_status || '').toLowerCase()

        if (escrowStatus) {
          return escrowStatus === 'held'
        }

        if (['delivered', 'completed', 'cancelled', 'canceled', 'failed', 'refunded'].includes(status)) {
          return false
        }

        if (['cancelled', 'canceled', 'failed', 'refunded'].includes(paymentStatus)) {
          return false
        }

        const paidByStatus = ['paid', 'processing', 'shipped'].includes(status)
        const paidByPaymentStatus = ['paid', 'processing', 'completed'].includes(paymentStatus)
        return paidByStatus || paidByPaymentStatus
      }

      const totalSales = releasedOrders.reduce((sum, order) => sum + getOrderSellingTotal(order), 0)
      const totalInventoryCost = merchantProducts.reduce(
        (sum, product) => sum + (Number(product.cost_price || 0) * Number(product.stock || 0)),
        0,
      )
      const profitLoss = completedOrders.reduce((sum, order) => {
        const orderItems = Array.isArray(order?.order_items)
          ? order.order_items
          : Array.isArray(order?.items)
            ? order.items
            : []

        if (orderItems.length === 0) {
          // Legacy fallback when item-level values are unavailable.
          return sum + getMerchantAmount(order)
        }

        const orderProfit = orderItems.reduce((innerSum: number, item: any) => {
          const sellingAmount = getItemSellingAmount(item)
          const costAmount = getItemCost(item)
          return innerSum + (sellingAmount - costAmount)
        }, 0)

        return sum + orderProfit
      }, 0)
      const activeOrders = merchantOrders.filter((order) => !['delivered', 'completed'].includes(String(order?.status || '').toLowerCase())).length
      const escrowBalance = merchantOrders.reduce((sum, order) => {
        if (!isOrderHeldInEscrow(order)) {
          return sum
        }
        return sum + getMerchantAmount(order)
      }, 0)

      const profitValue = profitLoss >= 0
        ? formatNaira(profitLoss)
        : `-${formatNaira(Math.abs(profitLoss))}`

      // Reload live wallet balance after fetching orders so the stat card stays fresh
      let liveWalletBalance = 0
      try {
        const walletResp = await fetch(`/api/merchant/wallet?merchantId=${encodeURIComponent(walletMerchantId || user.userId)}`, { cache: 'no-store' })
        const walletJson = await walletResp.json()
        if (walletJson?.success) {
          liveWalletBalance = Number(walletJson.balance || 0)
          setWalletBalance(liveWalletBalance)
        }
      } catch { /* ignore */ }

      const statsData = [
        { label: "Total Cost Price", value: formatNaira(totalInventoryCost), change: `${merchantProducts.length} products`, trend: "up", icon: NairaIcon },
        { label: "Total Sales", value: formatNaira(totalSales), change: `${releasedOrders.length} orders released`, trend: "up", icon: NairaIcon },
        { label: profitLoss >= 0 ? "Profit" : "Loss", value: profitValue, valueClass: profitLoss >= 0 ? "text-primary" : "text-destructive", change: activeOrders > 0 ? `${activeOrders} active orders` : "Audited", trend: profitLoss >= 0 ? "up" : "down", icon: profitLoss >= 0 ? TrendingUp : TrendingDown },
        { label: "Wallet Balance", value: formatNaira(liveWalletBalance), change: "Tap to withdraw", trend: "up", icon: NairaIcon, action: () => setShowWithdrawal(true) },
        { label: "Escrow Balance", value: formatNaira(escrowBalance), change: nextTokenBalance > 0 ? `${nextTokenBalance} tokens` : "Held safely", trend: "up", icon: Clock },
      ]
      setStats(statsData)
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  const loadProducts = async () => {
    setLoadingProducts(true)
    try {
      if (user?.userId) {
        const response = await fetch(`/api/products/merchant?merchantId=${user.userId}&includePrivate=1`)
        const result = await response.json()
        if (result.success && result.data) {
          setAllProducts(result.data)
          setProducts(result.data.slice(0, 4))
        }
      }
    } catch (error) {
      console.error("Error loading products:", error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const loadOrders = async () => {
    setLoadingOrders(true)
    try {
      if (user?.userId) {
        const response = await fetch(`/api/orders/merchant?merchantId=${user.userId}`, { cache: 'no-store' })
        const result = await response.json()
        const nextOrders = Array.isArray(result.data) ? result.data : Array.isArray(result.orders) ? result.orders : []
        if (result.success) {
          trackMerchantOrderNotifications(nextOrders)
          setRecentOrders(nextOrders.slice(0, 3))
        }
      }
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const loadUnreadMessages = async () => {
    if (!user?.userId) {
      setUnreadMessages(0)
      trackMerchantUnreadMessageNotifications(0)
      return
    }

    try {
      const response = await fetch(`/api/messages/conversation?userId=${encodeURIComponent(user.userId)}`, { cache: 'no-store' })
      const result = await response.json()

      if (result.success && Array.isArray(result.data)) {
        const totalUnread = result.data.reduce((sum: number, conv: any) => sum + Number(conv.unread_count || 0), 0)
        setUnreadMessages(totalUnread)
        trackMerchantUnreadMessageNotifications(totalUnread)
      } else {
        setUnreadMessages(0)
        trackMerchantUnreadMessageNotifications(0)
      }
    } catch {
      setUnreadMessages(0)
      trackMerchantUnreadMessageNotifications(0)
    }
  }

  const quickActions = [
    ...(isServiceMerchant 
      ? [{ label: "Add Service", icon: Plus, primary: true, action: () => setActiveTab("services") }]
      : [{ label: "Add Product", icon: Plus, primary: true, action: () => setActiveTab("products") }]
    ),
    { label: "View Orders", icon: ShoppingBag, primary: false, action: () => setActiveTab("orders") },
    { label: "Analytics", icon: BarChart3, primary: false, action: () => setActiveTab("analytics") },
    { label: "Withdraw", icon: ArrowUpRight, primary: false, action: () => setShowWithdrawal(true) },
    { label: "AI BizPilot", icon: Sparkles, primary: false, highlight: true, action: () => setActiveTab("ai") },
  ]

  const aiInsights = [
    isServiceMerchant
      ? "Build your service catalog with clear offerings, turnaround times, and pricing."
      : "Build your store by adding quality products with accurate descriptions.",
    "Respond quickly to customer messages to build trust and increase sales.",
    "Competitive pricing and fast delivery help increase your sales.",
  ]

  const analyticsData = useMemo(() => {
    const orderItems = (order: any) => (
      Array.isArray(order?.order_items)
        ? order.order_items
        : Array.isArray(order?.items)
          ? order.items
          : []
    )

    const getOrderAmount = (order: any) => {
      const items = orderItems(order)
      const itemsTotal = items.reduce((sum: number, item: any) => {
        const quantity = Math.max(1, toAmount(item?.quantity || 1))
        const lineTotal = toAmount(item?.total_price || 0)
        const unitAmount = toAmount(item?.unit_price || item?.price || 0)

        if (lineTotal > 0) return sum + lineTotal
        if (unitAmount > 0) return sum + (unitAmount * quantity)
        return sum
      }, 0)

      const deliveryFee = toAmount(order?.delivery_fee || 0)
      const productTotal = toAmount(order?.product_total || 0)
      const grandTotal = toAmount(order?.grand_total || order?.total_amount || itemsTotal || 0)

      if (itemsTotal > 0) return Math.max(0, itemsTotal)
      if (productTotal > 0) return Math.max(0, productTotal)
      return Math.max(0, grandTotal - deliveryFee)
    }

    const isReleasedOrder = (order: any) => {
      const status = String(order?.status || "").toLowerCase()
      const escrowStatus = String(order?.escrow_status || "").toLowerCase()
      return status === "delivered" || status === "completed" || escrowStatus === "released"
    }

    const getOrderTimestamp = (order: any) => {
      const raw = order?.released_at || order?.delivered_at || order?.updated_at || order?.created_at
      const parsed = Date.parse(String(raw || ""))
      return Number.isFinite(parsed) ? parsed : null
    }

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)

    const releasedOrders = allOrders.filter(isReleasedOrder)

    const weeklySales = releasedOrders.reduce((sum: number, order: any) => {
      const timestamp = getOrderTimestamp(order)
      if (timestamp && timestamp >= weekStart.getTime()) {
        return sum + getOrderAmount(order)
      }
      return sum
    }, 0)

    const monthlySales = releasedOrders.reduce((sum: number, order: any) => {
      const timestamp = getOrderTimestamp(order)
      if (timestamp && timestamp >= monthStart.getTime()) {
        return sum + getOrderAmount(order)
      }
      return sum
    }, 0)

    const totalSales = releasedOrders.reduce((sum: number, order: any) => sum + getOrderAmount(order), 0)
    const totalOrders = allOrders.length
    const completedOrders = releasedOrders.length
    const completionRate = totalOrders > 0 ? `${((completedOrders / totalOrders) * 100).toFixed(1)}%` : "0%"
    const averageOrderValue = completedOrders > 0 ? formatNaira(totalSales / completedOrders) : formatNaira(0)

    const buyerCounts = releasedOrders.reduce((acc: Record<string, number>, order: any) => {
      const buyerId = String(order?.buyer_id || order?.buyerId || "").trim()
      if (!buyerId) return acc
      acc[buyerId] = (acc[buyerId] || 0) + 1
      return acc
    }, {})

    const uniqueBuyers = Object.keys(buyerCounts).length
    const repeatBuyers = Object.values(buyerCounts).filter((count) => count > 1).length
    const customerRetention = uniqueBuyers > 0 ? `${((repeatBuyers / uniqueBuyers) * 100).toFixed(1)}%` : "0%"

    return {
      weeklySales,
      monthlySales,
      listingCount: allProducts.length,
      completionRate,
      averageOrderValue,
      customerRetention,
    }
  }, [allOrders, allProducts])

  const lowStockCount = allProducts.filter((item) => {
    const stock = Number(item?.stock || 0)
    return stock > 0 && stock <= 5
  }).length

  const outOfStockCount = allProducts.filter((item) => Number(item?.stock || 0) <= 0).length

  const marginRiskCount = allProducts.filter((item) => Number(item?.price || 0) <= Number(item?.cost_price || 0)).length

  const pendingFulfillmentCount = allOrders.filter((order) => {
    const status = String(order?.status || '').toLowerCase()
    return !['delivered', 'completed', 'cancelled', 'canceled', 'refunded'].includes(status)
  }).length

  const returnOrDisputeQueueCount = allOrders.filter((order) => {
    const status = String(order?.status || '').toLowerCase()
    return status.includes('refund') || status.includes('return') || status.includes('dispute')
  }).length

  const stalePendingCheckoutCount = allOrders.filter((order) => {
    const paymentStatus = String(order?.payment_status || '').toLowerCase()
    if (paymentStatus !== 'pending') return false
    const createdAt = new Date(order?.created_at || 0).getTime()
    return Number.isFinite(createdAt) && Date.now() - createdAt > 1000 * 60 * 60 * 24
  }).length

  const onboardingSteps = [
    {
      label: 'Complete business setup',
      done: Boolean(user?.merchantProfile?.setup_completed ?? (user as any)?.setup_completed),
      cta: 'Open Settings',
      action: () => setShowSettings(true),
    },
    isServiceMerchant
      ? {
          label: 'Add your first service',
          done: allProducts.length > 0,
          cta: 'Add Service',
          action: () => setActiveTab('services'),
        }
      : {
          label: 'Add your first product',
          done: allProducts.length > 0,
          cta: 'Add Product',
          action: () => setActiveTab('products'),
        },
    isServiceMerchant
      ? {
          label: 'Set service pricing',
          done: allProducts.length > 0 && allProducts.every((item) => Number(item?.base_price || 0) > 0),
          cta: 'Update Services',
          action: () => setActiveTab('services'),
        }
      : {
          label: 'Set cost prices for P&L',
          done: allProducts.length > 0 && allProducts.every((item) => Number(item?.cost_price || 0) > 0),
          cta: 'Update Products',
          action: () => setActiveTab('products'),
        },
    {
      label: 'Receive first order',
      done: allOrders.length > 0,
      cta: 'View Orders',
      action: () => setActiveTab('orders'),
    },
    {
      label: 'Configure notification preferences',
      done: notificationPermission === 'granted',
      cta: 'Set Alerts',
      action: () => setShowSettings(true),
    },
  ]

  const completedOnboardingSteps = onboardingSteps.filter((step) => step.done).length
  const onboardingProgress = onboardingSteps.length > 0
    ? Math.round((completedOnboardingSteps / onboardingSteps.length) * 100)
    : 0

  const nextOnboardingStep = onboardingSteps.find((step) => !step.done)

  const selectedReportMonth = useMemo(() => {
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(reportMonth)
    if (!monthMatch) {
      const now = new Date()
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        label: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
        slug: formatMonthValue(now),
      }
    }

    const year = Number(monthMatch[1])
    const monthIndex = Math.max(0, Math.min(11, Number(monthMatch[2]) - 1))
    const start = new Date(year, monthIndex, 1)
    const end = new Date(year, monthIndex + 1, 1)

    return {
      start,
      end,
      label: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
      slug: formatMonthValue(start),
    }
  }, [reportMonth])

  const csvEscape = (value: unknown) => {
    const text = String(value ?? "")
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const downloadCsvReport = (filename: string, headers: string[], rows: Array<Array<unknown>>) => {
    if (typeof window === "undefined") return
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const isReleasedOrderForReport = (order: any) => {
    const status = String(order?.status || "").toLowerCase()
    const escrowStatus = String(order?.escrow_status || "").toLowerCase()
    return status === "delivered" || status === "completed" || escrowStatus === "released"
  }

  const getOrderTimestampForReport = (order: any) => {
    const raw = order?.released_at || order?.delivered_at || order?.updated_at || order?.created_at
    const parsed = Date.parse(String(raw || ""))
    return Number.isFinite(parsed) ? parsed : null
  }

  const getOrderAmountForReport = (order: any) => {
    const items = Array.isArray(order?.order_items)
      ? order.order_items
      : Array.isArray(order?.items)
        ? order.items
        : []

    const itemsTotal = items.reduce((sum: number, item: any) => {
      const quantity = Math.max(1, toAmount(item?.quantity || 1))
      const lineTotal = toAmount(item?.total_price || 0)
      const unitAmount = toAmount(item?.unit_price || item?.price || 0)

      if (lineTotal > 0) return sum + lineTotal
      if (unitAmount > 0) return sum + (unitAmount * quantity)
      return sum
    }, 0)

    const deliveryFee = toAmount(order?.delivery_fee || 0)
    const productTotal = toAmount(order?.product_total || 0)
    const grandTotal = toAmount(order?.grand_total || order?.total_amount || itemsTotal || 0)

    if (itemsTotal > 0) return Math.max(0, itemsTotal)
    if (productTotal > 0) return Math.max(0, productTotal)
    return Math.max(0, grandTotal - deliveryFee)
  }

  const getSelectedMonthReleasedOrders = () => {
    return allOrders.filter((order) => {
      if (!isReleasedOrderForReport(order)) return false
      const timestamp = getOrderTimestampForReport(order)
      if (timestamp === null) return false
      return timestamp >= selectedReportMonth.start.getTime() && timestamp < selectedReportMonth.end.getTime()
    })
  }

  const downloadFinancialReport = () => {
    const monthlyOrders = getSelectedMonthReleasedOrders()
    const monthlySales = monthlyOrders.reduce((sum, order) => sum + getOrderAmountForReport(order), 0)
    const monthlyOrderCount = monthlyOrders.length
    const averageOrderValue = monthlyOrderCount > 0 ? monthlySales / monthlyOrderCount : 0
    const uniqueBuyers = new Set(
      monthlyOrders
        .map((order) => String(order?.buyer_id || order?.buyerId || "").trim())
        .filter(Boolean),
    ).size

    const rows = [
      ["Report Period", selectedReportMonth.label],
      ["Merchant", user?.merchantProfile?.business_name || user?.name || user?.email || "Merchant"],
      ["Monthly Sales", monthlySales.toFixed(2)],
      ["Completed/Released Orders", monthlyOrderCount],
      ["Average Order Value", averageOrderValue.toFixed(2)],
      ["Unique Customers", uniqueBuyers],
      ["Active Listings", allProducts.length],
      ["Current Escrow Balance", stats.find((item) => item.label === "Escrow Balance")?.value || formatNaira(0)],
      ["Generated At", new Date().toISOString()],
    ]

    downloadCsvReport(
      `bigcat-financial-report-${selectedReportMonth.slug}.csv`,
      ["Metric", "Value"],
      rows,
    )
  }

  const downloadSalesReport = () => {
    const monthlyOrders = getSelectedMonthReleasedOrders()
    const rows = monthlyOrders.map((order) => {
      const items = Array.isArray(order?.order_items)
        ? order.order_items
        : Array.isArray(order?.items)
          ? order.items
          : []

      const quantity = items.reduce((sum: number, item: any) => sum + Math.max(1, Number(item?.quantity || 1)), 0)
      const timestamp = getOrderTimestampForReport(order)
      const orderDate = timestamp ? new Date(timestamp).toISOString() : ""

      return [
        order?.id || "",
        orderDate,
        String(order?.status || ""),
        String(order?.payment_status || ""),
        String(order?.escrow_status || ""),
        String(order?.buyer_id || order?.buyerId || ""),
        quantity,
        getOrderAmountForReport(order).toFixed(2),
      ]
    })

    downloadCsvReport(
      `bigcat-sales-report-${selectedReportMonth.slug}.csv`,
      ["Order ID", "Date", "Status", "Payment Status", "Escrow Status", "Buyer ID", "Items Qty", "Amount (NGN)"],
      rows,
    )
  }

  const downloadCatalogReport = () => {
    const rows = allProducts.map((item) => [
      item?.id || "",
      item?.name || item?.title || "",
      item?.category || "",
      isServiceMerchant ? "service" : "product",
      Number(item?.price || item?.base_price || 0).toFixed(2),
      Number(item?.cost_price || 0).toFixed(2),
      isServiceMerchant ? "N/A" : Number(item?.stock || 0),
      item?.is_active === false ? "inactive" : "active",
      item?.created_at || "",
    ])

    downloadCsvReport(
      `bigcat-catalog-report-${selectedReportMonth.slug}.csv`,
      ["ID", "Name", "Category", "Type", "Sell Price (NGN)", "Cost Price (NGN)", "Stock", "Status", "Created At"],
      rows,
    )
  }

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      setUser(null)
      setRole(null)
    }
  }

  const handleAiSend = () => {
    if (!aiMessage.trim()) return
    setCurrentInsight((prev) => (prev + 1) % aiInsights.length)
    setAiMessage("")
  }

  const openTokenDialog = () => {
    setTokenDialogError("")
    setTokenPaymentMethod("wallet")
    setTokenBuying(false)
    if (typeof window !== "undefined" && user?.userId) {
      const card = localStorage.getItem(`demo_card_balance_${user.userId}`)
      setCardBalance(card !== null ? parseFloat(card) : 50000)
      const bank = localStorage.getItem(`demo_bank_balance_${user.userId}`)
      setBankBalance(bank !== null ? parseFloat(bank) : 100000)
    }
    setShowTokenDialog(true)
  }

  const handleTokenTopUp = async (amount: number, price: number) => {
    if (!user?.userId) return
    setTokenDialogError("")
    setTokenBuying(true)

    const methodLabel = tokenPaymentMethod === "wallet" ? "Wallet" : tokenPaymentMethod === "card" ? "Card" : "Bank Transfer"

    // Check selected payment source balance
    let currentBalance = 0
    if (tokenPaymentMethod === "wallet") {
      currentBalance = walletBalance
    } else if (tokenPaymentMethod === "card") {
      const raw = typeof window !== "undefined" ? localStorage.getItem(`demo_card_balance_${user.userId}`) : null
      currentBalance = raw !== null ? parseFloat(raw) : 50000
    } else {
      const raw = typeof window !== "undefined" ? localStorage.getItem(`demo_bank_balance_${user.userId}`) : null
      currentBalance = raw !== null ? parseFloat(raw) : 100000
    }

    if (currentBalance < price) {
      setTokenDialogError(`Insufficient ${methodLabel} balance. Need ${formatNaira(price)}, have ${formatNaira(currentBalance)}.`)
      setTokenBuying(false)
      return
    }

    try {
      const response = await fetch('/api/merchant/tokens/top-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: user.userId, amount }),
      })
      const result = await response.json()
      if (!result.success) {
        setTokenDialogError(result.error || 'Failed to top up tokens')
        setTokenBuying(false)
        return
      }

      // Deduct from the chosen payment source
      const newBalance = currentBalance - price
      if (tokenPaymentMethod === "wallet") {
        setWalletBalance(newBalance)
      } else if (tokenPaymentMethod === "card") {
        localStorage.setItem(`demo_card_balance_${user.userId}`, newBalance.toString())
        setCardBalance(newBalance)
      } else {
        localStorage.setItem(`demo_bank_balance_${user.userId}`, newBalance.toString())
        setBankBalance(newBalance)
      }

      setTokenBalance(Number(result.balance || 0))
      setStats((prev) => {
        if (!Array.isArray(prev) || prev.length < 3) return prev
        const next = [...prev]
        next[2] = { ...next[2], value: String(result.balance || 0) }
        return next
      })
      setTokenBuying(false)
      setShowTokenDialog(false)
    } catch {
      setTokenDialogError('Payment failed. Please try again.')
      setTokenBuying(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-3.5 h-3.5" />
      case "shipped": return <Truck className="w-3.5 h-3.5" />
      case "delivered": return <CheckCircle2 className="w-3.5 h-3.5" />
      default: return null
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending": return "bg-chart-4/10 text-chart-4"
      case "shipped": return "bg-chart-3/10 text-chart-3"
      case "delivered": return "bg-primary/10 text-primary"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const getOrderEscrowAmount = (order: any) => {
    const orderItems = Array.isArray(order?.order_items)
      ? order.order_items
      : Array.isArray(order?.items)
        ? order.items
        : []

    const itemsTotal = orderItems.reduce((sum: number, item: any) => {
      const quantity = Math.max(1, Number(item?.quantity || 1))
      const lineTotal = Number(item?.total_price || 0)
      const unitAmount = Number(item?.unit_price || item?.price || 0)

      if (lineTotal > 0) return sum + lineTotal
      if (unitAmount > 0) return sum + (unitAmount * quantity)
      return sum
    }, 0)

    const deliveryFee = Number(order?.delivery_fee || 0)
    const productTotal = Number(order?.product_total || 0)
    const grandTotal = Number(order?.grand_total || order?.total_amount || itemsTotal || 0)
    const merchantAmount = Math.max(0, productTotal || (grandTotal - deliveryFee))
    const status = String(order?.status || '').toLowerCase()

    if (status === 'delivered' || status === 'completed') return 0
    return merchantAmount
  }

  const getStockStyle = (status: string) => {
    switch (status) {
      case "active": return "text-primary"
      case "low": return "text-chart-4"
      case "out": return "text-destructive"
      default: return "text-muted-foreground"
    }
  }

  if (showProfile) {
    return <MerchantProfilePage onBack={() => setShowProfile(false)} />
  }

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />
  }

  if (showPaymentMethods) {
    return <PaymentMethodsPage onBack={() => setShowPaymentMethods(false)} />
  }

  if (showWithdrawal) {
    return <MerchantWithdrawal 
      merchantId={walletMerchantId || user?.userId || ""} 
      walletBalance={walletBalance}
      onBack={() => setShowWithdrawal(false)}
      onSuccess={() => {
        setShowWithdrawal(false)
        loadStats()
        loadOrders()
      }}
    />
  }

  return (
    <>
    <NotificationsPanel 
      isOpen={showNotifications} 
      onClose={() => setShowNotifications(false)}
      onUnreadChange={setNotificationCount}
      onOpenOrders={() => {
        setShowNotifications(false)
        setActiveTab("orders")
      }}
      onOpenMessages={() => {
        setShowNotifications(false)
        setActiveTab("messages")
      }}
    />
    
    {/* Token Purchase Dialog */}
    {showTokenDialog && (
      <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <div className="text-center mb-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-chart-4/10 flex items-center justify-center mb-3">
              <Coins className="w-7 h-7 text-chart-4" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">Buy Tokens</h2>
            <p className="text-sm text-muted-foreground">Boost your store visibility</p>
          </div>

          {/* Payment method selector */}
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Pay with</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "wallet" as const, label: "Wallet", balance: walletBalance },
                { id: "card" as const, label: "Card", balance: cardBalance },
                { id: "bank" as const, label: "Bank", balance: bankBalance },
              ] as const).map((method) => (
                <button
                  key={method.id}
                  onClick={() => { setTokenPaymentMethod(method.id); setTokenDialogError("") }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-colors ${
                    tokenPaymentMethod === method.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <span>{method.label}</span>
                  <span className={`text-[10px] font-semibold ${
                    tokenPaymentMethod === method.id ? "text-primary" : "text-foreground"
                  }`}>{formatNaira(method.balance)}</span>
                </button>
              ))}
            </div>
          </div>

          {tokenDialogError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4 text-center">
              {tokenDialogError}
            </p>
          )}

          <div className="space-y-2 mb-5">
            {[
              { tokens: 100, price: 1000 },
              { tokens: 500, price: 4500 },
              { tokens: 1000, price: 8000 },
            ].map((pack) => {
              const selectedBalance = tokenPaymentMethod === "wallet" ? walletBalance : tokenPaymentMethod === "card" ? cardBalance : bankBalance
              const canAfford = selectedBalance >= pack.price
              return (
                <button
                  key={pack.tokens}
                  onClick={() => handleTokenTopUp(pack.tokens, pack.price)}
                  disabled={tokenBuying}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                    tokenBuying
                      ? 'bg-muted opacity-60 cursor-not-allowed'
                      : canAfford
                        ? 'bg-secondary hover:bg-secondary/80 cursor-pointer'
                        : 'bg-secondary/50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-chart-4" />
                    <div className="text-left">
                      <span className="font-semibold text-foreground text-sm">{pack.tokens} Tokens</span>
                      {!canAfford && (
                        <p className="text-[10px] text-destructive">Insufficient balance</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tokenBuying && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
                    <span className={`font-bold text-sm ${canAfford ? 'text-primary' : 'text-muted-foreground'}`}>{formatNaira(pack.price)}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => { setShowTokenDialog(false); setTokenDialogError(""); setTokenBuying(false) }}
            disabled={tokenBuying}
            className="w-full py-3 bg-muted text-foreground rounded-xl font-medium disabled:opacity-60"
          >
            Close
          </button>
        </div>
      </div>
    )}
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <BrandWordmark compact />
          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
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

      {/* Tab Navigation */}
      <div className="sticky top-14 z-40 bg-card border-b border-border px-4 flex gap-4">
        <button
          onClick={() => setActiveTab("home")}
          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "home"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
            Overview
        </button>
        {!isServiceMerchant && (
        <button
          onClick={() => setActiveTab("products")}
          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "products"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
            Products
        </button>
        )}
        {isServiceMerchant && (
        <button
          onClick={() => setActiveTab("services")}
          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "services"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
            Services
        </button>
        )}
        <button
          onClick={() => setActiveTab("orders")}
          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "orders"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
            Orders
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "messages"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
            Messages
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "ai"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
            AI
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-24">
        {activeTab === "home" ? (
          <>
        {/* Welcome Section */}
        <div className="px-4 pt-5 pb-4">
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h2 className="text-2xl font-bold text-foreground">{user?.merchantProfile?.business_name || user?.name || user?.email?.split('@')[0] || "Merchant"}</h2>
        </div>

        {/* Stats Cards */}
        <section className="px-4 mb-6">
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : stats.length === 0 ? (
            <div className="p-8 text-center">
              <NairaIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 flex items-center justify-center text-4xl" />
              <p className="text-sm text-muted-foreground">No sales data yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat, idx) => (
                <div
                  key={stat.label}
                  className={`bg-card border border-border rounded-2xl p-4 shadow-sm ${stat.action ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''} ${stats.length % 2 !== 0 && idx === stats.length - 1 ? 'col-span-2' : ''}`}
                  onClick={stat.action}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.trend === "up" ? "text-primary" : "text-destructive"}`}>
                      {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {stat.change}
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${stat.valueClass || 'text-foreground'}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="px-4 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                  action.primary 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : action.highlight 
                      ? "bg-chart-4/10 text-chart-4 border border-chart-4/30"
                      : "bg-card border border-border text-foreground hover:border-primary/30"
                }`}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-tight text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="px-4 mb-6">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Growth Onboarding Path</h3>
                <p className="text-xs text-muted-foreground mt-1">Progressive setup based on your current business maturity.</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">{onboardingProgress}% complete</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-4">
              <div className="h-full bg-primary" style={{ width: `${onboardingProgress}%` }} />
            </div>
            <div className="space-y-2 mb-4">
              {onboardingSteps.map((step) => (
                <div key={step.label} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${step.done ? 'bg-primary' : 'bg-border'}`} />
                    <span className={step.done ? 'text-foreground' : 'text-muted-foreground'}>{step.label}</span>
                  </div>
                  {!step.done && (
                    <button onClick={step.action} className="text-xs font-medium text-primary hover:underline shrink-0">
                      {step.cta}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {nextOnboardingStep && (
              <button
                onClick={nextOnboardingStep.action}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Next best action: {nextOnboardingStep.cta}
              </button>
            )}
          </div>
        </section>

        <section className="px-4 mb-6">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Merchant Operations Cockpit</h3>
              <span className="text-xs text-muted-foreground">Live operational signals</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {isServiceMerchant ? (
                <>
                  <div className="rounded-xl border border-border bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Active services</p>
                    <p className="text-lg font-bold text-chart-4 mt-1">{allProducts.length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Unpriced services</p>
                    <p className="text-lg font-bold text-destructive mt-1">{allProducts.filter((item) => Number(item?.base_price || 0) <= 0).length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Catalog gaps</p>
                    <p className="text-lg font-bold text-destructive mt-1">{allProducts.filter((item) => !String(item?.description || '').trim()).length}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Low-stock alerts</p>
                    <p className="text-lg font-bold text-chart-4 mt-1">{lowStockCount}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Out of stock</p>
                    <p className="text-lg font-bold text-destructive mt-1">{outOfStockCount}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Margin-risk SKUs</p>
                    <p className="text-lg font-bold text-destructive mt-1">{marginRiskCount}</p>
                  </div>
                </>
              )}
              <div className="rounded-xl border border-border bg-secondary/40 p-3">
                <p className="text-xs text-muted-foreground">Pending fulfillment</p>
                <p className="text-lg font-bold text-primary mt-1">{pendingFulfillmentCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-3">
                <p className="text-xs text-muted-foreground">Return/refund queue</p>
                <p className="text-lg font-bold text-purple-600 mt-1">{returnOrDisputeQueueCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-3">
                <p className="text-xs text-muted-foreground">Stale pending checkout</p>
                <p className="text-lg font-bold text-amber-600 mt-1">{stalePendingCheckoutCount}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setActiveTab(isServiceMerchant ? 'services' : 'products')}
                className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 text-left"
              >
                {isServiceMerchant ? 'Refresh service catalog' : 'Launch low-stock campaign'}
              </button>
              <button
                onClick={() => setActiveTab(isServiceMerchant ? 'services' : 'products')}
                className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 text-left"
              >
                {isServiceMerchant ? 'Update service pricing' : 'Create bundle offer'}
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 text-left"
              >
                Review return/refund queue
              </button>
            </div>
          </div>
        </section>

        {/* AI BizPilot Section */}
        <section className="px-4 mb-6">
          <button
            onClick={() => setActiveTab("ai")}
            className="w-full text-left bg-gradient-to-br from-primary/5 via-card to-chart-4/5 border border-primary/20 rounded-2xl p-4 shadow-sm hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">AI BizPilot</h3>
                  <p className="text-[10px] text-muted-foreground">Your intelligent business assistant</p>
                </div>
              </div>
              <span className="text-xs text-primary font-medium">Open →</span>
            </div>
            
            {/* AI Insight Card */}
            <div className="bg-card/80 backdrop-blur rounded-xl p-3 mb-3 border border-border">
              <div className="flex gap-2">
                <div className="w-1 rounded-full bg-primary shrink-0" />
                <p className="text-sm text-foreground leading-relaxed">
                  {aiInsights[currentInsight]}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1">
                  {aiInsights.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full inline-block ${i === currentInsight ? "bg-primary" : "bg-border"}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">Tap to chat with BizPilot</span>
              </div>
            </div>
          </button>
        </section>


        {/* Performance Stats - Removed hardcoded data */}

        {/* Token System - Using real user balance */}
        <section className="px-4 mb-6">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-chart-4/10">
                  <Coins className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Token Balance</p>
                  <p className="text-xl font-bold text-foreground">{tokenBalance}</p>
                </div>
              </div>
              <button 
                onClick={openTokenDialog}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl shadow-sm shadow-primary/20"
              >
                Buy Tokens
              </button>
            </div>
            <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
              More activity = higher visibility. Tokens boost your store ranking.
            </p>
          </div>
        </section>

        {/* To-Do & Reminders */}
        <section className="px-4 mb-6">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">To-Do & Reminders</h3>
                <p className="text-xs text-muted-foreground">Plan tasks and get alerted when they are due.</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{merchantTodos.filter((todo) => !todo.completed).length}</p>
                <p className="text-[10px] text-muted-foreground">Open tasks</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <input
                type="text"
                value={todoForm.title}
                onChange={(e) => setTodoForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="What do you want to do?"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={todoForm.dueDate}
                  onChange={(e) => setTodoForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <input
                  type="time"
                  value={todoForm.dueTime}
                  onChange={(e) => setTodoForm((prev) => ({ ...prev, dueTime: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              {todoError ? (
                <p className="text-xs text-destructive">{todoError}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {notificationPermission === "granted"
                    ? "Browser alerts are enabled for reminders."
                    : notificationPermission === "denied"
                      ? "Browser alerts are blocked, but reminder notices will still appear in-app."
                      : notificationPermission === "unsupported"
                        ? "This browser does not support push alerts; in-app reminders still work."
                        : "Allow browser notifications for instant reminder pop-ups."}
                </p>
              )}
              <button
                onClick={handleAddTodo}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20"
              >
                Add Reminder
              </button>
            </div>

            {merchantTodos.length === 0 ? (
              <div className="rounded-xl bg-secondary/40 px-4 py-5 text-center">
                <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-foreground font-medium">No tasks yet</p>
                <p className="text-xs text-muted-foreground">Add your first reminder above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {merchantTodos.slice(0, 5).map((todo) => {
                  const isOverdue = !todo.completed && new Date(todo.dueAt).getTime() <= Date.now()
                  return (
                    <div key={todo.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${todo.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {todo.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{formatReminderTime(todo.dueAt)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${todo.completed ? "bg-primary/10 text-primary" : isOverdue ? "bg-destructive/10 text-destructive" : "bg-chart-4/10 text-chart-4"}`}>
                          {todo.completed ? "Done" : isOverdue ? "Due now" : "Scheduled"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => toggleTodoCompletion(todo.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {todo.completed ? "Undo" : "Complete"}
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Catalog Management */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">{isServiceMerchant ? 'Services' : 'Products'}</h3>
            <button onClick={() => setActiveTab(isServiceMerchant ? "services" : "products")} className="text-xs text-primary font-medium">View All</button>
          </div>
          {loadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{isServiceMerchant ? 'No services yet' : 'No products yet'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {products.map((product) => (
                <div key={product.id} className="bg-card border border-border rounded-2xl p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {isServiceMerchant ? '🔧' : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          {isServiceMerchant ? 'Price' : 'Sell'}: {formatNaira(parseFloat(product.price || product.base_price || 0))}
                        </span>
                        {isServiceMerchant ? (
                          <span className="text-xs text-muted-foreground">Category: {product.category || 'Service'}</span>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground">Cost: {formatNaira(Number(product.cost_price || 0))}</span>
                            <span className="text-xs text-muted-foreground">Stock: {Number(product.stock || 0)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveTab(isServiceMerchant ? "services" : "products")}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                        aria-label={isServiceMerchant ? "Edit service" : "Edit product"}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveTab(isServiceMerchant ? "services" : "products")}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        aria-label={isServiceMerchant ? "Delete service" : "Delete product"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Orders */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
            <button onClick={() => setActiveTab("orders")} className="text-xs text-primary font-medium">View All</button>
          </div>
          {loadingOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No orders yet</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {recentOrders.map((order, index) => {
                const cardTotal = Math.max(0, toAmount(order?.grand_total || order?.total_amount || 0))
                const cardEscrow = Math.max(0, toAmount(getOrderEscrowAmount(order)))

                return (
                <div
                  key={order.id}
                  className={`flex items-center justify-between p-3 ${
                    index !== recentOrders.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${getStatusStyle(order.status)}`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm">{order.id}</p>
                        <span className="text-[10px] text-muted-foreground">Just now</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{order.customer_name || "Customer"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground text-sm">{formatNaira(cardTotal)}</p>
                    <p className="text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 mt-1 inline-block">Escrow {formatNaira(cardEscrow)}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{order.status}</p>
                  </div>
                </div>
              )})}
            </div>
          )}
        </section>
          </>
        ) : activeTab === "products" && !isServiceMerchant ? (
          <MerchantProducts merchantId={user?.userId || ""} />
        ) : activeTab === "orders" ? (
          <MerchantOrders onBack={() => setActiveTab("home")} />
        ) : activeTab === "services" ? (
          <MerchantServices merchantId={user?.userId || ""} />
        ) : activeTab === "messages" ? (
          <ChatInterface />
        ) : activeTab === "ai" ? (
          <div className="h-full" style={{ minHeight: "calc(100vh - 180px)" }}>
            <NigeriaAiAssistant
              assistantMode="merchant"
              className="h-full"
              userLocation={String(user?.location || [user?.city, user?.state].filter(Boolean).join(', '))}
            />
          </div>
        ) : activeTab === "analytics" ? (
          <div className="px-4 py-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Analytics Dashboard</h2>
              <p className="text-sm text-muted-foreground">Track your business performance</p>
            </div>
            
            {/* Sales Overview */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-foreground mb-4">Sales Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-primary/5 rounded-xl">
                  <p className="text-2xl font-bold text-primary">{formatNaira(analyticsData.weeklySales)}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-xl">
                  <p className="text-2xl font-bold text-primary">{formatNaira(analyticsData.monthlySales)}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-foreground mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                {[
                  {
                    label: isServiceMerchant ? "Active Services" : "Active Products",
                    value: analyticsData.listingCount.toString(),
                    change: "Live catalog",
                  },
                  { label: "Order Completion Rate", value: analyticsData.completionRate, change: "Delivered + released" },
                  { label: "Average Order Value", value: analyticsData.averageOrderValue, change: "From completed sales" },
                  { label: "Customer Retention", value: analyticsData.customerRetention, change: "Repeat buyers" },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{metric.value}</span>
                      <span className="text-xs text-muted-foreground">{metric.change}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-foreground mb-2">Download Reports</h3>
              <p className="text-xs text-muted-foreground mb-3">Export your monthly financial, sales, and catalog reports as CSV.</p>
              <div className="mb-4">
                <label className="block text-xs text-muted-foreground mb-1">Report Month</label>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full sm:w-auto rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={downloadFinancialReport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Financial Report
                </button>
                <button
                  onClick={downloadSalesReport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Sales Report
                </button>
                <button
                  onClick={downloadCatalogReport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background text-foreground px-3 py-2 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Catalog Report
                </button>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Analytics are calculated from your live orders and listings.
            </p>
          </div>
        ) : activeTab === "settings" ? (
          <div className="px-4 py-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Store Settings</h2>
              <p className="text-sm text-muted-foreground">Manage your store preferences</p>
            </div>
            
            {/* Profile & Store Settings */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
              <h3 className="font-semibold text-foreground p-4 border-b border-border">Profile & Store</h3>
              <div className="divide-y divide-border">
                <button 
                  onClick={() => setShowProfile(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm text-muted-foreground">Edit Profile & Store</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-primary">Edit</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
                <button 
                  onClick={() => setShowPaymentMethods(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm text-muted-foreground">Wallet</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-primary">Open</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <h3 className="font-semibold text-foreground p-4 border-b border-border">Account</h3>
              <div className="divide-y divide-border">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm text-muted-foreground">Security Settings</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 hover:bg-destructive/10 transition-colors"
                >
                  <span className="text-sm text-destructive">Log Out</span>
                  <LogOut className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 pb-6 z-40">
        <div className="flex items-center justify-around">
          {/* Home */}
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              activeTab === "home" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          {/* Orders */}
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              activeTab === "orders" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] font-medium">Orders</span>
          </button>

          {/* Catalog */}
          <button
            onClick={() => setActiveTab(isServiceMerchant ? "services" : "products")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              (isServiceMerchant ? activeTab === "services" : activeTab === "products") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-medium">{isServiceMerchant ? 'Services' : 'Products'}</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => setShowProfile(true)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              showProfile ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
              activeTab === "settings" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </div>
    </>
  )
}
