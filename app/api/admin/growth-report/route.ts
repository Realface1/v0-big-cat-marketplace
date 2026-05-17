import { NextResponse } from 'next/server'
import { getMerchantGrowthHistory } from '@/lib/admin-actions'

export async function GET() {
  const result = await getMerchantGrowthHistory(75)

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error, data: [] }, { status: 500 })
  }

  const data = Array.isArray(result.data) ? result.data : []
  const summary = data.reduce((acc: Record<string, number>, row: any) => {
    const transition = `${String(row.previous_scale || 'Nano')}→${String(row.next_scale || 'Nano')}`
    acc[transition] = (acc[transition] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({ success: true, data, summary })
}