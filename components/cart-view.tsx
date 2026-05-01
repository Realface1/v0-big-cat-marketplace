'use client'

import { useCart } from '@/lib/cart-context'
import { formatNaira } from '@/lib/currency-utils'
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react'

interface CartViewProps {
  onCheckout?: () => void
  onBack?: () => void
}

export function CartView({ onCheckout, onBack }: CartViewProps) {
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <ShoppingCart className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Start shopping to add items to your cart</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  const total = getTotal()

  // Group items by merchant
  const itemsByMerchant = items.reduce(
    (acc, item) => {
      if (!acc[item.merchantId]) {
        acc[item.merchantId] = { name: item.merchantName, items: [] }
      }
      acc[item.merchantId].items.push(item)
      return acc
    },
    {} as Record<string, { name: string; items: typeof items }>
  )

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Shopping Cart</h1>

        {/* Items by Merchant */}
        <div className="space-y-6 mb-8">
          {Object.entries(itemsByMerchant).map(([merchantId, { name, items: merchantItems }]) => (
            <div key={merchantId} className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Merchant Header */}
              <div className="bg-secondary px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{name}</p>
              </div>

              {/* Items */}
              <div className="divide-y divide-border">
                {merchantItems.map((item) => (
                  <div key={item.productId} className="p-4 flex gap-4">
                    {/* Product Placeholder */}
                    <div className="w-16 h-16 bg-secondary rounded-lg flex-shrink-0" />

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground line-clamp-2">{item.name}</h3>
                      <p className="text-lg font-bold text-foreground mt-1">
                        {formatNaira(item.price)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-1 hover:bg-secondary rounded transition-colors"
                        >
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 hover:bg-secondary rounded transition-colors"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Subtotal and Delete */}
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="text-sm font-bold text-foreground">
                          {formatNaira(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border p-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            {/* Summary Lines */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatNaira(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">Calculated at checkout</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-lg text-primary">{formatNaira(total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={onCheckout}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              >
                Proceed to Checkout
              </button>
              <button
                onClick={clearCart}
                className="w-full py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
