import { NextRequest, NextResponse } from 'next/server'
import { getLogisticsOrders, registerOrderForLogistics } from '@/lib/logistics-actions'

function isAuthorized(request: NextRequest) {
  const supplied = request.headers.get('x-logistics-access-code') || ''
  const expected = process.env.LOGISTICS_ACCESS_CODE || 'LOGISTICS_001'
  return supplied.trim().toUpperCase() === expected.trim().toUpperCase()
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized logistics access' }, { status: 401 })
    }

    const result = await getLogisticsOrders()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Logistics orders GET API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const result = await registerOrderForLogistics(payload)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Logistics orders POST API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
