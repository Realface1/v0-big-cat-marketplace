import { NextRequest, NextResponse } from 'next/server'
import { getMerchantGrowthHistory } from '@/lib/admin-actions'

export async function GET(request: NextRequest) {
  const result = await getMerchantGrowthHistory(75)

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error, data: [] }, { status: 500 })
  }

  const data = Array.isArray(result.data) ? result.data : []
  const format = String(request.nextUrl.searchParams.get('format') || '').toLowerCase()

  if (format === 'csv') {
    const header = ['Merchant Name', 'From Scale', 'To Scale', 'Total Sales', 'Transition Date']
    const rows = data.map((row: any) => {
      const merchantName = String(row?.merchant_name || 'Unknown merchant').replace(/"/g, '""')
      const previousScale = String(row?.previous_scale || '')
      const nextScale = String(row?.next_scale || '')
      const totalSales = Number(row?.total_sales || 0).toFixed(2)
      const transitionDate = row?.created_at ? new Date(row.created_at).toISOString() : ''
      return [merchantName, previousScale, nextScale, totalSales, transitionDate]
    })

    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value)}"`).join(','))
      .join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="smedan-growth-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const summary = data.reduce((acc: Record<string, number>, row: any) => {
    const transition = `${String(row.previous_scale || 'Nano')}→${String(row.next_scale || 'Nano')}`
    acc[transition] = (acc[transition] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({ success: true, data, summary })
}