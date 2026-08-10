import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const buyerId = String(body?.buyerId || '').trim()
    const amount = Number(body?.amount || 0)
    const reason = String(body?.reason || 'Wallet top-up').trim()

    if (!buyerId) {
      return NextResponse.json({ success: false, error: 'buyerId is required' }, { status: 400 })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
    }

    if (amount > 1_000_000) {
      return NextResponse.json({ success: false, error: 'Maximum top-up is ₦1,000,000 per transaction' }, { status: 400 })
    }

    const { data, error } = await supabase.from('transactions').insert([{
      buyer_id: buyerId,
      type: 'wallet_credit',
      amount,
      reason,
      status: 'completed',
    }]).select('id, amount, created_at').single()

    if (error) {
      console.error('[buyer/wallet/fund] Insert error:', error)
      return NextResponse.json({ success: false, error: 'Failed to fund wallet' }, { status: 500 })
    }

    return NextResponse.json({ success: true, transaction: data, amount })
  } catch (err: any) {
    console.error('[buyer/wallet/fund] Error:', err)
    return NextResponse.json({ success: false, error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
