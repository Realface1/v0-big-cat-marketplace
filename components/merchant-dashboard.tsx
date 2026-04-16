"use client"

// Force rebuild

declare global {
  interface Window {
    voiceflow?: {
      chat?: {
        load?: (config: Record<string, unknown>) => void
      }
    }
    __voiceflowMerchantLoaded?: boolean
  }
}

import { useRole } from "@/lib/role-context"
import { logout } from "@/lib/auth-client"
import { MerchantProducts } from "@/components/merchant-products"
import { MerchantOrders } from "@/components/merchant-orders"
import { ProfilePage } from "@/components/profile-page"
import { MerchantProfilePage } from "@/components/merchant-profile-page"
import { SettingsPage } from "@/components/settings-page"
import { PaymentMethodsPage } from "@/components/payment-methods-page"
import { ChatInterface } from "@/components/chat-interface"
import { formatNaira } from "@/lib/currency-utils"
import { BrandWordmark } from "./brand-wordmark"
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
  DollarSign,
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
  User,
  MessageSquare,
} from "lucide-react"
import { useState, useEffect } from "react"
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

export function MerchantDashboard() {
  const { setRole, setUser, user, isLoading } = useRole()
  const [activeTab, setActiveTab] = useState("home")
  const [aiMessage, setAiMessage] = useState("")
  const [voiceflowMerchantReady, setVoiceflowMerchantReady] = useState(false)
  const [currentInsight, setCurrentInsight] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  
  // Real data states
  const [stats, setStats] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
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
    }
  }, [user])

  // Suppress Voiceflow inline prop warning
  useEffect(() => {
    const pattern = "Received `true` for a non-boolean attribute `inline`"
    const originalError = console.error
    const originalWarn = console.warn
    const shouldSuppress = (args: unknown[]) =>
      args.some((arg) => typeof arg === "string" && arg.includes(pattern))
    console.error = (...args: any[]) => { if (shouldSuppress(args)) return; originalError(...args) }
    console.warn = (...args: any[]) => { if (shouldSuppress(args)) return; originalWarn(...args) }
    return () => { console.error = originalError; console.warn = originalWarn }
  }, [])

  // Load Voiceflow script
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.__voiceflowMerchantLoaded) {
      setVoiceflowMerchantReady(Boolean(window.voiceflow?.chat?.load))
      return
    }
    const existingScript = document.getElementById("voiceflow-merchant-script")
    if (existingScript) {
      setVoiceflowMerchantReady(Boolean(window.voiceflow?.chat?.load))
      return
    }
    const script = document.createElement("script")
    script.id = "voiceflow-merchant-script"
    script.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs"
    script.type = "text/javascript"
    script.onload = () => {
      window.__voiceflowMerchantLoaded = true
      setVoiceflowMerchantReady(true)
    }
    document.body.appendChild(script)
  }, [])

  // Mount Voiceflow widget when AI tab is active
  useEffect(() => {
    if (activeTab !== "ai" || !voiceflowMerchantReady) return
    const target = document.getElementById("merchant-ai-embed-target")
    if (!target) return
    target.innerHTML = ""
    window.voiceflow?.chat?.load?.({
      verify: { projectID: "69dd08062ba6b506cadb4f4e" },
      url: "https://general-runtime.voiceflow.com",
      versionID: "production",
      voice: { url: "https://runtime-api.voiceflow.com" },
      render: { mode: "embedded", target },
    })
  }, [activeTab, voiceflowMerchantReady])

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
        const [tokenResponse, ordersResponse, productsResponse] = await Promise.all([
          fetch(`/api/merchant/tokens?merchantId=${encodeURIComponent(user.userId)}`, {
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
        const ordersResult = await ordersResponse.json()
        const productsResult = await productsResponse.json()

        if (tokenResult.success) {
          nextTokenBalance = Number(tokenResult.balance || 0)
          setTokenBalance(nextTokenBalance)
        }

        merchantOrders = Array.isArray(ordersResult.data)
          ? ordersResult.data
          : Array.isArray(ordersResult.orders)
            ? ordersResult.orders
            : []

        merchantProducts = Array.isArray(productsResult.data) ? productsResult.data : []
      }

      const getMerchantAmount = (order: any) => {
        const deliveryFee = Number(order?.delivery_fee || 0)
        const productTotal = Number(order?.product_total || 0)
        const grandTotal = Number(order?.grand_total || order?.total_amount || 0)
        return Math.max(0, productTotal || (grandTotal - deliveryFee))
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

      const completedOrders = merchantOrders.filter((order) => {
        const status = String(order?.status || '').toLowerCase()
        const escrowStatus = String(order?.escrow_status || '').toLowerCase()
        const paymentStatus = String(order?.payment_status || '').toLowerCase()
        return status === 'delivered' || status === 'completed' || escrowStatus === 'released' || paymentStatus === 'completed'
      })

      const totalSales = completedOrders.reduce((sum, order) => sum + getMerchantAmount(order), 0)
      const totalInventoryCost = merchantProducts.reduce(
        (sum, product) => sum + (Number(product.cost_price || 0) * Number(product.stock || 0)),
        0,
      )
      const totalCostOfSales = completedOrders.reduce(
        (sum, order) => sum + (Array.isArray(order?.order_items) ? order.order_items.reduce((innerSum: number, item: any) => innerSum + getItemCost(item), 0) : 0),
        0,
      )
      const profitLoss = totalSales - totalCostOfSales
      const activeOrders = merchantOrders.filter((order) => !['delivered', 'completed'].includes(String(order?.status || '').toLowerCase())).length
      const escrowBalance = merchantOrders
        .filter((order) => String(order?.escrow_status || '').toLowerCase() === 'held')
        .reduce((sum, order) => sum + getMerchantAmount(order), 0)

      const statsData = [
        { label: "Total Cost Price", value: formatNaira(totalInventoryCost), change: `${merchantProducts.length} products`, trend: "up", icon: DollarSign },
        { label: "Total Sales", value: formatNaira(totalSales), change: `${completedOrders.length} sales`, trend: "up", icon: NairaIcon },
        { label: "Profit / Loss", value: profitLoss >= 0 ? formatNaira(profitLoss) : `-${formatNaira(Math.abs(profitLoss))}`, change: activeOrders > 0 ? `${activeOrders} active orders` : "Audited", trend: profitLoss >= 0 ? "up" : "down", icon: profitLoss >= 0 ? TrendingUp : TrendingDown },
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
          setRecentOrders(nextOrders.slice(0, 3))
        }
      }
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const quickActions = [
    { label: "Add Product", icon: Plus, primary: true, action: () => setActiveTab("products") },
    { label: "View Orders", icon: ShoppingBag, primary: false, action: () => setActiveTab("orders") },
    { label: "Analytics", icon: BarChart3, primary: false, action: () => setActiveTab("analytics") },
    { label: "AI BizPilot", icon: Sparkles, primary: false, highlight: true, action: () => setActiveTab("ai") },
  ]

  const aiInsights = [
    "Build your store by adding quality products with accurate descriptions.",
    "Respond quickly to customer messages to build trust and increase sales.",
    "Competitive pricing and fast delivery help increase your sales.",
  ]

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
      const stored = localStorage.getItem(`wallet_balance_${user.userId}`)
      setWalletBalance(stored ? parseFloat(stored) : 0)
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
      currentBalance = typeof window !== "undefined"
        ? parseFloat(localStorage.getItem(`wallet_balance_${user.userId}`) || "0")
        : 0
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
        localStorage.setItem(`wallet_balance_${user.userId}`, newBalance.toString())
        setWalletBalance(newBalance)
        // Record wallet transaction
        const txKey = `wallet_balance_${user.userId}_transactions`
        const txRaw = localStorage.getItem(txKey)
        const transactions = txRaw ? JSON.parse(txRaw) : []
        transactions.unshift({
          id: crypto.randomUUID(),
          type: "debit",
          amount: price,
          description: `Bought ${amount} tokens`,
          date: new Date().toISOString(),
        })
        localStorage.setItem(txKey, JSON.stringify(transactions))
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

  return (
    <>
    <NotificationsPanel 
      isOpen={showNotifications} 
      onClose={() => setShowNotifications(false)}
      onUnreadChange={setNotificationCount}
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
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Overview
          </div>
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "products"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Products
          </div>
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "orders"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Orders
          </div>
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "messages"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages
          </div>
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "ai"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI
          </div>
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
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card border border-border rounded-2xl p-4 shadow-sm"
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
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
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

        {/* Product Management */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Products</h3>
            <button onClick={() => setActiveTab("products")} className="text-xs text-primary font-medium">View All</button>
          </div>
          {loadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No products yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {products.map((product) => (
                <div key={product.id} className="bg-card border border-border rounded-2xl p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">Sell: {formatNaira(parseFloat(product.price))}</span>
                        <span className="text-xs text-muted-foreground">Cost: {formatNaira(Number(product.cost_price || 0))}</span>
                        <span className="text-xs text-muted-foreground">Stock: {Number(product.stock || 0)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveTab("products")}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                        aria-label="Edit product"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveTab("products")}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        aria-label="Delete product"
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
              {recentOrders.map((order, index) => (
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
                    <p className="font-semibold text-foreground text-sm">{formatNaira(order.grand_total || 0)}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
          </>
        ) : activeTab === "products" ? (
          <MerchantProducts merchantId={user?.userId || ""} />
        ) : activeTab === "orders" ? (
          <MerchantOrders onBack={() => setActiveTab("home")} />
        ) : activeTab === "messages" ? (
          <ChatInterface />
        ) : activeTab === "ai" ? (
          <div className="flex flex-col h-full">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">AI BizPilot</h2>
                <p className="text-[11px] text-muted-foreground">Your intelligent business assistant</p>
              </div>
            </div>
            {!voiceflowMerchantReady ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading AI assistant…</span>
              </div>
            ) : null}
            <div
              id="merchant-ai-embed-target"
              className="flex-1 w-full overflow-hidden"
              style={{ minHeight: "calc(100vh - 180px)" }}
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
                  <p className="text-2xl font-bold text-primary">{formatNaira(0)}</p>
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-xl">
                  <p className="text-2xl font-bold text-primary">{formatNaira(0)}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-foreground mb-4">Performance Metrics</h3>
              <div className="space-y-3">
                {[
                  { label: "Products Views", value: "0", change: "+0%" },
                  { label: "Conversion Rate", value: "0%", change: "+0%" },
                  { label: "Average Order Value", value: formatNaira(0), change: "+0%" },
                  { label: "Customer Retention", value: "0%", change: "+0%" },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{metric.value}</span>
                      <span className="text-xs text-primary">{metric.change}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Analytics data updates daily. Start selling to see your metrics!
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
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 pb-6">
        <div className="flex items-center justify-around">
{[
                  { id: "home", icon: Home, label: "Home", action: () => setActiveTab("home") },
                  { id: "products", icon: Package, label: "Products", action: () => setActiveTab("products") },
                  { id: "orders", icon: ShoppingBag, label: "Orders", action: () => setActiveTab("orders") },
                  { id: "messages", icon: MessageSquare, label: "Messages", action: () => setActiveTab("messages") },
                  { id: "ai", icon: Sparkles, label: "AI", action: () => setActiveTab("ai") },
                  { id: "profile", icon: User, label: "Profile", action: () => setShowProfile(true) },
                  { id: "settings", icon: Settings, label: "Settings", action: () => setActiveTab("settings") },
                ].map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                activeTab === item.id 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
    </>
  )
}
