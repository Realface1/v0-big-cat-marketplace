"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Package, Clock, Truck, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { formatNaira } from "@/lib/currency-utils"
import { useRole } from "@/lib/role-context"
import {
  createEscrowRecord,
  getEscrowByOrderId,
  markOrderDeliveredAndReleaseEscrow,
  type EscrowRecord,
} from "@/lib/escrow"
import { getDemoBuyerOrders, updateDemoOrderStatus } from "@/lib/demo-orders"

interface BuyerOrdersProps {
  onBack: () => void
}

const statusConfig: { [key: string]: { label: string; color: string; icon: any; step: number } } = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock, step: 1 },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-700', icon: Package, step: 2 },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-700', icon: RefreshCw, step: 3 },
  shipped: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-700', icon: Truck, step: 4 },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle2, step: 5 },
}

const orderSteps = ['Pending', 'Paid', 'Processing', 'Shipped', 'Delivered']

export function BuyerOrders({ onBack }: BuyerOrdersProps) {
  const { user } = useRole()
  const [orders, setOrders] = useState<any[]>([])
  const [escrowMap, setEscrowMap] = useState<Record<string, EscrowRecord>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  const badgeClass = (status: "held" | "released") =>
    status === "held"
      ? "bg-amber-100 text-amber-700"
      : "bg-green-100 text-green-700"

  const syncEscrowForOrders = (orderList: any[]) => {
    const next: Record<string, EscrowRecord> = {}

    orderList.forEach((order) => {
      const orderId = String(order.id)
      const totalAmount = Number(order.grand_total || order.total_amount || 0)
      const deliveryAmount = Number(order.delivery_fee || 0)
      let escrow = getEscrowByOrderId(orderId)

      if (!escrow) {
        escrow = createEscrowRecord(orderId, totalAmount, deliveryAmount)
      }

      if (order.status === "delivered") {
        escrow = markOrderDeliveredAndReleaseEscrow(orderId) || escrow
      }

      next[orderId] = escrow
    })

    setEscrowMap(next)
  }

  useEffect(() => {
    async function fetchOrders() {
      if (!user?.userId) return

      setIsLoading(true)
      try {
        const response = await fetch(`/api/orders/buyer?buyerId=${user.userId}`)
        const result = await response.json()
        const demoOrders = getDemoBuyerOrders(user.userId)

        if (result.success) {
          const fetched = result.data || []
          const merged = [
            ...demoOrders,
            ...fetched.filter((order: any) => !demoOrders.some((demo) => String(demo.id) === String(order.id))),
          ]
          setOrders(merged)
          syncEscrowForOrders(merged)
        } else {
          if (demoOrders.length > 0) {
            setOrders(demoOrders)
            syncEscrowForOrders(demoOrders)
          } else {
            setError(result.error || 'Failed to fetch orders')
          }
        }
      } catch {
        const demoOrders = getDemoBuyerOrders(user.userId)
        if (demoOrders.length > 0) {
          setOrders(demoOrders)
          syncEscrowForOrders(demoOrders)
        } else {
          setError('Failed to fetch orders')
        }
      }
      setIsLoading(false)
    }

    fetchOrders()
  }, [user?.userId])

  const handleMarkAsDelivered = async (orderId: string) => {
    setUpdatingOrderId(orderId)
    setError("")

    if (String(orderId).startsWith('demo_')) {
      const updated = updateDemoOrderStatus(orderId, 'delivered')
      if (!updated) {
        setError('Failed to mark order as delivered')
        setUpdatingOrderId(null)
        return
      }

      setOrders((prev) => prev.map((order) =>
        String(order.id) === String(orderId) ? { ...order, status: 'delivered' } : order
      ))

      const updatedEscrow = markOrderDeliveredAndReleaseEscrow(orderId)
      if (updatedEscrow) {
        setEscrowMap((prev) => ({ ...prev, [orderId]: updatedEscrow }))
      }

      setUpdatingOrderId(null)
      return
    }

    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, status: 'delivered' }),
      })

      const result = await response.json()
      if (!result.success) {
        setError(result.error || 'Failed to mark order as delivered')
        return
      }

      setOrders((prev) => prev.map((order) =>
        order.id === orderId ? { ...order, status: 'delivered' } : order
      ))

      const updatedEscrow = markOrderDeliveredAndReleaseEscrow(orderId)
      if (updatedEscrow) {
        setEscrowMap((prev) => ({ ...prev, [orderId]: updatedEscrow }))
      }
    } catch {
      setError('Failed to mark order as delivered')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">My Orders</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-destructive mb-3" />
            <p className="text-destructive">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground text-center">
              Start shopping to see your orders here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const StatusIcon = statusConfig[order.status]?.icon || Clock
              const escrow = escrowMap[String(order.id)]
              const paymentHeld = escrow?.merchant_status === "held" || escrow?.logistics_status === "held"
              return (
                <div
                  key={order.id}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Order ID</p>
                      <p className="font-mono text-sm font-medium">
                        {order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statusConfig[order.status]?.color || 'bg-muted text-muted-foreground'}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig[order.status]?.label || order.status}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mb-3">
                    {(order.order_items || order.items || []).map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="text-foreground">
                          {item.product_name || item.name} x{item.quantity}
                        </span>
                        <span className="text-muted-foreground">
                          N{item.total_price?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-semibold text-foreground">
                        {formatNaira(order.grand_total)}
                      </p>
                    </div>
                  </div>

                  {/* Order Progress */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3">Order Progress</p>
                    <div className="flex items-center justify-between">
                      {orderSteps.map((step, index) => {
                        const currentStep = statusConfig[order.status]?.step || 1
                        const isCompleted = index + 1 < currentStep
                        const isCurrent = index + 1 === currentStep
                        return (
                          <div key={step} className="flex flex-col items-center flex-1">
                            <div className="relative flex items-center w-full">
                              {index > 0 && (
                                <div className={`absolute left-0 right-1/2 h-0.5 -translate-y-1/2 top-3 ${
                                  isCompleted || isCurrent ? 'bg-primary' : 'bg-border'
                                }`} />
                              )}
                              {index < orderSteps.length - 1 && (
                                <div className={`absolute left-1/2 right-0 h-0.5 -translate-y-1/2 top-3 ${
                                  isCompleted ? 'bg-primary' : 'bg-border'
                                }`} />
                              )}
                              <div className={`relative z-10 mx-auto w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                isCompleted 
                                  ? 'bg-primary text-primary-foreground' 
                                  : isCurrent 
                                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' 
                                    : 'bg-muted text-muted-foreground'
                              }`}>
                                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : index + 1}
                              </div>
                            </div>
                            <span className={`text-xs mt-1.5 ${
                              isCompleted || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                            }`}>
                              {step.slice(0, 4)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Delivery Address</p>
                    <p className="text-sm text-foreground">{order.delivery_address}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.delivery_type === 'pickup'
                        ? 'Pickup at Drop-off Point'
                        : order.delivery_type === 'express'
                          ? 'Express Delivery'
                          : 'Normal Delivery'}
                    </p>
                  </div>

                  {/* Escrow Status */}
                  {escrow && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Payment Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentHeld ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {paymentHeld ? 'Held in Escrow' : 'Released from Escrow'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">Merchant Payment</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass(escrow.merchant_status)}`}>
                          {escrow.merchant_status === 'held' ? 'Held' : 'Released'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">Logistics Payment</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass(escrow.logistics_status)}`}>
                          {escrow.logistics_status === 'held' ? 'Held' : 'Released'}
                        </span>
                      </div>
                    </div>
                  )}

                  {order.status !== 'delivered' && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <button
                        onClick={() => handleMarkAsDelivered(String(order.id))}
                        disabled={updatingOrderId === String(order.id)}
                        className="w-full rounded-lg bg-[#6C2BD9] text-white py-2.5 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {updatingOrderId === String(order.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Mark as Delivered'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
