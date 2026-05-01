import { NextRequest, NextResponse } from 'next/server'
import { assignRiderToOrder } from '@/lib/logistics-actions'

function isAuthorized(request: NextRequest) {
  const supplied = request.headers.get('x-logistics-access-code') || ''
  const expected = process.env.LOGISTICS_ACCESS_CODE || 'LOGISTICS_001'
  return supplied.trim().toUpperCase() === expected.trim().toUpperCase()
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized logistics access' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const riderId = String(body?.riderId || '').trim()

    if (!id || !riderId) {
      return NextResponse.json({ success: false, error: 'Order id and rider id are required.' }, { status: 400 })
    }

    const result = await assignRiderToOrder(id, riderId, body?.notes)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Assign rider API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
