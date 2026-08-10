import { NextRequest, NextResponse } from 'next/server'
import { signupEnhanced } from '@/lib/auth-actions'
import { dispatchNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, city, state, role, smedanId, cacId, merchantType } = await request.json()
    const normalizedCity = typeof city === 'string' ? city.trim() : ''
    const normalizedState = typeof state === 'string' ? state.trim() : ''
    const normalizedMerchantType = merchantType === 'services' ? 'services' : 'products'

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

    if (role === 'merchant' && normalizedMerchantType !== 'services' && !cacId) {
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
      merchantType: normalizedMerchantType,
    })

    if (result.success) {
      const createdUserId = String((result as any)?.data?.id || '')
      if (createdUserId) {
        try {
          await dispatchNotification({
            userId: createdUserId,
            type: 'system',
            title: role === 'merchant' ? 'Welcome, merchant!' : 'Welcome to BigCat Marketplace!',
            message: role === 'merchant'
              ? 'Your merchant account is ready. Complete setup and start receiving orders.'
              : 'Your buyer account is ready. Start exploring and placing orders.',
            eventKey: `signup:welcome:${createdUserId}`,
            emailSubject: role === 'merchant' ? 'Welcome to BigCat Marketplace (Merchant)' : 'Welcome to BigCat Marketplace',
          })
        } catch (notifyError) {
          console.warn('Signup welcome notification failed:', notifyError)
        }
      }

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