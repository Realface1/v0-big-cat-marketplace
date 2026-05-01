'use server'

import { createClient } from '@/lib/supabase/server'
import { holdFundsInEscrow, releaseFundsFromEscrow } from '@/lib/escrow-actions'
import { getUserSafetyStatus } from '@/lib/server-trust-safety'
import { registerOrderForLogistics } from '@/lib/logistics-actions'
import { dispatchNotification } from '@/lib/notifications'

function isMissingColumnError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('column') && (
    message.includes('does not exist')
    || message.includes('schema cache')
    || message.includes('could not find')
  )
}

function isMissingResourceError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('does not exist')
    || message.includes('schema cache')
    || message.includes('could not find')
    || message.includes('relation')
    || message.includes('column')
}

export async function getBuyerOrders(buyerId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('buyer_id', buyerId).order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getMerchantOrders(merchantId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('orders').select('*, order_items(*, products(*)), auth_users!buyer_id(name, email)').eq('merchant_id', merchantId).order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

type CreateOrderInput = {
  buyerId: string
  items: {
    productId: string
    merchantId: string
    productName?: string
    quantity: number
    unitPrice: number
    weight?: number
  }[]
  deliveryType: 'normal' | 'express' | 'pickup'
  deliveryAddress: string
  paymentMethod?: string
  deliveryFee?: number
}

export async function createOrder(
  payloadOrBuyerId: CreateOrderInput | string,
  merchantIdArg?: string,
  itemsArg?: { productId: string; quantity: number; price: number }[],
  totalAmountArg?: number,
  shippingAddressArg?: string,
) {
  try {
    const supabase = await createClient()

    const payload: CreateOrderInput = typeof payloadOrBuyerId === 'string'
      ? {
          buyerId: payloadOrBuyerId,
          items: (itemsArg || []).map((item) => ({
            productId: item.productId,
            merchantId: merchantIdArg || '',
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          deliveryType: 'normal',
          deliveryAddress: shippingAddressArg || '',
          paymentMethod: 'card',
          deliveryFee: Math.max(0, (totalAmountArg || 0) - (itemsArg || []).reduce((sum, item) => sum + (item.price * item.quantity), 0)),
        }
      : payloadOrBuyerId

    if (!payload.buyerId || !payload.items?.length) {
      return { success: false, error: 'Order items are required.' }
    }

    const safetyStatus = await getUserSafetyStatus(payload.buyerId)
    if (safetyStatus.suspended) {
      return {
        success: false,
        error: 'Your account is temporarily suspended for violating platform policies.',
        code: 'POLICY_USER_SUSPENDED',
      }
    }

    const groupedItems = payload.items.reduce<Record<string, CreateOrderInput['items']>>((acc, item) => {
      const key = String(item.merchantId || '').trim() || 'unknown_merchant'
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})

    const buyerProfileResult = await (supabase.from('auth_users') as any)
      .select('name, email, phone, city, state')
      .eq('id', payload.buyerId)
      .maybeSingle()
    const buyerProfile = buyerProfileResult.data || null

    const createdOrders: any[] = []

    for (const [merchantId, merchantItems] of Object.entries(groupedItems)) {
      const normalizedMerchantId = String(merchantId || '').trim()
      if (!normalizedMerchantId || normalizedMerchantId === 'unknown_merchant') {
        return { success: false, error: 'One or more cart items are missing merchant information. Please remove the item and add it again.' }
      }

      const productTotal = merchantItems.reduce((sum, item) => sum + (Number(item.unitPrice) * Number(item.quantity)), 0)
      const allocatedDeliveryFee = payload.deliveryType === 'pickup' ? 0 : (createdOrders.length === 0 ? Number(payload.deliveryFee || 0) : 0)
      const grandTotal = productTotal + allocatedDeliveryFee
      const orderId = crypto.randomUUID()

      const resolvedPaymentMethod = payload.paymentMethod || 'card'

      const orderInsertAttempts = [
        {
          id: orderId,
          buyer_id: payload.buyerId,
          merchant_id: normalizedMerchantId,
          status: 'paid',
          grand_total: grandTotal,
          product_total: productTotal,
          delivery_fee: allocatedDeliveryFee,
          total_amount: grandTotal,
          delivery_type: payload.deliveryType,
          delivery_address: payload.deliveryAddress,
          shipping_address: payload.deliveryAddress,
          payment_method: resolvedPaymentMethod,
          payment_status: 'completed',
        },
        {
          id: orderId,
          buyer_id: payload.buyerId,
          merchant_id: normalizedMerchantId,
          status: 'paid',
          grand_total: grandTotal,
          product_total: productTotal,
          delivery_fee: allocatedDeliveryFee,
          delivery_type: payload.deliveryType,
          delivery_address: payload.deliveryAddress,
          payment_method: resolvedPaymentMethod,
          payment_status: 'completed',
        },
        {
          id: orderId,
          buyer_id: payload.buyerId,
          merchant_id: normalizedMerchantId,
          status: 'paid',
          total_amount: grandTotal,
          delivery_fee: allocatedDeliveryFee,
          delivery_address: payload.deliveryAddress,
          payment_status: 'completed',
        },
        {
          id: orderId,
          buyer_id: payload.buyerId,
          merchant_id: normalizedMerchantId,
          status: 'paid',
          total_amount: grandTotal,
          delivery_fee: allocatedDeliveryFee,
          delivery_address: payload.deliveryAddress,
          payment_status: 'completed',
        },
        {
          id: orderId,
          buyer_id: payload.buyerId,
          merchant_id: normalizedMerchantId,
          status: 'paid',
          delivery_fee: allocatedDeliveryFee,
          delivery_address: payload.deliveryAddress,
        },
      ]

      let orderResult: any = null
      let lastOrderError: any = null

      for (const attempt of orderInsertAttempts) {
        const result = await (supabase.from('orders') as any).insert(attempt).select().single()
        if (!result.error) {
          orderResult = result
          break
        }

        if (!isMissingColumnError(result.error)) {
          throw result.error
        }

        lastOrderError = result.error
      }

      if (!orderResult?.data) {
        throw lastOrderError || new Error('Failed to create order')
      }

      const richOrderItems = merchantItems.map((item) => ({
        id: crypto.randomUUID(),
        order_id: orderResult.data?.id || orderId,
        product_id: item.productId,
        merchant_id: normalizedMerchantId,
        product_name: item.productName || 'Product',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: Number(item.unitPrice) * Number(item.quantity),
        weight: item.weight ?? 0.5,
      }))

      let itemsResult = await (supabase.from('order_items') as any).insert(richOrderItems)

      if (itemsResult.error) {
        itemsResult = await (supabase.from('order_items') as any).insert(
          merchantItems.map((item) => ({
            order_id: orderResult.data?.id || orderId,
            product_id: item.productId,
            quantity: item.quantity,
            price: item.unitPrice,
          }))
        )
      }

      if (itemsResult.error) throw itemsResult.error

      await holdFundsInEscrow(
        supabase,
        {
          ...(orderResult.data || {}),
          id: orderResult.data?.id || orderId,
          merchant_id: normalizedMerchantId,
          product_total: productTotal,
          grand_total: grandTotal,
          total_amount: grandTotal,
          delivery_fee: allocatedDeliveryFee,
          payment_method: resolvedPaymentMethod,
          status: orderResult.data?.status || 'pending',
        },
        resolvedPaymentMethod,
      )

      const orderIdRef = String(orderResult.data?.id || orderId)

      await dispatchNotification({
        userId: normalizedMerchantId,
        type: 'order',
        title: 'You have a new order',
        message: `Order ${orderIdRef} was placed and is awaiting processing.`,
        eventKey: `order:new:merchant:${orderIdRef}`,
        emailSubject: 'New order received',
      })

      await dispatchNotification({
        userId: payload.buyerId,
        type: 'order',
        title: 'Your order has been received',
        message: `Order ${orderIdRef} has been received by the merchant.`,
        eventKey: `order:new:buyer:${orderIdRef}`,
        emailSubject: 'Order received',
      })

      await dispatchNotification({
        userId: payload.buyerId,
        type: 'order',
        title: 'Payment confirmation',
        message: `Payment for order ${orderIdRef} has been confirmed.`,
        eventKey: `order:payment-confirmed:${orderIdRef}`,
        emailSubject: 'Payment confirmation',
      })

      let logisticsRegisteredAt: string | null = null
      if (String(payload.deliveryType || '').toLowerCase() !== 'pickup') {
        const logisticsResult = await registerOrderForLogistics({
          order_id: orderIdRef,
          customer_name: String(buyerProfile?.name || buyerProfile?.email || 'Customer'),
          customer_phone: String(buyerProfile?.phone || ''),
          customer_city: String(buyerProfile?.city || ''),
          customer_state: String(buyerProfile?.state || ''),
          delivery_address: payload.deliveryAddress,
          items: merchantItems.map((item) => ({
            product_name: item.productName || 'Product',
            quantity: Number(item.quantity || 0),
          })),
          total_amount: grandTotal,
          delivery_fee: allocatedDeliveryFee,
          status: 'pending',
        })

        if (logisticsResult.success) {
          logisticsRegisteredAt = new Date().toISOString()
        }
      }

      try {
        await (supabase.from('order_automation_state') as any).upsert({
          order_id: orderIdRef,
          merchant_id: normalizedMerchantId,
          buyer_id: payload.buyerId,
          buyer_notified_at: new Date().toISOString(),
          merchant_notified_at: new Date().toISOString(),
          payment_notified_at: new Date().toISOString(),
          logistics_registered_at: logisticsRegisteredAt,
        }, { onConflict: 'order_id' })
      } catch (stateError: any) {
        if (!isMissingResourceError(stateError)) {
          throw stateError
        }
      }

      createdOrders.push(orderResult.data)
    }

    return {
      success: true,
      data: {
        id: createdOrders[0]?.id,
        orderId: createdOrders[0]?.id,
        orders: createdOrders,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateOrderStatus(orderId: string, status: string, actorId?: string) {
  try {
    const supabase = await createClient()
    const normalizedStatus = String(status || '').trim() === 'completed' ? 'delivered' : String(status || '').trim()

    if (actorId) {
      const orderResult = await (supabase.from('orders') as any).select('*').eq('id', orderId).single()
      if (orderResult.error) throw orderResult.error

      const order = (orderResult.data || {}) as any
      const buyerId = String(order.buyer_id || '')
      const merchantId = String(order.merchant_id || '')
      if (buyerId !== actorId && merchantId !== actorId) {
        return { success: false, error: 'You are not allowed to update this order.' }
      }
    }

    // Check for active disputes if marking as delivered
    if (normalizedStatus === 'delivered') {
      const { data: dispute, error: disputeError } = await (supabase.from('support_issues') as any)
        .select('id, status')
        .eq('order_id', orderId)
        .in('status', ['open', 'in_review'])
        .maybeSingle()

      if (!disputeError && dispute) {
        return {
          success: false,
          error: 'Cannot mark as delivered: This order has an active dispute. Funds are frozen until the dispute is resolved by BigCat admin.',
        }
      }
    }

    const updateAttempts = normalizedStatus === 'delivered'
      ? [
          { status: normalizedStatus, payment_status: 'completed', updated_at: new Date().toISOString() },
          { status: normalizedStatus, payment_status: 'completed' },
          { status: normalizedStatus, updated_at: new Date().toISOString() },
          { status: normalizedStatus },
        ]
      : [
          { status: normalizedStatus, updated_at: new Date().toISOString() },
          { status: normalizedStatus },
        ]

    let data: any = null
    let lastError: any = null

    for (const attempt of updateAttempts) {
      const result = await (supabase.from('orders') as any).update(attempt).eq('id', orderId).select().single()
      if (!result.error) {
        data = result.data
        break
      }
      lastError = result.error
    }

    if (!data && lastError) throw lastError

    const buyerId = String(data?.buyer_id || '')
    const merchantId = String(data?.merchant_id || '')

    if (normalizedStatus === 'in_transit' || normalizedStatus === 'shipped') {
      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: 'order',
          title: 'Delivery update',
          message: `Order ${orderId} is now in transit.`,
          eventKey: `order:delivery-update:${orderId}:${normalizedStatus}`,
          emailSubject: 'Your order is in transit',
        })
      }
    }

    if (normalizedStatus === 'cancelled') {
      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: 'order',
          title: 'Order cancelled',
          message: `Order ${orderId} has been cancelled.`,
          eventKey: `order:cancelled:buyer:${orderId}`,
          emailSubject: 'Order cancelled',
        })
      }
      if (merchantId) {
        await dispatchNotification({
          userId: merchantId,
          type: 'order',
          title: 'Order cancelled',
          message: `Order ${orderId} has been cancelled.`,
          eventKey: `order:cancelled:merchant:${orderId}`,
          emailSubject: 'Order cancelled',
        })
      }
    }

    if (normalizedStatus === 'delivered') {
      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: 'order',
          title: 'Order delivered',
          message: `Order ${orderId} has been delivered successfully.`,
          eventKey: `order:delivered:buyer:${orderId}`,
          emailSubject: 'Order delivered',
        })
      }
      if (merchantId) {
        await dispatchNotification({
          userId: merchantId,
          type: 'order',
          title: 'Order marked delivered',
          message: `Order ${orderId} was marked as delivered and settled.`,
          eventKey: `order:delivered:merchant:${orderId}`,
          emailSubject: 'Order delivered',
        })
      }

      const released = await releaseFundsFromEscrow(supabase, orderId, data)
      return {
        success: true,
        data: released?.order || data,
        disbursement: released?.breakdown || null,
      }
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
