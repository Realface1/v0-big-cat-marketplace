import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/revenue-report?format=csv|json
// Returns platform revenue breakdown for download

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'csv'
  const period = searchParams.get('period') || '30d'  // 30d, 90d, all

  try {
    const supabase = await createClient()

    const periodDate = new Date()
    if (period === '30d') periodDate.setDate(periodDate.getDate() - 30)
    else if (period === '90d') periodDate.setDate(periodDate.getDate() - 90)
    else periodDate.setFullYear(2000) // "all" - go back far

    const selectAttempts = [
      'id, created_at, status, grand_total, product_total, delivery_fee, merchant_id, buyer_id, payment_status, escrow_status',
      'id, created_at, status, grand_total, product_total, delivery_fee, merchant_id, buyer_id, escrow_status',
      'id, created_at, status, grand_total, product_total, delivery_fee, merchant_id, buyer_id',
      'id, created_at, status, total_amount, delivery_fee, merchant_id, buyer_id',
      'id, created_at, status, grand_total, merchant_id, buyer_id',
    ]

    let orders: any[] = []
    let lastError: any = null

    for (const selectClause of selectAttempts) {
      const result = await (supabase.from('orders') as any)
        .select(selectClause)
        .gte('created_at', periodDate.toISOString())
        .order('created_at', { ascending: false })

      if (!result.error) {
        orders = result.data || []
        lastError = null
        break
      }

      lastError = result.error
      const message = String(result.error?.message || '').toLowerCase()
      if (!message.includes('column') && !message.includes('schema cache') && !message.includes('does not exist')) {
        throw result.error
      }
    }

    if (lastError && orders.length === 0) {
      throw lastError
    }

    const rows = (orders || []) as any[]

    const totalGMV = rows.reduce((s: number, o: any) => s + Number(o.grand_total || o.total_amount || 0), 0)
    const totalDeliveryFees = rows.reduce((s: number, o: any) => s + Number(o.delivery_fee || 0), 0)
    const totalProductRevenue = rows.reduce((s: number, o: any) => s + Number(o.product_total || o.grand_total || o.total_amount || 0), 0)
    const deliveredOrders = rows.filter((o: any) => o.status === 'delivered' || o.escrow_status === 'released')
    const deliveredGMV = deliveredOrders.reduce((s: number, o: any) => s + Number(o.grand_total || o.total_amount || 0), 0)
    const pendingOrders = rows.filter((o: any) => ['pending', 'paid', 'processing', 'shipped'].includes(o.status))
    const pendingGMV = pendingOrders.reduce((s: number, o: any) => s + Number(o.grand_total || o.total_amount || 0), 0)

    // Platform fee estimate: 5% of product revenue
    const platformFeeRate = 0.05
    const estimatedPlatformFee = totalProductRevenue * platformFeeRate

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        period,
        generatedAt: new Date().toISOString(),
        summary: {
          totalOrders: rows.length,
          deliveredOrders: deliveredOrders.length,
          pendingOrders: pendingOrders.length,
          totalGMV,
          deliveredGMV,
          pendingGMV,
          totalDeliveryFees,
          estimatedPlatformFee,
        },
        orders: rows.map((o: any) => ({
          orderId: o.id,
          date: o.created_at,
          status: o.status,
          grandTotal: o.grand_total,
          totalAmount: o.total_amount,
          productTotal: o.product_total,
          deliveryFee: o.delivery_fee,
          merchantId: o.merchant_id,
          buyerId: o.buyer_id,
        })),
      })
    }

    // CSV format
    const csvHeader = 'Order ID,Date,Status,Grand Total (₦),Product Total (₦),Delivery Fee (₦),Platform Fee Est. (₦),Merchant ID,Buyer ID'
    const csvRows = rows.map((o: any) => {
      const platformFee = (Number(o.product_total || 0) * platformFeeRate).toFixed(2)
      return [
        o.id,
        new Date(o.created_at).toLocaleDateString('en-NG'),
        o.status,
        Number(o.grand_total || o.total_amount || 0).toFixed(2),
        Number(o.product_total || o.grand_total || o.total_amount || 0).toFixed(2),
        Number(o.delivery_fee || 0).toFixed(2),
        (Number(o.product_total || o.grand_total || o.total_amount || 0) * platformFeeRate).toFixed(2),
        o.merchant_id || '',
        o.buyer_id || '',
      ].join(',')
    })

    const summaryRows = [
      '',
      'SUMMARY',
      `Report Period,${period}`,
      `Generated At,${new Date().toISOString()}`,
      `Total Orders,${rows.length}`,
      `Delivered Orders,${deliveredOrders.length}`,
      `Pending Orders,${pendingOrders.length}`,
      `Total GMV (₦),${totalGMV.toFixed(2)}`,
      `Delivered GMV (₦),${deliveredGMV.toFixed(2)}`,
      `Pending GMV (₦),${pendingGMV.toFixed(2)}`,
      `Total Delivery Fees (₦),${totalDeliveryFees.toFixed(2)}`,
      `Estimated Platform Fee (5%) (₦),${estimatedPlatformFee.toFixed(2)}`,
    ]

    const csv = [csvHeader, ...csvRows, ...summaryRows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="bigcat-revenue-report-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Revenue report API error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
