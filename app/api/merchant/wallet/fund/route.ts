import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { createMerchantWalletFunding } from '@/lib/merchant-wallet'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const authUserId = String(body.authUserId || body.userId || '').trim()
  const merchantId = String(body.merchantId || body.merchant_id || authUserId || '').trim()
  const amount = Number(body.amount || 0)
  const reason = String(body.reason || '').trim()

  if (!authUserId) {
    return NextResponse.json({ success: false, error: 'authUserId is required' }, { status: 400 })
  }

  if (!merchantId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ success: false, error: 'merchantId and valid amount are required' }, { status: 400 })
  }

  const auth = await requireAuthenticatedUser(authUserId, request)
  if (auth.response) return auth.response

  const result = await createMerchantWalletFunding({
    merchantId,
    amount,
    reason: reason || `Manual wallet funding for ${merchantId}`,
  })

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Wallet funding failed', balance: result.balance || 0 },
      { status: 400 },
    )
  }

  return NextResponse.json({
    success: true,
    balance: result.balance,
    transaction: result.transaction,
  })
}
