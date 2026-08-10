import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAgentTransactions(agentId: string) {
  const { data: transactions, error } = await supabase
    .from('agent_transactions')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return []
    }
    throw error
  }

  return transactions || []
}

async function getEscrowHeldAmount(agentId: string) {
  const { data, error } = await supabase
    .from('onboarding_escrow')
    .select('amount')
    .eq('agent_id', agentId)
    .eq('status', 'held')

  if (error) {
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      return 0
    }
    throw error
  }

  return (data || []).reduce((sum: number, row: any) => sum + Number(row?.amount || 0), 0)
}

function computeWalletSummary(transactions: any[]) {
  const totalEarned = (transactions || [])
    .filter((t: any) => t.status === 'completed' && t.type !== 'withdrawal')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

  const totalWithdrawn = (transactions || [])
    .filter((t: any) => t.status === 'completed' && t.type === 'withdrawal')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

  const pendingWithdrawals = (transactions || [])
    .filter((t: any) => t.status === 'pending' && t.type === 'withdrawal')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

  const availableToWithdraw = Math.max(0, totalEarned - totalWithdrawn - pendingWithdrawals)

  return {
    totalEarned,
    totalWithdrawn,
    pendingWithdrawals,
    availableToWithdraw,
  }
}

// GET /api/agent/wallet?agentId=xxx
export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get('agentId')?.trim()

    if (!agentId) {
      return NextResponse.json({ success: false, error: 'agentId is required' }, { status: 400 })
    }

    const transactions = await getAgentTransactions(agentId)
    const escrowHeld = await getEscrowHeldAmount(agentId)
    const summary = computeWalletSummary(transactions)

    return NextResponse.json({
      success: true,
      balance: summary.availableToWithdraw,
      available_to_withdraw: summary.availableToWithdraw,
      total_earned: summary.totalEarned,
      total_withdrawn: summary.totalWithdrawn,
      pending_withdrawals: summary.pendingWithdrawals,
      escrow_held: escrowHeld,
      transactions,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

// POST /api/agent/wallet
// Creates a withdrawal request and reserves funds immediately.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const agentId = String(body.agentId || '').trim()
    const amount = Number(body.amount || 0)
    const bankName = String(body.bankName || '').trim()
    const accountNumber = String(body.accountNumber || '').trim()
    const accountName = String(body.accountName || '').trim()

    if (!agentId || !amount || !bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { success: false, error: 'agentId, amount, bankName, accountNumber and accountName are required' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(amount) || amount < 1000) {
      return NextResponse.json({ success: false, error: 'Minimum withdrawal is ₦1,000' }, { status: 400 })
    }

    const transactions = await getAgentTransactions(agentId)
    const summary = computeWalletSummary(transactions)

    if (amount > summary.availableToWithdraw) {
      return NextResponse.json(
        { success: false, error: `Insufficient wallet balance. Available: ₦${summary.availableToWithdraw.toLocaleString()}` },
        { status: 400 }
      )
    }

    const description = `Withdrawal request to ${bankName} (${accountNumber}) - ${accountName}`

    const { data, error } = await supabase
      .from('agent_transactions')
      .insert({
        id: randomUUID(),
        agent_id: agentId,
        type: 'withdrawal',
        amount,
        status: 'pending',
        description,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, withdrawal: data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
