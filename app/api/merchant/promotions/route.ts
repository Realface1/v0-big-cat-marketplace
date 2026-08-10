import { NextRequest, NextResponse } from 'next/server'
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  getMerchantPromotions,
  PromotionInput,
} from '@/lib/promotion-actions'
import { notifyFollowersAboutMerchantUpdate } from '@/lib/merchant-follow-actions'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { success, error, data } = await getMerchantPromotions(userId)
    if (!success) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch promotions' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const input: PromotionInput = await request.json()

    if (!input.name || !input.type || !input.discount_value) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      )
    }

    const { success, error, data } = await createPromotion(userId, input)
    if (!success) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    await notifyFollowersAboutMerchantUpdate({
      merchantId: userId,
      updateType: 'promotion',
      itemName: String(data?.name || input?.name || 'New promotion'),
      itemId: String(data?.id || ''),
    }).catch(() => null)

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create promotion' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { promotionId, updates }: { promotionId: string; updates: Partial<PromotionInput> } =
      await request.json()

    if (!promotionId) {
      return NextResponse.json(
        { success: false, error: 'Promotion ID required' },
        { status: 400 },
      )
    }

    const { success, error, data } = await updatePromotion(userId, promotionId, updates)
    if (!success) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update promotion' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { promotionId } = await request.json()
    if (!promotionId) {
      return NextResponse.json(
        { success: false, error: 'Promotion ID required' },
        { status: 400 },
      )
    }

    const { success, error } = await deletePromotion(userId, promotionId)
    if (!success) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete promotion' },
      { status: 500 },
    )
  }
}
