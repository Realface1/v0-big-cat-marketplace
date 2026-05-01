import { NextRequest, NextResponse } from 'next/server'
import {
  SIGNUP_OTP_COOKIE,
  SIGNUP_OTP_TTL_SECONDS,
  encodePendingSignupOtp,
  generateOtp,
  hashOtp,
  sendSignupOtpEmail,
} from '@/lib/auth-otp'

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedRole = role === 'merchant' ? 'merchant' : 'buyer'

    if (!normalizedEmail) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const otp = generateOtp()
    const emailResult = await sendSignupOtpEmail(normalizedEmail, otp, normalizedRole)

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: emailResult.error || 'Failed to send verification email' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      success: true,
      data: {
        expiresIn: SIGNUP_OTP_TTL_SECONDS,
      },
    })

    response.cookies.set(SIGNUP_OTP_COOKIE, encodePendingSignupOtp({
      email: normalizedEmail,
      role: normalizedRole,
      otpHash: hashOtp(normalizedEmail, normalizedRole, otp),
      expiresAt: Date.now() + SIGNUP_OTP_TTL_SECONDS * 1000,
    }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SIGNUP_OTP_TTL_SECONDS,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Request OTP API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}