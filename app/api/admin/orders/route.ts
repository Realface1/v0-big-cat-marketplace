import { NextResponse } from 'next/server'
import { getRecentOrders } from '@/lib/admin-actions'

export async function GET() {
  try {
    const result = await getRecentOrders()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin orders API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
