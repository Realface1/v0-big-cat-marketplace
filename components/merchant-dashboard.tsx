"use client"

// Force rebuild
import { useRole } from "@/lib/role-context"
import { logout } from "@/lib/auth-actions"
import { MerchantProducts } from "@/components/merchant-products"
import { MerchantOrders } from "@/components/merchant-orders"
import { ProfilePage } from "@/components/profile-page"
import { MerchantProfilePage } from "@/components/merchant-profile-page"
import { SettingsPage } from "@/components/settings-page"
import { PaymentMethodsPage } from "@/components/payment-methods-page"
import { formatNaira } from "@/lib/currency-utils"
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
} from "lucide-react"
import { useState, useEffect } from "react"
import { getMerchantProducts } from "@/lib/product-actions"
import { getMerchantOrders } from "@/lib/order-actions"
import { NotificationsPanel } from "./notifications-panel"

export function MerchantDashboard() {
  const { setRole, setUser, user, isLoading } = useRole()
  const [activeTab, setActiveTab] = useState("home")
  const [aiMessage, setAiMessage] = useState("")
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
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  
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

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      // Set default stats since getMerchantStats doesn't take parameters
      const statsData = [
        { label: "Total Sales", value: formatNaira(0), change: "+12%", trend: "up", icon: DollarSign },
        { label: "Active Orders", value: "0", change: "+2", trend: "up", icon: ShoppingBag },
        { label: "Token Balance", value: "0", change: "0", trend: "up", icon: Coins },
        { label: "Escrow Balance", value: formatNaira(0), change: "0", trend: "up", icon: Clock },
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
        const result = await getMerchantProducts(user.userId)
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
        const result = await getMerchantOrders(user.userId)
        if (result.success && result.orders) {
          setRecentOrders(result.orders.slice(0, 3))
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
    { label: "AI BizPilot", icon: Sparkles, primary: false, highlight: true, action: () => {} },
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
    />
    
    {/* Token Purchase Dialog */}
    {showTokenDialog && (
      <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-chart-4/10 flex items-center justify-center mb-4">
              <Coins className="w-8 h-8 text-chart-4" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Buy Tokens</h2>
            <p className="text-sm text-muted-foreground">Boost your store visibility</p>
          </div>
          
          <div className="space-y-3 mb-6">
            {[
              { tokens: 100, price: 1000 },
              { tokens: 500, price: 4500 },
              { tokens: 1000, price: 8000 },
            ].map((pack) => (
              <button
                key={pack.tokens}
                className="w-full flex items-center justify-between p-4 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Coins className="w-5 h-5 text-chart-4" />
                  <span className="font-semibold text-foreground">{pack.tokens} Tokens</span>
                </div>
                <span className="text-primary font-bold">{formatNaira(pack.price)}</span>
              </button>
            ))}
          </div>
          
          <p className="text-xs text-center text-muted-foreground mb-4">
            Tokens can be used to boost product visibility and unlock premium features.
          </p>
          
          <button
            onClick={() => setShowTokenDialog(false)}
            className="w-full py-3 bg-muted text-foreground rounded-xl font-medium"
          >
            Close
          </button>
        </div>
      </div>
    )}
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleLogout}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">Merchant Dashboard</h1>
          <button 
            onClick={() => setShowNotifications(true)}
            className="relative p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </button>
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
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
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
          <div className="bg-gradient-to-br from-primary/5 via-card to-chart-4/5 border border-primary/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">AI BizPilot</h3>
                <p className="text-[10px] text-muted-foreground">Your intelligent business assistant</p>
              </div>
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
                    <button
                      key={i}
                      onClick={() => setCurrentInsight(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentInsight ? "bg-primary" : "bg-border"}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">Insight {currentInsight + 1} of {aiInsights.length}</span>
              </div>
            </div>

            {/* AI Chat Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask BizPilot anything..."
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              />
              <button className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground rounded-xl shadow-sm shadow-primary/20">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
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
                  <p className="text-xl font-bold text-foreground">{stats[2]?.value || "0"}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTokenDialog(true)}
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-foreground">{formatNaira(parseFloat(product.price))}</span>
                        <span className="text-xs text-muted-foreground">In stock</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
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
                  <span className="text-sm text-muted-foreground">Payment Methods</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-primary">Manage</span>
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
                  { id: "home", icon: Home, label: "Home" },
                  { id: "products", icon: Package, label: "Products", action: () => setActiveTab("products") },
                  { id: "orders", icon: ShoppingBag, label: "Orders", action: () => setActiveTab("orders") },
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
