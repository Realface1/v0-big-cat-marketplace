import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { getUserSafetyStatus } from '@/lib/server-trust-safety'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = String(searchParams.get('userId') || '').trim()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 },
      )
    }

    const auth = await requireAuthenticatedUser(userId)
    if (auth.response) return auth.response

    const status = await getUserSafetyStatus(userId)
    return NextResponse.json({ success: true, ...status })
  } catch (error) {
    console.error('Safety status API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
