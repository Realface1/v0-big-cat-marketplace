import { NextResponse } from 'next/server'
import { getTransactions, getTransactionStats } from '@/lib/admin-actions'

export async function GET() {
  try {
    const [txnResult, statsResult] = await Promise.all([
      getTransactions(),
      getTransactionStats(),
    ])

    const transactions = txnResult.success ? txnResult.data.map((t: any) => ({
      id: t.id,
      user: t.buyer_id || 'Unknown',
      amount: t.grand_total || t.total_amount || 0,
      status:
        String(t.status || '').toLowerCase() === 'delivered'
          ? 'completed'
          : String(t.payment_status || '').toLowerCase() === 'completed'
            ? 'paid'
            : t.status || t.payment_status || 'pending',
      date: new Date(t.created_at).toLocaleDateString(),
      type: 'payment',
    })) : []

    const raw = statsResult.success ? statsResult.data : null

    const stats = {
      totalTransactions: transactions.length,
      totalRevenue: raw?.totalRevenue || 0,
      productEscrow: raw?.productEscrow || 0,
      deliveryEscrow: raw?.deliveryEscrow || 0,
      totalEscrow: raw?.totalEscrow || 0,
      completedPayments: raw?.successful || 0,
      pendingPayments: raw?.pending || 0,
      pendingOrders: raw?.pendingOrders || 0,
      completedOrders: raw?.completedOrders || 0,
      disbursedAmount: raw?.disbursedAmount || 0,
    }

    return NextResponse.json({ success: true, transactions, stats })
  } catch (error) {
    console.error('Admin transactions API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
