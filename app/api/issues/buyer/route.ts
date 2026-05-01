import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { getBuyerSupportIssues } from '@/lib/support-issues-actions'

export async function GET(request: NextRequest) {
  try {
    const buyerId = String(request.nextUrl.searchParams.get('buyerId') || '')

    if (!buyerId) {
      return NextResponse.json(
        { success: false, error: 'buyerId is required', data: [] },
        { status: 400 },
      )
    }

    const auth = await requireAuthenticatedUser(buyerId)
    if (auth.response) return auth.response

    const result = await getBuyerSupportIssues(buyerId)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Buyer issues API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', data: [] },
      { status: 500 },
    )
  }
}
