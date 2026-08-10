import { NextRequest, NextResponse } from 'next/server'
import { getMerchantWalletOverview, backfillMerchantWalletFromOrders, getMerchantWalletDiagnostics } from '@/lib/merchant-wallet'

export async function GET(request: NextRequest) {
  const merchantId = String(request.nextUrl.searchParams.get('merchantId') || '').trim()
  if (!merchantId) {
    return NextResponse.json({ success: false, error: 'merchantId is required' }, { status: 400 })
  }

  // Backfill any delivered orders that were never credited to the wallet ledger.
  // This is idempotent - orders already credited are skipped.
  await backfillMerchantWalletFromOrders(merchantId)

  const result = await getMerchantWalletOverview(merchantId, { limit: 100 })
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error || 'Failed to load wallet', balance: 0 }, { status: 400 })
  }

  const debug = String(request.nextUrl.searchParams.get('debug') || '').trim() === '1'
  const diagnostics = debug ? await getMerchantWalletDiagnostics(merchantId) : null

  return NextResponse.json({
    success: true,
    balance: result.balance,
    withdrawals: result.withdrawalHistory,
    transactions: result.transactions,
    diagnostics,
  })
}
