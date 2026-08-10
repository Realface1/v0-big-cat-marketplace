'use server'

import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications'

function isMissingInfraError(error: any) {
  const msg = String(error?.message || '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('relation') || msg.includes('schema cache')
}

async function getMerchantName(merchantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('auth_users')
    .select('business_name, name, full_name')
    .eq('id', merchantId)
    .maybeSingle()
  return String(data?.business_name || data?.name || data?.full_name || 'Merchant').trim()
}

async function getBuyerName(buyerId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('auth_users')
    .select('name, full_name, email')
    .eq('id', buyerId)
    .maybeSingle()
  return String(data?.name || data?.full_name || data?.email || 'Buyer').trim()
}

export interface BillLineItem {
  description: string
  quantity: number
  unit_price: number
}

export async function createServiceBill(
  merchantId: string,
  input: {
    buyerId: string
    serviceListingId?: string
    scopeSummary?: string
    timeline?: string
    lineItems: BillLineItem[]
    discountAmount?: number
    notes?: string
    validUntil?: string
  },
) {
  if (!merchantId || !input.buyerId) {
    return { success: false, error: 'merchantId and buyerId are required' }
  }

  const lineItems = Array.isArray(input.lineItems) ? input.lineItems : []
  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.quantity || 1) * Number(item.unit_price || 0), 0)
  const discount = Math.max(0, Math.min(Number(input.discountAmount || 0), subtotal))
  const total = Math.max(0, subtotal - discount)

  try {
    const supabase = await createClient()
    const { data, error } = await (supabase.from('service_bills') as any)
      .insert({
        merchant_id: merchantId,
        buyer_id: input.buyerId,
        service_listing_id: input.serviceListingId || null,
        scope_summary: String(input.scopeSummary || '').trim() || null,
        timeline: String(input.timeline || '').trim() || null,
        line_items: lineItems,
        subtotal: Number(subtotal.toFixed(2)),
        discount_amount: Number(discount.toFixed(2)),
        total_amount: Number(total.toFixed(2)),
        notes: String(input.notes || '').trim() || null,
        valid_until: input.validUntil ? new Date(input.validUntil).toISOString() : null,
        status: 'draft',
      })
      .select('*')
      .single()

    if (error) {
      if (isMissingInfraError(error)) {
        return { success: false, error: 'Run scripts/025-create-service-bills.sql in Supabase to enable billing.' }
      }
      throw error
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create bill' }
  }
}

export async function updateServiceBill(
  merchantId: string,
  billId: string,
  updates: Partial<{
    scopeSummary: string
    timeline: string
    lineItems: BillLineItem[]
    discountAmount: number
    notes: string
    validUntil: string
  }>,
) {
  try {
    const supabase = await createClient()

    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    if (updates.scopeSummary !== undefined) patch.scope_summary = updates.scopeSummary
    if (updates.timeline !== undefined) patch.timeline = updates.timeline
    if (updates.notes !== undefined) patch.notes = updates.notes
    if (updates.validUntil !== undefined) patch.valid_until = updates.validUntil ? new Date(updates.validUntil).toISOString() : null

    if (Array.isArray(updates.lineItems)) {
      const lineItems = updates.lineItems
      const subtotal = lineItems.reduce((sum, item) => sum + Number(item.quantity || 1) * Number(item.unit_price || 0), 0)
      const discount = Math.max(0, Math.min(Number(updates.discountAmount || 0), subtotal))
      patch.line_items = lineItems
      patch.subtotal = Number(subtotal.toFixed(2))
      patch.discount_amount = Number(discount.toFixed(2))
      patch.total_amount = Number(Math.max(0, subtotal - discount).toFixed(2))
    }

    const { data, error } = await (supabase.from('service_bills') as any)
      .update(patch)
      .eq('id', billId)
      .eq('merchant_id', merchantId)
      .eq('status', 'draft')
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update bill' }
  }
}

export async function sendServiceBill(merchantId: string, billId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await (supabase.from('service_bills') as any)
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', billId)
      .eq('merchant_id', merchantId)
      .in('status', ['draft', 'sent'])
      .select('*')
      .single()

    if (error) throw error
    if (!data) return { success: false, error: 'Bill not found or already paid/cancelled' }

    const merchantName = await getMerchantName(merchantId)

    await dispatchNotification({
      userId: data.buyer_id,
      type: 'order',
      title: 'You have a new bill to pay',
      message: `${merchantName} sent you a bill for ₦${Number(data.total_amount).toLocaleString('en-NG')}.${data.scope_summary ? ' ' + data.scope_summary : ''}`,
      eventKey: `service-bill-sent:${data.id}`,
      metadata: { billId: data.id, merchantId, merchantName, totalAmount: data.total_amount },
    }).catch(() => null)

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send bill' }
  }
}

export async function getMerchantServiceBills(merchantId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await (supabase.from('service_bills') as any)
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      if (isMissingInfraError(error)) return { success: true, data: [] }
      throw error
    }

    const rows = data || []
    const buyerIds = Array.from(new Set(rows.map((r: any) => String(r.buyer_id)).filter(Boolean)))
    if (buyerIds.length === 0) return { success: true, data: rows }

    const { data: buyers } = await supabase
      .from('auth_users')
      .select('id, business_name, name, full_name, email')
      .in('id', buyerIds)

    const buyerMap = new Map((buyers || []).map((b: any) => [String(b.id), b]))

    const withNames = rows.map((bill: any) => {
      const buyer = buyerMap.get(String(bill.buyer_id))
      return {
        ...bill,
        buyer_name: buyer?.business_name || buyer?.name || buyer?.full_name || buyer?.email || 'Buyer',
      }
    })

    return { success: true, data: withNames }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load bills', data: [] }
  }
}

export async function getBuyerServiceBills(buyerId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await (supabase.from('service_bills') as any)
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      if (isMissingInfraError(error)) return { success: true, data: [] }
      throw error
    }

    const rows = data || []
    const merchantIds = Array.from(new Set(rows.map((r: any) => String(r.merchant_id)).filter(Boolean)))
    if (merchantIds.length === 0) return { success: true, data: rows }

    const { data: merchants } = await supabase
      .from('auth_users')
      .select('id, business_name, name, full_name')
      .in('id', merchantIds)

    const merchantMap = new Map((merchants || []).map((m: any) => [String(m.id), m]))

    const withNames = rows.map((bill: any) => {
      const merchant = merchantMap.get(String(bill.merchant_id))
      return {
        ...bill,
        merchant_name: merchant?.business_name || merchant?.name || merchant?.full_name || 'Merchant',
      }
    })

    return { success: true, data: withNames }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to load bills', data: [] }
  }
}

export async function payServiceBill(
  buyerId: string,
  billId: string,
  options?: {
    paymentMethod?: 'palmpay' | 'bank' | 'card'
    paymentAddress?: string
  },
) {
  try {
    const supabase = await createClient()
    const paymentMethod = options?.paymentMethod === 'bank' || options?.paymentMethod === 'card' ? options.paymentMethod : 'palmpay'
    const paymentAddress = String(options?.paymentAddress || '').trim() || null

    // 1. Load bill
    const { data: bill, error: billError } = await (supabase.from('service_bills') as any)
      .select('*')
      .eq('id', billId)
      .eq('buyer_id', buyerId)
      .eq('status', 'sent')
      .maybeSingle()

    if (billError) throw billError
    if (!bill) return { success: false, error: 'Bill not found or already paid' }

    const amount = Number(bill.total_amount)
    if (!amount || amount <= 0) return { success: false, error: 'Invalid bill amount' }

    if (paymentMethod === 'palmpay') {
      // 2. Check wallet balance for wallet payments
      const { data: txRows, error: txError } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('buyer_id', buyerId)

      if (txError) throw txError

      const creditTypes = new Set(['wallet_credit', 'refund', 'payment', 'escrow_release'])
      const debitTypes = new Set(['wallet_debit', 'withdrawal'])
      const balance = (txRows || []).reduce((sum: number, tx: any) => {
        const type = String(tx?.type || '').toLowerCase()
        const amt = Math.max(0, Number(tx?.amount || 0))
        if (creditTypes.has(type)) return sum + amt
        if (debitTypes.has(type)) return sum - amt
        return sum
      }, 0)

      if (balance < amount) {
        return {
          success: false,
          error: `Insufficient wallet balance. You need ₦${amount.toLocaleString('en-NG')} but have ₦${balance.toLocaleString('en-NG')}. Please top up your wallet first.`,
          code: 'INSUFFICIENT_BALANCE',
          currentBalance: balance,
          required: amount,
        }
      }

      // 3. Debit buyer wallet
      const { error: debitError } = await supabase
        .from('transactions')
        .insert({
          buyer_id: buyerId,
          type: 'wallet_debit',
          amount,
          reason: `Service bill payment: ${bill.scope_summary || billId}`,
          status: 'completed',
        })

      if (debitError) throw debitError
    } else {
      // Non-wallet methods are treated as externally settled and recorded.
      const { error: paymentError } = await supabase
        .from('transactions')
        .insert({
          buyer_id: buyerId,
          type: 'payment',
          amount,
          reason: `Service bill payment via ${paymentMethod}: ${bill.scope_summary || billId}`,
          status: 'completed',
        })

      if (paymentError) throw paymentError
    }

    // 4. Create service booking with quoted price = total_amount
    let bookingId: string | null = null
    if (bill.service_listing_id) {
      const { data: booking } = await (supabase.from('service_bookings') as any)
        .insert({
          service_id: bill.service_listing_id,
          buyer_id: buyerId,
          merchant_id: bill.merchant_id,
          status: 'accepted',
          quoted_price: amount,
          payment_status: 'paid',
          escrow_status: 'held',
          service_address: paymentAddress,
          buyer_note: bill.scope_summary || null,
        })
        .select('id')
        .single()
      bookingId = booking?.id || null
    }

    // 5. Mark bill as paid
    await (supabase.from('service_bills') as any)
      .update({
        status: 'paid',
        booking_id: bookingId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', billId)

    // 6. Notify merchant
    const buyerName = await getBuyerName(buyerId)
    await dispatchNotification({
      userId: bill.merchant_id,
      type: 'order',
      title: 'Service bill paid',
      message: `${buyerName} paid ₦${amount.toLocaleString('en-NG')} for: ${bill.scope_summary || 'Service bill'}.`,
      eventKey: `service-bill-paid:${billId}`,
      metadata: { billId, buyerId, amount },
    }).catch(() => null)

    return { success: true, bookingId }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to process payment' }
  }
}

export async function cancelServiceBill(actorId: string, billId: string, actorType: 'merchant' | 'buyer') {
  try {
    const supabase = await createClient()
    const filter = actorType === 'merchant' ? 'merchant_id' : 'buyer_id'

    const { error } = await (supabase.from('service_bills') as any)
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', billId)
      .eq(filter, actorId)
      .in('status', ['draft', 'sent'])

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel bill' }
  }
}
