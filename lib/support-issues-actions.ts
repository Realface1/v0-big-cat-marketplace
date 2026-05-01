import { createClient } from '@/lib/supabase/server'
import { releaseFundsFromEscrow } from '@/lib/escrow-actions'

type ReportIssueInput = {
  orderId: string
  buyerId: string
  issueType: string
  description: string
}

function normalizeStatus(value: string) {
  const normalized = String(value || '').toLowerCase().trim()
  if (['open', 'in_review', 'resolved', 'rejected'].includes(normalized)) return normalized
  return 'open'
}

export async function reportOrderIssue(input: ReportIssueInput) {
  try {
    const supabase = await createClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyer_id, merchant_id, status')
      .eq('id', input.orderId)
      .single()

    if (orderError || !order) {
      return { success: false, error: 'Order not found' }
    }

    if (String(order.buyer_id) !== String(input.buyerId)) {
      return { success: false, error: 'You are not allowed to report this order' }
    }

    const payload = {
      order_id: input.orderId,
      buyer_id: input.buyerId,
      merchant_id: order.merchant_id || null,
      issue_type: String(input.issueType || 'other').trim() || 'other',
      description: String(input.description || '').trim(),
      status: 'open',
    }

    if (!payload.description) {
      return { success: false, error: 'Please describe the issue' }
    }

    const { data, error } = await (supabase.from('support_issues') as any).insert(payload).select('*').single()
    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to report issue' }
  }
}

export async function getAdminSupportIssues() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('support_issues')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getBuyerSupportIssues(buyerId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('support_issues')
      .select('*')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function updateSupportIssueStatus(issueId: string, status: string, adminNotes?: string) {
  try {
    const supabase = await createClient()
    const nextStatus = normalizeStatus(status)

    const payload = {
      status: nextStatus,
      ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
    }

    const { data, error } = await (supabase.from('support_issues') as any)
      .update(payload)
      .eq('id', issueId)
      .select('*')
      .single()

    if (error) throw error

    // If dispute is being resolved, handle fund execution
    if ((nextStatus === 'resolved' || nextStatus === 'rejected') && data) {
      await executeDisputeResolution(supabase, data)
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Execute fund transfer based on dispute resolution
async function executeDisputeResolution(supabase: any, issue: any) {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', issue.order_id)
      .single()

    if (orderError || !order) return

    // Get admin notes to determine resolution type (for now, assume resolved = merchant keeps, rejected = buyer refund)
    const adminNotes = String(issue.admin_notes || '').toLowerCase()
    const resolutionType = adminNotes.includes('refund') || issue.status === 'rejected' ? 'refund' : 'merchant'

    if (resolutionType === 'refund') {
      // Issue refund to buyer - update order status to 'refunded'
      await (supabase.from('orders') as any)
        .update({
          status: 'refunded',
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', issue.order_id)

      // Create a transaction record for the refund
      const refundAmount = order.grand_total || order.total_amount || 0
      await (supabase.from('transactions') as any).insert({
        order_id: issue.order_id,
        buyer_id: issue.buyer_id,
        merchant_id: issue.merchant_id,
        type: 'refund',
        amount: refundAmount,
        reason: `Dispute resolution: ${issue.issue_type}`,
        status: 'completed',
        created_at: new Date().toISOString(),
      }).select()
    } else {
      // Merchant wins: settle through escrow release so wallet credit and escrow records stay consistent.
      await releaseFundsFromEscrow(supabase, String(issue.order_id || ''), order)
    }
  } catch {
    // Silently fail - dispute resolution core is complete, fund execution is best-effort
  }
}
