import { NextRequest, NextResponse } from 'next/server'
import { getBuyerOrders } from '@/lib/order-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buyerId = searchParams.get('buyerId')

    if (!buyerId) {
      return NextResponse.json(
        { success: false, error: 'Buyer ID is required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(buyerId)
    if (auth.response) return auth.response

    const result = await getBuyerOrders(buyerId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get buyer orders API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}