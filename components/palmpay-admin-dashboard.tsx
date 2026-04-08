"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, TrendingUp, Wallet, DollarSign, CheckCircle2, Clock, Loader2 } from "lucide-react"
import { getTransactions, getTransactionStats } from "@/lib/admin-actions"
import { formatNaira } from "@/lib/currency-utils"

export function PalmpayAdminDashboard() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    productEscrow: 0,
    deliveryEscrow: 0,
    completedPayments: 0,
    pendingPayments: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const adminAccess = sessionStorage.getItem("adminAccess")
    if (adminAccess === "PALMPAY_012") {
      setIsAuthorized(true)
      loadData()
    } else {
      router.push("/")
    }
  }, [router])

  const loadData = async () => {
    setLoading(true)
    try {
      const [txnResult, statsResult] = await Promise.all([
        getTransactions(),
        getTransactionStats()
      ])

      if (txnResult.success) {
        const txnData = txnResult.data.map((t: any) => ({
          id: t.id,
          user: t.buyer_id || 'Unknown',
          amount: t.grand_total || 0,
          status: t.status === 'delivered' ? 'completed' : t.status || 'pending',
          date: new Date(t.created_at).toLocaleDateString(),
          type: 'payment',
        }))
        setTransactions(txnData)
      }

      if (statsResult.success) {
        setStats(statsResult.stats)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
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

  const statCards = [
    {
      label: "Total Transactions",
      value: stats.totalTransactions,
      icon: TrendingUp,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Total Revenue",
      value: formatNaira(stats.totalRevenue),
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Product Escrow",
      value: formatNaira(stats.productEscrow),
      icon: Wallet,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Delivery Escrow",
      value: formatNaira(stats.deliveryEscrow),
      icon: Wallet,
      color: "bg-orange-100 text-orange-600",
    },
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
          <div>
            <h1 className="text-2xl font-bold text-foreground">PalmPay Admin</h1>
            <p className="text-sm text-muted-foreground">Payment & Escrow Management</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">
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

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-4">Payment Status Overview</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-muted-foreground">Completed</span>
                </div>
                <span className="font-bold text-foreground">{stats.completedPayments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-muted-foreground">Pending</span>
                </div>
                <span className="font-bold text-foreground">{stats.pendingPayments}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-4">Escrow Summary</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Product Escrow</span>
                <span className="font-bold text-foreground">{formatNaira(stats.productEscrow)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivery Escrow</span>
                <span className="font-bold text-foreground">{formatNaira(stats.deliveryEscrow)}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="font-semibold text-foreground">Total Held</span>
                <span className="font-bold text-foreground">{formatNaira(stats.productEscrow + stats.deliveryEscrow)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-lg text-foreground">Recent Transactions</h2>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-sm text-foreground">ID</th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">User</th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">Amount</th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">Type</th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">Date</th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4 text-sm text-muted-foreground">{txn.id.substring(0, 8)}</td>
                      <td className="p-4 text-sm text-foreground font-medium">{txn.user.substring(0, 8)}</td>
                      <td className="p-4 text-sm text-foreground font-medium">
                        {formatNaira(txn.amount)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground capitalize">{txn.type}</td>
                      <td className="p-4 text-sm text-muted-foreground">{txn.date}</td>
                      <td className="p-4 text-sm">
                        {txn.status === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
