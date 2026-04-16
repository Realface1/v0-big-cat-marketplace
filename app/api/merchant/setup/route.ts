import { NextRequest, NextResponse } from 'next/server'
import { saveMerchantSetup } from '@/lib/merchant-setup-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      smedanId,
      businessName,
      businessDescription,
      category,
      location,
      logoUrl,
    } = await request.json()

    if (!userId || !businessName || !businessDescription || !category || !location) {
      return NextResponse.json(
        { success: false, error: 'Missing required merchant setup fields' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(userId)
    if (auth.response) return auth.response

    const result = await saveMerchantSetup(userId, {
      businessName,
      businessDescription,
      category,
      location,
      smedanId,
      logoUrl,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Merchant setup API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
