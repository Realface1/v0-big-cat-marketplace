import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications'

function isMissingResourceError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('does not exist')
    || message.includes('schema cache')
    || message.includes('could not find')
    || message.includes('relation')
    || message.includes('column')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const orderId = decodeURIComponent(String(id || '')).trim()
    const body = await req.json().catch(() => ({}))
    const buyerId: string | undefined = body.buyerId

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 })
    }

    if (!buyerId) {
      return NextResponse.json({ success: false, error: 'Buyer ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Load the order directly by ID first.
    const orderSelectAttempts = [
      'id, status, logistics_status, buyer_id, merchant_id, grand_total, product_total, delivery_fee, payment_status, rider_id',
      'id, status, logistics_status, buyer_id, merchant_id, grand_total, product_total, delivery_fee, rider_id',
      'id, status, logistics_status, buyer_id, merchant_id, grand_total, product_total, delivery_fee',
    ]

    let directOrder: any = null
    let directOrderError: any = null

    for (const selectClause of orderSelectAttempts) {
      const result = await (supabase.from('orders') as any)
        .select(selectClause)
        .eq('id', orderId)
        .maybeSingle()

      if (!result.error) {
        directOrder = result.data
        directOrderError = null
        break
      }

      directOrderError = result.error
      if (!isMissingResourceError(result.error)) break
    }

    let order = directOrder

    // Fallback: in legacy data/envs, direct ID filters can fail (e.g. type mismatch).
    // Recover by loading buyer-scoped orders and matching in memory.
    if (!order) {
      let buyerOrders: any[] | null = null
      let buyerOrdersError: any = null

      for (const selectClause of orderSelectAttempts) {
        const result = await (supabase.from('orders') as any)
          .select(selectClause)
          .eq('buyer_id', buyerId)
          .order('created_at', { ascending: false })
          .limit(200)

        if (!result.error) {
          buyerOrders = Array.isArray(result.data) ? result.data : []
          buyerOrdersError = null
          break
        }

        buyerOrdersError = result.error
        if (!isMissingResourceError(result.error)) break
      }

      if (!buyerOrdersError && Array.isArray(buyerOrders)) {
        order = buyerOrders.find((entry: any) => String(entry?.id || '').trim() === orderId) || null
      }
    }

    if ((!order && directOrderError) || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Verify the requester is the buyer
    if (order.buyer_id !== buyerId) {
      return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 403 })
    }

    // Block cancellation if already cancelled or delivered
    const terminalStatuses = ['cancelled', 'delivered', 'completed']
    if (terminalStatuses.includes(String(order.status).toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'This order cannot be cancelled.' },
        { status: 400 }
      )
    }

    // Block cancellation if a rider has already been assigned
    const logisticsStatus = String(order.logistics_status || '').toLowerCase().trim()
    const riderAssigned = order.rider_id || ['assigned', 'in_transit', 'return_assigned', 'return_in_transit'].includes(logisticsStatus)
    if (riderAssigned) {
      return NextResponse.json(
        {
          success: false,
          error: 'A rider has already been assigned to this order. You can no longer cancel — please use Report Issue if there is a problem.',
        },
        { status: 400 }
      )
    }

    // Cancel the order
    const updateAttempts = [
      { status: 'cancelled', payment_status: 'refunded', updated_at: new Date().toISOString() },
      { status: 'cancelled', updated_at: new Date().toISOString() },
    ]

    let updated: any = null
    let updateError: any = null
    for (const attempt of updateAttempts) {
      const result = await (supabase.from('orders') as any)
        .update(attempt)
        .eq('id', orderId)
        .select()
        .single()

      if (!result.error) {
        updated = result.data
        updateError = null
        break
      }

      updateError = result.error
      if (!isMissingResourceError(result.error)) break
    }

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to cancel order' }, { status: 500 })
    }

    // Calculate refund amount — GIT fee (1.5% of product_total) is non-refundable
    const productTotal = Math.max(0, Number(order.product_total || 0))
    const deliveryFee = Math.max(0, Number(order.delivery_fee || 0))
    const grandTotal = Math.max(0, Number(order.grand_total || 0))
    // GIT fee is charged as 1.5% of product_total at checkout
    const gitFeeAmount = Math.round(productTotal * 0.015)
    // If we can't derive it from product_total, fall back to grand_total minus best guess
    const refundAmount = productTotal > 0
      ? productTotal + deliveryFee
      : Math.max(0, grandTotal - gitFeeAmount)

    // Record buyer refund in transactions ledger (best-effort — table may not exist yet)
    if (refundAmount > 0 && order.buyer_id) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (supabaseUrl && serviceKey) {
          await fetch(`${supabaseUrl}/rest/v1/transactions`, {
            method: 'POST',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              buyer_id: order.buyer_id,
              order_id: orderId,
              type: 'wallet_credit',
              amount: refundAmount,
              reason: `Order cancellation refund (GIT fee non-refundable). Order: ${orderId.slice(0, 8).toUpperCase()}`,
              status: 'completed',
              created_at: new Date().toISOString(),
            }),
          })
        }
      } catch {
        // Best-effort — do not fail the cancellation if ledger write fails
      }
    }

    // Notify buyer
    if (order.buyer_id) {
      const refundMsg = refundAmount > 0
        ? ` ₦${refundAmount.toLocaleString('en-NG')} has been credited back to your wallet (GIT fee of ₦${gitFeeAmount.toLocaleString('en-NG')} is non-refundable).`
        : ' A refund will be processed shortly.'
      await dispatchNotification({
        userId: order.buyer_id,
        type: 'order',
        title: 'Order cancelled & refund issued',
        message: `Your order ${orderId.slice(0, 8).toUpperCase()} has been cancelled.${refundMsg}`,
        eventKey: `order:cancelled:buyer:${orderId}`,
        metadata: { orderId, refundAmount },
        emailSubject: 'Your order has been cancelled',
      })
    }

    // Notify merchant
    if (order.merchant_id) {
      await dispatchNotification({
        userId: order.merchant_id,
        type: 'order',
        title: 'Order cancelled by buyer',
        message: `A buyer has cancelled order ${orderId.slice(0, 8).toUpperCase()} before a rider was assigned.`,
        eventKey: `order:cancelled:merchant:${orderId}`,
        metadata: { orderId },
        emailSubject: 'Order cancelled by buyer',
      })
    }

    return NextResponse.json({ success: true, data: updated, refundAmount })
  } catch (error: any) {
    console.error('[cancel-order] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
