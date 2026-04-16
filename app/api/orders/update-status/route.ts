import { NextRequest, NextResponse } from 'next/server'
import { updateOrderStatus } from '@/lib/order-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function PUT(request: NextRequest) {
  try {
    const { orderId, status } = await request.json()

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'Order ID and status are required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser()
    if (auth.response) return auth.response

    const result = await updateOrderStatus(orderId, status, auth.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Update order status API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}