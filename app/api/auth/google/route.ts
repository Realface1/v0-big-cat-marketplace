import { NextRequest, NextResponse } from 'next/server'
import { loginWithGoogle } from '@/lib/auth-actions'

export async function POST(request: NextRequest) {
  try {
    const { credential, role } = await request.json()

    if (!credential || !role) {
      return NextResponse.json(
        { success: false, error: 'Google credential and role are required' },
        { status: 400 }
      )
    }

    const tokenResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    )

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Invalid Google token' },
        { status: 401 }
      )
    }

    const tokenData = await tokenResponse.json()

    const configuredClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (configuredClientId && tokenData.aud !== configuredClientId) {
      return NextResponse.json(
        { success: false, error: 'Google client mismatch' },
        { status: 401 }
      )
    }

    if (!tokenData.email || !tokenData.sub) {
      return NextResponse.json(
        { success: false, error: 'Google account details not available' },
        { status: 400 }
      )
    }

    const result = await loginWithGoogle({
      email: tokenData.email,
      name: tokenData.name || tokenData.email.split('@')[0],
      role,
      googleId: tokenData.sub,
    })

    if (result.success) {
      return NextResponse.json(result)
    }

    return NextResponse.json(result, { status: 400 })
  } catch (error) {
    console.error('Google auth API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
