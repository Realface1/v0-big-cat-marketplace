import { NextRequest, NextResponse } from 'next/server'
import { updateServiceBookingStatus } from '@/lib/service-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { getUserSafetyStatus } from '@/lib/server-trust-safety'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const actorId = String(body?.actorId || '')
    const actorType = body?.actorType === 'buyer' ? 'buyer' : 'merchant'

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: 'Actor ID is required' },
        { status: 400 },
      )
    }

    const auth = await requireAuthenticatedUser(actorId)
    if (auth.response) return auth.response

    const safetyStatus = await getUserSafetyStatus(actorId)
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

    const result = await updateServiceBookingStatus({
      bookingId: String(body?.bookingId || ''),
      nextStatus: String(body?.status || ''),
      actorId,
      actorType,
      note: body?.note,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Service bookings status PATCH API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
