import { NextRequest, NextResponse } from 'next/server'
import { requestOrderReturn } from '@/lib/logistics-actions'

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
    if (!id) {
      return NextResponse.json({ success: false, error: 'Order id is required.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = String(body?.reason || '').trim() || 'Product issue reported by buyer.'

    const result = await requestOrderReturn(id, reason, 'admin')
    return NextResponse.json(result)
  } catch (error) {
    console.error('Return request API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
