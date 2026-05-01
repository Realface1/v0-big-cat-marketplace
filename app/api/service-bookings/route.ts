import { NextRequest, NextResponse } from 'next/server'
import {
  createServiceBooking,
  getBuyerServiceBookings,
  getMerchantServiceBookings,
} from '@/lib/service-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { getUserSafetyStatus } from '@/lib/server-trust-safety'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buyerId = searchParams.get('buyerId')
    const merchantId = searchParams.get('merchantId')

    if (!buyerId && !merchantId) {
      return NextResponse.json(
        { success: false, error: 'buyerId or merchantId is required' },
        { status: 400 },
      )
    }

    if (buyerId) {
      const auth = await requireAuthenticatedUser(buyerId)
      if (auth.response) return auth.response

      const result = await getBuyerServiceBookings(buyerId)
      return NextResponse.json(result)
    }

    const auth = await requireAuthenticatedUser(merchantId || undefined)
    if (auth.response) return auth.response

    const result = await getMerchantServiceBookings(merchantId || '')
    return NextResponse.json(result)
  } catch (error) {
    console.error('Service bookings GET API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const buyerId = String(body?.buyerId || '')

    if (!buyerId) {
      return NextResponse.json(
        { success: false, error: 'Buyer ID is required' },
        { status: 400 },
      )
    }

    const auth = await requireAuthenticatedUser(buyerId)
    if (auth.response) return auth.response

    const safetyStatus = await getUserSafetyStatus(buyerId)
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

    const result = await createServiceBooking({
      serviceId: String(body?.serviceId || ''),
      buyerId,
      scheduledAt: body?.scheduledAt,
      serviceAddress: body?.serviceAddress,
      buyerNote: body?.buyerNote,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Service bookings POST API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
