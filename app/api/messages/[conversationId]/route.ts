import { NextRequest, NextResponse } from 'next/server'
import { getConversationMessages, markConversationAsRead } from '@/lib/message-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser()
    if (auth.response) return auth.response

    await markConversationAsRead(conversationId, auth.user.id)

    const result = await getConversationMessages(conversationId, auth.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get conversation messages API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
