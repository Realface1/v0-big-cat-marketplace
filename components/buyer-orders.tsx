"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Package, Clock, Truck, CheckCircle2, AlertCircle, RefreshCw, Loader2, Download, Timer, Banknote } from "lucide-react"
import { formatNaira } from "@/lib/currency-utils"
import { useRole } from "@/lib/role-context"
import { useCart } from "@/lib/cart-context"
import {
  createEscrowRecord,
  getEscrowByOrderId,
  markOrderDeliveredAndReleaseEscrow,
  type EscrowRecord,
} from "@/lib/escrow"

interface BuyerOrdersProps {
  onBack: () => void
  onOpenCart?: () => void
}

const statusConfig: { [key: string]: { label: string; color: string; icon: any; step: number } } = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock, step: 1 },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-700', icon: Package, step: 2 },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-700', icon: RefreshCw, step: 3 },
  shipped: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-700', icon: Truck, step: 4 },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle2, step: 5 },
}

const orderSteps = ['Pending', 'Paid', 'Processing', 'Shipped', 'Delivered']

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

export function BuyerOrders({ onBack, onOpenCart }: BuyerOrdersProps) {
  const { user } = useRole()
  const { addItem } = useCart()
  const [orders, setOrders] = useState<any[]>([])
  const [escrowMap, setEscrowMap] = useState<Record<string, EscrowRecord>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [reorderMessage, setReorderMessage] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(Date.now())
  const [reportingOrderId, setReportingOrderId] = useState<string | null>(null)
  const [reportIssueType, setReportIssueType] = useState('not_delivered')
  const [reportDescription, setReportDescription] = useState('')
  const [refundBankName, setRefundBankName] = useState('')
  const [refundAccountNumber, setRefundAccountNumber] = useState('')
  const [refundAccountName, setRefundAccountName] = useState('')
  const [submittingReportFor, setSubmittingReportFor] = useState<string | null>(null)
  const [reportFeedback, setReportFeedback] = useState('')
  const [issuesByOrder, setIssuesByOrder] = useState<Record<string, any>>({})

  const badgeClass = (status: "held" | "released") =>
    status === "held"
      ? "bg-amber-100 text-amber-700"
      : "bg-green-100 text-green-700"

  const syncEscrowForOrders = (orderList: any[]) => {
    const next: Record<string, EscrowRecord> = {}

    orderList.forEach((order) => {
      const orderId = String(order.id)
      const itemAmount = getOrderItemsAmount(order)
      const totalAmount = Number(order.grand_total || order.total_amount || itemAmount || 0)
      const deliveryAmount = Number(order.delivery_fee || 0)
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

  const getNotificationStorageKey = (buyerId: string) => `app_notifications_buyer_${buyerId}`
  const getIssueStatusCacheKey = (buyerId: string) => `bigcat_issue_status_cache_${buyerId}`

  const getIssueStatusLabel = (status: string) => {
    const normalized = String(status || 'open').toLowerCase().trim()
    if (normalized === 'open') return 'Reported'
    if (normalized === 'in_review') return 'In Review'
    if (normalized === 'resolved') return 'Resolved'
    if (normalized === 'rejected') return 'Closed'
    return 'Reported'
  }

  const getIssueStatusClass = (status: string) => {
    const normalized = String(status || 'open').toLowerCase().trim()
    if (normalized === 'resolved') return 'bg-green-100 text-green-700'
    if (normalized === 'rejected') return 'bg-slate-100 text-slate-700'
    if (normalized === 'in_review') return 'bg-blue-100 text-blue-700'
    return 'bg-amber-100 text-amber-700'
  }

  const appendBuyerIssueNotification = (payload: {
    issueId: string
    title: string
    message: string
    type?: 'system' | 'warning'
  }) => {
    if (typeof window === 'undefined' || !user?.userId) return

    const storageKey = getNotificationStorageKey(user.userId)
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]') as any[]

    const next = [
      {
        id: `issue_${payload.issueId}_${Date.now()}`,
        type: payload.type || 'system',
        title: payload.title,
        message: payload.message,
        time: 'Just now',
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...existing,
    ].slice(0, 100)

    localStorage.setItem(storageKey, JSON.stringify(next))
    window.dispatchEvent(new Event('bigcat-notifications-updated'))
  }

  const syncIssueStatusNotifications = (issues: any[]) => {
    if (typeof window === 'undefined' || !user?.userId) return

    const cacheKey = getIssueStatusCacheKey(user.userId)
    const previousStatus = JSON.parse(localStorage.getItem(cacheKey) || '{}') as Record<string, string>
    const nextStatusMap: Record<string, string> = { ...previousStatus }

    issues.forEach((issue) => {
      const issueId = String(issue?.id || '')
      if (!issueId) return

      const nextStatus = String(issue?.status || 'open').toLowerCase().trim()
      const prevStatus = previousStatus[issueId]

      nextStatusMap[issueId] = nextStatus

      if (prevStatus && prevStatus !== nextStatus) {
        appendBuyerIssueNotification({
          issueId,
          title: 'Issue progress update',
          message: `Your reported issue is now ${getIssueStatusLabel(nextStatus)}.`,
          type: nextStatus === 'rejected' ? 'warning' : 'system',
        })
      }
    })

    localStorage.setItem(cacheKey, JSON.stringify(nextStatusMap))
  }

  const fetchIssues = async () => {
    if (!user?.userId) return

    try {
      const response = await fetch(`/api/issues/buyer?buyerId=${user.userId}`, { cache: 'no-store' })
      const result = await response.json()
      if (!result?.success) return

      const issueList = Array.isArray(result.data) ? result.data : []
      syncIssueStatusNotifications(issueList)

      const nextMap: Record<string, any> = {}
      issueList.forEach((issue: any) => {
        const orderId = String(issue?.order_id || '')
        if (!orderId) return

        const existing = nextMap[orderId]
        if (!existing) {
          nextMap[orderId] = issue
          return
        }

        const existingTime = new Date(existing?.updated_at || existing?.created_at || 0).getTime()
        const issueTime = new Date(issue?.updated_at || issue?.created_at || 0).getTime()
        if (issueTime >= existingTime) {
          nextMap[orderId] = issue
        }
      })

      setIssuesByOrder(nextMap)
    } catch {
      // Ignore issue fetch failures without interrupting order rendering.
    }
  }

  const fetchOrders = async (showLoader = true) => {
    if (!user?.userId) return

    if (showLoader) {
      setIsLoading(true)
    }

    try {
      const response = await fetch(`/api/orders/buyer?buyerId=${user.userId}`)
      const result = await response.json()

      if (result.success) {
        const fetched = Array.isArray(result.data) ? result.data : []
        setOrders(fetched)
        syncEscrowForOrders(fetched)
        setLastUpdatedAt(Date.now())
        fetchIssues()
        fetchIssues()
        fetchIssues()
      } else {
        setError(result.error || 'Failed to fetch orders')
      }
    } catch {
      setError('Failed to fetch orders')
    }

    if (showLoader) {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(true)
    fetchIssues()

    const interval = window.setInterval(() => {
      fetchOrders(false)
    }, 20000)

    return () => window.clearInterval(interval)
  }, [user?.userId])

  const handleReorder = (order: any) => {
    const orderItems = Array.isArray(order?.order_items)
      ? order.order_items
      : Array.isArray(order?.items)
        ? order.items
        : []

    if (orderItems.length === 0) {
      setReorderMessage('No items found in this order.')
      return
    }

    orderItems.forEach((item: any) => {
      const productId = String(item?.product_id || item?.id || '')
      if (!productId) return

      const quantity = Math.max(1, Number(item?.quantity || 1))
      const lineTotal = Number(item?.total_price || 0)
      const unitPrice = Number(item?.unit_price || item?.price || (lineTotal > 0 ? lineTotal / quantity : 0))

      addItem({
        id: productId,
        productId,
        name: item?.product_name || item?.name || 'Product',
        price: Number.isFinite(unitPrice) ? unitPrice : 0,
        quantity,
        merchantId: String(order?.merchant_id || item?.merchant_id || 'unknown_merchant'),
        merchantName: String(order?.merchant_name || 'Merchant'),
      })
    })

    setReorderMessage('Items added to cart. Ready to checkout.')
    window.setTimeout(() => setReorderMessage(''), 3000)
    onOpenCart?.()
  }

  const getDeliveryETA = (order: any) => {
    if (order.status === 'delivered') return { label: 'Delivered', daysLeft: null as number | null }
    if (!order.created_at) return { label: 'ETA unavailable', daysLeft: null as number | null }

    const created = new Date(order.created_at)
    const etaDays = order.delivery_type === 'express' ? 1 : order.delivery_type === 'pickup' ? 0 : 3
    const eta = new Date(created)
    eta.setDate(eta.getDate() + etaDays)
    const diffMs = eta.getTime() - Date.now()
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (daysLeft <= 0) {
      return { label: order.status === 'shipped' ? 'Arriving today' : 'Expected today', daysLeft: 0 }
    }

    return {
      label: `ETA: ${eta.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}`,
      daysLeft,
    }
  }

  const downloadInvoice = (order: any) => {
    const items = order.order_items || order.items || []
    const rows = items.map((item: any) => {
      const unit = Number(item.unit_price || item.price || 0)
      const qty = Number(item.quantity || 1)
      const total = Number(item.total_price || unit * qty)
      return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.product_name || item.name || 'Product'}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₦${unit.toLocaleString()}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₦${total.toLocaleString()}</td></tr>`
    }).join('')

    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Invoice</title><style>body{font-family:Arial,sans-serif;padding:28px;max-width:760px;margin:auto;color:#111}table{width:100%;border-collapse:collapse}th{padding:8px;background:#f5f5f5;text-align:left}.muted{color:#666}</style></head><body><h2>BigCat Marketplace</h2><p class="muted">Tax Invoice / Receipt</p><p><strong>Order:</strong> ${String(order.id).slice(0, 8).toUpperCase()}</p><p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-NG')}</p><p><strong>Delivery:</strong> ${order.delivery_address || 'N/A'}</p><table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table><table style="margin-top:12px;max-width:300px;margin-left:auto"><tr><td style="padding:4px 8px">Subtotal</td><td style="padding:4px 8px;text-align:right">₦${Number(order.product_total || 0).toLocaleString()}</td></tr><tr><td style="padding:4px 8px">Delivery</td><td style="padding:4px 8px;text-align:right">₦${Number(order.delivery_fee || 0).toLocaleString()}</td></tr><tr><td style="padding:8px 8px"><strong>Grand Total</strong></td><td style="padding:8px 8px;text-align:right"><strong>₦${Number(order.grand_total || 0).toLocaleString()}</strong></td></tr></table><p class="muted" style="margin-top:20px">Thank you for shopping on BigCat.</p></body></html>`

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 350)
  }

  const submitIssueReport = async (orderId: string) => {
    if (!user?.userId) {
      setReportFeedback('Please sign in to report an issue.')
      return
    }

    const description = reportDescription.trim()
    if (!description) {
      setReportFeedback('Please describe the issue before submitting.')
      return
    }

    setSubmittingReportFor(orderId)
    setReportFeedback('')

    try {
      const refundMeta = (reportIssueType === 'refund_request' || reportIssueType === 'return_item')
        ? `\n\n--- Refund Details ---\nBank: ${refundBankName}\nAccount Number: ${refundAccountNumber}\nAccount Name: ${refundAccountName}`
        : ''

      const response = await fetch('/api/issues/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          buyerId: user.userId,
          issueType: reportIssueType,
          description: description + refundMeta,
        }),
      })
      const result = await response.json()

      if (!result.success) {
        setReportFeedback(result.error || 'Unable to submit your report right now.')
        return
      }

      setReportFeedback('Report submitted. BigCat admin will review and update you shortly.')

      if (result?.data?.id) {
        const issueId = String(result.data.id)
        appendBuyerIssueNotification({
          issueId,
          title: 'Issue reported',
          message: 'Your issue has been reported to BigCat admin and is currently Reported.',
        })

        if (typeof window !== 'undefined' && user?.userId) {
          const cacheKey = getIssueStatusCacheKey(user.userId)
          const existingMap = JSON.parse(localStorage.getItem(cacheKey) || '{}') as Record<string, string>
          existingMap[issueId] = 'open'
          localStorage.setItem(cacheKey, JSON.stringify(existingMap))
        }
      }

      fetchIssues()
      setReportingOrderId(null)
      setReportDescription('')
      setReportIssueType('not_delivered')
      setRefundBankName('')
      setRefundAccountNumber('')
      setRefundAccountName('')
    } catch {
      setReportFeedback('Unable to submit your report right now.')
    } finally {
      setSubmittingReportFor(null)
    }
  }

  const handleMarkAsDelivered = async (orderId: string) => {
    setUpdatingOrderId(orderId)
    setError("")

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
        <p className="mt-1 text-xs text-muted-foreground">Auto-updates every 20s · Last sync {new Date(lastUpdatedAt).toLocaleTimeString()}</p>
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
            {reorderMessage && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {reorderMessage}
              </div>
            )}
            {reportFeedback && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {reportFeedback}
              </div>
            )}
            {orders.map((order) => {
              const StatusIcon = statusConfig[order.status]?.icon || Clock
              const escrow = escrowMap[String(order.id)]
              const orderIssue = issuesByOrder[String(order.id)]
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
                    {order.status !== 'delivered' && (
                      <div className={`mt-2 flex items-center gap-1.5 text-xs ${getDeliveryETA(order).daysLeft === 0 ? 'text-green-700' : 'text-primary'}`}>
                        <Timer className="w-3.5 h-3.5" />
                        <span>{getDeliveryETA(order).label}</span>
                        {typeof getDeliveryETA(order).daysLeft === 'number' && getDeliveryETA(order).daysLeft! > 0 && (
                          <span className="text-muted-foreground">({getDeliveryETA(order).daysLeft}d left)</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Use Report issue from order details when you need BigCat admin support.
                    </p>
                    {orderIssue && (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-2">
                        <p className="text-xs text-muted-foreground">Issue Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getIssueStatusClass(orderIssue.status)}`}>
                          {getIssueStatusLabel(orderIssue.status)}
                        </span>
                      </div>
                    )}
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

                  <div className="mt-2">
                    <button
                      onClick={() => handleReorder(order)}
                      className="w-full rounded-lg border border-border bg-secondary py-2.5 text-sm font-medium text-foreground hover:bg-secondary/80"
                    >
                      Buy Again
                    </button>
                  </div>

                  <div className="mt-2">
                    <button
                      onClick={() => downloadInvoice(order)}
                      className="w-full rounded-lg border border-border bg-secondary/60 py-2.5 text-sm font-medium text-foreground hover:bg-secondary flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Receipt / Invoice
                    </button>
                  </div>

                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setReportingOrderId((prev) => prev === String(order.id) ? null : String(order.id))
                        setReportFeedback('')
                      }}
                      className="w-full rounded-lg border border-primary/30 bg-primary/5 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      Report Issue / Request Return or Refund
                    </button>
                    {orderIssue && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Status: {getIssueStatusLabel(orderIssue.status)}
                      </p>
                    )}
                  </div>

                  {reportingOrderId === String(order.id) && (
                    <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3 space-y-2">
                      <p className="text-xs font-semibold text-foreground">Report Issue / Request Return or Refund</p>
                      <select
                        value={reportIssueType}
                        onChange={(e) => setReportIssueType(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="not_delivered">Order not delivered</option>
                        <option value="wrong_item">Wrong item received</option>
                        <option value="damaged_item">Damaged item</option>
                        <option value="return_item">Return item (change of mind)</option>
                        <option value="refund_request">Refund request</option>
                        <option value="other">Other</option>
                      </select>
                      <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        placeholder="Tell BigCat admin what happened..."
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground min-h-[88px]"
                      />
                      {(reportIssueType === 'refund_request' || reportIssueType === 'return_item') && (
                        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                            <Banknote className="w-3.5 h-3.5" />
                            Refund Bank Details (optional)
                          </div>
                          <input
                            value={refundBankName}
                            onChange={(e) => setRefundBankName(e.target.value)}
                            placeholder="Bank name"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          />
                          <input
                            value={refundAccountNumber}
                            onChange={(e) => setRefundAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Account number (10 digits)"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            maxLength={10}
                            inputMode="numeric"
                          />
                          <input
                            value={refundAccountName}
                            onChange={(e) => setRefundAccountName(e.target.value)}
                            placeholder="Account name"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => submitIssueReport(String(order.id))}
                        disabled={submittingReportFor === String(order.id)}
                        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        {submittingReportFor === String(order.id) ? 'Submitting...' : 'Submit report'}
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
