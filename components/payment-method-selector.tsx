'use client'

import { CreditCard, Wallet, Building2, Check } from 'lucide-react'

export type PaymentMethod = 'palmpay' | 'bank' | 'card'

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod
  onSelect: (method: PaymentMethod) => void
}

const paymentMethods = [
  {
    id: 'palmpay' as PaymentMethod,
    label: 'PalmPay Wallet',
    description: 'Pay instantly from your PalmPay account',
    icon: Wallet,
    badge: 'Recommended',
    highlighted: true,
  },
  {
    id: 'bank' as PaymentMethod,
    label: 'Bank Transfer',
    description: 'Transfer funds directly from your bank account',
    icon: Building2,
    badge: null,
    highlighted: false,
  },
  {
    id: 'card' as PaymentMethod,
    label: 'Credit/Debit Card',
    description: 'Pay securely with your card',
    icon: CreditCard,
    badge: null,
    highlighted: false,
  },
]

export function PaymentMethodSelector({ selectedMethod, onSelect }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Select Payment Method</h3>
      <div className="grid gap-3">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={`relative p-4 rounded-xl border-2 transition-all text-left ${
              selectedMethod === method.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-border/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${method.highlighted ? 'bg-[#F3E8FF]' : 'bg-secondary'}`}>
                  <method.icon className={`w-5 h-5 ${method.highlighted ? 'text-[#6C2BD9]' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{method.label}</p>
                    {method.badge && (
                      <span className="text-xs px-2 py-1 rounded-full bg-[#F3E8FF] text-[#6C2BD9] font-semibold">
                        {method.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{method.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 mt-1" 
                   style={{
                     borderColor: selectedMethod === method.id ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                     backgroundColor: selectedMethod === method.id ? 'hsl(var(--primary))' : 'transparent',
                   }}>
                {selectedMethod === method.id && (
                  <Check className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
