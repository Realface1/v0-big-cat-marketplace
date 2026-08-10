'use server'

import { createClient } from '@/lib/supabase/server'
import { updateOrderStatus } from '@/lib/order-actions'
import { dispatchNotification } from '@/lib/notifications'

export interface LogisticsOrderPayload {
  order_id: string
  customer_name: string
  customer_phone: string
  customer_city?: string
  customer_state?: string
  delivery_address: string
  items: Array<{ product_name: string; quantity: number }>
  total_amount: number
  delivery_fee: number
  status?: 'pending'
}

function includesMissingTable(errorMessage: string, tableName: string) {
  const normalized = String(errorMessage || '').toLowerCase()
  return normalized.includes(`table 'public.${tableName.toLowerCase()}'`) || normalized.includes(`relation \"${tableName.toLowerCase()}\"`)
}

function isMissingColumn(errorMessage: string) {
  return String(errorMessage || '').toLowerCase().includes('column')
}

function safeJsonParse(input: any) {
  if (!input) return null
  if (typeof input === 'object') return input
  try {
    return JSON.parse(String(input))
  } catch {
    return null
  }
}

function containsAnyText(haystack: string, needles: string[]) {
  const text = String(haystack || '').toLowerCase()
  return needles.some((needle) => text.includes(String(needle || '').toLowerCase()))
}

async function getOrderParties(supabase: any, orderId: string) {
  const result = await (supabase.from('orders') as any)
    .select('id, buyer_id, merchant_id, delivery_address')
    .eq('id', orderId)
    .maybeSingle()

  return result.data || null
}

async function notifyOrderActors(
  supabase: any,
  orderId: string,
  payload: {
    buyerTitle?: string
    buyerMessage?: string
    buyerEventKey?: string
    merchantTitle?: string
    merchantMessage?: string
    merchantEventKey?: string
  },
) {
  const order = await getOrderParties(supabase, orderId)
  if (!order) return

  const buyerId = String(order.buyer_id || '')
  const merchantId = String(order.merchant_id || '')

  if (buyerId && payload.buyerTitle && payload.buyerMessage) {
    await dispatchNotification({
      userId: buyerId,
      type: 'order',
      title: payload.buyerTitle,
      message: payload.buyerMessage,
      eventKey: payload.buyerEventKey,
      metadata: {
        orderId,
        action: 'track_package',
        actionPath: `/track/${orderId}`,
      },
    })
  }

  if (merchantId && payload.merchantTitle && payload.merchantMessage) {
    await dispatchNotification({
      userId: merchantId,
      type: 'order',
      title: payload.merchantTitle,
      message: payload.merchantMessage,
      eventKey: payload.merchantEventKey,
      metadata: {
        orderId,
      },
    })
  }
}

async function selectOrdersWithCompatibility(supabase: any, scope: 'single' | 'list', orderId?: string) {
  const selectAttempts = [
    'id, buyer_id, merchant_id, status, payment_status, delivery_type, delivery_address, delivery_fee, grand_total, total_amount, created_at, order_items(product_name, quantity)',
    'id, buyer_id, merchant_id, status, delivery_type, delivery_address, delivery_fee, grand_total, total_amount, created_at, order_items(product_name, quantity)',
    'id, buyer_id, merchant_id, status, delivery_address, delivery_fee, grand_total, total_amount, created_at, order_items(product_name, quantity)',
    'id, buyer_id, merchant_id, status, delivery_address, delivery_fee, grand_total, created_at, order_items(product_name, quantity)',
    'id, buyer_id, merchant_id, status, delivery_address, delivery_fee, total_amount, created_at, order_items(product_name, quantity)',
    'id, buyer_id, merchant_id, status, delivery_address, delivery_fee, created_at, order_items(product_name, quantity)',
    'id, buyer_id, merchant_id, status, delivery_address, delivery_fee, grand_total, created_at',
    'id, buyer_id, merchant_id, status, delivery_address, delivery_fee, total_amount, created_at',
    'id, buyer_id, merchant_id, status, delivery_address, delivery_fee, created_at',
  ]

  let lastError: any = null

  for (const selectClause of selectAttempts) {
    let query = (supabase.from('orders') as any).select(selectClause)
    if (scope === 'single' && orderId) {
      query = query.eq('id', orderId).maybeSingle()
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const result = await query
    if (!result.error) {
      return result
    }

    const message = String(result.error.message || '')
    if (!isMissingColumn(message)) {
      throw result.error
    }

    lastError = result.error
  }

  if (lastError) throw lastError
  return { data: scope === 'single' ? null : [], error: null }
}

async function readOrderForDeliveryContext(supabase: any, orderId: string) {
  const result = await selectOrdersWithCompatibility(supabase, 'single', orderId)

  if (result.error) throw result.error
  return result.data
}

async function upsertLogisticsAssignment(
  supabase: any,
  payload: {
    order_id: string
    rider_id?: string | null
    logistics_status?: string
    notes?: string | null
    assigned_at?: string | null
    completed_at?: string | null
  },
) {
  const now = new Date().toISOString()

  const existingResult = await (supabase.from('logistics_order_assignments') as any)
    .select('order_id, rider_id, logistics_status, notes, assigned_at, completed_at')
    .eq('order_id', payload.order_id)
    .maybeSingle()

  if (existingResult.error) {
    const message = String(existingResult.error.message || '')
    if (includesMissingTable(message, 'logistics_order_assignments')) {
      return null
    }
  }

  const existing = existingResult.data || null
  const resolvedRiderId = payload.rider_id !== undefined ? payload.rider_id : (existing?.rider_id ?? null)
  const resolvedStatus = payload.logistics_status ?? existing?.logistics_status ?? 'pending'
  const resolvedNotes = payload.notes !== undefined ? payload.notes : (existing?.notes ?? null)
  const resolvedAssignedAt = payload.assigned_at !== undefined
    ? payload.assigned_at
    : (existing?.assigned_at ?? (resolvedRiderId ? now : null))
  const resolvedCompletedAt = payload.completed_at !== undefined ? payload.completed_at : (existing?.completed_at ?? null)

  const attempts = [
    {
      order_id: payload.order_id,
      rider_id: resolvedRiderId,
      logistics_status: resolvedStatus,
      notes: resolvedNotes,
      assigned_at: resolvedAssignedAt,
      completed_at: resolvedCompletedAt,
      updated_at: now,
    },
    {
      order_id: payload.order_id,
      rider_id: resolvedRiderId,
      logistics_status: resolvedStatus,
      assigned_at: resolvedAssignedAt,
      completed_at: resolvedCompletedAt,
      updated_at: now,
    },
    {
      order_id: payload.order_id,
      rider_id: resolvedRiderId,
      logistics_status: resolvedStatus,
      assigned_at: resolvedAssignedAt,
      completed_at: resolvedCompletedAt,
    },
  ]

  let lastError: any = null
  for (const attempt of attempts) {
    const result = await (supabase.from('logistics_order_assignments') as any)
      .upsert(attempt, { onConflict: 'order_id' })
      .select('*')
      .single()

    if (!result.error) return result.data

    const message = String(result.error.message || '')
    if (includesMissingTable(message, 'logistics_order_assignments')) {
      return null
    }

    if (!isMissingColumn(message)) {
      throw result.error
    }

    lastError = result.error
  }

  if (lastError) throw lastError
  return null
}

async function ensureRiderTableExists(supabase: any) {
  const probe = await (supabase.from('logistics_riders') as any).select('id').limit(1)
  if (!probe.error) return true

  const message = String(probe.error.message || '')
  if (includesMissingTable(message, 'logistics_riders')) return false
  throw probe.error
}

export async function registerOrderForLogistics(payload: LogisticsOrderPayload) {
  try {
    const supabase = await createClient()

    const orderId = String(payload?.order_id || '').trim()
    if (!orderId) {
      return { success: false, error: 'Order id is required for logistics registration.' }
    }

    const order = await readOrderForDeliveryContext(supabase, orderId)
    if (!order) {
      return { success: false, error: 'Order not found for logistics registration.' }
    }

    if (String(order.delivery_type || '').toLowerCase() === 'pickup') {
      return { success: true, skipped: true, reason: 'Pickup orders do not require logistics dispatch.' }
    }

    await upsertLogisticsAssignment(supabase, {
      order_id: orderId,
      logistics_status: 'pending',
      notes: null,
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getLogisticsOrders() {
  try {
    const supabase = await createClient()

    const ordersResult = await selectOrdersWithCompatibility(supabase, 'list')

    if (ordersResult.error) throw ordersResult.error

    const assignmentsResult = await (supabase.from('logistics_order_assignments') as any)
      .select('*')
      .order('updated_at', { ascending: false })

    const ridersResult = await (supabase.from('logistics_riders') as any)
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    const assignmentsMissing = assignmentsResult.error && includesMissingTable(String(assignmentsResult.error.message || ''), 'logistics_order_assignments')
    const ridersMissing = ridersResult.error && includesMissingTable(String(ridersResult.error.message || ''), 'logistics_riders')

    if (assignmentsResult.error && !assignmentsMissing) throw assignmentsResult.error
    if (ridersResult.error && !ridersMissing) throw ridersResult.error

    const assignments = assignmentsMissing ? [] : assignmentsResult.data || []
    const riders = ridersMissing ? [] : ridersResult.data || []

    const assignmentByOrderId = new Map(assignments.map((item: any) => [String(item.order_id || '').trim(), item]))
    const riderById = new Map(riders.map((item: any) => [String(item.id || '').trim(), item]))

    const orders = (ordersResult.data || [])
      .filter((order: any) => String(order.delivery_type || '').toLowerCase() !== 'pickup')
      .filter((order: any) => {
        const status = String(order.status || '').toLowerCase().trim()
        // Logistics should only receive orders after merchant packs.
        return ['order_packed', 'order_taken_for_delivery', 'in_transit', 'completed', 'delivered'].includes(status)
      })
      .map((order: any) => {
        const assignment = (assignmentByOrderId.get(String(order.id || '').trim()) as any) || null
        const rider = assignment?.rider_id ? riderById.get(String(assignment.rider_id || '').trim()) || null : null

        const logisticsStatus = assignment?.logistics_status
          || (String(order.status || '').toLowerCase() === 'delivered' ? 'completed' : 'pending')

        return {
          ...order,
          logistics_status: logisticsStatus,
          assigned_rider: rider,
          rider_id: assignment?.rider_id || null,
          assignment_notes: assignment?.notes || null,
          assigned_at: assignment?.assigned_at || null,
          completed_at: assignment?.completed_at || null,
          grand_total: Number(order.grand_total || order.total_amount || order.product_total || 0),
          delivery_fee: Number(order.delivery_fee || 0),
        }
      })

    const summary = orders.reduce(
      (acc: any, order: any) => {
        const status = String(order.logistics_status || '').toLowerCase()
        const deliveryFee = Number(order.delivery_fee || 0)
        const orderDelivered = ['completed', 'delivered'].includes(String(order.status || '').toLowerCase())
          || String(order.escrow_status || '').toLowerCase() === 'released'

        acc.totalOrders += 1
        if (status === 'assigned') acc.assignedOrders += 1
        if (status === 'completed') acc.completedOrders += 1
        if (status === 'pending') acc.pendingOrders += 1

        if (orderDelivered) {
          acc.releasedEscrow += deliveryFee
        } else {
          acc.heldEscrow += deliveryFee
        }

        return acc
      },
      {
        totalOrders: 0,
        pendingOrders: 0,
        assignedOrders: 0,
        completedOrders: 0,
        heldEscrow: 0,
        releasedEscrow: 0,
      },
    )

    return {
      success: true,
      data: {
        orders,
        riders,
        summary,
        schemaWarnings: {
          logisticsAssignmentsTableMissing: assignmentsMissing,
          logisticsRidersTableMissing: ridersMissing,
        },
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createLogisticsRider(payload: { name: string; email?: string; phone?: string; region?: string }) {
  try {
    const supabase = await createClient()
    const tableExists = await ensureRiderTableExists(supabase)

    if (!tableExists) {
      return {
        success: false,
        error: 'Logistics rider table is missing. Run scripts/014-create-logistics-tables.sql and retry.',
      }
    }

    const riderPayload = {
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone || null,
      region: payload.region || null,
      is_active: true,
    }

    const result = await (supabase.from('logistics_riders') as any)
      .insert(riderPayload)
      .select('*')
      .single()

    if (result.error) throw result.error
    return { success: true, data: result.data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deactivateLogisticsRider(riderId: string) {
  try {
    const supabase = await createClient()
    const result = await (supabase.from('logistics_riders') as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', riderId)
      .select('id')
      .maybeSingle()

    if (result.error) {
      const message = String(result.error.message || '')
      if (includesMissingTable(message, 'logistics_riders')) {
        return {
          success: false,
          error: 'Logistics rider table is missing. Run scripts/014-create-logistics-tables.sql and retry.',
        }
      }
      throw result.error
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function assignRiderToOrder(orderId: string, riderId: string, notes?: string) {
  try {
    const supabase = await createClient()

    const order = await readOrderForDeliveryContext(supabase, orderId)
    if (!order) {
      return { success: false, error: 'Order not found.' }
    }

    const riderResult = await (supabase.from('logistics_riders') as any)
      .select('id, is_active')
      .eq('id', riderId)
      .maybeSingle()

    if (riderResult.error) {
      const message = String(riderResult.error.message || '')
      if (includesMissingTable(message, 'logistics_riders')) {
        return {
          success: false,
          error: 'Logistics rider table is missing. Run scripts/014-create-logistics-tables.sql and retry.',
        }
      }
      throw riderResult.error
    }

    if (!riderResult.data || riderResult.data.is_active === false) {
      return { success: false, error: 'Selected rider is unavailable.' }
    }

    const activeAssignmentsResult = await (supabase.from('logistics_order_assignments') as any)
      .select('order_id, logistics_status')
      .eq('rider_id', riderId)
      .in('logistics_status', ['assigned', 'in_transit', 'return_assigned', 'return_in_transit'])

    if (activeAssignmentsResult.error) {
      const message = String(activeAssignmentsResult.error.message || '')
      if (!includesMissingTable(message, 'logistics_order_assignments')) {
        throw activeAssignmentsResult.error
      }
    }

    const activeAssignments = Array.isArray(activeAssignmentsResult.data) ? activeAssignmentsResult.data : []
    const hasActiveAssignmentOnAnotherOrder = activeAssignments.some((row: any) => String(row.order_id || '') !== String(orderId || ''))

    if (hasActiveAssignmentOnAnotherOrder) {
      return { success: false, error: 'Selected rider is currently busy with another delivery.' }
    }

    const currentStatus = String(order.status || '').toLowerCase().trim()
    if (!['order_packed', 'order_taken_for_delivery', 'in_transit', 'completed', 'delivered'].includes(currentStatus)) {
      return { success: false, error: 'Order is not ready for logistics assignment yet.' }
    }

    const existingAssignment = await (supabase.from('logistics_order_assignments') as any)
      .select('logistics_status')
      .eq('order_id', orderId)
      .maybeSingle()

    const currentLogisticsStatus = String(existingAssignment.data?.logistics_status || '').toLowerCase()
    const isReturnFlow = currentLogisticsStatus === 'return_requested' || currentLogisticsStatus.startsWith('return_')

    await upsertLogisticsAssignment(supabase, {
      order_id: orderId,
      rider_id: riderId,
      logistics_status: isReturnFlow ? 'return_assigned' : 'assigned',
      notes: notes || null,
      assigned_at: new Date().toISOString(),
    })

    await notifyOrderActors(supabase, orderId, {
      buyerTitle: isReturnFlow ? 'Return rider assigned' : 'Delivery rider assigned',
      buyerMessage: isReturnFlow
        ? `A rider has been assigned for your return on order ${orderId}.`
        : `A rider has been assigned for order ${orderId}.`,
      buyerEventKey: `logistics:rider-assigned:buyer:${orderId}:${riderId}`,
      merchantTitle: isReturnFlow ? 'Return pickup assigned' : 'Order dispatch assigned',
      merchantMessage: isReturnFlow
        ? `A rider has been assigned to pick up returned item for order ${orderId}.`
        : `A rider has been assigned for order ${orderId}.`,
      merchantEventKey: `logistics:rider-assigned:merchant:${orderId}:${riderId}`,
    })



    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function markLogisticsOrderInTransit(orderId: string) {
  try {
    const supabase = await createClient()

    const order = await readOrderForDeliveryContext(supabase, orderId)
    if (!order) {
      return { success: false, error: 'Order not found.' }
    }

    const status = String(order.status || '').toLowerCase().trim()
    if (!['order_taken_for_delivery', 'in_transit'].includes(status)) {
      return { success: false, error: 'Order must be marked "taken for delivery" by merchant first.' }
    }

    const update = await updateOrderStatus(orderId, 'in_transit')
    if (!update.success) return update

    await upsertLogisticsAssignment(supabase, {
      order_id: orderId,
      logistics_status: 'in_transit',
      notes: null,
    })

    return { success: true, data: update.data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function completeLogisticsOrder(orderId: string, proofOfDeliveryUrl?: string | null) {
  try {
    const supabase = await createClient()

    const order = await readOrderForDeliveryContext(supabase, orderId)
    if (!order) {
      return { success: false, error: 'Order not found.' }
    }

    const status = String(order.status || '').toLowerCase().trim()
    if (!['in_transit', 'completed', 'delivered'].includes(status)) {
      return { success: false, error: 'Order must be in transit before completion.' }
    }

    const complete = await updateOrderStatus(orderId, 'completed')
    if (!complete.success) {
      return complete
    }

    await upsertLogisticsAssignment(supabase, {
      order_id: orderId,
      logistics_status: 'completed',
      notes: proofOfDeliveryUrl ? JSON.stringify({ proofOfDeliveryUrl, completedAt: new Date().toISOString() }) : null,
      completed_at: new Date().toISOString(),
    })

    return {
      success: true,
      data: complete.data,
      disbursement: complete.disbursement,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function autoAssignRiderToOrder(orderId: string) {
  try {
    const supabase = await createClient()
    const order = await readOrderForDeliveryContext(supabase, orderId)
    if (!order) return { success: false, error: 'Order not found.' }

    const ridersResult = await (supabase.from('logistics_riders') as any)
      .select('id, name, region, is_active')
      .eq('is_active', true)

    if (ridersResult.error) {
      return { success: false, error: ridersResult.error.message }
    }

    const activeAssignmentsResult = await (supabase.from('logistics_order_assignments') as any)
      .select('order_id, rider_id, logistics_status')
      .in('logistics_status', ['assigned', 'in_transit', 'return_assigned', 'return_in_transit'])

    if (activeAssignmentsResult.error && !includesMissingTable(String(activeAssignmentsResult.error.message || ''), 'logistics_order_assignments')) {
      return { success: false, error: activeAssignmentsResult.error.message }
    }

    const busyRiderIds = new Set(
      (activeAssignmentsResult.data || [])
        .map((row: any) => String(row?.rider_id || '').trim())
        .filter(Boolean),
    )

    const freeRiders = (ridersResult.data || []).filter((rider: any) => !busyRiderIds.has(String(rider.id || '').trim()))

    if (freeRiders.length === 0) {
      return { success: false, error: 'No free riders available for auto assignment.' }
    }

    const deliveryAddress = String(order.delivery_address || '').toLowerCase()
    const regionMatched = freeRiders.find((rider: any) => {
      const region = String(rider.region || '').toLowerCase().trim()
      return region && containsAnyText(deliveryAddress, [region])
    })

    const selected = regionMatched || freeRiders[0]
    return await assignRiderToOrder(orderId, String(selected.id || ''), 'Auto-assigned by system')
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function requestOrderReturn(orderId: string, reason: string, requestedBy: 'admin' | 'buyer' = 'admin') {
  try {
    const supabase = await createClient()
    const order = await readOrderForDeliveryContext(supabase, orderId)
    if (!order) return { success: false, error: 'Order not found.' }

    const normalizedOrderStatus = String(order.status || '').toLowerCase().trim()
    if (!['completed', 'delivered'].includes(normalizedOrderStatus)) {
      return { success: false, error: 'Return can only be requested after delivery.' }
    }

    const returnMeta = {
      type: 'return',
      requestedBy,
      reason: String(reason || '').trim() || 'Buyer reported issue with delivered product.',
      requestedAt: new Date().toISOString(),
    }

    await upsertLogisticsAssignment(supabase, {
      order_id: orderId,
      logistics_status: 'return_requested',
      notes: JSON.stringify(returnMeta),
    })

    await notifyOrderActors(supabase, orderId, {
      buyerTitle: 'Return request opened',
      buyerMessage: `Your return request for order ${orderId} has been received and logistics will assign a rider shortly.`,
      buyerEventKey: `return:requested:buyer:${orderId}`,
      merchantTitle: 'Return request on order',
      merchantMessage: `A return request was opened for order ${orderId}. Logistics will coordinate pickup.`,
      merchantEventKey: `return:requested:merchant:${orderId}`,
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function reportRiderIncident(orderId: string, riderId: string, incidentType: string, note?: string) {
  try {
    const supabase = await createClient()

    const assignmentResult = await (supabase.from('logistics_order_assignments') as any)
      .select('order_id, rider_id, logistics_status, notes')
      .eq('order_id', orderId)
      .eq('rider_id', riderId)
      .maybeSingle()

    if (assignmentResult.error || !assignmentResult.data) {
      return { success: false, error: 'Order not found or not assigned to this rider.' }
    }

    const existingNotes = safeJsonParse(assignmentResult.data.notes) || {}
    const existingIncidents = Array.isArray(existingNotes.incidents) ? existingNotes.incidents : []
    const incident = {
      type: String(incidentType || '').trim() || 'general_issue',
      note: String(note || '').trim(),
      reportedAt: new Date().toISOString(),
      riderId,
    }

    const nextNotes = {
      ...existingNotes,
      incidents: [...existingIncidents, incident],
      lastIncident: incident,
    }

    await upsertLogisticsAssignment(supabase, {
      order_id: orderId,
      notes: JSON.stringify(nextNotes),
    })

    await notifyOrderActors(supabase, orderId, {
      buyerTitle: 'Delivery incident reported',
      buyerMessage: `A delivery incident was reported for order ${orderId}. Logistics team is resolving it.`,
      buyerEventKey: `incident:buyer:${orderId}:${incident.type}`,
      merchantTitle: 'Rider incident on order',
      merchantMessage: `Rider reported "${incident.type}" on order ${orderId}.`,
      merchantEventKey: `incident:merchant:${orderId}:${incident.type}`,
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getRiderEarnings(riderId: string) {
  try {
    const supabase = await createClient()

    const completedAssignmentsResult = await (supabase.from('logistics_order_assignments') as any)
      .select('order_id, completed_at, logistics_status')
      .eq('rider_id', riderId)
      .in('logistics_status', ['completed', 'return_completed'])

    if (completedAssignmentsResult.error) {
      return { success: false, error: completedAssignmentsResult.error.message }
    }

    const assignments = completedAssignmentsResult.data || []
    const orderIds = assignments.map((row: any) => String(row.order_id || '')).filter(Boolean)

    let orders: any[] = []
    if (orderIds.length > 0) {
      const ordersResult = await (supabase.from('orders') as any)
        .select('id, delivery_fee, created_at')
        .in('id', orderIds)

      orders = ordersResult.data || []
    }

    const feeByOrderId = new Map(orders.map((row: any) => [String(row.id || ''), Number(row.delivery_fee || 0)]))
    const totalEarned = assignments.reduce((sum: number, row: any) => sum + Number(feeByOrderId.get(String(row.order_id || '')) || 0), 0)

    // Optional payout history table (graceful fallback if table doesn't exist)
    let payoutHistory: any[] = []
    let totalPaidOut = 0
    const payoutResult = await (supabase.from('logistics_rider_payouts') as any)
      .select('id, amount, status, created_at, paid_at, reference')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })

    if (!payoutResult.error && Array.isArray(payoutResult.data)) {
      payoutHistory = payoutResult.data
      totalPaidOut = payoutHistory
        .filter((row: any) => String(row.status || '').toLowerCase() === 'paid')
        .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
    }

    const availableBalance = Math.max(0, totalEarned - totalPaidOut)

    return {
      success: true,
      data: {
        totalEarned,
        totalPaidOut,
        availableBalance,
        completedDeliveries: assignments.length,
        payoutHistory,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function requestRiderPayout(riderId: string, amount: number) {
  try {
    const supabase = await createClient()
    const earnings = await getRiderEarnings(riderId)
    if (!earnings.success) return earnings

    const available = Number(earnings.data?.availableBalance || 0)
    const requested = Number(amount || 0)
    if (requested <= 0) {
      return { success: false, error: 'Invalid payout amount.' }
    }
    if (requested > available) {
      return { success: false, error: 'Requested amount exceeds available rider balance.' }
    }

    const insertResult = await (supabase.from('logistics_rider_payouts') as any)
      .insert({
        rider_id: riderId,
        amount: requested,
        status: 'pending',
        reference: `RPO-${Date.now()}`,
      })
      .select('id, amount, status, created_at, reference')
      .single()

    if (insertResult.error) {
      const message = String(insertResult.error.message || '')
      if (includesMissingTable(message, 'logistics_rider_payouts')) {
        return { success: false, error: 'Payout table is missing. Run latest logistics migration to enable payouts.' }
      }
      return { success: false, error: insertResult.error.message }
    }

    return { success: true, data: insertResult.data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
