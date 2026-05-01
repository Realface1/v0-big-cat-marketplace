'use server'

import { createClient } from '@/lib/supabase/server'
import { updateOrderStatus } from '@/lib/order-actions'

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

  const attempts = [
    {
      order_id: payload.order_id,
      rider_id: payload.rider_id ?? null,
      logistics_status: payload.logistics_status ?? 'pending',
      notes: payload.notes ?? null,
      assigned_at: payload.assigned_at ?? (payload.rider_id ? now : null),
      completed_at: payload.completed_at ?? null,
      updated_at: now,
    },
    {
      order_id: payload.order_id,
      rider_id: payload.rider_id ?? null,
      logistics_status: payload.logistics_status ?? 'pending',
      assigned_at: payload.assigned_at ?? (payload.rider_id ? now : null),
      completed_at: payload.completed_at ?? null,
      updated_at: now,
    },
    {
      order_id: payload.order_id,
      rider_id: payload.rider_id ?? null,
      logistics_status: payload.logistics_status ?? 'pending',
      assigned_at: payload.assigned_at ?? (payload.rider_id ? now : null),
      completed_at: payload.completed_at ?? null,
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

    const assignmentByOrderId = new Map(assignments.map((item: any) => [String(item.order_id), item]))
    const riderById = new Map(riders.map((item: any) => [String(item.id), item]))

    const orders = (ordersResult.data || [])
      .filter((order: any) => String(order.delivery_type || '').toLowerCase() !== 'pickup')
      .map((order: any) => {
        const assignment = assignmentByOrderId.get(String(order.id)) || null
        const rider = assignment?.rider_id ? riderById.get(String(assignment.rider_id)) || null : null

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
        const orderDelivered = String(order.status || '').toLowerCase() === 'delivered' || String(order.escrow_status || '').toLowerCase() === 'released'

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

    await upsertLogisticsAssignment(supabase, {
      order_id: orderId,
      rider_id: riderId,
      logistics_status: 'assigned',
      notes: notes || null,
      assigned_at: new Date().toISOString(),
    })

    // Optional status transition to indicate dispatch has started.
    await (supabase.from('orders') as any)
      .update({ status: 'shipped', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function completeLogisticsOrder(orderId: string, proofOfDeliveryUrl?: string | null) {
  try {
    const supabase = await createClient()

    const release = await updateOrderStatus(orderId, 'delivered')
    if (!release.success) {
      return release
    }

    await upsertLogisticsAssignment(supabase, {
      order_id: orderId,
      logistics_status: 'completed',
      notes: proofOfDeliveryUrl ? JSON.stringify({ proofOfDeliveryUrl, completedAt: new Date().toISOString() }) : null,
      completed_at: new Date().toISOString(),
    })

    return {
      success: true,
      data: release.data,
      disbursement: release.disbursement,
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
