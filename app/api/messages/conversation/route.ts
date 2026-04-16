import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateConversation, getUserConversations } from '@/lib/message-actions'
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

    const result = await getUserConversations(userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get user conversations API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { buyerId, merchantId, productId } = await request.json()

    if (!buyerId || !merchantId) {
      return NextResponse.json(
        { success: false, error: 'Buyer ID and Merchant ID are required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser()
    if (auth.response) return auth.response

    if (auth.user.id !== buyerId && auth.user.id !== merchantId) {
      return NextResponse.json(
        { success: false, error: 'You are not allowed to create this conversation' },
        { status: 403 }
      )
    }

    const result = await getOrCreateConversation(buyerId, merchantId, productId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get or create conversation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}