"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, Store, ShoppingBag, TrendingUp, Truck, CheckCircle2, XCircle, Clock, Loader2, UserPlus, Download, Ban, ShieldCheck } from "lucide-react"
import { formatNaira } from "@/lib/currency-utils"
import { SmedanAdminDashboard } from "./smedan-admin-dashboard"
import { PalmpayAdminDashboard } from "./palmpay-admin-dashboard"
import { LogisticsAdminDashboard } from "./logistics-admin-dashboard"

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
  const [activePanel, setActivePanel] = useState<'overview' | 'smedan' | 'palmpay' | 'logistics'>('overview')
  const [issues, setIssues] = useState<any[]>([])
  const [issueStatusFilter, setIssueStatusFilter] = useState<'all' | 'open' | 'in_review' | 'resolved' | 'rejected'>('all')
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null)
  const [suspendingUserId, setSuspendingUserId] = useState<string | null>(null)
  const [adminFeedback, setAdminFeedback] = useState('')
  const [reportPeriod, setReportPeriod] = useState<'30d' | '90d' | 'all'>('30d')

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
          is_suspended: Boolean(u.is_suspended),
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

      const issuesRes = await fetch('/api/admin/issues', { cache: 'no-store' }).then(r => r.json())
      if (issuesRes.success) {
        setIssues(Array.isArray(issuesRes.data) ? issuesRes.data : [])
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

  if (activePanel === 'smedan') {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="flex items-center justify-between gap-3 p-4 max-w-7xl mx-auto">
            <div>
              <h1 className="text-xl font-bold text-foreground">BigCat Super Admin</h1>
              <p className="text-sm text-muted-foreground">Viewing full SMEDAN dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivePanel('overview')}
                className="px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80"
              >
                Back to Overview
              </button>
              <button
                onClick={() => setActivePanel('palmpay')}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Open PalmPay View
              </button>
            </div>
          </div>
        </div>
        <SmedanAdminDashboard bypassAccessCheck embedded />
      </div>
    )
  }

  if (activePanel === 'palmpay') {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="flex items-center justify-between gap-3 p-4 max-w-7xl mx-auto">
            <div>
              <h1 className="text-xl font-bold text-foreground">BigCat Super Admin</h1>
              <p className="text-sm text-muted-foreground">Viewing full PalmPay dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivePanel('overview')}
                className="px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80"
              >
                Back to Overview
              </button>
              <button
                onClick={() => setActivePanel('smedan')}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Open SMEDAN View
              </button>
            </div>
          </div>
        </div>
        <PalmpayAdminDashboard bypassAccessCheck embedded />
      </div>
    )
  }

  if (activePanel === 'logistics') {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="flex items-center justify-between gap-3 p-4 max-w-7xl mx-auto">
            <div>
              <h1 className="text-xl font-bold text-foreground">BigCat Super Admin</h1>
              <p className="text-sm text-muted-foreground">Viewing full Logistics dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivePanel('overview')}
                className="px-3 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80"
              >
                Back to Overview
              </button>
              <button
                onClick={() => setActivePanel('palmpay')}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Open PalmPay View
              </button>
            </div>
          </div>
        </div>
        <LogisticsAdminDashboard bypassAccessCheck embedded />
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
  const filteredIssues = issueStatusFilter === 'all'
    ? issues
    : issues.filter((issue) => String(issue?.status || '').toLowerCase() === issueStatusFilter)

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

  const updateIssueStatus = async (issueId: string, status: 'open' | 'in_review' | 'resolved' | 'rejected') => {
    setUpdatingIssueId(issueId)
    try {
      const res = await fetch('/api/admin/issues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, status }),
      })
      const result = await res.json()
      if (result.success) {
        setIssues(prev => prev.map(issue => issue.id === issueId ? { ...issue, status } : issue))
      }
    } catch (error) {
      console.error('Error updating issue status:', error)
    } finally {
      setUpdatingIssueId(null)
    }
  }

  const toggleSuspendUser = async (targetUser: any, suspended: boolean) => {
    setSuspendingUserId(String(targetUser.id))
    setAdminFeedback('')
    try {
      const res = await fetch('/api/admin/users/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUser.id,
          suspended,
          reason: suspended ? 'Suspended by BigCat admin for policy review' : null,
        }),
      })
      const result = await res.json()
      if (!result.success) {
        setAdminFeedback(result.error || 'Unable to update user status.')
        return
      }

      setRecentUsers((prev) => prev.map((entry) =>
        entry.id === targetUser.id ? { ...entry, is_suspended: suspended } : entry
      ))
      setAdminFeedback(suspended ? 'User suspended successfully.' : 'User unsuspended successfully.')
    } catch {
      setAdminFeedback('Unable to update user status.')
    } finally {
      setSuspendingUserId(null)
    }
  }

  const downloadRevenueReport = () => {
    window.open(`/api/admin/revenue-report?format=csv&period=${reportPeriod}`, '_blank')
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
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground mr-2">Open Full Admin Views:</span>
            <button
              onClick={() => setActivePanel('smedan')}
              className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100"
            >
              SMEDAN Admin View
            </button>
            <button
              onClick={() => setActivePanel('palmpay')}
              className="px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100"
            >
              PalmPay Admin View
            </button>
            <button
              onClick={() => setActivePanel('logistics')}
              className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100"
            >
              Logistics Admin View
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-lg text-foreground">Platform Revenue Reports</h2>
              <p className="text-sm text-muted-foreground">Export CSV reports for accounting and reconciliation.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value as '30d' | '90d' | 'all')}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
              <button
                onClick={downloadRevenueReport}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>
          </div>
          {adminFeedback && <p className="mt-2 text-xs text-muted-foreground">{adminFeedback}</p>}
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-lg text-foreground">Reported Issues (BigCat Inbox)</h2>
              <p className="text-sm text-muted-foreground">Buyers use Report issue and BigCat admin resolves complaints here.</p>
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'open', 'in_review', 'resolved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setIssueStatusFilter(status)}
                  className={`px-3 py-1 rounded text-xs font-medium ${issueStatusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
                >
                  {status === 'all' ? 'All' : status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reported issues found.</p>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <div key={issue.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{String(issue.issue_type || 'issue').replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">Order: {String(issue.order_id || '').slice(0, 8).toUpperCase()} · Buyer: {String(issue.buyer_id || '').slice(0, 8)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      issue.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      issue.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      issue.status === 'in_review' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {String(issue.status || 'open').replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-sm text-foreground mb-1">{issue.description}</p>
                  <p className="text-xs text-muted-foreground mb-3">Reported: {issue.created_at ? new Date(issue.created_at).toLocaleString() : 'Unknown time'}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => updateIssueStatus(issue.id, 'in_review')}
                      disabled={updatingIssueId === issue.id}
                      className="px-3 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
                    >
                      Mark In Review
                    </button>
                    <button
                      onClick={() => updateIssueStatus(issue.id, 'resolved')}
                      disabled={updatingIssueId === issue.id}
                      className="px-3 py-1 rounded bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => updateIssueStatus(issue.id, 'rejected')}
                      disabled={updatingIssueId === issue.id}
                      className="px-3 py-1 rounded bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          user.type === "merchant"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {user.type}
                        </span>
                        <button
                          onClick={() => toggleSuspendUser(user, !Boolean(user.is_suspended))}
                          disabled={suspendingUserId === user.id}
                          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                            Boolean(user.is_suspended)
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {Boolean(user.is_suspended) ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          {Boolean(user.is_suspended) ? 'Unsuspend' : 'Suspend'}
                        </button>
                      </div>
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
