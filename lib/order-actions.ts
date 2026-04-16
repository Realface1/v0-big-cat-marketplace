'use server'

import { createClient } from '@/lib/supabase/server'
import { holdFundsInEscrow, releaseFundsFromEscrow } from '@/lib/escrow-actions'

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

    const groupedItems = payload.items.reduce<Record<string, CreateOrderInput['items']>>((acc, item) => {
      const key = String(item.merchantId || '').trim() || 'unknown_merchant'
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})

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
          payment_provider: resolvedPaymentMethod,
          escrow_status: 'held',
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
          payment_provider: resolvedPaymentMethod,
          escrow_status: 'held',
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
          payment_provider: resolvedPaymentMethod,
          escrow_status: 'held',
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
          payment_provider: resolvedPaymentMethod,
          status: orderResult.data?.status || 'pending',
        },
        resolvedPaymentMethod,
      )

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

    const updateAttempts = normalizedStatus === 'delivered'
      ? [
          { status: normalizedStatus, payment_status: 'completed', escrow_status: 'released', updated_at: new Date().toISOString() },
          { status: normalizedStatus, payment_status: 'completed', escrow_status: 'released' },
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

    if (normalizedStatus === 'delivered') {
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
