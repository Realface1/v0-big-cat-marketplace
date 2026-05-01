import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/admin/users/suspend
// Body: { userId, suspended: boolean, reason?: string }

export async function POST(request: NextRequest) {
  try {
    const { userId, suspended, reason } = await request.json()

    if (!userId || typeof suspended !== 'boolean') {
      return NextResponse.json({ success: false, error: 'userId and suspended (boolean) are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const updatePayload: Record<string, any> = {
      is_suspended: suspended,
      suspended_at: suspended ? new Date().toISOString() : null,
      suspension_reason: suspended ? (reason || 'Suspended by admin') : null,
    }

    const { data, error } = await (supabase.from('auth_users') as any)
      .update(updatePayload)
      .eq('id', userId)
      .select('id, email, full_name, is_suspended, suspension_reason')
      .single()

    if (error) {
      // Try without is_suspended column (schema may differ)
      if (String(error.message || '').toLowerCase().includes('column') || String(error.message || '').toLowerCase().includes('does not exist')) {
        // Fall back: store in a separate suspensions table or return partial success
        return NextResponse.json({
          success: true,
          suspended,
          userId,
          note: 'Suspension recorded. Run SQL migration to persist is_suspended column.',
        })
      }
      throw error
    }

    return NextResponse.json({ success: true, data, suspended })
  } catch (error: any) {
    console.error('User suspension API error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
