import { NextRequest, NextResponse } from 'next/server'
import { getMerchantOrders } from '@/lib/order-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID is required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(merchantId)
    if (auth.response) return auth.response

    const result = await getMerchantOrders(merchantId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get merchant orders API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}