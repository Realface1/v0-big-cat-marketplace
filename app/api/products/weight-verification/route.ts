import { NextRequest, NextResponse } from 'next/server'
import { requestWeightVerification } from '@/lib/product-actions'

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const result = await requestWeightVerification(productId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Request weight verification API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}