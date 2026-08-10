'use client'

import { useState } from 'react'
import { Tag, Check, AlertCircle } from 'lucide-react'
import { formatNaira } from '@/lib/currency-utils'

interface CouponInputProps {
  cartTotal: number
  onCouponApplied?: (couponCode: string, discount: number) => void
  onCouponRemoved?: () => void
}

export function CouponInput({ cartTotal, onCouponApplied, onCouponRemoved }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount: number
  } | null>(null)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleValidate = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code')
      return
    }

    setValidating(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/merchant/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          couponCode: couponCode.toUpperCase(),
          buyerId: 'current-buyer-id', // This would come from auth context
          cartTotal,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error)
        return
      }

      setAppliedCoupon({
        code: data.coupon.code,
        discount: data.discount,
      })
      setSuccess(`✓ Coupon applied! You save ${formatNaira(data.discount)}`)
      onCouponApplied?.(data.coupon.code, data.discount)
    } catch (err: any) {
      setError(err.message || 'Failed to validate coupon')
    } finally {
      setValidating(false)
    }
  }

  const handleRemove = () => {
    setCouponCode('')
    setAppliedCoupon(null)
    setError('')
    setSuccess('')
    onCouponRemoved?.()
  }

  if (appliedCoupon) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">{appliedCoupon.code}</p>
              <p className="text-sm text-green-700">
                Saves you {formatNaira(appliedCoupon.discount)}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-sm text-green-700 hover:text-green-900 font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Have a coupon code?</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          disabled={validating}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={handleValidate}
          disabled={validating || !couponCode.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Tag className="w-4 h-4" />
          {validating ? 'Checking...' : 'Apply'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
    </div>
  )
}
