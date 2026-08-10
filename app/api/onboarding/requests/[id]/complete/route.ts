import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const ONBOARDING_FEE_NAIRA = 2000

async function releaseEscrowToAgent(requestId: string, agentId: string) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find held escrow for this request
  const { data: escrow } = await supabase
    .from('onboarding_escrow')
    .select('*')
    .eq('onboarding_request_id', requestId)
    .eq('status', 'held')
    .maybeSingle()

  if (!escrow) return // No escrow (merchant didn't pay yet) — skip silently

  // Release escrow
  await supabase
    .from('onboarding_escrow')
    .update({ status: 'released', agent_id: agentId, released_at: new Date().toISOString() })
    .eq('id', escrow.id)

  // Credit agent wallet
  await supabase
    .from('agent_transactions')
    .insert({
      id: randomUUID(),
      agent_id: agentId,
      onboarding_request_id: requestId,
      type: 'onboarding_fee',
      amount: ONBOARDING_FEE_NAIRA,
      status: 'completed',
      description: `Onboarding fee released for request ${requestId}`,
      created_at: new Date().toISOString(),
    })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  try {
    const requestIdFromPath = request.nextUrl.pathname.split('/').filter(Boolean).at(-2) || ''
    const requestId = String(resolvedParams?.id || requestIdFromPath || '').trim()
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

    // Release escrow to agent wallet (best-effort — don't fail the completion if escrow tables are missing)
    try {
      await releaseEscrowToAgent(requestId, agent_id)
    } catch (escrowErr) {
      console.warn('[v0] Escrow release failed (non-fatal):', escrowErr)
    }

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
