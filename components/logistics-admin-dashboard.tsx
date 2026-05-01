"use client"

import { useEffect, useMemo, useState } from "react"
import { formatNaira } from "@/lib/currency-utils"
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
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
  const [gpsByOrder, setGpsByOrder] = useState<Record<string, { lat: number; lng: number; updatedAt: string }>>({})
  const [proofByOrder, setProofByOrder] = useState<Record<string, string>>({})

  const getGpsStorageKey = () => `bigcat_logistics_gps_${accessCode || 'default'}`
  const getProofStorageKey = () => `bigcat_logistics_proof_${accessCode || 'default'}`

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

  useEffect(() => {
    if (typeof window === 'undefined' || !accessCode) return
    try {
      const gpsRaw = localStorage.getItem(getGpsStorageKey())
      const proofRaw = localStorage.getItem(getProofStorageKey())
      if (gpsRaw) setGpsByOrder(JSON.parse(gpsRaw))
      if (proofRaw) setProofByOrder(JSON.parse(proofRaw))
    } catch {
      // ignore parse failures
    }
  }, [accessCode])

  useEffect(() => {
    if (typeof window === 'undefined' || !accessCode) return
    localStorage.setItem(getGpsStorageKey(), JSON.stringify(gpsByOrder))
  }, [gpsByOrder, accessCode])

  useEffect(() => {
    if (typeof window === 'undefined' || !accessCode) return
    localStorage.setItem(getProofStorageKey(), JSON.stringify(proofByOrder))
  }, [proofByOrder, accessCode])

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

      // Seed an initial GPS point after assignment if not set yet.
      setGpsByOrder((prev) => {
        if (prev[orderId]) return prev
        return {
          ...prev,
          [orderId]: {
            lat: 6.5244 + (Math.random() - 0.5) * 0.02,
            lng: 3.3792 + (Math.random() - 0.5) * 0.02,
            updatedAt: new Date().toISOString(),
          },
        }
      })

      await loadDashboard()
    } catch {
      setError("Failed to assign rider")
    } finally {
      setActionBusyKey("")
    }
  }

  const completeOrder = async (orderId: string) => {
    setActionBusyKey(`complete:${orderId}`)
    setError("")

    try {
      const response = await fetch(`/api/logistics/orders/${orderId}/complete`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ proofOfDeliveryUrl: proofByOrder[orderId] || null }),
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || "Failed to complete delivery")
        return
      }

      await loadDashboard()
    } catch {
      setError("Failed to complete delivery")
    } finally {
      setActionBusyKey("")
    }
  }

  const updateLiveGps = (orderId: string) => {
    setGpsByOrder((prev) => {
      const current = prev[orderId] || { lat: 6.5244, lng: 3.3792 }
      const next = {
        lat: current.lat + (Math.random() - 0.5) * 0.002,
        lng: current.lng + (Math.random() - 0.5) * 0.002,
        updatedAt: new Date().toISOString(),
      }
      return { ...prev, [orderId]: next }
    })
  }

  const uploadProof = async (orderId: string, file?: File) => {
    if (!file) return
    setActionBusyKey(`proof:${orderId}`)
    setError("")
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      if (!response.ok || !result?.url) {
        setError(result?.error || 'Failed to upload proof of delivery')
        return
      }

      setProofByOrder((prev) => ({ ...prev, [orderId]: result.url }))
    } catch {
      setError('Failed to upload proof of delivery')
    } finally {
      setActionBusyKey("")
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Total Dispatch Orders" value={summary.totalOrders} icon={<Package className="w-4 h-4" />} />
          <MetricCard label="Pending Dispatch" value={summary.pendingOrders} icon={<Clock className="w-4 h-4" />} />
          <MetricCard label="Assigned Orders" value={summary.assignedOrders} icon={<Truck className="w-4 h-4" />} />
          <MetricCard label="Completed Delivery" value={summary.completedOrders} icon={<CheckCircle2 className="w-4 h-4" />} />
          <MetricCard label="Held Escrow" value={formatNaira(summary.heldEscrow)} icon={<Wallet className="w-4 h-4" />} />
          <MetricCard label="Released to Logistics" value={formatNaira(summary.releasedEscrow)} icon={<Wallet className="w-4 h-4" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

                      {gpsByOrder[order.id] && (
                        <div className="rounded-lg border border-border bg-secondary/30 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground">
                              Live GPS: {gpsByOrder[order.id].lat.toFixed(5)}, {gpsByOrder[order.id].lng.toFixed(5)}
                              <span className="ml-1">· {new Date(gpsByOrder[order.id].updatedAt).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateLiveGps(order.id)}
                                className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-secondary"
                              >
                                <Navigation className="w-3 h-3" />
                                Refresh GPS
                              </button>
                              <a
                                href={`https://maps.google.com/?q=${gpsByOrder[order.id].lat},${gpsByOrder[order.id].lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-secondary"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Open Map
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg border border-border bg-secondary/20 p-2">
                        <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Camera className="w-3 h-3" />
                          Proof of delivery photo
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => uploadProof(order.id, event.target.files?.[0])}
                            className="text-xs"
                          />
                          {proofByOrder[order.id] && (
                            <a
                              href={proofByOrder[order.id]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              View proof
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                        <select
                          value={selectedRider}
                          onChange={(event) => assignRider(order.id, event.target.value)}
                          disabled={String(order.logistics_status).toLowerCase() === 'completed' || riders.length === 0 || actionBusyKey.startsWith('assign:')}
                          className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                        >
                          <option value="">Assign rider...</option>
                          {riders.map((rider) => (
                            <option key={rider.id} value={rider.id}>
                              {rider.name}{rider.region ? ` (${rider.region})` : ''}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => completeOrder(order.id)}
                          disabled={String(order.logistics_status).toLowerCase() === 'completed' || actionBusyKey === `complete:${order.id}`}
                          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                          {actionBusyKey === `complete:${order.id}` ? 'Completing...' : 'Mark Delivered'}
                        </button>

                        <button
                          disabled
                          className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground"
                        >
                          Escrow: {String(order.escrow_status || 'held')}
                        </button>
                      </div>
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
                      <p className="text-sm font-medium text-foreground">{rider.name}</p>
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
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}
