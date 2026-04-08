'use server'

import { createClient } from '@/lib/supabase/server'

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

export async function createOrder(buyerId: string, merchantId: string, items: { productId: string; quantity: number; price: number }[], totalAmount: number, shippingAddress: string) {
  try {
    const supabase = await createClient()
    const { data: order, error: orderError } = await supabase.from('orders').insert({ buyer_id: buyerId, merchant_id: merchantId, total_amount: totalAmount, shipping_address: shippingAddress }).select().single()
    if (orderError) throw orderError

    const orderItems = items.map(item => ({ order_id: order.id, product_id: item.productId, quantity: item.quantity, price: item.price }))
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) throw itemsError

    return { success: true, data: order }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('orders').update({ status }).eq('id', orderId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
