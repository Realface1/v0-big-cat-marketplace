import { NextRequest, NextResponse } from 'next/server'
import { createProduct } from '@/lib/product-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function POST(request: NextRequest) {
  try {
    const { merchantId, product } = await request.json()

    if (!merchantId || !product) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID and product data are required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(merchantId)
    if (auth.response) return auth.response

    const result = await createProduct(merchantId, product, auth.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Create product API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}