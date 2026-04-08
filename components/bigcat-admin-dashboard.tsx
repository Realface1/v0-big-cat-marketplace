"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, Store, ShoppingBag, TrendingUp, Truck, CheckCircle2, Loader2 } from "lucide-react"
import { getPlatformStats, getRecentUsers, getRecentOrders, getLogisticsStats } from "@/lib/admin-actions"
import { formatNaira } from "@/lib/currency-utils"

export function BigcatAdminDashboard() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    totalOrders: 0,
    totalRevenue: 0
  })
  const [logisticsStats, setLogisticsStats] = useState({
    activeDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0
  })
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const adminAccess = sessionStorage.getItem("adminAccess")
    if (adminAccess === "BIGCAT_00") {
      setIsAuthorized(true)
      loadData()
    } else {
      router.push("/")
    }
  }, [router])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsResult, logisticsResult, usersResult, ordersResult] = await Promise.all([
        getPlatformStats(),
        getLogisticsStats(),
        getRecentUsers(),
        getRecentOrders()
      ])

      if (statsResult.success) {
        setPlatformStats(statsResult.stats)
      }

      if (logisticsResult.success) {
        setLogisticsStats(logisticsResult.stats)
      }

      if (usersResult.success) {
        const userData = usersResult.data.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.email?.split('@')[0] || 'Unknown',
          email: u.email,
          joined: new Date(u.created_at).toLocaleDateString(),
          type: u.role || 'buyer',
        }))
        setRecentUsers(userData)
      }

      if (ordersResult.success) {
        const orderData = ordersResult.data.map((o: any) => ({
          id: o.id,
          user: o.buyerName || o.buyer_id?.substring(0, 8) || 'Unknown',
          amount: o.grand_total || 0,
          status: o.status || 'pending',
          date: new Date(o.created_at).toLocaleDateString(),
        }))
        setRecentOrders(orderData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const interval = setInterval(loadData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: "Total Users",
      value: platformStats.totalUsers,
      icon: Users,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Total Merchants",
      value: platformStats.totalMerchants,
      icon: Store,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Total Orders",
      value: platformStats.totalOrders,
      icon: ShoppingBag,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Total Revenue",
      value: formatNaira(platformStats.totalRevenue),
      icon: TrendingUp,
      color: "bg-orange-100 text-orange-600",
    },
  ]

  const logisticsData = [
    { label: "Active Deliveries", value: logisticsStats.activeDeliveries, color: "text-blue-600" },
    { label: "Completed Deliveries", value: logisticsStats.completedDeliveries, color: "text-green-600" },
    { label: "Pending Deliveries", value: logisticsStats.pendingDeliveries, color: "text-yellow-600" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex items-center gap-4 p-6 max-w-7xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">BigCat Super Admin</h1>
            <p className="text-sm text-muted-foreground">Complete Marketplace Overview</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Logistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg text-foreground">Logistics Overview</h2>
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col gap-4">
              {logisticsData.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-6">Quick Access</h2>
            <div className="flex flex-col gap-3">
              <button className="w-full p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-left">
                View All Users ({platformStats.totalUsers})
              </button>
              <button className="w-full p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors text-left">
                View All Merchants ({platformStats.totalMerchants})
              </button>
              <button className="w-full p-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors text-left">
                View All Orders ({platformStats.totalOrders})
              </button>
            </div>
          </div>
        </div>

        {/* Recent Users & Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-bold text-lg text-foreground">Recent Users</h2>
            </div>
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {recentUsers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No users found</div>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">{user.joined}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        user.type === "merchant"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {user.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-bold text-lg text-foreground">Recent Orders</h2>
            </div>
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {recentOrders.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No orders found</div>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{order.id.substring(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{order.user}</p>
                        <p className="text-xs text-muted-foreground mt-1">{order.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{formatNaira(order.amount)}</p>
                        <span className={`text-xs font-semibold px-2 py-1 rounded inline-block mt-1 ${
                          order.status === "delivered"
                            ? "bg-green-100 text-green-700"
                            : order.status === "processing"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
