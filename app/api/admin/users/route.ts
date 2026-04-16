import { NextResponse } from 'next/server'
import { getRecentUsers } from '@/lib/admin-actions'

export async function GET() {
  try {
    const result = await getRecentUsers()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
