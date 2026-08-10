import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'
import {
  cancelServiceBill,
  createServiceBill,
  getBuyerServiceBills,
  getMerchantServiceBills,
  payServiceBill,
  sendServiceBill,
  updateServiceBill,
} from '@/lib/service-bill-actions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')
    const buyerId = searchParams.get('buyerId')

    if (!merchantId && !buyerId) {
      return NextResponse.json({ success: false, error: 'merchantId or buyerId is required' }, { status: 400 })
    }

    if (merchantId) {
      const auth = await requireAuthenticatedUser(merchantId, request)
      if (auth.response) return auth.response
      return NextResponse.json(await getMerchantServiceBills(merchantId))
    }

    const auth = await requireAuthenticatedUser(buyerId!, request)
    if (auth.response) return auth.response
    return NextResponse.json(await getBuyerServiceBills(buyerId!))
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const merchantId = String(body?.merchantId || '').trim()
    if (!merchantId) {
      return NextResponse.json({ success: false, error: 'merchantId is required' }, { status: 400 })
    }

    const auth = await requireAuthenticatedUser(merchantId, request)
    if (auth.response) return auth.response

    const result = await createServiceBill(merchantId, {
      buyerId: String(body?.buyerId || '').trim(),
      serviceListingId: body?.serviceListingId,
      scopeSummary: body?.scopeSummary,
      timeline: body?.timeline,
      lineItems: Array.isArray(body?.lineItems) ? body.lineItems : [],
      discountAmount: Number(body?.discountAmount || 0),
      notes: body?.notes,
      validUntil: body?.validUntil,
    })

    return NextResponse.json(result, { status: result.success ? 201 : 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const action = String(body?.action || '').trim()
    const billId = String(body?.billId || '').trim()

    if (!billId) {
      return NextResponse.json({ success: false, error: 'billId is required' }, { status: 400 })
    }

    // Merchant: send bill
    if (action === 'send') {
      const merchantId = String(body?.merchantId || '').trim()
      const auth = await requireAuthenticatedUser(merchantId, request)
      if (auth.response) return auth.response
      return NextResponse.json(await sendServiceBill(merchantId, billId))
    }

    // Buyer: pay bill
    if (action === 'pay') {
      const buyerId = String(body?.buyerId || '').trim()
      const auth = await requireAuthenticatedUser(buyerId, request)
      if (auth.response) return auth.response
      return NextResponse.json(await payServiceBill(buyerId, billId, {
        paymentMethod: body?.paymentMethod,
        paymentAddress: body?.paymentAddress,
      }))
    }

    // Merchant or buyer: cancel bill
    if (action === 'cancel') {
      const actorId = String(body?.actorId || '').trim()
      const actorType = body?.actorType === 'buyer' ? 'buyer' : 'merchant'
      const auth = await requireAuthenticatedUser(actorId, request)
      if (auth.response) return auth.response
      return NextResponse.json(await cancelServiceBill(actorId, billId, actorType))
    }

    // Merchant: update draft
    if (action === 'update') {
      const merchantId = String(body?.merchantId || '').trim()
      const auth = await requireAuthenticatedUser(merchantId, request)
      if (auth.response) return auth.response
      return NextResponse.json(await updateServiceBill(merchantId, billId, {
        scopeSummary: body?.scopeSummary,
        timeline: body?.timeline,
        lineItems: body?.lineItems,
        discountAmount: body?.discountAmount,
        notes: body?.notes,
        validUntil: body?.validUntil,
      }))
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Internal error' }, { status: 500 })
  }
}
