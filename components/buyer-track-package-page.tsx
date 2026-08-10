"use client"

import { useEffect, useMemo, useState } from "react"
import { useRole } from "@/lib/role-context"
import { ArrowLeft, CheckCircle2, Clock, Loader2, MapPin, Truck, User } from "lucide-react"

type TrackPageProps = {
  orderId: string
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  order_received: "Merchant Received",
  order_packed: "Order Packed",
  order_taken_for_delivery: "Taken For Delivery",
  in_transit: "In Transit",
  completed: "Delivered By Logistics",
  delivered: "Received and Satisfied",
}

const timeline = [
  "paid",
  "order_received",
  "order_packed",
  "order_taken_for_delivery",
  "in_transit",
  "completed",
  "delivered",
]

function toStep(status: string) {
  const idx = timeline.indexOf(String(status || "").toLowerCase())
  return idx >= 0 ? idx : 0
}

export function BuyerTrackPackagePage({ orderId }: TrackPageProps) {
  const { user } = useRole()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      if (!user?.userId || !orderId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError("")

      try {
        const res = await fetch(`/api/orders/buyer?buyerId=${encodeURIComponent(user.userId)}`, { cache: "no-store" })
        const result = await res.json().catch(() => ({}))
        if (!result?.success) {
          setError(result?.error || "Could not load order tracking details")
          return
        }

        const all = Array.isArray(result?.data) ? result.data : []
        const found = all.find((row: any) => String(row?.id || "") === String(orderId))
        if (!found) {
          setError("Order not found")
          return
        }

        setOrder(found)
      } catch {
        setError("Could not load tracking details")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [orderId, user?.userId])

  const currentStep = useMemo(() => toStep(String(order?.status || "")), [order?.status])
  const mapSrc = useMemo(() => {
    const address = String(order?.delivery_address || "")
    if (!address) return ""
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
  }, [order?.delivery_address])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <a href="/marketplace" className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="font-semibold text-foreground">Track Package</h1>
            <p className="text-xs text-muted-foreground">Tracking ID: {String(order?.tracking_id || `BC-${String(orderId).replace(/-/g, "").slice(0, 10).toUpperCase()}`)}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Current Status</p>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700">
                  <Truck className="w-3.5 h-3.5" />
                  {statusLabels[String(order?.status || "").toLowerCase()] || String(order?.status || "Unknown")}
                </span>
              </div>
              <p className="text-sm text-foreground">Order #{String(order?.id || "").slice(0, 8).toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">Delivery Address: {String(order?.delivery_address || "N/A")}</p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Delivery Timeline</h2>
              <div className="space-y-2">
                {timeline.map((stage, index) => {
                  const done = index <= currentStep
                  return (
                    <div key={stage} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>{statusLabels[stage]}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Rider Information</h2>
              <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-1">
                <p className="text-sm text-foreground flex items-center gap-2"><User className="w-4 h-4" /> {String(order?.assigned_rider?.name || "Not assigned yet")}</p>
                <p className="text-xs text-muted-foreground">Phone: {String(order?.assigned_rider?.phone || "N/A")}</p>
                <p className="text-xs text-muted-foreground">Region: {String(order?.assigned_rider?.region || "N/A")}</p>
                <p className="text-xs text-muted-foreground">Assigned At: {order?.logistics_assigned_at ? new Date(order.logistics_assigned_at).toLocaleString() : "N/A"}</p>
                <p className="text-xs text-muted-foreground">Completed At: {order?.logistics_completed_at ? new Date(order.logistics_completed_at).toLocaleString() : "N/A"}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> Map View</h2>
              {mapSrc ? (
                <div className="rounded-xl overflow-hidden border border-border">
                  <iframe
                    title="Delivery map"
                    src={mapSrc}
                    className="w-full h-64"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Map unavailable. Delivery address is missing.</p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
