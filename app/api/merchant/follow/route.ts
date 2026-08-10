import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import { followMerchant, getMerchantFollowerSummary, unfollowMerchant } from '@/lib/merchant-follow-actions'

async function readFollowPayload(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  let body: any = null

  try {
    body = await request.json()
  } catch {
    body = null
  }

  const merchantId = String(body?.merchantId || searchParams.get('merchantId') || '').trim()
  const buyerId = String(body?.buyerId || searchParams.get('buyerId') || '').trim()

  return { merchantId, buyerId }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = String(searchParams.get('merchantId') || '').trim()
    const buyerId = String(searchParams.get('buyerId') || '').trim()

    if (!merchantId) {
      return NextResponse.json({ success: false, error: 'merchantId is required' }, { status: 400 })
    }

    const summary = await getMerchantFollowerSummary(merchantId, buyerId || undefined)
    return NextResponse.json({ success: true, data: summary })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load follow data' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { merchantId, buyerId } = await readFollowPayload(request)

    if (!merchantId || !buyerId) {
      return NextResponse.json({ success: false, error: 'merchantId and buyerId are required' }, { status: 400 })
    }

    const auth = await requireAuthenticatedUser(buyerId, request)
    if (auth.response) return auth.response

    const result = await followMerchant(buyerId, merchantId)
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    const summary = await getMerchantFollowerSummary(merchantId, buyerId)
    return NextResponse.json({ success: true, data: summary })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to follow merchant' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { merchantId, buyerId } = await readFollowPayload(request)

    if (!merchantId || !buyerId) {
      return NextResponse.json({ success: false, error: 'merchantId and buyerId are required' }, { status: 400 })
    }

    const auth = await requireAuthenticatedUser(buyerId, request)
    if (auth.response) return auth.response

    const result = await unfollowMerchant(buyerId, merchantId)
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    const summary = await getMerchantFollowerSummary(merchantId, buyerId)
    return NextResponse.json({ success: true, data: summary })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to unfollow merchant' },
      { status: 500 },
    )
  }
}
