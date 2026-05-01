"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Package, Clock, Truck, CheckCircle2, AlertCircle, RefreshCw, ChevronDown } from "lucide-react"
import { useRole } from "@/lib/role-context"
import {
  createEscrowRecord,
  getEscrowByOrderId,
  markOrderDeliveredAndReleaseEscrow,
  type EscrowRecord,
} from "@/lib/escrow"

interface MerchantOrdersProps {
  onBack: () => void
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
]

const statusConfig: { [key: string]: { label: string; color: string; icon: any } } = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-700', icon: Package },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  shipped: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
}

function getOrderItemsAmount(order: any) {
  const orderItems = Array.isArray(order?.order_items)
    ? order.order_items
    : Array.isArray(order?.items)
      ? order.items
      : []

  return orderItems.reduce((sum: number, item: any) => {
    const quantity = Math.max(1, Number(item?.quantity || 1))
    const lineTotal = Number(item?.total_price || 0)
    const unitAmount = Number(item?.unit_price || item?.price || 0)

    if (lineTotal > 0) return sum + lineTotal
    if (unitAmount > 0) return sum + (unitAmount * quantity)
    return sum
  }, 0)
}

function getOrderTotalAmount(order: any) {
  const directTotal = Number(order?.grand_total || order?.total_amount || 0)
  if (directTotal > 0) return directTotal
  return getOrderItemsAmount(order)
}

export function MerchantOrders({ onBack }: MerchantOrdersProps) {
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
      const totalAmount = getOrderTotalAmount(order)
      const deliveryAmount = Number(order.delivery_fee || 0)
      const itemAmount = getOrderItemsAmount(order)
      const productAmount = itemAmount > 0 ? itemAmount : Math.max(0, totalAmount - deliveryAmount)
      let escrow = getEscrowByOrderId(orderId)

      if (!escrow) {
        escrow = createEscrowRecord(orderId, totalAmount, deliveryAmount, productAmount)
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
        const response = await fetch(`/api/orders/merchant?merchantId=${user.userId}`)
        const result = await response.json()

        if (result.success) {
          const fetched = Array.isArray(result.data) ? result.data : []
          setOrders(fetched)
          syncEscrowForOrders(fetched)
        } else {
          setError(result.error || 'Failed to fetch orders')
        }
      } catch {
        setError('Failed to fetch orders')
      }
      setIsLoading(false)
    }

    fetchOrders()
  }, [user?.userId])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)

    try {
      const response = await fetch('/api/orders/update-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      })
      const result = await response.json()

      if (result.success) {
        const nextOrders = orders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
        setOrders(nextOrders)

        if (newStatus === 'delivered') {
          const updatedEscrow = markOrderDeliveredAndReleaseEscrow(orderId)
          if (updatedEscrow) {
            setEscrowMap((prev) => ({ ...prev, [orderId]: updatedEscrow }))
          }
        }
      }
    } catch (error) {
      console.error('Failed to update order status')
    }

    setUpdatingOrderId(null)
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
          <h1 className="font-semibold text-foreground">Incoming Orders</h1>
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
              Orders will appear here when customers purchase your products
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const StatusIcon = statusConfig[order.status]?.icon || Clock
              const isUpdating = updatingOrderId === order.id
              const orderId = String(order.id)
              const fallbackTotal = getOrderTotalAmount(order)
              const fallbackDelivery = Number(order.delivery_fee || 0)
              const fallbackProduct = Math.max(0, fallbackTotal - fallbackDelivery)
              const escrow = escrowMap[orderId] || {
                order_id: orderId,
                total_amount: fallbackTotal,
                product_amount: fallbackProduct,
                delivery_fee: fallbackDelivery,
                merchant_status: order.status === 'delivered' ? 'released' : 'held',
                logistics_status: order.status === 'delivered' ? 'released' : 'held',
              }
              const paymentHeld = escrow?.merchant_status === "held" || escrow?.logistics_status === "held"
              const orderItems = order.order_items || order.items || []
              
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
                    {orderItems.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="text-foreground">
                          {item.product_name || item.name || 'Product'} x{item.quantity}
                        </span>
                        <span className="text-muted-foreground">
                          N{Number(item.total_price || item.price || 0).toLocaleString()}
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
                      <p className="text-xs text-muted-foreground">Your Earnings</p>
                      <p className="font-semibold text-foreground">
                        N{orderItems.reduce((sum: number, item: any) => sum + Number(item.total_price || item.price || 0), 0).toLocaleString()}
                      </p>
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
                      <span className="text-foreground">Merchant Escrow Amount</span>
                      <span className="font-semibold text-foreground">
                        N{Number(escrow.product_amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">Logistics Payment</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass(escrow.logistics_status)}`}>
                        {escrow.logistics_status === 'held' ? 'Held' : 'Released'}
                      </span>
                    </div>
                  </div>

                  {/* Status Update */}
                  {order.status !== 'delivered' && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Update Status</p>
                      <div className="relative">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={isUpdating}
                          className="w-full appearance-none px-4 py-2.5 bg-muted rounded-lg text-foreground pr-10 disabled:opacity-50"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                      </div>
                      {isUpdating && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Updating...
                        </p>
                      )}
                    </div>
                  )}

                  {order.status === 'delivered' && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Order completed - Funds released</span>
                      </div>
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
