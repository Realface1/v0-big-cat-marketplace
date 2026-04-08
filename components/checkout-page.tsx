"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Truck, Zap, MapPin, Package, CreditCard, CheckCircle2, Wallet, Building2 } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useRole } from "@/lib/role-context"
import { createOrder } from "@/lib/order-actions"
import { calculateDeliveryFee } from "@/lib/delivery-utils"
import { formatNaira } from "@/lib/currency-utils"
import { PaymentMethodSelector, type PaymentMethod } from "@/components/payment-method-selector"

interface CheckoutPageProps {
  onBack: () => void
  onSuccess: (orderId: string) => void
}

export function CheckoutPage({ onBack, onSuccess }: CheckoutPageProps) {
  const { items, getTotal, clearCart } = useCart()
  const { user } = useRole()
  const [deliveryType, setDeliveryType] = useState<'normal' | 'express'>('normal')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('palmpay')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deliveryFee, setDeliveryFee] = useState(0)

  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => sum + (0.5 * item.quantity), 0) // Default 0.5kg per item

  // Calculate delivery fee when inputs change
  useEffect(() => {
    if (deliveryAddress.trim()) {
      const fee = calculateDeliveryFee({
        weight: totalWeight,
        deliveryType,
        location: deliveryAddress,
      })
      setDeliveryFee(fee)
    }
  }, [deliveryType, deliveryAddress, totalWeight])

  const productTotal = getTotal()
  const grandTotal = productTotal + deliveryFee

  const handleSubmit = async () => {
    if (!deliveryAddress.trim()) {
      setError('Please enter a delivery address')
      return
    }

    if (!user?.userId) {
      setError('Please log in to place an order')
      return
    }

    setIsSubmitting(true)
    setError('')

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
      deliveryType,
      deliveryAddress: deliveryAddress.trim(),
      paymentMethod,
    })

    setIsSubmitting(false)

    if (result.success && result.data) {
      clearCart()
      onSuccess(result.data.orderId)
    } else {
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
        <section className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground mb-3">Delivery Options</h2>
          <div className="space-y-3">
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
              {deliveryType === 'normal' && (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              )}
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
              {deliveryType === 'express' && (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              )}
            </button>
          </div>
        </section>

        {/* Delivery Address */}
        <section className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground mb-3">Delivery Address</h2>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter your full delivery address..."
              className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground resize-none h-24"
            />
          </div>
        </section>

        {/* Payment Method Selection */}
        <section className="p-4 border-b border-border">
          <PaymentMethodSelector selectedMethod={paymentMethod} onSelect={setPaymentMethod} />
        </section>

        {/* Price Breakdown */}
        <section className="p-4">
          <h2 className="font-semibold text-foreground mb-3">Price Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product Total</span>
              <span className="font-medium text-foreground">{formatNaira(productTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
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
            disabled={isSubmitting || !deliveryAddress.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-5 h-5" />
            {isSubmitting ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
