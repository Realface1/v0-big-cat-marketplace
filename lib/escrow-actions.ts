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
  escrowStatus: string,
  paymentMethod: string,
  releasedAt?: string | null,
) {
  const now = new Date().toISOString()
  const withRelease = releasedAt ? { released_at: releasedAt } : {}

  return [
    {
      status: orderStatus,
      payment_status: paymentStatus,
      payment_provider: paymentMethod,
      payment_method: paymentMethod,
      escrow_status: escrowStatus,
      updated_at: now,
      ...withRelease,
    },
    {
      status: orderStatus,
      payment_status: paymentStatus,
      payment_provider: paymentMethod,
      escrow_status: escrowStatus,
      updated_at: now,
      ...withRelease,
    },
    {
      status: orderStatus,
      payment_status: paymentStatus,
      escrow_status: escrowStatus,
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
  const totalAmount = Math.max(0, toAmount(order.grand_total ?? order.total_amount))
  const productAmount = Math.max(0, toAmount(order.product_total) || (totalAmount - deliveryFee))

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

  await persistEscrowRows(
    supabase,
    {
      ...order,
      ...persistedOrder,
      id: resolvedOrderId,
    },
    'released',
  )

  return {
    order: persistedOrder,
    breakdown: getEscrowBreakdown({ ...order, ...persistedOrder }),
  }
}
