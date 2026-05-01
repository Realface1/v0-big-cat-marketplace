"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock, BarChart3, Users, Loader2, MapPin, TrendingUp, Search } from "lucide-react"
import { formatNaira } from "@/lib/currency-utils"

interface SmedanAdminDashboardProps {
  bypassAccessCheck?: boolean
  embedded?: boolean
}

const INVALID_STATE_VALUES = new Set([
  'unknown',
  'nigeria',
  'federal republic of nigeria',
  'na',
  'n/a',
])

function normalizeState(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 'Unknown'

  const compact = raw.toLowerCase().replace(/\./g, '')
  if (INVALID_STATE_VALUES.has(compact)) return 'Unknown'

  // Handle values like "Lagos, Nigeria" by taking the non-country segment.
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length > 1) {
    const nonCountry = parts.find((part) => {
      const normalized = part.toLowerCase().replace(/\./g, '')
      return !INVALID_STATE_VALUES.has(normalized)
    })
    if (nonCountry) return nonCountry
  }

  return raw
}

export function SmedanAdminDashboard({ bypassAccessCheck = false, embedded = false }: SmedanAdminDashboardProps = {}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [merchants, setMerchants] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, totalSales: 0, totalProfit: 0 })
  const [growthSummary, setGrowthSummary] = useState({ Nano: 0, Mini: 0, Medium: 0, 'Large Scale': 0 })
  const [selectedState, setSelectedState] = useState('all')
  const [cityQuery, setCityQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (bypassAccessCheck) {
      setIsAuthorized(true)
      loadData()
      return
    }

    const adminAccess = sessionStorage.getItem("adminAccess")
    if (adminAccess === "SMEDAN_123") {
      setIsAuthorized(true)
      loadData()
    } else {
      router.push("/")
    }
  }, [router, bypassAccessCheck])

  const loadData = async () => {
    setLoading(true)
    try {
      const [merchantsRes, statsRes] = await Promise.all([
        fetch('/api/admin/merchants').then(r => r.json()),
        fetch('/api/admin/stats').then(r => r.json()),
      ])

      if (merchantsRes.success) {
        const merchantData = (merchantsRes.data || []).map((m: any) => ({
          id: m.id,
          name: m.business_name || m.full_name || 'Unknown',
          businessType: m.business_category || 'Not specified',
          smedanId: m.smedan_id || 'N/A',
          status: m.setup_completed ? 'approved' : 'pending',
          email: m.email,
          state: normalizeState(m.state),
          city: m.city || '',
          location: m.location || '',
          createdAt: m.created_at,
          sales: Number(m.total_sales || 0),
          profitLoss: Number(m.profit_loss || 0),
          businessScale: m.business_scale || 'Nano',
        }))
        setMerchants(merchantData)
      }

      if (statsRes.success && statsRes.merchants) {
        setStats(statsRes.merchants)
        setGrowthSummary(statsRes.merchants.categories || { Nano: 0, Mini: 0, Medium: 0, 'Large Scale': 0 })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
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

  const states = useMemo(() => {
    const unique = Array.from(
      new Set(
        merchants
          .map((m) => String(m.state || '').trim())
          .filter((state) => state.length > 0 && state.toLowerCase() !== 'unknown'),
      ),
    )
    return unique.sort((a, b) => a.localeCompare(b))
  }, [merchants])

  const filteredMerchants = useMemo(() => {
    const query = cityQuery.trim().toLowerCase()

    return merchants.filter((merchant) => {
      const merchantState = String(merchant.state || 'Unknown')
      const merchantCity = String(merchant.city || '')
      const merchantLocation = String(merchant.location || '')

      if (selectedState !== 'all' && merchantState !== selectedState) return false
      if (statusFilter !== 'all' && merchant.status !== statusFilter) return false

      if (query) {
        const searchable = `${merchantCity} ${merchantLocation} ${merchantState}`.toLowerCase()
        if (!searchable.includes(query)) return false
      }

      return true
    })
  }, [merchants, selectedState, statusFilter, cityQuery])

  const geographicPerformance = useMemo(() => {
    const grouped = merchants.reduce(
      (acc, merchant) => {
        const state = normalizeState(merchant.state)
        if (state === 'Unknown') return acc

        if (!acc[state]) {
          acc[state] = {
            state,
            total: 0,
            approved: 0,
            pending: 0,
            totalSales: 0,
            totalProfit: 0,
          }
        }

        acc[state].total += 1
        if (merchant.status === 'approved') acc[state].approved += 1
        if (merchant.status === 'pending') acc[state].pending += 1
        acc[state].totalSales += Number(merchant.sales || 0)
        acc[state].totalProfit += Number(merchant.profitLoss || 0)

        return acc
      },
      {} as Record<string, { state: string; total: number; approved: number; pending: number; totalSales: number; totalProfit: number }>,
    )

    return Object.values(grouped)
      .map((entry) => ({
        ...entry,
        approvalRate: entry.total > 0 ? (entry.approved / entry.total) * 100 : 0,
      }))
      .sort((a, b) => {
        if (b.totalSales !== a.totalSales) return b.totalSales - a.totalSales
        if (b.totalProfit !== a.totalProfit) return b.totalProfit - a.totalProfit
        return b.approved - a.approved
      })
  }, [merchants])

  const topState = geographicPerformance[0]

  const missingSmedan = filteredMerchants.filter((m) => !m.smedanId || m.smedanId === 'N/A').length
  const dormantCandidates = filteredMerchants.filter((m) => m.status === 'approved').length
  const growthCards = [
    { label: 'Nano', value: growthSummary.Nano || 0, color: 'bg-slate-100 text-slate-700' },
    { label: 'Mini', value: growthSummary.Mini || 0, color: 'bg-blue-100 text-blue-700' },
    { label: 'Medium', value: growthSummary.Medium || 0, color: 'bg-purple-100 text-purple-700' },
    { label: 'Large Scale', value: growthSummary['Large Scale'] || 0, color: 'bg-green-100 text-green-700' },
  ]

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {!embedded && (
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
      )}

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

        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-foreground">SME Growth Categories</h2>
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {growthCards.map((card) => (
              <div key={card.label} className="rounded-lg border border-border p-4 bg-background">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${card.color}`}>{card.label}</span>
                <p className="text-2xl font-bold text-foreground mt-3">{card.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
              <p className="text-muted-foreground">Total SME sales</p>
              <p className="text-xl font-bold text-foreground mt-1">{formatNaira(Number(stats.totalSales || 0))}</p>
            </div>
            <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
              <p className="text-muted-foreground">Total SME profit/loss</p>
              <p className="text-xl font-bold text-foreground mt-1">{formatNaira(Number(stats.totalProfit || 0))}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-4">Compliance Overview</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Profiles missing SMEDAN ID</span>
                <span className="font-bold text-amber-600">{missingSmedan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending KYC review</span>
                <span className="font-bold text-purple-600">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approved but inactive candidates</span>
                <span className="font-bold text-blue-600">{dormantCandidates}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-4">MSME Support Actions</h2>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => alert('Onboarding reminders queued for pending merchants.')}
                className="p-3 rounded-lg bg-blue-50 text-blue-700 text-left font-medium hover:bg-blue-100 transition-colors"
              >
                Send onboarding reminder
              </button>
              <button
                onClick={() => alert('Training batch assignment module opens in the next release.')}
                className="p-3 rounded-lg bg-green-50 text-green-700 text-left font-medium hover:bg-green-100 transition-colors"
              >
                Assign training batch
              </button>
              <button
                onClick={() => alert('Compliance queue is represented by merchants table below.')}
                className="p-3 rounded-lg bg-purple-50 text-purple-700 text-left font-medium hover:bg-purple-100 transition-colors"
              >
                Review compliance queue
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-lg text-foreground">Geographic SME Tracking</h2>
                <p className="text-sm text-muted-foreground">Filter SMEs by state, city and verification status.</p>
              </div>
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">State</label>
                <select
                  value={selectedState}
                  onChange={(event) => setSelectedState(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="all">All states</option>
                  {states.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'approved' | 'pending')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="all">All statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">City / location</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={cityQuery}
                    onChange={(event) => setCityQuery(event.target.value)}
                    placeholder="Search city or area"
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Visible SMEs</p>
                <p className="text-xl font-bold text-foreground mt-1">{filteredMerchants.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Approved (filtered)</p>
                <p className="text-xl font-bold text-foreground mt-1">{filteredMerchants.filter((m) => m.status === 'approved').length}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Sales (filtered)</p>
                <p className="text-xl font-bold text-foreground mt-1">{formatNaira(filteredMerchants.reduce((sum, m) => sum + Number(m.sales || 0), 0))}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Profit/Loss (filtered)</p>
                <p className="text-xl font-bold text-foreground mt-1">{formatNaira(filteredMerchants.reduce((sum, m) => sum + Number(m.profitLoss || 0), 0))}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-foreground">Best Performing State</h2>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            {topState ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">Top state right now</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{topState.state}</p>
                </div>
                <div className="text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">SMEs</span>
                    <span className="font-semibold text-foreground">{topState.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Approved</span>
                    <span className="font-semibold text-foreground">{topState.approved}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Approval rate</span>
                    <span className="font-semibold text-foreground">{topState.approvalRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sales</span>
                    <span className="font-semibold text-foreground">{formatNaira(topState.totalSales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Profit/Loss</span>
                    <span className="font-semibold text-foreground">{formatNaira(topState.totalProfit)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No state data available yet.</p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="font-bold text-lg text-foreground mb-4">State Performance Ranking</h2>
          {geographicPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No performance records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 text-muted-foreground">State</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground">SMEs</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground">Approved</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground">Approval Rate</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground">Sales</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground">Profit/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {geographicPerformance.slice(0, 10).map((row) => (
                    <tr key={row.state} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-semibold text-foreground">{row.state}</td>
                      <td className="py-2 pr-3 text-foreground">{row.total}</td>
                      <td className="py-2 pr-3 text-foreground">{row.approved}</td>
                      <td className="py-2 pr-3 text-foreground">{row.approvalRate.toFixed(1)}%</td>
                      <td className="py-2 pr-3 text-foreground">{formatNaira(row.totalSales)}</td>
                      <td className={`py-2 pr-3 font-medium ${row.totalProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {formatNaira(row.totalProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Merchants Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-lg text-foreground">Merchants ({filteredMerchants.length})</h2>
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
                    Category
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">
                    Total Sales
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">
                    Profit/Loss
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">
                    Email
                  </th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Loading merchants...
                    </td>
                  </tr>
                ) : filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No merchants found for the selected geographic filters
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((merchant) => (
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
                      <td className="p-4 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {merchant.businessScale}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatNaira(merchant.sales)}
                      </td>
                      <td className={`p-4 text-sm font-medium ${merchant.profitLoss >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {merchant.profitLoss >= 0 ? formatNaira(merchant.profitLoss) : `-${formatNaira(Math.abs(merchant.profitLoss))}`}
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
