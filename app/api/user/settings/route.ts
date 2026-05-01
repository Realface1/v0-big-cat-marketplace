import { NextRequest, NextResponse } from 'next/server'
import {
  changePassword,
  updateEmail,
  updateNotificationPreferences,
  deleteAccount,
} from '@/lib/user-actions'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId } = body

    if (!action || !userId) {
      return NextResponse.json(
        { success: false, error: 'Action and user ID are required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(userId, request)
    if (auth.response) return auth.response

    switch (action) {
      case 'change-password': {
        const { currentPassword, newPassword } = body
        const result = await changePassword(userId, currentPassword, newPassword)
        return NextResponse.json(result)
      }
      case 'update-email': {
        const { newEmail } = body
        const result = await updateEmail(userId, newEmail)
        return NextResponse.json(result)
      }
      case 'update-notifications': {
        const { preferences } = body
        const result = await updateNotificationPreferences(userId, preferences)
        return NextResponse.json(result)
      }
      case 'delete-account': {
        const result = await deleteAccount(userId)
        return NextResponse.json(result)
      }
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('User settings API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
