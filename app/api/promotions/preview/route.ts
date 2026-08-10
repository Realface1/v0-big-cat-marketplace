import { NextRequest, NextResponse } from 'next/server'
import { getBestPromotionDiscountForItems } from '@/lib/promotion-actions'

type PreviewItem = {
  merchantId: string
  productId: string
  quantity: number
  unitPrice: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items = Array.isArray(body?.items) ? body.items : []

    if (!items.length) {
      return NextResponse.json({ success: true, data: { totalDiscount: 0, promotions: [] } })
    }

    const normalizedItems: PreviewItem[] = items
      .map((item: any) => ({
        merchantId: String(item?.merchantId || '').trim(),
        productId: String(item?.productId || '').trim(),
        quantity: Math.max(0, Number(item?.quantity || 0)),
        unitPrice: Math.max(0, Number(item?.unitPrice || 0)),
      }))
      .filter((item: PreviewItem) => item.merchantId && item.productId && item.quantity > 0)

    const grouped = normalizedItems.reduce<Record<string, PreviewItem[]>>((acc, item) => {
      if (!acc[item.merchantId]) acc[item.merchantId] = []
      acc[item.merchantId].push(item)
      return acc
    }, {})

    let totalDiscount = 0
    const promotions: Array<{ merchantId: string; promotionId: string; promotionName: string; discountAmount: number }> = []

    for (const [merchantId, merchantItems] of Object.entries(grouped)) {
      const applied = await getBestPromotionDiscountForItems(
        merchantId,
        merchantItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      )

      if (applied && applied.discountAmount > 0) {
        totalDiscount += Number(applied.discountAmount || 0)
        promotions.push({
          merchantId,
          promotionId: applied.promotionId,
          promotionName: applied.promotionName,
          discountAmount: Number(applied.discountAmount || 0),
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        promotions,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to preview promotions' },
      { status: 500 },
    )
  }
}
