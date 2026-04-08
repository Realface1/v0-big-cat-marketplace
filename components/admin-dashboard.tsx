"use client"

import { useRole } from "@/lib/role-context"
import {
  ArrowLeft,
  Bell,
  Home,
  Users,
  Store,
  Shield,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Activity,
  Loader2,
} from "lucide-react"
import { useState, useEffect } from "react"
import { getMerchants, getPlatformStats, approveMerchant, rejectMerchant, getRecentUsers, getRecentOrders } from "@/lib/admin-actions"
import { NotificationsPanel } from "./notifications-panel"

export function AdminDashboard() {
  const { setRole } = useRole()
  const [activeTab, setActiveTab] = useState("home")
  const [platformStats, setPlatformStats] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingApprovals, setLoadingApprovals] = useState(true)
  const [processingApproval, setProcessingApproval] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [allMerchants, setAllMerchants] = useState<any[]>([])
  const [loadingMerchants, setLoadingMerchants] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    loadStats()
    loadApprovals()
    loadUsers()
    loadAllMerchants()
  }, [])

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const result = await getPlatformStats()
      if (result.success && result.stats) {
        const stats = [
          { label: "Total Users", value: result.stats.totalUsers || "0", change: "+12.5%", icon: Users },
          { label: "Merchants", value: result.stats.totalMerchants || "0", change: "+8.2%", icon: Store },
          { label: "Revenue", value: `₦${(result.stats.totalRevenue || 0).toLocaleString()}`, change: "+23.1%", icon: DollarSign },
          { label: "Active Now", value: result.stats.activeNow || "0", change: "", icon: Activity },
        ]
        setPlatformStats(stats)
      }
    } catch (error) {
      console.error("Error loading platform stats:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  const loadApprovals = async () => {
    setLoadingApprovals(true)
    try {
      const result = await getMerchants()
      if (result.success && result.data) {
        const pending = result.data
          .filter((m: any) => !m.setup_completed)
          .slice(0, 5)
          .map((m: any) => ({
            id: m.id,
            name: m.business_name || m.full_name || "Unknown",
            type: "Merchant",
            date: new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          }))
        setPendingApprovals(pending)
      }
    } catch (error) {
      console.error("Error loading approvals:", error)
    } finally {
      setLoadingApprovals(false)
    }
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const result = await getRecentUsers()
      if (result.success && result.data) {
        setUsers(result.data)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadAllMerchants = async () => {
    setLoadingMerchants(true)
    try {
      const result = await getMerchants()
      if (result.success && result.data) {
        setAllMerchants(result.data)
      }
    } catch (error) {
      console.error("Error loading merchants:", error)
    } finally {
      setLoadingMerchants(false)
    }
  }

  const handleApprove = async (merchantId: string) => {
    setProcessingApproval(merchantId)
    try {
      const result = await approveMerchant(merchantId)
      if (result.success) {
        setPendingApprovals(prev => prev.filter(m => m.id !== merchantId))
        loadStats()
        loadAllMerchants()
      }
    } catch (error) {
      console.error("Error approving merchant:", error)
    } finally {
      setProcessingApproval(null)
    }
  }

  const handleReject = async (merchantId: string) => {
    setProcessingApproval(merchantId)
    try {
      const result = await rejectMerchant(merchantId)
      if (result.success) {
        setPendingApprovals(prev => prev.filter(m => m.id !== merchantId))
        loadStats()
        loadAllMerchants()
      }
    } catch (error) {
      console.error("Error rejecting merchant:", error)
    } finally {
      setProcessingApproval(null)
    }
  }

  const defaultRecentActivity = [
    {
      id: 1,
      action: "Platform initialized",
      detail: "System ready",
      time: "Just now",
      type: "success",
    },
  ]

  return (
    <>
    <NotificationsPanel 
      isOpen={showNotifications} 
      onClose={() => setShowNotifications(false)} 
    />
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setRole(null)}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">Admin Dashboard</h1>
          <button 
            onClick={() => setShowNotifications(true)}
            className="relative p-2 -mr-2 text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        {activeTab === "home" ? (
          <>
        {/* Admin Badge */}
        <div className="px-4 py-4">
          <div className="bg-primary p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-foreground/20">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-primary-foreground/80">Administrator</p>
                <h2 className="font-bold text-primary-foreground">System Overview</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <section className="px-4 mb-6">
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {platformStats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary">
                      <stat.icon className="w-4 h-4 text-primary" />
                    </div>
                    {stat.change && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {stat.change}
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending Approvals */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-chart-4" />
              Pending Approvals
            </h2>
            <span className="text-xs px-2 py-1 bg-chart-4/20 text-chart-4 rounded-full">{pendingApprovals.length} pending</span>
          </div>
          {loadingApprovals ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No pending approvals</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {pendingApprovals.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 ${
                    index !== pendingApprovals.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.type} - {item.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleApprove(item.id)}
                      disabled={processingApproval === item.id}
                      className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
                    >
                      {processingApproval === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                    <button 
                      onClick={() => handleReject(item.id)}
                      disabled={processingApproval === item.id}
                      className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Recent Activity</h2>
            <button className="text-sm text-primary">View all</button>
          </div>
          <div className="flex flex-col gap-3">
            {(recentActivity.length > 0 ? recentActivity : defaultRecentActivity).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl"
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    activity.type === "success"
                      ? "bg-primary/20"
                      : activity.type === "warning"
                      ? "bg-chart-4/20"
                      : "bg-destructive/20"
                  }`}
                >
                  {activity.type === "success" ? (
                    <CheckCircle
                      className={`w-4 h-4 ${
                        activity.type === "success"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  ) : activity.type === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-chart-4" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.detail}</p>
                </div>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            ))}
          </div>
        </section>
          </>
        ) : activeTab === "users" ? (
          <div className="px-4 py-6">
            <h2 className="text-xl font-bold text-foreground mb-4">User Management</h2>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {users.map((user, index) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 ${
                      index !== users.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.full_name || "Unnamed"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.role === "merchant" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                    }`}>
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "merchants" ? (
          <div className="px-4 py-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Merchant Management</h2>
            {loadingMerchants ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              </div>
            ) : allMerchants.length === 0 ? (
              <div className="p-8 text-center">
                <Store className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No merchants found</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {allMerchants.map((merchant, index) => (
                  <div
                    key={merchant.id}
                    className={`flex items-center justify-between p-4 ${
                      index !== allMerchants.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{merchant.business_name || merchant.full_name || "Unnamed"}</p>
                        <p className="text-sm text-muted-foreground">{merchant.business_category || "General"}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      merchant.setup_completed ? "bg-primary/20 text-primary" : "bg-chart-4/20 text-chart-4"
                    }`}>
                      {merchant.setup_completed ? "Active" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "security" ? (
          <div className="px-4 py-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Security Center</h2>
              <p className="text-sm text-muted-foreground">Monitor platform security</p>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-foreground mb-4">Security Status</h3>
              <div className="space-y-3">
                {[
                  { label: "SSL Certificate", status: "Active", ok: true },
                  { label: "Database Encryption", status: "Enabled", ok: true },
                  { label: "2FA Enforcement", status: "Optional", ok: true },
                  { label: "Last Security Scan", status: "Today", ok: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 ${item.ok ? "text-primary" : "text-destructive"}`} />
                      <span className="text-sm font-medium text-foreground">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === "settings" ? (
          <div className="px-4 py-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Platform Settings</h2>
              <p className="text-sm text-muted-foreground">Configure system preferences</p>
            </div>
            
            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
              <h3 className="font-semibold text-foreground p-4 border-b border-border">General</h3>
              <div className="divide-y divide-border">
                {[
                  { label: "Platform Name", value: "BigCat Marketplace" },
                  { label: "Support Email", value: "support@bigcat.ng" },
                  { label: "Currency", value: "NGN (₦)" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <h3 className="font-semibold text-foreground p-4 border-b border-border">Actions</h3>
              <div className="divide-y divide-border">
                <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                  <span className="text-sm text-muted-foreground">Export Data</span>
                  <span className="text-sm text-primary">Download</span>
                </button>
                <button 
                  onClick={() => setRole(null)}
                  className="w-full flex items-center justify-between p-4 hover:bg-destructive/10 transition-colors"
                >
                  <span className="text-sm text-destructive">Exit Admin Mode</span>
                  <ArrowLeft className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-4 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around">
          {[
            { id: "home", icon: Home, label: "Overview" },
            { id: "users", icon: Users, label: "Users" },
            { id: "merchants", icon: Store, label: "Merchants" },
            { id: "security", icon: Shield, label: "Security" },
            { id: "settings", icon: Settings, label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 ${
                activeTab === item.id ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
    </>
  )
}
