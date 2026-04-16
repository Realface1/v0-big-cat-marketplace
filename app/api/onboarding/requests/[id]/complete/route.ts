import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requestIdFromPath = request.nextUrl.pathname.split('/').filter(Boolean).at(-2) || ''
    const requestId = String(params?.id || requestIdFromPath || '').trim()
    const body = await request.json()
    const agent_id = String(body.agent_id || body.agentId || body.assigned_agent_id || '').trim()

    if (!requestId || !agent_id) {
      return NextResponse.json({ success: false, error: 'Request id and agent id are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: existing, error: findError } = await supabase
      .from('merchant_onboarding_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    if (findError) throw findError
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Onboarding request not found' }, { status: 404 })
    }

    if (existing.assigned_agent_id !== agent_id) {
      return NextResponse.json({ success: false, error: 'Only assigned agent can complete this request' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('merchant_onboarding_requests')
      .update({
        onboarding_status: 'completed',
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', requestId)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, request: data })
  } catch (error: any) {
    const msg = error?.message || 'Unknown error'
    if (msg.includes("Could not find the table 'public.merchant_onboarding_requests'")) {
      return NextResponse.json(
        {
          success: false,
          error: 'Onboarding table is missing. Run scripts/009-create-merchant-onboarding-table.sql in Supabase SQL Editor.',
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
