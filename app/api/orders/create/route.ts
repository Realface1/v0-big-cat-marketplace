import { NextRequest, NextResponse } from 'next/server'

import { createOrder } from '@/lib/order-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      buyerId,
      items,
      deliveryType,
      deliveryAddress,
      paymentMethod,
      deliveryFee,
      appliedCoupon,
    } = body

    if (!buyerId || !Array.isArray(items) || items.length === 0 || !deliveryType || !deliveryAddress) {
      return NextResponse.json(
        { success: false, error: 'buyerId, items, deliveryType, and deliveryAddress are required' },
        { status: 400 },
      )
    }

    const auth = await requireAuthenticatedUser(buyerId, request)
    if (auth.response) return auth.response

    const result = await createOrder({
      buyerId,
      items: items.map((item: any) => ({
        productId: String(item.productId),
        merchantId: String(item.merchantId),
        productName: typeof item.productName === 'string' ? item.productName : undefined,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        weight: Number.isFinite(Number(item.weight)) ? Number(item.weight) : undefined,
      })),
      deliveryType,
      deliveryAddress,
      paymentMethod,
      deliveryFee: Number(deliveryFee || 0),
      appliedCoupon: appliedCoupon || null,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Create order API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
