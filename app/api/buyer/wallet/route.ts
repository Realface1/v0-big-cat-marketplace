import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isMissingTableError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('does not exist')
    || message.includes('relation')
    || message.includes('schema cache')
    || message.includes('could not find')
}

export async function GET(request: NextRequest) {
  const userId = String(request.nextUrl.searchParams.get('userId') || '').trim()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const result = await (supabase.from('transactions') as any)
      .select('id, order_id, buyer_id, type, amount, reason, status, created_at')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (result.error) {
      if (isMissingTableError(result.error)) {
        return NextResponse.json({ success: true, balance: 0, transactions: [] })
      }
      throw result.error
    }

    const transactions = Array.isArray(result.data) ? result.data : []
    const creditTypes = new Set(['wallet_credit', 'refund', 'payment', 'escrow_release'])
    const debitTypes = new Set(['wallet_debit', 'withdrawal'])

    const balance = transactions.reduce((sum: number, tx: any) => {
      const type = String(tx?.type || '').toLowerCase().trim()
      const amount = Math.max(0, Number(tx?.amount || 0))
      if (!amount) return sum
      if (creditTypes.has(type)) return sum + amount
      if (debitTypes.has(type)) return sum - amount
      return sum
    }, 0)

    return NextResponse.json({ success: true, balance, transactions })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load buyer wallet', balance: 0, transactions: [] },
      { status: 500 },
    )
  }
}
