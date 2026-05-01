import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { reportOrderIssue } from '@/lib/support-issues-actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const buyerId = String(body?.buyerId || '')
    const orderId = String(body?.orderId || '')
    const issueType = String(body?.issueType || 'other')
    const description = String(body?.description || '')

    if (!buyerId || !orderId) {
      return NextResponse.json(
        { success: false, error: 'buyerId and orderId are required' },
        { status: 400 },
      )
    }

    const auth = await requireAuthenticatedUser(buyerId)
    if (auth.response) return auth.response

    const result = await reportOrderIssue({
      orderId,
      buyerId,
      issueType,
      description,
    })

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Report issue API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
