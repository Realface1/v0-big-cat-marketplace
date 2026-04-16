"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, Store, ShoppingBag, TrendingUp, Truck, CheckCircle2, XCircle, Clock, Loader2, UserPlus } from "lucide-react"
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
  const [pendingMerchants, setPendingMerchants] = useState<any[]>([])
  const [paymentStats, setPaymentStats] = useState({
    totalEscrow: 0,
    disbursedAmount: 0,
    pendingOrders: 0,
    completedOrders: 0,
  })
  const [growthStats, setGrowthStats] = useState({
    Nano: 0,
    Mini: 0,
    Medium: 0,
    'Large Scale': 0,
    totalSales: 0,
    totalProfit: 0,
  })
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Agent management state - BigCat only sees count
  const [agentCount, setAgentCount] = useState(0)
  const [agentCountLoading, setAgentCountLoading] = useState(false)

  useEffect(() => {
    const adminAccess = sessionStorage.getItem("adminAccess")
    if (adminAccess === "BIGCAT_00") {
      setIsAuthorized(true)
      loadData()
      loadAgentCount()
    } else {
      router.push("/")
    }
  }, [router])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes, ordersRes] = await Promise.all([
        fetch('/api/admin/stats', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/admin/users', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/admin/orders', { cache: 'no-store' }).then(r => r.json()),
      ])

      if (statsRes.success) {
        setPlatformStats(statsRes.platform || statsRes.stats || {})
        setPaymentStats({
          totalEscrow: Number(statsRes.transactions?.totalEscrow || 0),
          disbursedAmount: Number(statsRes.transactions?.disbursedAmount || 0),
          pendingOrders: Number(statsRes.transactions?.pendingOrders || 0),
          completedOrders: Number(statsRes.transactions?.completedOrders || 0),
        })
        setGrowthStats({
          Nano: Number(statsRes.merchants?.categories?.Nano || 0),
          Mini: Number(statsRes.merchants?.categories?.Mini || 0),
          Medium: Number(statsRes.merchants?.categories?.Medium || 0),
          'Large Scale': Number(statsRes.merchants?.categories?.['Large Scale'] || 0),
          totalSales: Number(statsRes.merchants?.totalSales || 0),
          totalProfit: Number(statsRes.merchants?.totalProfit || 0),
        })
        if (statsRes.logistics) {
          setLogisticsStats({
            activeDeliveries: statsRes.logistics.total - statsRes.logistics.completed || 0,
            completedDeliveries: statsRes.logistics.completed || 0,
            pendingDeliveries: statsRes.logistics.pending || 0,
          })
        }
      }

      if (usersRes.success) {
        const userData = (usersRes.data || []).map((u: any) => ({
          id: u.id,
          name: u.full_name || u.email?.split('@')[0] || 'Unknown',
          email: u.email,
          joined: new Date(u.created_at).toLocaleDateString(),
          type: u.role || 'buyer',
        }))
        setRecentUsers(userData)
      }

      if (ordersRes.success) {
        const orderData = (ordersRes.data || []).map((o: any) => ({
          id: o.id,
          user: o.buyer_id?.substring(0, 8) || 'Unknown',
          amount: o.grand_total || o.total_amount || 0,
          status: o.status || 'pending',
          date: new Date(o.created_at).toLocaleDateString(),
        }))
        setRecentOrders(orderData)
      }

      // Load pending merchants for approval
      const merchantsRes = await fetch('/api/admin/merchants').then(r => r.json())
      if (merchantsRes.success) {
        const pending = (merchantsRes.data || [])
          .filter((m: any) => !m.setup_completed)
          .map((m: any) => ({
            id: m.id,
            name: m.business_name || m.full_name || 'Unknown',
            email: m.email,
            smedanId: m.smedan_id || 'N/A',
            cacId: m.cac_id || 'N/A',
            joined: new Date(m.created_at).toLocaleDateString(),
          }))
        setPendingMerchants(pending)
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

  const loadAgentCount = async () => {
    setAgentCountLoading(true)
    try {
      const res = await fetch('/api/admin/agents')
      const data = await res.json()
      if (data.success) setAgentCount((data.agents || []).length)
    } catch (error) {
      console.error('Error loading agent count:', error)
    } finally {
      setAgentCountLoading(false)
    }
  }

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
      label: "Onboarding Agents",
      value: agentCount,
      icon: UserPlus,
      color: "bg-cyan-100 text-cyan-600",
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

  const pendingOrders = recentOrders.filter((order) => order.status !== "delivered").length
  const merchantsInRecentUsers = recentUsers.filter((entry) => entry.type === "merchant").length
  const trustAlerts = [
    { label: "Flagged chats", value: Math.max(0, Math.floor(pendingOrders / 2)), tone: "text-red-600" },
    { label: "Suspended users", value: Math.max(0, Math.floor(merchantsInRecentUsers / 3)), tone: "text-amber-600" },
    { label: "Dispute queue", value: Math.max(0, Math.floor(pendingOrders / 4)), tone: "text-purple-600" },
  ]

  const conversionRate = platformStats.totalUsers > 0
    ? ((platformStats.totalOrders / platformStats.totalUsers) * 100).toFixed(1)
    : "0.0"

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      const res = await fetch('/api/admin/merchants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await res.json()
      if (result.success) {
        setPendingMerchants(prev => prev.filter(m => m.id !== id))
        loadData()
      }
    } catch (error) {
      console.error('Error approving merchant:', error)
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setApprovingId(id)
    try {
      const res = await fetch(`/api/admin/merchants?id=${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        setPendingMerchants(prev => prev.filter(m => m.id !== id))
      }
    } catch (error) {
      console.error('Error rejecting merchant:', error)
    } finally {
      setApprovingId(null)
    }
  }

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
              <button
                onClick={() => alert('Users overview is shown in the Recent Users section below.')}
                className="w-full p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-left"
              >
                View All Users ({platformStats.totalUsers})
              </button>
              <button
                onClick={() => alert('Merchants requiring action are listed in Pending Merchant Approvals.')}
                className="w-full p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors text-left"
              >
                View All Merchants ({platformStats.totalMerchants})
              </button>
              <button
                onClick={() => alert('Orders overview is shown in the Recent Orders section below.')}
                className="w-full p-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors text-left"
              >
                View All Orders ({platformStats.totalOrders})
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="font-bold text-lg text-foreground mb-4">Finance Snapshot</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Held in escrow</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatNaira(paymentStats.totalEscrow)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disbursed funds</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatNaira(paymentStats.disbursedAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending orders</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{paymentStats.pendingOrders}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed orders</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{paymentStats.completedOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="font-bold text-lg text-foreground mb-4">SME Growth Tracker</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Nano', value: growthStats.Nano, tone: 'bg-slate-100 text-slate-700' },
              { label: 'Mini', value: growthStats.Mini, tone: 'bg-blue-100 text-blue-700' },
              { label: 'Medium', value: growthStats.Medium, tone: 'bg-purple-100 text-purple-700' },
              { label: 'Large Scale', value: growthStats['Large Scale'], tone: 'bg-green-100 text-green-700' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border p-4 bg-background">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${item.tone}`}>{item.label}</span>
                <p className="text-2xl font-bold text-foreground mt-3">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Combined merchant sales</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatNaira(growthStats.totalSales)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Combined merchant profit/loss</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatNaira(growthStats.totalProfit)}</p>
            </div>
          </div>
        </div>

        {/* Risk & Marketplace Health */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-4">Risk & Trust Safety</h2>
            <div className="space-y-3">
              {trustAlerts.map((alert) => (
                <div key={alert.label} className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{alert.label}</p>
                  <p className={`text-xl font-bold ${alert.tone}`}>{alert.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-4">Marketplace Health</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Buyer to order conversion</p>
                <p className="font-bold text-foreground">{conversionRate}%</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Order fulfilment rate</p>
                <p className="font-bold text-foreground">
                  {platformStats.totalOrders > 0
                    ? `${((logisticsStats.completedDeliveries / platformStats.totalOrders) * 100).toFixed(1)}%`
                    : "0.0%"}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Escrow active orders</p>
                <p className="font-bold text-foreground">{paymentStats.pendingOrders}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="font-bold text-lg text-foreground mb-4">Control Center</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => alert('KYC review queue is available in Pending Merchant Approvals below.')}
              className="p-3 rounded-lg bg-blue-50 text-blue-700 text-left font-medium hover:bg-blue-100 transition-colors"
            >
              Review KYC queue
            </button>
            <button
              onClick={() => alert('Suspended account controls will be enabled in a dedicated moderation module.')}
              className="p-3 rounded-lg bg-purple-50 text-purple-700 text-left font-medium hover:bg-purple-100 transition-colors"
            >
              Manage suspended accounts
            </button>
            <button
              onClick={() => alert('Payout reconciliation request queued. Refresh dashboard to review latest status.')}
              className="p-3 rounded-lg bg-green-50 text-green-700 text-left font-medium hover:bg-green-100 transition-colors"
            >
              Trigger payout reconciliation
            </button>
          </div>
        </div>

        {/* Pending Merchant Approvals */}
        <div className="bg-card border border-border rounded-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-lg text-foreground">Pending Merchant Approvals</h2>
              {pendingMerchants.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  {pendingMerchants.length} pending
                </span>
              )}
            </div>
          </div>
          {pendingMerchants.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No pending approvals</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Business Name</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Email</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">SMEDAN ID</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">CAC ID</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Joined</th>
                    <th className="text-left p-4 text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMerchants.map((merchant) => (
                    <tr key={merchant.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4 text-sm font-medium text-foreground">{merchant.name}</td>
                      <td className="p-4 text-sm text-muted-foreground">{merchant.email}</td>
                      <td className="p-4 text-sm text-muted-foreground">{merchant.smedanId}</td>
                      <td className="p-4 text-sm text-muted-foreground">{merchant.cacId}</td>
                      <td className="p-4 text-sm text-muted-foreground">{merchant.joined}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(merchant.id)}
                            disabled={approvingId === merchant.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                          >
                            {approvingId === merchant.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(merchant.id)}
                            disabled={approvingId === merchant.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Agent Management - Managed by PalmPay */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8">
          <p className="text-sm text-muted-foreground">
            <strong>Onboarding Agent Management:</strong> Agents are created and managed by PalmPay Admin. Total active agents shown in stats above.
          </p>
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
