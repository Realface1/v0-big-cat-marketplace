import { NextRequest, NextResponse } from 'next/server'
import { getMerchants, approveMerchant, rejectMerchant } from '@/lib/admin-actions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buyerLat = Number(searchParams.get('buyerLat'))
    const buyerLng = Number(searchParams.get('buyerLng'))

    const result = await getMerchants({
      buyerLat: Number.isFinite(buyerLat) ? buyerLat : null,
      buyerLng: Number.isFinite(buyerLng) ? buyerLng : null,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get merchants API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    const result = await approveMerchant(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Approve merchant API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
    const result = await rejectMerchant(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Reject merchant API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
