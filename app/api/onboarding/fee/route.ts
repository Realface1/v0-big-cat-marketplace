import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const ONBOARDING_FEE_NAIRA = 2000

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/onboarding/fee
// Called when merchant attests they've transferred the ₦2,000 onboarding fee.
// Creates an onboarding_escrow record (held) and marks the request as fee paid.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const onboarding_request_id = String(body.onboarding_request_id || '').trim()

    if (!onboarding_request_id) {
      return NextResponse.json({ success: false, error: 'onboarding_request_id is required' }, { status: 400 })
    }

    // Fetch the onboarding request to get the assigned agent
    const { data: req, error: reqError } = await supabase
      .from('merchant_onboarding_requests')
      .select('id, onboarding_fee_paid, assigned_agent_id')
      .eq('id', onboarding_request_id)
      .maybeSingle()

    if (reqError) throw reqError
    if (!req) {
      return NextResponse.json({ success: false, error: 'Onboarding request not found' }, { status: 404 })
    }

    // Idempotent — if already paid, return existing escrow
    if (req.onboarding_fee_paid) {
      const { data: existing } = await supabase
        .from('onboarding_escrow')
        .select('*')
        .eq('onboarding_request_id', onboarding_request_id)
        .maybeSingle()
      return NextResponse.json({ success: true, escrow: existing, already_paid: true })
    }

    const payment_reference = `BCO-${onboarding_request_id.slice(0, 8).toUpperCase()}-${Date.now()}`

    // Create escrow record
    const { data: escrow, error: escrowError } = await supabase
      .from('onboarding_escrow')
      .insert({
        id: randomUUID(),
        onboarding_request_id,
        agent_id: req.assigned_agent_id || null,
        amount: ONBOARDING_FEE_NAIRA,
        status: 'held',
        payment_reference,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (escrowError) throw escrowError

    // Mark request as fee paid
    await supabase
      .from('merchant_onboarding_requests')
      .update({
        onboarding_fee_paid: true,
        onboarding_fee_reference: payment_reference,
        onboarding_fee_escrowed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', onboarding_request_id)

    return NextResponse.json({ success: true, escrow, payment_reference })
  } catch (error: any) {
    console.error('[v0] Onboarding fee error:', error)
    const message = String(error?.message || 'Unknown error')
    if (message.includes('invalid input syntax for type uuid')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database schema mismatch on onboarding_request_id. Run scripts/028-fix-onboarding-request-id-types.sql in Supabase SQL Editor.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
