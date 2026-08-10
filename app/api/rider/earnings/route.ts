import { NextRequest, NextResponse } from 'next/server'
import { getRiderEarnings, requestRiderPayout } from '@/lib/logistics-actions'

function getRiderId(request: NextRequest) {
  return String(request.headers.get('x-rider-id') || '').trim()
}

export async function GET(request: NextRequest) {
  try {
    const riderId = getRiderId(request)
    if (!riderId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const result = await getRiderEarnings(riderId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Rider earnings GET API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const riderId = getRiderId(request)
    if (!riderId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const amount = Number(body?.amount || 0)

    const result = await requestRiderPayout(riderId, amount)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Rider payout request API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 })
  }
}
