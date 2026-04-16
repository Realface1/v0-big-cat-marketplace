import { NextRequest, NextResponse } from 'next/server'
import { signupEnhanced } from '@/lib/auth-actions'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, city, state, role, smedanId, cacId } = await request.json()
    const normalizedCity = typeof city === 'string' ? city.trim() : ''
    const normalizedState = typeof state === 'string' ? state.trim() : ''

    if (!email || !password || !name || !phone || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (!normalizedCity || !normalizedState) {
      return NextResponse.json(
        { success: false, error: 'State and city are required to create an account' },
        { status: 400 }
      )
    }

    if (role === 'merchant' && !cacId) {
      return NextResponse.json(
        { success: false, error: 'CAC ID is required for merchant accounts' },
        { status: 400 }
      )
    }

    const result = await signupEnhanced({
      email,
      password,
      name,
      phone,
      city: normalizedCity,
      state: normalizedState,
      role: role as 'buyer' | 'merchant',
      smedanId,
      cacId,
    })

    if (result.success) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}