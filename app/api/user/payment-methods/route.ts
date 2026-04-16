import { NextRequest, NextResponse } from 'next/server'
import {
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from '@/lib/user-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(userId)
    if (auth.response) return auth.response

    const result = await getPaymentMethods(userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get payment methods API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, method } = await request.json()

    if (!userId || !method) {
      return NextResponse.json(
        { success: false, error: 'User ID and payment method are required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(userId)
    if (auth.response) return auth.response

    const result = await addPaymentMethod(userId, method)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Add payment method API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, methodId } = await request.json()

    if (!userId || !methodId) {
      return NextResponse.json(
        { success: false, error: 'User ID and method ID are required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(userId)
    if (auth.response) return auth.response

    const result = await setDefaultPaymentMethod(userId, methodId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Set default payment method API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { methodId } = await request.json()

    if (!methodId) {
      return NextResponse.json(
        { success: false, error: 'Method ID is required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser()
    if (auth.response) return auth.response

    const result = await removePaymentMethod(auth.user.id, methodId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Remove payment method API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
