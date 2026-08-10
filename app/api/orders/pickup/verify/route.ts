import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { releaseFundsFromEscrow } from '@/lib/escrow-actions'
import { dispatchNotification } from '@/lib/notifications'

function isMissingResourceError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('does not exist')
    || message.includes('schema cache')
    || message.includes('could not find')
    || message.includes('relation')
    || message.includes('column')
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const riderId = request.headers.get('x-rider-id')?.trim() || ''

    if (!riderId) {
      return NextResponse.json({ success: false, error: 'Rider session is required.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const orderId = String(body?.orderId || '').trim()
    const token = String(body?.token || '').trim().toUpperCase()

    if (!orderId || !token) {
      return NextResponse.json({ success: false, error: 'Order ID and pickup token are required.' }, { status: 400 })
    }

    const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
    if (error) throw error
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found.' }, { status: 404 })
    }

    if (String(order.delivery_type || '').toLowerCase() !== 'pickup') {
      return NextResponse.json({ success: false, error: 'This order is not a pickup order.' }, { status: 400 })
    }

    const storedToken = String(order.pickup_token || '').trim().toUpperCase()
    if (!storedToken) {
      return NextResponse.json({ success: false, error: 'This order does not have a pickup token yet.' }, { status: 400 })
    }

    if (String(order.pickup_verified_at || '').trim()) {
      return NextResponse.json({ success: true, data: { orderId, alreadyVerified: true } })
    }

    if (storedToken !== token) {
      return NextResponse.json({ success: false, error: 'Pickup token does not match.' }, { status: 400 })
    }

    await releaseFundsFromEscrow(supabase, orderId, order)

    const verifiedAt = new Date().toISOString()
    const updateAttempts = [
      { status: 'delivered', payment_status: 'completed', pickup_verified_at: verifiedAt, pickup_verified_by: riderId, updated_at: verifiedAt },
      { status: 'delivered', payment_status: 'completed', pickup_verified_at: verifiedAt, updated_at: verifiedAt },
      { status: 'delivered', payment_status: 'completed', updated_at: verifiedAt },
      { status: 'delivered', updated_at: verifiedAt },
    ]

    let persistedOrder = null
    let lastError: any = null
    for (const attempt of updateAttempts) {
      const result = await supabase.from('orders').update(attempt as any).eq('id', orderId).select('*').single()
      if (!result.error) {
        persistedOrder = result.data
        break
      }
      if (!isMissingResourceError(result.error)) {
        lastError = result.error
      }
    }

    if (!persistedOrder && lastError) {
      throw lastError
    }

    await dispatchNotification({
      userId: String(order.buyer_id || ''),
      type: 'order',
      title: 'Pickup verified',
      message: `Your pickup token was verified for order ${orderId}.`,
      eventKey: `pickup:verified:buyer:${orderId}`,
      emailSubject: 'Pickup verified',
    })

    await dispatchNotification({
      userId: String(order.merchant_id || ''),
      type: 'order',
      title: 'Pickup verified',
      message: `Pickup token verified for order ${orderId}.`,
      eventKey: `pickup:verified:merchant:${orderId}`,
      emailSubject: 'Pickup verified',
    })

    return NextResponse.json({ success: true, data: { orderId, verifiedAt } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to verify pickup token.' }, { status: 500 })
  }
}