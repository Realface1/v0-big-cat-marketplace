"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock, XCircle, BarChart3, Users, Loader2 } from "lucide-react"
import { getMerchants, approveMerchant, rejectMerchant, getMerchantStats } from "@/lib/admin-actions"

export function SmedanAdminDashboard() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [merchants, setMerchants] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  useEffect(() => {
    const adminAccess = sessionStorage.getItem("adminAccess")
    if (adminAccess === "SMEDAN_123") {
      setIsAuthorized(true)
      loadData()
    } else {
      router.push("/")
    }
  }, [router])

  const loadData = async () => {
    setLoading(true)
    try {
      const [merchantsResult, statsResult] = await Promise.all([
        getMerchants(),
        getMerchantStats()
      ])

      if (merchantsResult.success) {
        const merchantData = merchantsResult.data.map((m: any) => ({
          id: m.id,
          name: m.business_name || m.full_name || 'Unknown',
          businessType: m.business_category || 'Not specified',
          smedanId: m.smedan_id || 'N/A',
          status: m.setup_completed ? 'approved' : 'pending',
          email: m.email,
          createdAt: m.created_at,
        }))
        setMerchants(merchantData)
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

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      const result = await approveMerchant(id)
      if (result.success) {
        setMerchants(merchants.map(m => 
          m.id === id ? { ...m, status: 'approved' } : m
        ))
        setStats(prev => ({
          ...prev,
          pending: prev.pending - 1,
          approved: prev.approved + 1
        }))
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
      const result = await rejectMerchant(id)
      if (result.success) {
        setMerchants(merchants.filter(m => m.id !== id))
        setStats(prev => ({
          ...prev,
          total: prev.total - 1,
          pending: prev.pending - 1
        }))
      }
    } catch (error) {
      console.error('Error rejecting merchant:', error)
    } finally {
      setApprovingId(null)
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

  const statCards = [
    {
      label: "Total Merchants",
      value: stats.total,
      icon: Users,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Pending Verification",
      value: stats.pending,
      icon: Clock,
      color: "bg-yellow-100 text-yellow-600",
    },
    {
      label: "Approved Merchants",
      value: stats.approved,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-600",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar & Header */}
      <div className="border-b border-border">
        <div className="flex items-center gap-4 p-6 max-w-7xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">SMEDAN Admin</h1>
            <p className="text-sm text-muted-foreground">Merchant Verification Dashboard</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {statCards.map((stat) => (
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

        {/* Merchants Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-lg text-foreground">Merchants</h2>
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
                  <th className="text-left p-4 font-semibold text-sm text-foreground">
                    Business Name
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">
                    Type
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">
                    SMEDAN ID
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">
                    Email
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">
                    Status
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading merchants...
                    </td>
                  </tr>
                ) : merchants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No merchants found
                    </td>
                  </tr>
                ) : (
                  merchants.map((merchant) => (
                    <tr key={merchant.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4 text-sm text-foreground font-medium">
                        {merchant.name}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {merchant.businessType}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {merchant.smedanId}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {merchant.email}
                      </td>
                      <td className="p-4 text-sm">
                        {merchant.status === "approved" ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {merchant.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(merchant.id)}
                              disabled={approvingId === merchant.id}
                              className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                              {approvingId === merchant.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(merchant.id)}
                              disabled={approvingId === merchant.id}
                              className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              {approvingId === merchant.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reject'}
                            </button>
                          </div>
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
