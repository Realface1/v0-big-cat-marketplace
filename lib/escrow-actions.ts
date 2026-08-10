import { creditMerchantWalletFromEscrow } from '@/lib/merchant-wallet'

type OrderFinancialRecord = {
  id: string
  merchant_id?: string | null
  grand_total?: number | null
  total_amount?: number | null
  product_total?: number | null
  delivery_fee?: number | null
  status?: string | null
  payment_method?: string | null
  payment_provider?: string | null
}

type EscrowLifecycleStatus = 'held' | 'released'

function toAmount(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function getOrderItemsAmount(order: any) {
  const orderItems = Array.isArray(order?.order_items)
    ? order.order_items
    : Array.isArray(order?.items)
      ? order.items
      : []

  return orderItems.reduce((sum: number, item: any) => {
    const quantity = Math.max(1, toAmount(item?.quantity || 1))
    const lineTotal = toAmount(item?.total_price || 0)
    const unitAmount = toAmount(item?.unit_price || item?.price || 0)

    if (lineTotal > 0) return sum + lineTotal
    if (unitAmount > 0) return sum + (unitAmount * quantity)
    return sum
  }, 0)
}

function normalizeOrderStatus(status: string | null | undefined, releaseFunds = false) {
  if (releaseFunds) return 'delivered'
  if (!status) return 'pending'
  if (status === 'completed') return 'delivered'
  return status
}

function isMissingEscrowTable(message: string) {
  return message.includes("Could not find the table 'public.escrow'")
}

function buildOrderUpdateAttempts(
  orderStatus: string,
  paymentStatus: string,
  _escrowStatus: string,
  paymentMethod: string,
  releasedAt?: string | null,
) {
  const now = new Date().toISOString()
  const withRelease = releasedAt ? { released_at: releasedAt } : {}

  return [
    {
      status: orderStatus,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      updated_at: now,
      ...withRelease,
    },
    {
      status: orderStatus,
      payment_status: paymentStatus,
      updated_at: now,
      ...withRelease,
    },
    {
      status: orderStatus,
      payment_status: paymentStatus,
      updated_at: now,
      ...withRelease,
    },
    {
      status: orderStatus,
      payment_status: paymentStatus,
      updated_at: now,
    },
    {
      status: orderStatus,
      updated_at: now,
    },
    {
      status: orderStatus,
    },
  ]
}

async function persistOrderFinancialState(
  supabase: any,
  orderId: string,
  orderStatus: string,
  paymentStatus: string,
  escrowStatus: string,
  paymentMethod: string,
  releasedAt?: string | null,
) {
  let persistedOrder: any = null
  let lastError: any = null

  for (const attempt of buildOrderUpdateAttempts(orderStatus, paymentStatus, escrowStatus, paymentMethod, releasedAt)) {
    const result = await supabase.from('orders').update(attempt as any).eq('id', orderId).select('*').single()
    if (!result.error) {
      persistedOrder = result.data
      break
    }
    lastError = result.error
  }

  if (!persistedOrder && lastError) {
    throw lastError
  }

  return persistedOrder
}

function getEscrowBreakdown(order: OrderFinancialRecord) {
  const deliveryFee = Math.max(0, toAmount(order.delivery_fee))
  const itemTotal = Math.max(0, getOrderItemsAmount(order as any))
  const totalAmount = Math.max(0, toAmount(order.grand_total ?? order.total_amount), itemTotal + deliveryFee)
  const productAmount = Math.max(0, itemTotal || toAmount(order.product_total) || (totalAmount - deliveryFee))

  return {
    totalAmount,
    productAmount,
    logisticsAmount: deliveryFee,
  }
}

async function persistEscrowRows(
  supabase: any,
  order: OrderFinancialRecord,
  lifecycleStatus: EscrowLifecycleStatus,
) {
  try {
    const { data: existingRows, error: existingError } = await supabase
      .from('escrow')
      .select('id, type')
      .eq('order_id', order.id)

    if (existingError) {
      const message = existingError?.message || ''
      if (isMissingEscrowTable(message)) {
        return
      }
      throw existingError
    }

    const breakdown = getEscrowBreakdown(order)
    const releasedAt = lifecycleStatus === 'released' ? new Date().toISOString() : null
    const rows = [
      {
        order_id: order.id,
        type: 'product',
        amount: breakdown.productAmount,
        recipient_id: order.merchant_id || null,
        status: lifecycleStatus,
        released_at: releasedAt,
      },
      {
        order_id: order.id,
        type: 'delivery',
        amount: breakdown.logisticsAmount,
        recipient_id: null,
        status: lifecycleStatus,
        released_at: releasedAt,
      },
    ]

    for (const row of rows) {
      const existing = (existingRows || []).find((entry: any) => entry.type === row.type)
      if (existing?.id) {
        const { error } = await supabase.from('escrow').update(row as any).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('escrow').insert(row as any)
        if (error) throw error
      }
    }
  } catch (error: any) {
    const message = error?.message || ''
    if (isMissingEscrowTable(message)) {
      return
    }
    throw error
  }
}

export async function holdFundsInEscrow(
  supabase: any,
  order: OrderFinancialRecord,
  paymentMethod?: string,
) {
  const orderId = String(order?.id || '').trim()
  if (!orderId) return null

  const resolvedPaymentMethod = String(paymentMethod || order.payment_method || order.payment_provider || 'palmpay')
  const normalizedStatus = normalizeOrderStatus(order.status)

  const persistedOrder = await persistOrderFinancialState(
    supabase,
    orderId,
    normalizedStatus,
    'completed',
    'held',
    resolvedPaymentMethod,
  )

  await persistEscrowRows(
    supabase,
    {
      ...order,
      ...persistedOrder,
      id: orderId,
    },
    'held',
  )

  return {
    order: persistedOrder,
    breakdown: getEscrowBreakdown({ ...order, ...persistedOrder }),
  }
}

// Check if an order has an active dispute (prevents escrow release)
async function hasActiveDispute(supabase: any, orderId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('support_issues')
      .select('id, status')
      .eq('order_id', orderId)
      .in('status', ['open', 'in_review'])
      .maybeSingle()
    
    if (error) return false
    return !!data
  } catch {
    return false
  }
}

export async function releaseFundsFromEscrow(
  supabase: any,
  orderId: string,
  existingOrder?: OrderFinancialRecord | null,
) {
  const resolvedOrderId = String(orderId || existingOrder?.id || '').trim()
  if (!resolvedOrderId) return null

  let order = existingOrder || null

  if (!order) {
    const { data, error } = await supabase.from('orders').select('*').eq('id', resolvedOrderId).maybeSingle()
    if (error) throw error
    order = data
  }

  // Fetch order_items separately so getEscrowBreakdown can compute correct amounts
  // (order_items is a separate table, not a column on orders)
  if (order && !Array.isArray((order as any).order_items)) {
    const { data: items } = await supabase
      .from('order_items')
      .select('id, total_price, unit_price, quantity')
      .eq('order_id', resolvedOrderId)
    if (Array.isArray(items) && items.length > 0) {
      ;(order as any).order_items = items
      // Also ensure product_total is set so the order record reflects the real amount
      const itemsTotal = items.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0)
      if (itemsTotal > 0 && !((order as any).product_total > 0)) {
        ;(order as any).product_total = itemsTotal
        ;(order as any).grand_total = itemsTotal + (Number((order as any).delivery_fee) || 0)
        // Persist the corrected totals to the DB
        await supabase.from('orders')
          .update({ product_total: (order as any).product_total, grand_total: (order as any).grand_total })
          .eq('id', resolvedOrderId)
      }
    }
  }

  // Check if there's an active dispute - if so, prevent fund release
  const activeDispute = await hasActiveDispute(supabase, resolvedOrderId)
  if (activeDispute) {
    throw new Error('Cannot release funds: This order has an active dispute. Funds are frozen until the dispute is resolved.')
  }

  const paymentMethod = String(order?.payment_method || order?.payment_provider || 'palmpay')
  const persistedOrder = await persistOrderFinancialState(
    supabase,
    resolvedOrderId,
    normalizeOrderStatus(order?.status, true),
    'completed',
    'released',
    paymentMethod,
    new Date().toISOString(),
  )

  const breakdown = getEscrowBreakdown({ ...order, ...persistedOrder })

  await persistEscrowRows(
    supabase,
    {
      ...order,
      ...persistedOrder,
      id: resolvedOrderId,
    },
    'released',
  )

  const merchantId = String((persistedOrder as any)?.merchant_id || (order as any)?.merchant_id || '').trim()
  if (merchantId && breakdown.productAmount > 0) {
    await creditMerchantWalletFromEscrow({
      supabase,
      orderId: resolvedOrderId,
      merchantId,
      amount: breakdown.productAmount,
      reason: `Escrow release payout for order ${resolvedOrderId}`,
    })
  }

  return {
    order: persistedOrder,
    breakdown,
  }
}
