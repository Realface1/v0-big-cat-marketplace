"use server"

import { createClient } from "@/lib/supabase/server"
import { dispatchNotification } from "@/lib/notifications"

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function toCurrency(value: number) {
  return `NGN ${Number(value || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`
}

async function getMerchants() {
  const supabase = await createClient()
  const { data, error } = await (supabase.from("auth_users") as any)
    .select("id, email, name, business_name")
    .eq("role", "merchant")

  if (error) throw error
  return data || []
}

async function getMerchantRevenue(merchantId: string, fromIso: string, toIso: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase.from("orders") as any)
    .select("id, status, grand_total, total_amount, product_total")
    .eq("merchant_id", merchantId)
    .gte("created_at", fromIso)
    .lt("created_at", toIso)

  if (error) return { orders: 0, revenue: 0 }

  const settledStatuses = new Set(["paid", "processing", "in_transit", "shipped", "delivered", "completed"])
  const rows = (data || []).filter((row: any) => settledStatuses.has(String(row.status || "").toLowerCase()))
  const revenue = rows.reduce((sum: number, row: any) => {
    const value = Number(row.grand_total || row.total_amount || row.product_total || 0)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)

  return { orders: rows.length, revenue }
}

export async function runUnprocessedOrderReminderJob() {
  const supabase = await createClient()
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const { data: states, error } = await (supabase.from("order_automation_state") as any)
    .select("order_id, merchant_id, reminder_sent_at, created_at")
    .is("reminder_sent_at", null)
    .lte("created_at", tenMinutesAgo)

  if (error) return { success: false, error: error.message, processed: 0 }

  let processed = 0
  for (const state of states || []) {
    const orderId = String(state.order_id || "")
    const merchantId = String(state.merchant_id || "")
    if (!orderId || !merchantId) continue

    const orderResult = await (supabase.from("orders") as any)
      .select("status")
      .eq("id", orderId)
      .maybeSingle()

    if (orderResult.error) continue

    const status = String(orderResult.data?.status || "").toLowerCase()
    const isUnprocessed = ["pending", "paid", "new"].includes(status)
    if (!isUnprocessed) continue

    await dispatchNotification({
      userId: merchantId,
      type: "alert",
      title: "You have an unprocessed order",
      message: `Order ${orderId} has not been processed after 10 minutes. Please respond now.`,
      eventKey: `order:unprocessed:${orderId}`,
      emailSubject: "Reminder: Unprocessed order",
    })

    await (supabase.from("order_automation_state") as any)
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("order_id", orderId)

    processed += 1
  }

  return { success: true, processed }
}

export async function runLowStockAlertJob(threshold = 5) {
  const supabase = await createClient()
  const { data: products, error } = await (supabase.from("products") as any)
    .select("id, merchant_id, name, stock")
    .lt("stock", threshold)

  if (error) return { success: false, error: error.message, processed: 0 }

  const dateKey = new Date().toISOString().slice(0, 10)
  let processed = 0

  for (const product of products || []) {
    const merchantId = String(product.merchant_id || "")
    const productId = String(product.id || "")
    if (!merchantId || !productId) continue

    await dispatchNotification({
      userId: merchantId,
      type: "alert",
      title: "Low stock alert",
      message: `${product.name || "A product"} is running low on stock (${Number(product.stock || 0)} left).`,
      eventKey: `stock:low:${productId}:${dateKey}`,
      emailSubject: "Low stock alert",
    })

    processed += 1
  }

  return { success: true, processed }
}

export async function runBizPilotAlertsJob() {
  const merchants = await getMerchants()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const weekKey = startOfWeek(now).toISOString().slice(0, 10)

  let processed = 0

  for (const merchant of merchants) {
    const merchantId = String(merchant.id)
    const current = await getMerchantRevenue(merchantId, sevenDaysAgo.toISOString(), now.toISOString())
    const previous = await getMerchantRevenue(merchantId, fourteenDaysAgo.toISOString(), sevenDaysAgo.toISOString())

    if (previous.revenue > 0 && current.revenue < previous.revenue * 0.8) {
      const dropPct = Math.round(((previous.revenue - current.revenue) / previous.revenue) * 100)
      await dispatchNotification({
        userId: merchantId,
        type: "alert",
        title: "BizPilot: Sales dropped this week",
        message: `Your sales dropped by ${dropPct}% vs last week. Tip: run a limited-time promotion and restock your top product.`,
        eventKey: `bizpilot:drop:${merchantId}:${weekKey}`,
        emailSubject: "BizPilot alert: Sales dropped",
      })
      processed += 1
      continue
    }

    if (current.revenue > 0 && (previous.revenue === 0 || current.revenue >= previous.revenue * 1.2)) {
      await dispatchNotification({
        userId: merchantId,
        type: "alert",
        title: "BizPilot: Product performance is strong",
        message: `Great momentum this week. Revenue: ${toCurrency(current.revenue)}. Tip: increase stock for your best seller and run retargeting ads.`,
        eventKey: `bizpilot:good:${merchantId}:${weekKey}`,
        emailSubject: "BizPilot insight: Strong product performance",
      })
      processed += 1
    }
  }

  return { success: true, processed }
}

export async function runWeeklyBusinessReportJob() {
  const supabase = await createClient()
  const merchants = await getMerchants()
  const weekStart = startOfWeek(new Date())
  const weekStartIso = weekStart.toISOString()
  const weekStartKey = weekStartIso.slice(0, 10)

  let processed = 0

  for (const merchant of merchants) {
    const merchantId = String(merchant.id)

    const existing = await (supabase.from("weekly_business_report_logs") as any)
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("week_start", weekStartKey)
      .maybeSingle()

    if (existing.data) continue

    const summary = await getMerchantRevenue(merchantId, weekStartIso, new Date().toISOString())

    const itemsResult = await (supabase.from("order_items") as any)
      .select("product_name, quantity, merchant_id, created_at")
      .eq("merchant_id", merchantId)
      .gte("created_at", weekStartIso)

    const counts = new Map<string, number>()
    for (const item of itemsResult.data || []) {
      const name = String(item.product_name || "Unknown product")
      const qty = Number(item.quantity || 0)
      counts.set(name, (counts.get(name) || 0) + qty)
    }

    let bestSellingProduct = "No sales yet"
    let bestQty = 0
    for (const [name, qty] of counts.entries()) {
      if (qty > bestQty) {
        bestQty = qty
        bestSellingProduct = name
      }
    }

    await dispatchNotification({
      userId: merchantId,
      type: "report",
      title: "Weekly Business Report",
      message: `Orders: ${summary.orders} | Revenue: ${toCurrency(summary.revenue)} | Best seller: ${bestSellingProduct}`,
      eventKey: `weekly:report:${merchantId}:${weekStartKey}`,
      emailSubject: "Your weekly business report",
      emailText: `Weekly report\n\nTotal orders: ${summary.orders}\nTotal revenue: ${toCurrency(summary.revenue)}\nBest selling product: ${bestSellingProduct}`,
    })

    await (supabase.from("weekly_business_report_logs") as any).insert({
      merchant_id: merchantId,
      week_start: weekStartKey,
      totals: {
        total_orders: summary.orders,
        total_revenue: summary.revenue,
        best_selling_product: bestSellingProduct,
      },
    })

    processed += 1
  }

  return { success: true, processed }
}

export async function runAbandonedCartRecoveryJob() {
  const supabase = await createClient()
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data: sessions, error } = await (supabase.from("cart_sessions") as any)
    .select("id, user_id, item_count, cart_value, checked_out_at, reminder_sent_at, last_active_at")
    .is("checked_out_at", null)
    .is("reminder_sent_at", null)
    .gt("item_count", 0)
    .lte("last_active_at", thirtyMinutesAgo)

  if (error) return { success: false, error: error.message, processed: 0 }

  let processed = 0
  for (const session of sessions || []) {
    const userId = String(session.user_id || "")
    if (!userId) continue

    const eventKey = `cart:abandoned:${session.id}`

    await dispatchNotification({
      userId,
      type: "system",
      title: "You left items in your cart",
      message: `You have ${Number(session.item_count || 0)} item(s) waiting. Complete checkout before they run out of stock.`,
      eventKey,
      emailSubject: "Complete your order",
    })

    await (supabase.from("cart_sessions") as any)
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", session.id)

    processed += 1
  }

  return { success: true, processed }
}

export async function runAllAutomationJobs() {
  const [orderReminders, bizpilot, lowStock, weeklyReport, abandonedCart] = await Promise.all([
    runUnprocessedOrderReminderJob(),
    runBizPilotAlertsJob(),
    runLowStockAlertJob(5),
    runWeeklyBusinessReportJob(),
    runAbandonedCartRecoveryJob(),
  ])

  return {
    success: true,
    jobs: {
      orderReminders,
      bizpilot,
      lowStock,
      weeklyReport,
      abandonedCart,
    },
  }
}
