import { NextRequest, NextResponse } from 'next/server'
import { sendMessage } from '@/lib/message-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { containsBlockedContactRequest } from '@/lib/trust-safety'
import { getUserSafetyStatus, recordContactSafetyViolation } from '@/lib/server-trust-safety'

export async function POST(request: NextRequest) {
  try {
    const { conversationId, senderId, content } = await request.json()
    const trimmedContent = typeof content === 'string' ? content.trim() : ''

    if (!conversationId || !senderId || !trimmedContent) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID, sender ID, and content are required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(senderId, request)
    if (auth.response) return auth.response

    const safetyStatus = await getUserSafetyStatus(senderId)
    if (safetyStatus.suspended) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your account is temporarily suspended for violating platform messaging policies.',
          code: 'POLICY_USER_SUSPENDED',
          strikes: safetyStatus.strikes,
          suspended: true,
          suspendedUntil: safetyStatus.suspendedUntil,
          remainingMs: safetyStatus.remainingMs,
        },
        { status: 403 }
      )
    }

    if (containsBlockedContactRequest(trimmedContent)) {
      const updatedStatus = await recordContactSafetyViolation(senderId)

      return NextResponse.json(
        {
          success: false,
          error: updatedStatus.suspended
            ? 'Your account is temporarily suspended for violating platform messaging policies.'
            : 'Contact sharing requests are not allowed. Please keep all communication within the platform.',
          code: updatedStatus.suspended ? 'POLICY_USER_SUSPENDED' : 'POLICY_CONTACT_REQUEST_BLOCKED',
          strikes: updatedStatus.strikes,
          suspended: updatedStatus.suspended,
          suspendedUntil: updatedStatus.suspendedUntil,
          remainingMs: updatedStatus.remainingMs,
        },
        { status: updatedStatus.suspended ? 403 : 400 }
      )
    }

    const result = await sendMessage(conversationId, senderId, trimmedContent)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Send message API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
