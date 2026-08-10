"use client"

import { useEffect, useState } from "react"
import { Shield, Clock, Truck, MapPin, Loader2, CheckCircle2, AlertCircle, X, Minus, Plus } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useRole } from "@/lib/role-context"

interface Product {
  id: number
  name: string
  price: number
  originalPrice?: number
  description?: string
  rating?: number
  sold?: number
}

interface Vendor {
  id: number
  name: string
  category: string
  rating: number
  reviews: number
  location: string
}

interface CheckoutDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product
  vendor: Vendor
}

type PaymentStatus = "idle" | "processing" | "success" | "error"
type DeliveryMethod = "platform" | "vendor" | "pickup"

export function CheckoutDrawer({ open, onOpenChange, product, vendor }: CheckoutDrawerProps) {
  const { user } = useRole()
  const [quantity, setQuantity] = useState(1)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("platform")
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [promotionDiscount, setPromotionDiscount] = useState(0)
  const [promotionName, setPromotionName] = useState<string | null>(null)

  const deliveryFee = deliveryMethod === "platform" ? 10 : deliveryMethod === "vendor" ? 5 : 0
  const subtotal = product.price * quantity
  const discountedSubtotal = Math.max(0, subtotal - promotionDiscount)
  const couponDiscount = appliedCoupon?.discount || 0
  const total = Math.max(0, discountedSubtotal + deliveryFee - couponDiscount)

  useEffect(() => {
    const previewPromotion = async () => {
      try {
        const response = await fetch('/api/promotions/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [
              {
                merchantId: String(vendor.id),
                productId: String(product.id),
                quantity,
                unitPrice: Number(product.price),
              },
            ],
          }),
        })

        const result = await response.json()
        if (result?.success) {
          const totalDiscount = Number(result?.data?.totalDiscount || 0)
          setPromotionDiscount(Math.max(0, Math.min(totalDiscount, subtotal)))
          const firstPromotion = Array.isArray(result?.data?.promotions) ? result.data.promotions[0] : null
          setPromotionName(firstPromotion?.promotionName ? String(firstPromotion.promotionName) : null)
        } else {
          setPromotionDiscount(0)
          setPromotionName(null)
        }
      } catch {
        setPromotionDiscount(0)
        setPromotionName(null)
      }
    }

    previewPromotion()
  }, [vendor.id, product.id, product.price, quantity, subtotal])

  const deliveryEstimates = {
    platform: { time: "2-3 days", icon: Truck },
    vendor: { time: "1-2 days", icon: Clock },
    pickup: { time: "Same day", icon: MapPin },
  }

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta
    if (newQty >= 1 && newQty <= 99) {
      setQuantity(newQty)
    }
  }

  const handlePayment = async () => {
    setPaymentStatus("processing")
    setError(null)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // In production, this would call the real PalmPay API
      // For now, we'll simulate success
      const response = await fetch("/api/checkout/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          vendorId: vendor.id,
          vendorName: vendor.name,
          quantity,
          unitPrice: product.price,
          totalAmount: total,
          deliveryMethod,
          deliveryFee,
          appliedCoupon: appliedCoupon || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Payment initiation failed")
      }

      const data = await response.json()
      console.log("[v0] Payment initiated:", data)

      // Show success state
      setPaymentStatus("success")

      // Reset and close after delay
      setTimeout(() => {
        setPaymentStatus("idle")
        setQuantity(1)
        setDeliveryMethod("platform")
        onOpenChange(false)
      }, 2000)
    } catch (err) {
      console.error("[v0] Payment error:", err)
      setPaymentStatus("error")
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.")
    }
  }

  const getDeliveryEstimate = (method: DeliveryMethod) => {
    const estimate = deliveryEstimates[method]
    const EstimateIcon = estimate.icon
    return (
      <div className="flex items-center gap-2">
        <EstimateIcon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{estimate.time}</span>
      </div>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        {/* Header with Close Button */}
        <DrawerHeader className="flex items-center justify-between px-4 pt-4 pb-0">
          <div>
            <DrawerTitle className="text-lg">Checkout</DrawerTitle>
            <DrawerDescription className="sr-only">
              Complete your order for {product.name} from {vendor.name}
            </DrawerDescription>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </DrawerHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {paymentStatus === "idle" || paymentStatus === "processing" ? (
            <>
              {/* Order Summary Section */}
              <section className="mb-6">
                <h3 className="font-semibold text-foreground text-sm mb-4 uppercase tracking-wide text-muted-foreground">
                  Order Summary
                </h3>
                <div className="bg-card border border-border rounded-2xl p-4 mb-4">
                  {/* Product Card */}
                  <div className="flex gap-3 mb-4 pb-4 border-b border-border">
                    <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">👔</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm mb-0.5">{product.name}</h4>
                      <p className="text-xs text-muted-foreground mb-1.5">{vendor.name}</p>
                      <p className="font-bold text-foreground">${product.price.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Quantity Control */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <span className="text-sm text-muted-foreground">Quantity</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1 || paymentStatus === "processing"}
                        className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-foreground">{quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= 99 || paymentStatus === "processing"}
                        className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span className="text-foreground">${deliveryFee.toFixed(2)}</span>
                    </div>
                    {promotionDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600">Promotion{promotionName ? ` (${promotionName})` : ''}</span>
                        <span className="text-green-600 font-semibold">-${promotionDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600">Coupon Discount</span>
                        <span className="text-green-600 font-semibold">-${couponDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-bold text-foreground text-lg">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Coupon Section */}
              {!appliedCoupon && (
                <section className="mb-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={validatingCoupon}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <button
                      onClick={async () => {
                        if (!couponCode.trim()) return
                        if (!user?.userId) {
                          setError('Please sign in to apply coupon')
                          return
                        }
                        setValidatingCoupon(true)
                        try {
                          const res = await fetch('/api/merchant/coupons', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'validate',
                              couponCode: couponCode.toUpperCase(),
                              buyerId: String(user?.userId || ''),
                              cartTotal: discountedSubtotal + deliveryFee,
                            }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            setAppliedCoupon({ code: data.coupon.code, discount: data.discount })
                            setError(null)
                          } else {
                            setError(data.error)
                          }
                        } catch (err: any) {
                          setError(err.message)
                        } finally {
                          setValidatingCoupon(false)
                        }
                      }}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                      {validatingCoupon ? "Checking..." : "Apply"}
                    </button>
                  </div>
                </section>
              )}

              {appliedCoupon && (
                <section className="mb-6 rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-900">{appliedCoupon.code}</p>
                      <p className="text-sm text-green-700">Save ${appliedCoupon.discount.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setAppliedCoupon(null)
                        setCouponCode("")
                      }}
                      className="text-sm text-green-700 hover:text-green-900"
                    >
                      Remove
                    </button>
                  </div>
                </section>
              )}

              {/* Delivery Section */}
              <section className="mb-6">
                <h3 className="font-semibold text-foreground text-sm mb-4 uppercase tracking-wide text-muted-foreground">
                  Delivery Options
                </h3>
                <RadioGroup value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)}>
                  {(["platform", "vendor", "pickup"] as const).map((method) => (
                    <div key={method} className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all">
                      <RadioGroupItem value={method} id={method} className="mt-1.5" />
                      <Label htmlFor={method} className="flex-1 cursor-pointer">
                        <div className="font-semibold text-foreground mb-1 capitalize">
                          {method === "platform" && "Platform Delivery"}
                          {method === "vendor" && "Vendor Delivery"}
                          {method === "pickup" && "Pickup"}
                        </div>
                        {getDeliveryEstimate(method)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </section>

              {/* Payment Method Section */}
              <section className="mb-6">
                <h3 className="font-semibold text-foreground text-sm mb-4 uppercase tracking-wide text-muted-foreground">
                  Payment Method
                </h3>
                <div className="bg-card border-2 border-primary rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-lg">
                      🟣
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">PalmPay</h4>
                      <p className="text-xs text-muted-foreground">Pay directly from wallet</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
              </section>

              {/* Escrow Information */}
              <section className="mb-6">
                <div className="flex gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm mb-1">Secure Payment</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      Your payment is secure and held in escrow until you confirm delivery.
                    </p>
                  </div>
                </div>
              </section>

              {/* Error Message */}
              {error && (
                <section className="mb-6">
                  <div className="flex gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : paymentStatus === "success" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2">Order Confirmed!</h3>
              <p className="text-sm text-muted-foreground mb-2">Your payment has been processed successfully.</p>
              <p className="text-xs text-muted-foreground">Redirecting...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <h3 className="font-bold text-foreground text-lg mb-2">Payment Failed</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => setPaymentStatus("idle")} variant="default" size="sm">
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {paymentStatus !== "success" && paymentStatus !== "error" && (
          <div className="border-t border-border p-4 bg-card">
            <Button
              onClick={handlePayment}
              disabled={paymentStatus === "processing"}
              className="w-full h-12 rounded-xl"
              size="lg"
            >
              {paymentStatus === "processing" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay Securely - $${total.toFixed(2)}`
              )}
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
