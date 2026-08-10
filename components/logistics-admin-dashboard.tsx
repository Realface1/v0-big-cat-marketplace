"use client"

import { useEffect, useMemo, useState } from "react"
import { formatNaira } from "@/lib/currency-utils"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"

type LogisticsOrder = {
  id: string
  status: string
  logistics_status: string
  payment_status?: string
  escrow_status?: string
  delivery_address?: string
  delivery_fee?: number
  grand_total?: number
  created_at?: string
  assigned_at?: string | null
  completed_at?: string | null
  assignment_notes?: string | null
  rider_id?: string | null
  assigned_rider?: {
    id: string
    name: string
    region?: string | null
  } | null
  order_items?: Array<{ product_name?: string; quantity?: number }>
}

type LogisticsRider = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  region?: string | null
}

const DEFAULT_ACCESS_CODE = "LOGISTICS_001"

type LogisticsAdminDashboardProps = {
  bypassAccessCheck?: boolean
  embedded?: boolean
}

export function LogisticsAdminDashboard({ bypassAccessCheck = false, embedded = false }: LogisticsAdminDashboardProps = {}) {
  const router = useRouter()
  const [accessCode, setAccessCode] = useState("")
  const [authorized, setAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [orders, setOrders] = useState<LogisticsOrder[]>([])
  const [riders, setRiders] = useState<LogisticsRider[]>([])
  const [summary, setSummary] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    assignedOrders: 0,
    completedOrders: 0,
    heldEscrow: 0,
    releasedEscrow: 0,
  })
  const [schemaWarning, setSchemaWarning] = useState("")
  const [newRider, setNewRider] = useState({ name: "", email: "", phone: "", region: "" })
  const [savingRider, setSavingRider] = useState(false)
  const [actionBusyKey, setActionBusyKey] = useState("")
  const [copiedRiderLink, setCopiedRiderLink] = useState(false)
  const [activeSection, setActiveSection] = useState<'orders' | 'tracking'>('orders')

  useEffect(() => {
    if (bypassAccessCheck) {
      setAccessCode(DEFAULT_ACCESS_CODE)
      setAuthorized(true)
      setCheckingAuth(false)
      return
    }

    if (typeof window === "undefined") return

    const saved = sessionStorage.getItem("logisticsAccessCode") || sessionStorage.getItem("adminAccess")
    if (saved && saved.toUpperCase() === DEFAULT_ACCESS_CODE) {
      setAccessCode(saved.toUpperCase())
      setAuthorized(true)
    }
    setCheckingAuth(false)
  }, [bypassAccessCheck])

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-logistics-access-code": accessCode,
    }),
    [accessCode],
  )

  const loadDashboard = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/logistics/orders", {
        headers: {
          "x-logistics-access-code": accessCode,
        },
        cache: "no-store",
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || "Failed to load logistics orders")
        setOrders([])
        setSummary({
          totalOrders: 0,
          pendingOrders: 0,
          assignedOrders: 0,
          completedOrders: 0,
          heldEscrow: 0,
          releasedEscrow: 0,
        })
        setRiders([])
        return
      }

      const nextOrders = Array.isArray(result.data?.orders) ? result.data.orders : []
      const nextRiders = Array.isArray(result.data?.riders) ? result.data.riders : []
      setOrders(nextOrders)
      setRiders(nextRiders)
      setSummary({
        totalOrders: Number(result.data?.summary?.totalOrders || 0),
        pendingOrders: Number(result.data?.summary?.pendingOrders || 0),
        assignedOrders: Number(result.data?.summary?.assignedOrders || 0),
        completedOrders: Number(result.data?.summary?.completedOrders || 0),
        heldEscrow: Number(result.data?.summary?.heldEscrow || 0),
        releasedEscrow: Number(result.data?.summary?.releasedEscrow || 0),
      })

      const warnings = result.data?.schemaWarnings || {}
      if (warnings.logisticsAssignmentsTableMissing || warnings.logisticsRidersTableMissing) {
        setSchemaWarning("Logistics tables are not fully provisioned. Run scripts/014-create-logistics-tables.sql for rider assignment and tracking.")
      } else {
        setSchemaWarning("")
      }
    } catch {
      setError("Failed to load logistics dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authorized || !accessCode) return
    loadDashboard()
  }, [authorized, accessCode])

  const busyRiderIds = useMemo(() => {
    const ids = new Set<string>()
    for (const order of orders) {
      const status = String(order.logistics_status || '').toLowerCase()
      if ((status === 'assigned' || status === 'in_transit' || status === 'return_assigned' || status === 'return_in_transit') && order.rider_id) {
        ids.add(String(order.rider_id))
      }
    }
    return ids
  }, [orders])

  const freeRidersCount = useMemo(
    () => riders.filter((rider) => !busyRiderIds.has(String(rider.id))).length,
    [riders, busyRiderIds],
  )

  const busyRidersCount = useMemo(
    () => riders.filter((rider) => busyRiderIds.has(String(rider.id))).length,
    [riders, busyRiderIds],
  )

  const activeDeliveries = useMemo(() => {
    const activeStatuses = ['assigned', 'in_transit', 'return_assigned', 'return_in_transit']
    return orders
      .filter((o) => activeStatuses.includes(String(o.logistics_status || '').toLowerCase()))
      .map((o) => ({
        ...o,
        rider: riders.find((r) => String(r.id) === String(o.rider_id)) ?? null,
      }))
  }, [orders, riders])

  const verifyAccess = () => {
    const normalized = accessCode.trim().toUpperCase()
    if (!normalized) {
      setError("Access code is required")
      return
    }

    if (normalized !== DEFAULT_ACCESS_CODE) {
      setError("Invalid logistics access code")
      return
    }

    setError("")
    setAuthorized(true)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("logisticsAccessCode", normalized)
    }
  }

  const assignRider = async (orderId: string, riderId: string) => {
    if (!riderId) {
      setError("Select a rider before assigning")
      return
    }

    const isBusy = busyRiderIds.has(String(riderId))
    const currentOrder = orders.find((row) => String(row.id) === String(orderId))
    const currentRiderId = String(currentOrder?.rider_id || '')
    if (isBusy && String(riderId) !== currentRiderId) {
      setError("Selected rider is currently busy. Choose a free rider.")
      return
    }

    setActionBusyKey(`assign:${orderId}`)
    setError("")

    try {
      const response = await fetch(`/api/logistics/orders/${orderId}/assign`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ riderId }),
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || "Failed to assign rider")
        return
      }

      await loadDashboard()
    } catch {
      setError("Failed to assign rider")
    } finally {
      setActionBusyKey("")
    }
  }

  const autoAssignRider = async (orderId: string) => {
    setActionBusyKey(`auto:${orderId}`)
    setError("")
    try {
      const response = await fetch(`/api/logistics/orders/${orderId}/auto-assign`, {
        method: 'PUT',
        headers: authHeaders,
      })
      const result = await response.json()
      if (!result.success) {
        setError(result.error || 'Auto-assign failed')
        return
      }
      await loadDashboard()
    } catch {
      setError('Auto-assign failed')
    } finally {
      setActionBusyKey('')
    }
  }

  const requestReturn = async (orderId: string) => {
    setActionBusyKey(`return:${orderId}`)
    setError("")
    try {
      const response = await fetch(`/api/logistics/orders/${orderId}/return-request`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ reason: 'Return requested due to product issue' }),
      })
      const result = await response.json()
      if (!result.success) {
        setError(result.error || 'Failed to open return flow')
        return
      }
      await loadDashboard()
    } catch {
      setError('Failed to open return flow')
    } finally {
      setActionBusyKey('')
    }
  }



  const createRider = async () => {
    if (!newRider.name.trim()) {
      setError("Rider name is required")
      return
    }

    setSavingRider(true)
    setError("")

    try {
      const response = await fetch("/api/logistics/riders", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newRider),
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || "Failed to create rider")
        return
      }

      setNewRider({ name: "", email: "", phone: "", region: "" })
      await loadDashboard()
    } catch {
      setError("Failed to create rider")
    } finally {
      setSavingRider(false)
    }
  }

  const removeRider = async (riderId: string) => {
    setActionBusyKey(`rider:${riderId}`)
    setError("")

    try {
      const response = await fetch(`/api/logistics/riders/${riderId}`, {
        method: "DELETE",
        headers: {
          "x-logistics-access-code": accessCode,
        },
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || "Failed to remove rider")
        return
      }

      await loadDashboard()
    } catch {
      setError("Failed to remove rider")
    } finally {
      setActionBusyKey("")
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Logistics Admin Access</h1>
          </div>
          <p className="text-sm text-muted-foreground">Enter logistics access code to manage dispatch and escrow release flow.</p>
          <input
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
            placeholder="Enter logistics access code"
            className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            onClick={verifyAccess}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!embedded && (
              <button
                onClick={() => router.push("/")}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">BigCat Logistics Hub</h1>
              <p className="text-xs text-muted-foreground">Standalone dispatch and delivery settlement website</p>
            </div>
          </div>
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

            <button
              onClick={() => {
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/rider/login`
                navigator.clipboard.writeText(url).then(() => {
                  setCopiedRiderLink(true)
                  setTimeout(() => setCopiedRiderLink(false), 2500)
                })
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm text-primary hover:bg-primary/10"
              title="Copy rider portal login link to send to riders"
            >
              {copiedRiderLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedRiderLink ? "Copied!" : "Rider Portal Link"}
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {schemaWarning && (
          <div className="rounded-xl border border-chart-4/30 bg-chart-4/10 px-3 py-2 text-sm text-chart-4">
            {schemaWarning}
          </div>
        )}

        {/* Section Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-border pb-1">
          <button
            onClick={() => setActiveSection('orders')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === 'orders'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Package className="w-4 h-4" />
            Dispatch Orders
          </button>
          <button
            onClick={() => setActiveSection('tracking')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === 'tracking'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Navigation className="w-4 h-4" />
            Rider Tracking
            {activeDeliveries.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {activeDeliveries.length}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <MetricCard label="Total Dispatch Orders" value={summary.totalOrders} icon={<Package className="w-4 h-4" />} />
          <MetricCard label="Pending Dispatch" value={summary.pendingOrders} icon={<Clock className="w-4 h-4" />} />
          <MetricCard label="Assigned Orders" value={summary.assignedOrders} icon={<Truck className="w-4 h-4" />} />
          <MetricCard label="Completed Delivery" value={summary.completedOrders} icon={<CheckCircle2 className="w-4 h-4" />} />
          <MetricCard
            label="Free Riders"
            value={freeRidersCount}
            icon={<Users className="w-4 h-4" />}
            className="border-emerald-200 bg-emerald-50"
            iconClassName="text-emerald-700"
            valueClassName="text-emerald-700"
          />
          <MetricCard
            label="Busy Riders"
            value={busyRidersCount}
            icon={<Users className="w-4 h-4" />}
            className="border-amber-200 bg-amber-50"
            iconClassName="text-amber-700"
            valueClassName="text-amber-700"
          />
          <MetricCard label="Held Escrow" value={formatNaira(summary.heldEscrow)} icon={<Wallet className="w-4 h-4" />} />
          <MetricCard label="Released to Logistics" value={formatNaira(summary.releasedEscrow)} icon={<Wallet className="w-4 h-4" />} />
        </div>

        {activeSection === 'tracking' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Live Rider Dispatch Board</h2>
              <span className="text-xs text-muted-foreground">{activeDeliveries.length} active {activeDeliveries.length === 1 ? 'delivery' : 'deliveries'}</span>
            </div>
            {activeDeliveries.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center">
                <Navigation className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No active deliveries</p>
                <p className="text-xs text-muted-foreground mt-1">Assign riders to orders to see them here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeDeliveries.map((delivery) => {
                  const status = String(delivery.logistics_status || '').toLowerCase()
                  const isReturn = status.startsWith('return')
                  const assignedAt = delivery.assigned_at ? new Date(delivery.assigned_at) : null
                  const durationMs = assignedAt ? Date.now() - assignedAt.getTime() : 0
                  const durationMins = Math.floor(durationMs / 60000)
                  const durationHours = Math.floor(durationMins / 60)
                  const durationDisplay =
                    durationHours > 0
                      ? `${durationHours}h ${durationMins % 60}m`
                      : durationMins > 0
                        ? `${durationMins}m`
                        : 'Just assigned'

                  const steps = isReturn
                    ? [
                        { key: 'return_requested', label: 'Return Requested' },
                        { key: 'return_assigned', label: 'Rider Assigned' },
                        { key: 'return_in_transit', label: 'In Transit' },
                        { key: 'return_completed', label: 'Returned' },
                      ]
                    : [
                        { key: 'pending', label: 'Pending' },
                        { key: 'assigned', label: 'Assigned' },
                        { key: 'in_transit', label: 'In Transit' },
                        { key: 'completed', label: 'Delivered' },
                      ]

                  const stepOrder = steps.map((s) => s.key)
                  const currentStepIdx = stepOrder.indexOf(status)

                  const trackingId = `BC-${String(delivery.id).replace(/-/g, '').slice(0, 10).toUpperCase()}`
                  const trackUrl = `/track/${delivery.id}`

                  const riderInitials = (delivery.rider?.name || 'R')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()

                  return (
                    <div key={delivery.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                      {/* Header stripe */}
                      <div className={`px-4 py-2 flex items-center justify-between ${ isReturn ? 'bg-amber-500' : status === 'in_transit' ? 'bg-indigo-600' : 'bg-blue-600' }`}>
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">
                          {isReturn ? 'Return Flow' : status === 'in_transit' ? 'In Transit' : 'Assigned'}
                        </span>
                        <span className="text-xs text-white/80">{durationDisplay} on delivery</span>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Rider Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                            {riderInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{delivery.rider?.name || 'Unknown Rider'}</p>
                            <p className="text-xs text-muted-foreground">
                              {delivery.rider?.phone ? `📞 ${delivery.rider.phone}` : ''}
                              {delivery.rider?.region ? ` · ${delivery.rider.region}` : ''}
                            </p>
                          </div>
                          <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Busy
                          </span>
                        </div>

                        {/* Order info */}
                        <div className="rounded-lg bg-secondary/60 px-3 py-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-semibold text-foreground">{trackingId}</span>
                            <span className="text-xs text-muted-foreground">#{String(delivery.id).substring(0, 8)}</span>
                          </div>
                          <div className="flex items-start gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{delivery.delivery_address || 'No address'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(delivery.order_items || []).map((item) => `${item.product_name || 'Item'} ×${item.quantity || 1}`).join(', ') || 'No items'}
                          </p>
                        </div>

                        {/* Status Steps */}
                        <div className="relative">
                          <div className="absolute top-[9px] left-0 right-0 h-0.5 bg-border" />
                          <div className="relative flex items-start justify-between">
                            {steps.map((step, idx) => {
                              const done = idx <= currentStepIdx
                              const active = idx === currentStepIdx
                              return (
                                <div key={step.key} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                                  <div className={`w-4.5 h-4.5 rounded-full border-2 z-10 ${
                                    done
                                      ? active
                                        ? 'bg-primary border-primary'
                                        : 'bg-emerald-500 border-emerald-500'
                                      : 'bg-card border-muted-foreground/30'
                                  }`}
                                    style={{ width: '18px', height: '18px', flexShrink: 0 }}
                                  >
                                    {done && !active && (
                                      <svg viewBox="0 0 18 18" fill="none" className="w-full h-full">
                                        <path d="M5 9l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                    {active && (
                                      <div className="w-full h-full rounded-full flex items-center justify-center">
                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" style={{ width: '8px', height: '8px' }} />
                                      </div>
                                    )}
                                  </div>
                                  <p className={`text-[9px] text-center leading-tight ${
                                    active ? 'text-primary font-semibold' : done ? 'text-emerald-600' : 'text-muted-foreground'
                                  }`}>{step.label}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Action */}
                        <button
                          onClick={() => {
                            if (typeof window !== 'undefined') window.open(trackUrl, '_blank')
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open Live Tracking
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeSection === 'orders' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Incoming Delivery Orders</h2>
              <span className="text-xs text-muted-foreground">Only non-pickup orders appear here</span>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto" />
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No logistics orders yet.</div>
            ) : (
              <div className="divide-y divide-border max-h-[680px] overflow-y-auto">
                {orders.map((order) => {
                  const selectedRider = order.rider_id || ''
                  return (
                    <div key={order.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">Order #{String(order.id).substring(0, 8)}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {order.delivery_address || 'No delivery address'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            String(order.logistics_status || '').toLowerCase() === 'completed'
                              ? 'bg-primary/10 text-primary'
                              : String(order.logistics_status || '').toLowerCase() === 'in_transit'
                                ? 'bg-indigo-100 text-indigo-700'
                              : String(order.logistics_status || '').toLowerCase() === 'assigned'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-chart-4/10 text-chart-4'
                          }`}>
                            {order.logistics_status || 'pending'}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">Delivery Fee: {formatNaira(Number(order.delivery_fee || 0))}</p>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Items: {(order.order_items || []).map((item) => `${item.product_name || 'Item'} x${item.quantity || 1}`).join(', ') || 'No items'}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
                        <select
                          value={selectedRider}
                          onChange={(event) => assignRider(order.id, event.target.value)}
                          disabled={['completed', 'in_transit', 'return_in_transit', 'return_completed'].includes(String(order.logistics_status).toLowerCase()) || riders.length === 0 || actionBusyKey.startsWith('assign:')}
                          className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                        >
                          <option value="">Assign rider...</option>
                          {riders.map((rider) => (
                            <option
                              key={rider.id}
                              value={rider.id}
                              disabled={busyRiderIds.has(String(rider.id)) && String(rider.id) !== selectedRider}
                            >
                              {rider.name}{rider.region ? ` (${rider.region})` : ''} - {busyRiderIds.has(String(rider.id)) && String(rider.id) !== selectedRider ? 'Busy' : 'Free'}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => autoAssignRider(order.id)}
                          disabled={actionBusyKey === `auto:${order.id}` || ['completed', 'in_transit', 'return_in_transit', 'return_completed'].includes(String(order.logistics_status).toLowerCase())}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {actionBusyKey === `auto:${order.id}` ? 'Assigning...' : 'Auto Assign'}
                        </button>

                        <button
                          onClick={() => requestReturn(order.id)}
                          disabled={actionBusyKey === `return:${order.id}` || !['completed', 'delivered', 'return_requested', 'return_assigned', 'return_in_transit'].includes(String(order.status || '').toLowerCase())}
                          className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {actionBusyKey === `return:${order.id}` ? 'Opening...' : 'Open Return'}
                        </button>

                        <button
                          disabled
                          className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-muted-foreground"
                        >
                          Rider updates status
                        </button>
                      </div>

                      <p className="text-xs text-muted-foreground">Tracking ID: BC-{String(order.id).replace(/-/g, '').slice(0, 10).toUpperCase()}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Rider Management</h2>
              <Users className="w-4 h-4 text-primary" />
            </div>

            <div className="space-y-2">
              <input
                value={newRider.name}
                onChange={(event) => setNewRider((current) => ({ ...current, name: event.target.value }))}
                placeholder="Rider name"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              />
              <input
                value={newRider.phone}
                onChange={(event) => setNewRider((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Phone number"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              />
              <input
                value={newRider.region}
                onChange={(event) => setNewRider((current) => ({ ...current, region: event.target.value }))}
                placeholder="Region / State"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
              />
              <button
                onClick={createRider}
                disabled={savingRider}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {savingRider ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add Rider
              </button>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {riders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No riders added yet.</p>
              ) : (
                riders.map((rider) => (
                  <div key={rider.id} className="rounded-lg border border-border px-3 py-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        {rider.name}
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${busyRiderIds.has(String(rider.id)) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {busyRiderIds.has(String(rider.id)) ? 'Busy' : 'Free'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{rider.phone || rider.email || rider.region || 'No contact info'}</p>
                    </div>
                    <button
                      onClick={() => removeRider(rider.id)}
                      disabled={actionBusyKey === `rider:${rider.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive disabled:opacity-50"
                    >
                      {actionBusyKey === `rider:${rider.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  className = '',
  iconClassName = 'text-primary',
  valueClassName = 'text-foreground',
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  className?: string
  iconClassName?: string
  valueClassName?: string
}) {
  return (
    <div className={`bg-card border border-border rounded-xl p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={iconClassName}>{icon}</span>
      </div>
      <p className={`text-lg font-bold ${valueClassName}`}>{value}</p>
    </div>
  )
}
