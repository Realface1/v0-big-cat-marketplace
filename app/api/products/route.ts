import { NextRequest, NextResponse } from 'next/server'
import { getAllProducts } from '@/lib/product-actions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buyerLat = Number(searchParams.get('buyerLat'))
    const buyerLng = Number(searchParams.get('buyerLng'))

    const result = await getAllProducts({
      buyerLat: Number.isFinite(buyerLat) ? buyerLat : null,
      buyerLng: Number.isFinite(buyerLng) ? buyerLng : null,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get all products API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}