import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getRiderId(request: NextRequest) {
  return String(request.headers.get('x-rider-id') || '').trim()
}

export async function GET(request: NextRequest) {
  try {
    const riderId = getRiderId(request)
    if (!riderId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()

    // Get all assignments for this rider
    const assignmentsResult = await (supabase.from('logistics_order_assignments') as any)
      .select('order_id, logistics_status, assigned_at, completed_at, notes, updated_at')
      .eq('rider_id', riderId)
      .order('updated_at', { ascending: false })

    if (assignmentsResult.error) {
      console.error('Rider orders fetch error:', assignmentsResult.error)
      return NextResponse.json({ success: false, error: 'Failed to load orders.' }, { status: 500 })
    }

    const assignments = assignmentsResult.data || []
    const orderIds = assignments.map((a: any) => String(a.order_id)).filter(Boolean)

    if (orderIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Fetch order details
    const ordersResult = await (supabase.from('orders') as any)
      .select('id, status, delivery_address, delivery_fee, grand_total, product_total, created_at, buyer_id')
      .in('id', orderIds)

    const orders = (ordersResult.data || [])
    const orderById = new Map(orders.map((o: any) => [String(o.id), o]))

    const enriched = assignments.map((assignment: any) => {
      const order = orderById.get(String(assignment.order_id)) as any || {}
      return {
        order_id: assignment.order_id,
        logistics_status: assignment.logistics_status,
        assigned_at: assignment.assigned_at,
        completed_at: assignment.completed_at,
        notes: assignment.notes,
        updated_at: assignment.updated_at,
        delivery_address: order.delivery_address || '',
        delivery_fee: Number(order.delivery_fee || 0),
        grand_total: Number(order.grand_total || order.product_total || 0),
        order_status: order.status || '',
        created_at: order.created_at || '',
      }
    })

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    console.error('Rider orders GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 })
  }
}
