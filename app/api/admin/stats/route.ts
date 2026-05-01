import { NextResponse } from 'next/server'
import { getPlatformStats, getLogisticsStats, getMerchantStats, getTransactionStats } from '@/lib/admin-actions'

export async function GET() {
  try {
    const [platformResult, logisticsResult, merchantResult, transactionResult] = await Promise.all([
      getPlatformStats(),
      getLogisticsStats(),
      getMerchantStats(),
      getTransactionStats(),
    ])

    return NextResponse.json({
      success: true,
      platform: platformResult.success ? platformResult.stats : { totalUsers: 0, totalMerchants: 0, totalRevenue: 0, activeNow: 0 },
      logistics: logisticsResult.success ? logisticsResult.data : { total: 0, pending: 0, completed: 0 },
      merchants: merchantResult.success ? merchantResult.data : { total: 0, approved: 0, pending: 0 },
      transactions: transactionResult.success ? transactionResult.data : { totalTransactions: 0, totalRevenue: 0, productEscrow: 0, deliveryEscrow: 0, totalEscrow: 0, completedPayments: 0, pendingPayments: 0, pendingOrders: 0, completedOrders: 0, disbursedAmount: 0 },
    })
  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
