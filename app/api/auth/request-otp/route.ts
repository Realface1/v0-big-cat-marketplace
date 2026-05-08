import { NextRequest, NextResponse } from 'next/server'
import {
  SIGNUP_OTP_COOKIE,
  SIGNUP_OTP_TTL_SECONDS,
  encodePendingSignupOtp,
  generateOtp,
  hashOtp,
  sendSignupOtpEmail,
} from '@/lib/auth-otp'
import { checkOtpRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const { email, role, phone, deliveryMethod } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedRole = role === 'merchant' ? 'merchant' : 'buyer'
    const normalizedDeliveryMethod = deliveryMethod === 'whatsapp' ? 'whatsapp' : 'email'
    const normalizedPhone = String(phone || '').trim()
    const emailDomain = normalizedEmail.includes('@') ? normalizedEmail.split('@')[1] : 'unknown'

    if (!normalizedEmail) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    if (normalizedDeliveryMethod === 'whatsapp' && !normalizedPhone) {
      return NextResponse.json({ success: false, error: 'Phone number is required for WhatsApp verification.' }, { status: 400 })
    }

    // Rate limit: 5 OTPs per email + 10 per IP per 10 minutes
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const rateLimit = await checkOtpRateLimit(normalizedEmail, clientIp)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimit.reason || 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds
            ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
            : undefined,
        }
      )
    }

    const otp = generateOtp()
    let effectiveDeliveryMethod = normalizedDeliveryMethod

    const otpResult = await sendSignupOtpEmail(
      normalizedEmail,
      otp,
      normalizedRole,
      normalizedPhone,
      normalizedDeliveryMethod
    )

    if (normalizedDeliveryMethod === 'whatsapp' && !otpResult.success) {
      const emailFallbackResult = await sendSignupOtpEmail(
        normalizedEmail,
        otp,
        normalizedRole,
        normalizedPhone,
        'email'
      )

      if (emailFallbackResult.success) {
        effectiveDeliveryMethod = 'email'
      } else {
        console.warn('[otp_delivery_failure]', {
          role: normalizedRole,
          requestedDeliveryMethod: normalizedDeliveryMethod,
          effectiveDeliveryMethod: normalizedDeliveryMethod,
          fallbackAttempted: true,
          fallbackSucceeded: false,
          hasPhone: Boolean(normalizedPhone),
          emailDomain,
          error: otpResult.error || 'Failed to send verification code via WhatsApp',
        })

        return NextResponse.json(
          {
            success: false,
            error: otpResult.error || 'Failed to send verification code via WhatsApp',
          },
          { status: 500 }
        )
      }
    }

    if (!otpResult.success && effectiveDeliveryMethod === normalizedDeliveryMethod) {
      const failureError =
        otpResult.error ||
        (normalizedDeliveryMethod === 'whatsapp'
          ? 'Failed to send verification code via WhatsApp'
          : 'Failed to send verification email')

      console.warn('[otp_delivery_failure]', {
        role: normalizedRole,
        requestedDeliveryMethod: normalizedDeliveryMethod,
        effectiveDeliveryMethod,
        fallbackAttempted: false,
        fallbackSucceeded: false,
        hasPhone: Boolean(normalizedPhone),
        emailDomain,
        error: failureError,
      })

      return NextResponse.json(
        {
          success: false,
          error: failureError,
        },
        { status: 500 }
      )
    }

    const fallbackUsed = effectiveDeliveryMethod !== normalizedDeliveryMethod

    console.info('[otp_delivery_success]', {
      role: normalizedRole,
      requestedDeliveryMethod: normalizedDeliveryMethod,
      effectiveDeliveryMethod,
      fallbackUsed,
      hasPhone: Boolean(normalizedPhone),
      emailDomain,
    })

    const response = NextResponse.json({
      success: true,
      data: {
        expiresIn: SIGNUP_OTP_TTL_SECONDS,
        deliveryMethod: effectiveDeliveryMethod,
        warning: fallbackUsed
          ? 'WhatsApp delivery is unavailable for this recipient. OTP was sent via email instead.'
          : undefined,
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