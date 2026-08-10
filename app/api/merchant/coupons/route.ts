import { NextRequest, NextResponse } from 'next/server'
import {
  createCoupon,
  getMerchantCoupons,
  validateCoupon,
  applyCoupon,
  CouponInput,
} from '@/lib/promotion-actions'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { success, error, data } = await getMerchantCoupons(userId)
    if (!success) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch coupons' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, input, couponCode, buyerId, cartTotal } = await request.json()
    const userId = request.headers.get('x-user-id')

    // Create new coupon
    if (action === 'create') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
      const couponInput: CouponInput = input
      if (!couponInput.code || !couponInput.discount_value) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 },
        )
      }

      const { success, error, data } = await createCoupon(userId, couponInput)
      if (!success) {
        return NextResponse.json({ success: false, error }, { status: 400 })
      }

      return NextResponse.json({ success: true, data })
    }

    // Validate coupon
    if (action === 'validate') {
      if (!couponCode || !buyerId || cartTotal === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 },
        )
      }

      const { success, error, discount, coupon } = await validateCoupon(
        couponCode,
        buyerId,
        cartTotal,
      )
      return NextResponse.json({ success, error, discount, coupon })
    }

    // Apply coupon (increment usage)
    if (action === 'apply') {
      if (!couponCode || !buyerId) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 },
        )
      }

      const { success, error } = await applyCoupon(couponCode, buyerId)
      if (!success) {
        return NextResponse.json({ success: false, error }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 },
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process coupon' },
      { status: 500 },
    )
  }
}
