import { NextRequest, NextResponse } from 'next/server'
import { deleteProduct } from '@/lib/product-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser()
    if (auth.response) return auth.response

    const result = await deleteProduct(productId, auth.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Delete product API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}