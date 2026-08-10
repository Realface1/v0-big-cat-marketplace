import { NextRequest, NextResponse } from 'next/server'
import { signupEnhanced } from '@/lib/auth-actions'
import { dispatchNotification } from '@/lib/notifications'
import {
  SIGNUP_OTP_COOKIE,
  decodePendingSignupOtp,
  isOtpValid,
} from '@/lib/auth-otp'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      otp,
      email,
      password,
      name,
      phone,
      city,
      state,
      role,
      smedanId,
      cacId,
      merchantType,
    } = body || {}

    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedRole = role === 'merchant' ? 'merchant' : 'buyer'
    const pendingOtp = decodePendingSignupOtp(request.cookies.get(SIGNUP_OTP_COOKIE)?.value)

    if (!otp || String(otp).trim().length !== 6) {
      return NextResponse.json({ success: false, error: 'A valid 6-digit OTP is required' }, { status: 400 })
    }

    if (!normalizedEmail || !password || !name || !phone) {
      return NextResponse.json({ success: false, error: 'Missing signup details' }, { status: 400 })
    }

    if (!isOtpValid(pendingOtp, normalizedEmail, normalizedRole, String(otp).trim())) {
      return NextResponse.json({ success: false, error: 'Invalid or expired OTP. Please request a new code.' }, { status: 400 })
    }

    const result = await signupEnhanced({
      email: normalizedEmail,
      password,
      name,
      phone,
      city,
      state,
      role: normalizedRole,
      smedanId,
      cacId,
      merchantType,
    })

    const response = NextResponse.json(result, { status: result.success ? 200 : 400 })
    response.cookies.set(SIGNUP_OTP_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
    })

    if (result.success) {
      const createdUserId = String((result as any)?.data?.id || '')
      if (createdUserId) {
        try {
          await dispatchNotification({
            userId: createdUserId,
            type: 'system',
            title: normalizedRole === 'merchant' ? 'Welcome, merchant!' : 'Welcome to BigCat Marketplace!',
            message: normalizedRole === 'merchant'
              ? 'Your merchant account is ready. Complete setup and start receiving orders.'
              : 'Your buyer account is ready. Start exploring and placing orders.',
            eventKey: `signup:welcome:${createdUserId}`,
            emailSubject: normalizedRole === 'merchant' ? 'Welcome to BigCat Marketplace (Merchant)' : 'Welcome to BigCat Marketplace',
          })
        } catch (notifyError) {
          console.warn('Signup welcome notification failed:', notifyError)
        }
      }
    }

    return response
  } catch (error) {
    console.error('Verify OTP API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}