import { NextRequest, NextResponse } from 'next/server'
import { createServiceListing, getMarketplaceServices, getMerchantServices } from '@/lib/service-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { getUserSafetyStatus } from '@/lib/server-trust-safety'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')

    if (merchantId) {
      const auth = await requireAuthenticatedUser(merchantId)
      if (auth.response) return auth.response

      const result = await getMerchantServices(merchantId)
      return NextResponse.json(result)
    }

    const search = searchParams.get('search') || undefined
    const category = searchParams.get('category') || undefined
    const state = searchParams.get('state') || undefined
    const city = searchParams.get('city') || undefined

    const result = await getMarketplaceServices({ search, category, state, city })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Services GET API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const merchantId = String(body?.merchantId || '')

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID is required' },
        { status: 400 },
      )
    }

    const auth = await requireAuthenticatedUser(merchantId)
    if (auth.response) return auth.response

    const safetyStatus = await getUserSafetyStatus(merchantId)
    if (safetyStatus.suspended) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your account is temporarily suspended for violating platform policies.',
          code: 'POLICY_USER_SUSPENDED',
          strikes: safetyStatus.strikes,
          suspended: true,
          suspendedUntil: safetyStatus.suspendedUntil,
          remainingMs: safetyStatus.remainingMs,
        },
        { status: 403 },
      )
    }

    const result = await createServiceListing({
      merchantId,
      title: body?.title,
      description: body?.description,
      category: body?.category,
      basePrice: Number(body?.basePrice || 0),
      workingDays: Array.isArray(body?.workingDays) ? body.workingDays : [],
      workingHours: body?.workingHours,
      serviceCity: body?.serviceCity,
      serviceState: body?.serviceState,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Services POST API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
