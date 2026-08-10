import { NextRequest, NextResponse } from 'next/server'
import { getMerchantPromotionAnalyticsOverview } from '@/lib/promotion-actions'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { success, error, data } = await getMerchantPromotionAnalyticsOverview(userId)
    if (!success) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load promotion analytics' },
      { status: 500 },
    )
  }
}
