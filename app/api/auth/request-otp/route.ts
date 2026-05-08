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
    const { email, role, phone, deliveryMethod } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedRole = role === 'merchant' ? 'merchant' : 'buyer'
    const normalizedDeliveryMethod = deliveryMethod === 'whatsapp' ? 'whatsapp' : 'email'
    const normalizedPhone = String(phone || '').trim()

    if (!normalizedEmail) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    if (normalizedDeliveryMethod === 'whatsapp' && !normalizedPhone) {
      return NextResponse.json({ success: false, error: 'Phone number is required for WhatsApp verification.' }, { status: 400 })
    }

    const otp = generateOtp()
    const otpResult = await sendSignupOtpEmail(
      normalizedEmail,
      otp,
      normalizedRole,
      normalizedPhone,
      normalizedDeliveryMethod
    )

    if (!otpResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            otpResult.error ||
            (normalizedDeliveryMethod === 'whatsapp'
              ? 'Failed to send verification code via WhatsApp'
              : 'Failed to send verification email'),
        },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      success: true,
      data: {
        expiresIn: SIGNUP_OTP_TTL_SECONDS,
        deliveryMethod: normalizedDeliveryMethod,
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