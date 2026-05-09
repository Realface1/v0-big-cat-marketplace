import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/agent/wallet?agentId=xxx
export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get('agentId')?.trim()

    if (!agentId) {
      return NextResponse.json({ success: false, error: 'agentId is required' }, { status: 400 })
    }

    const { data: transactions, error } = await supabase
      .from('agent_transactions')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      // Table might not exist yet — return empty wallet gracefully
      if (error.message?.includes("does not exist") || error.message?.includes("relation")) {
        return NextResponse.json({ success: true, balance: 0, transactions: [] })
      }
      throw error
    }

    const balance = (transactions || [])
      .filter((t: any) => t.status === 'completed' && t.type !== 'withdrawal')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

    const withdrawn = (transactions || [])
      .filter((t: any) => t.status === 'completed' && t.type === 'withdrawal')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)

    return NextResponse.json({
      success: true,
      balance: Math.max(0, balance - withdrawn),
      total_earned: balance,
      total_withdrawn: withdrawn,
      transactions: transactions || [],
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
