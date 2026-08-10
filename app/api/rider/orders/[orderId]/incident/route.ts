import { NextRequest, NextResponse } from 'next/server'
import { reportRiderIncident } from '@/lib/logistics-actions'

function getRiderId(request: NextRequest) {
  return String(request.headers.get('x-rider-id') || '').trim()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const riderId = getRiderId(request)
    if (!riderId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId: rawOrderId } = await params
    const orderId = String(rawOrderId || '').trim()
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required.' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const incidentType = String(body?.incidentType || '').trim()
    const note = String(body?.note || '').trim()

    if (!incidentType) {
      return NextResponse.json({ success: false, error: 'Incident type is required.' }, { status: 400 })
    }

    const result = await reportRiderIncident(orderId, riderId, incidentType, note)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Rider incident report API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 })
  }
}
