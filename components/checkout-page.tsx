"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Truck, Zap, MapPin, Package, CreditCard, CheckCircle2, Wallet, Building2 } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useRole } from "@/lib/role-context"
import { createOrder } from "@/lib/order-actions"
import { calculateDeliveryFee } from "@/lib/delivery-utils"
import { formatNaira } from "@/lib/currency-utils"
import { PaymentMethodSelector, type PaymentMethod } from "@/components/payment-method-selector"
import { getUserStrikeCount, isUserSuspended, resetSafetyState } from "@/lib/trust-safety"
import { createEscrowRecord } from "@/lib/escrow"
import { sendOrderToLogistics } from "@/lib/logistics"

interface CheckoutPageProps {
  onBack: () => void
  onSuccess: (orderId: string) => void
}

export function CheckoutPage({ onBack, onSuccess }: CheckoutPageProps) {
  const { items, getTotal, clearCart } = useCart()
  const { user } = useRole()
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'doorstep' | 'pickup'>('doorstep')
  const [deliveryType, setDeliveryType] = useState<'normal' | 'express'>('normal')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('palmpay')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [walletBalance, setWalletBalance] = useState(0)
  const [suspended, setSuspended] = useState(false)
  const [strikeCount, setStrikeCount] = useState(0)
  const savedLocation = [user?.city, user?.state].filter(Boolean).join(', ')

  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => sum + (0.5 * item.quantity), 0) // Default 0.5kg per item

  // Calculate delivery fee when inputs change
  useEffect(() => {
    if (!deliveryAddress.trim()) {
      setDeliveryFee(0)
      return
    }

    const effectiveDeliveryType = fulfillmentMethod === 'pickup' ? 'pickup' : deliveryType
    const fee = calculateDeliveryFee({
      weight: totalWeight,
      deliveryType: effectiveDeliveryType,
      location: deliveryAddress,
    })
    setDeliveryFee(fee)
  }, [deliveryType, deliveryAddress, totalWeight, fulfillmentMethod])

  const productTotal = getTotal()
  const grandTotal = productTotal + deliveryFee
  const isWalletPayment = paymentMethod === 'palmpay'
  const isWalletInsufficient = isWalletPayment && deliveryAddress.trim() && walletBalance < grandTotal
  const walletShortfall = isWalletInsufficient ? grandTotal - walletBalance : 0

  const getWalletStorageKey = () => {
    return user?.userId ? `wallet_balance_${user.userId}` : "wallet_balance_guest"
  }

  const getWalletBalance = () => {
    const storageKey = getWalletStorageKey()
    const raw = localStorage.getItem(storageKey)
    const parsed = raw ? Number(raw) : 0
    return Number.isFinite(parsed) ? parsed : 0
  }

  useEffect(() => {
    if (!isWalletPayment) return
    setWalletBalance(getWalletBalance())
  }, [isWalletPayment, user?.userId])

  useEffect(() => {
    setSuspended(isUserSuspended(user?.userId))
    setStrikeCount(getUserStrikeCount(user?.userId))
  }, [user?.userId])

  useEffect(() => {
    if (!deliveryAddress.trim() && savedLocation) {
      setDeliveryAddress(savedLocation)
    }
  }, [savedLocation])

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (suspended) {
      setError('Your account has been temporarily suspended for violating platform policies.')
      return
    }

    if (!deliveryAddress.trim()) {
      setError(
        fulfillmentMethod === 'pickup'
          ? 'Please enter your preferred drop-off point or pickup area'
          : 'Please enter a delivery address'
      )
      return
    }

    if (!user?.userId) {
      setError('Please log in to place an order')
      return
    }

    const currentWalletBalance = isWalletPayment ? getWalletBalance() : 0
    if (isWalletPayment && currentWalletBalance < grandTotal) {
      setWalletBalance(currentWalletBalance)
      setError('Insufficient funds in wallet')
      return
    }

    setIsSubmitting(true)
    const merchantIdsInCart = Array.from(new Set(items.map((item) => String(item.merchantId || '').trim()).filter(Boolean)))

    const tokenChargeResponse = await fetch('/api/merchant/tokens/charge-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ merchantIds: merchantIdsInCart }),
    })
    const tokenChargeResult = await tokenChargeResponse.json()

    if (!tokenChargeResult.success && Array.isArray(tokenChargeResult.failed) && tokenChargeResult.failed.length > 0) {
      const firstFailed = tokenChargeResult.failed[0]
      setIsSubmitting(false)
      setError(`This merchant cannot receive orders right now (${firstFailed.merchantId}) because token balance is exhausted.`)
      return
    }

    const result = await createOrder({
      buyerId: user.userId,
      items: items.map(item => ({
        productId: item.productId,
        merchantId: item.merchantId,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        weight: 0.5, // Default weight
      })),
      deliveryType: fulfillmentMethod === 'pickup' ? 'pickup' : deliveryType,
      deliveryAddress: deliveryAddress.trim(),
      paymentMethod,
      deliveryFee,
    })

    setIsSubmitting(false)

    if (result.success && result.data) {
      const createdOrders = Array.isArray((result.data as any).orders) && (result.data as any).orders.length > 0
        ? (result.data as any).orders
        : [result.data]
      const orderId = String(result.data.orderId || result.data.id || `order_${Date.now()}`)

      createdOrders.forEach((createdOrder: any, index: number) => {
        const currentOrderId = String(createdOrder?.id || `${orderId}_${index}`)
        const currentOrderTotal = Number(createdOrder?.grand_total || createdOrder?.total_amount || 0)
        const currentDeliveryFee = Number(createdOrder?.delivery_fee || 0)

        createEscrowRecord(currentOrderId, currentOrderTotal, currentDeliveryFee)

        const scopedItems = items.filter(
          (item) => String(item.merchantId || '') === String(createdOrder?.merchant_id || '')
        )

        sendOrderToLogistics({
          order_id: currentOrderId,
          customer_name: user?.name || user?.email || "Customer",
          customer_phone: user?.phone || "",
          customer_city: user?.city || "",
          customer_state: user?.state || "",
          delivery_address: deliveryAddress.trim(),
          items: (scopedItems.length > 0 ? scopedItems : items).map((item) => ({ product_name: item.name, quantity: item.quantity })),
          total_amount: currentOrderTotal,
          delivery_fee: currentDeliveryFee,
          status: "pending",
        })
      })

      if (isWalletPayment) {
        const updatedBalance = Math.max(0, currentWalletBalance - grandTotal)
        localStorage.setItem(getWalletStorageKey(), updatedBalance.toString())
        setWalletBalance(updatedBalance)
        setSuccess('Payment successful and funds secured in escrow')
      } else {
        setSuccess(
          paymentMethod === 'bank'
            ? 'Bank transfer confirmed and funds secured in escrow'
            : 'Card payment processed and funds secured in escrow'
        )
      }
      clearCart()
      setTimeout(() => {
        onSuccess(orderId)
      }, 700)
    } else {
      await Promise.all(
        merchantIdsInCart.map((merchantId) =>
          fetch('/api/merchant/tokens/top-up', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchantId, amount: tokenChargeResult.tokenCostPerMerchant || 0 }),
          }).catch(() => null)
        )
      )
      setError(result.error || 'Failed to place order')
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-4">Add some products to checkout</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Continue Shopping
        </button>
      </div>
    )
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
          <h1 className="font-semibold text-foreground">Checkout</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-32">
        {/* Order Summary */}
        <section className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground mb-3">Order Summary</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium text-foreground">
                  {formatNaira(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery Options */}
        <section className="p-4 border-b border-border space-y-4">
          <h2 className="font-semibold text-foreground">Delivery Options</h2>

          <div className="grid gap-3">
            <button
              onClick={() => setFulfillmentMethod('doorstep')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                fulfillmentMethod === 'doorstep'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className={`p-2 rounded-lg ${fulfillmentMethod === 'doorstep' ? 'bg-primary/10' : 'bg-muted'}`}>
                <Truck className={`w-5 h-5 ${fulfillmentMethod === 'doorstep' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Doorstep Delivery</p>
                <p className="text-sm text-muted-foreground">Get your order delivered to your address</p>
              </div>
              {fulfillmentMethod === 'doorstep' && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </button>

            <button
              onClick={() => setFulfillmentMethod('pickup')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                fulfillmentMethod === 'pickup'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <div className={`p-2 rounded-lg ${fulfillmentMethod === 'pickup' ? 'bg-primary/10' : 'bg-muted'}`}>
                <MapPin className={`w-5 h-5 ${fulfillmentMethod === 'pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Pickup at Drop-off Point</p>
                <p className="text-sm text-muted-foreground">Collect your order from a nearby drop-off point</p>
              </div>
              {fulfillmentMethod === 'pickup' && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </button>
          </div>

          {fulfillmentMethod === 'doorstep' && (
            <div className="space-y-3 pt-1">
              <button
                onClick={() => setDeliveryType('normal')}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  deliveryType === 'normal'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${deliveryType === 'normal' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Truck className={`w-5 h-5 ${deliveryType === 'normal' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">Normal Delivery</p>
                  <p className="text-sm text-muted-foreground">3-5 business days</p>
                </div>
                {deliveryType === 'normal' && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>

              <button
                onClick={() => setDeliveryType('express')}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  deliveryType === 'express'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${deliveryType === 'express' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Zap className={`w-5 h-5 ${deliveryType === 'express' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">Express Delivery</p>
                  <p className="text-sm text-muted-foreground">1-2 business days</p>
                </div>
                {deliveryType === 'express' && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>
            </div>
          )}
        </section>

        {/* Delivery Address */}
        <section className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground mb-3">
            {fulfillmentMethod === 'pickup' ? 'Preferred Drop-off Point' : 'Delivery Address'}
          </h2>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder={
                fulfillmentMethod === 'pickup'
                  ? 'Enter your preferred drop-off point or pickup area...'
                  : 'Enter your full delivery address...'
              }
              className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground resize-none h-24"
            />
          </div>
          {savedLocation && (
            <p className="mt-2 text-xs text-muted-foreground">
              Prefilled from your account location: {savedLocation}
            </p>
          )}
        </section>

        {/* Payment Method Selection */}
        <section className="p-4 border-b border-border">
          <PaymentMethodSelector selectedMethod={paymentMethod} onSelect={setPaymentMethod} />

          {isWalletPayment && (
            <div className="mt-3 rounded-xl border border-[#E8D7FF] bg-[#F9F5FF] p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#5B21B6] font-medium">Wallet Balance</span>
                <span className="font-semibold text-[#6C2BD9]">{formatNaira(walletBalance)}</span>
              </div>
              {deliveryAddress.trim() && (
                <div className="mt-2 space-y-1">
                  <p className={`text-xs ${isWalletInsufficient ? 'text-red-600' : 'text-[#6C2BD9]'}`}>
                    {isWalletInsufficient
                      ? 'Insufficient funds in wallet'
                      : 'Wallet balance is sufficient for this payment'}
                  </p>
                  {isWalletInsufficient && (
                    <p className="text-xs text-red-600/90">
                      You need {formatNaira(walletShortfall)} more to complete this payment.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {suspended && (
          <section className="mx-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">Account Suspended</p>
            <p className="text-xs text-red-700 mt-1">
              Your account has been temporarily suspended for violating platform policies.
            </p>
            <p className="text-xs text-red-600 mt-1">Strikes: {strikeCount}</p>
            <button
              onClick={() => {
                resetSafetyState(user?.userId)
                setStrikeCount(0)
                setSuspended(false)
                setError('')
              }}
              className="mt-3 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-medium"
            >
              Reset Strikes (Demo)
            </button>
          </section>
        )}

        {/* Price Breakdown */}
        <section className="p-4">
          <h2 className="font-semibold text-foreground mb-3">Price Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product Total</span>
              <span className="font-medium text-foreground">{formatNaira(productTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{fulfillmentMethod === 'pickup' ? 'Pickup Fee' : 'Delivery Fee'}</span>
              <span className="font-medium text-foreground">
                {deliveryAddress.trim() ? formatNaira(deliveryFee) : '--'}
              </span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Grand Total</span>
              <span className="font-bold text-primary text-lg">
                {deliveryAddress.trim() ? formatNaira(grandTotal) : '--'}
              </span>
            </div>
          </div>
        </section>

        {error && (
          <div className="mx-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="mx-4 mt-3 p-3 bg-[#F3E8FF] border border-[#E8D7FF] rounded-lg">
            <p className="text-sm text-[#6C2BD9] font-medium">{success}</p>
          </div>
        )}
      </main>

      {/* Fixed Bottom - Place Order */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Total to pay</p>
            <p className="text-xl font-bold text-foreground">
              {deliveryAddress.trim() ? formatNaira(grandTotal) : '--'}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !deliveryAddress.trim() || isWalletInsufficient || suspended}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
              isWalletPayment
                ? 'bg-[#6C2BD9] text-white'
                : 'bg-primary text-primary-foreground'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            {isSubmitting
              ? 'Processing...'
              : isWalletPayment
                ? 'Pay with Wallet'
                : paymentMethod === 'bank'
                  ? 'Pay via Transfer'
                  : 'Pay with Card'}
          </button>
        </div>
      </div>
    </div>
  )
}
