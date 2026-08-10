import { NextRequest, NextResponse } from 'next/server'
import { createMerchantWithdrawal } from '@/lib/merchant-wallet'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const merchantId = String(body.merchantId || body.merchant_id || '').trim()
  const amount = Number(body.amount || 0)
  const fee = Number(body.fee || 0)
  const netAmount = Number(body.netAmount || body.net_amount || 0)
  const bankDisplay = String(body.bankDisplay || body.bank_display || '').trim()

  if (!merchantId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ success: false, error: 'merchantId and valid amount are required' }, { status: 400 })
  }

  const auth = await requireAuthenticatedUser(merchantId, request)
  if (auth.response) return auth.response

  const result = await createMerchantWithdrawal({
    merchantId,
    amount,
    fee,
    netAmount,
    bankDisplay,
  })

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Withdrawal failed', balance: result.balance || 0 },
      { status: 400 },
    )
  }

  return NextResponse.json({
    success: true,
    balance: result.balance,
    transaction: result.transaction,
  })
}
