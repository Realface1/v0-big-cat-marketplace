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

// Process merchants in pages so a single getMerchants() call never returns a 50k-row payload
async function forEachMerchantBatch(
  callback: (batch: any[]) => Promise<void>,
  pageSize = 500,
) {
  const supabase = await createClient()
  let offset = 0

  while (true) {
    const { data, error } = await (supabase.from("auth_users") as any)
      .select("id, email, name, business_name")
      .eq("role", "merchant")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) throw error
    const batch = data || []
    if (batch.length === 0) break

    await callback(batch)
    if (batch.length < pageSize) break
    offset += pageSize
  }
}

// Fetch revenue for ALL merchants in two bulk queries instead of N per-merchant queries
async function getAllMerchantsRevenue(merchantIds: string[], fromIso: string, toIso: string) {
  if (merchantIds.length === 0) return new Map<string, { orders: number; revenue: number }>()
  const supabase = await createClient()
  const settledStatuses = ["paid", "processing", "in_transit", "shipped", "delivered", "completed"]
  const { data, error } = await (supabase.from("orders") as any)
    .select("merchant_id, status, grand_total, total_amount, product_total")
    .in("merchant_id", merchantIds)
    .in("status", settledStatuses)
    .gte("created_at", fromIso)
    .lt("created_at", toIso)

  const result = new Map<string, { orders: number; revenue: number }>()
  for (const id of merchantIds) result.set(id, { orders: 0, revenue: 0 })

  if (error || !data) return result

  for (const row of data) {
    const id = String(row.merchant_id || "")
    if (!id) continue
    const existing = result.get(id) || { orders: 0, revenue: 0 }
    const value = Number(row.grand_total || row.total_amount || row.product_total || 0)
    result.set(id, { orders: existing.orders + 1, revenue: existing.revenue + (Number.isFinite(value) ? value : 0) })
  }

  return result
}

// Run an async task list in parallel with a concurrency cap
async function batchRun<T>(tasks: (() => Promise<T>)[], concurrency = 10): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency).map((fn) => fn())
    const settled = await Promise.allSettled(batch)
    for (const s of settled) {
      if (s.status === "fulfilled") results.push(s.value)
    }
  }
  return results
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
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const weekKey = startOfWeek(now).toISOString().slice(0, 10)

  let processed = 0

  await forEachMerchantBatch(async (merchants) => {
    const merchantIds = merchants.map((m: any) => String(m.id))

    // Two bulk queries per batch instead of 2×N sequential queries
    const [currentRevenues, previousRevenues] = await Promise.all([
      getAllMerchantsRevenue(merchantIds, sevenDaysAgo.toISOString(), now.toISOString()),
      getAllMerchantsRevenue(merchantIds, fourteenDaysAgo.toISOString(), sevenDaysAgo.toISOString()),
    ])

    const tasks = merchants.map((merchant: any) => async () => {
      const merchantId = String(merchant.id)
      const current = currentRevenues.get(merchantId) || { orders: 0, revenue: 0 }
      const previous = previousRevenues.get(merchantId) || { orders: 0, revenue: 0 }

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
        return
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
    })

    await batchRun(tasks, 10)
  })

  return { success: true, processed }
}

export async function runWeeklyBusinessReportJob() {
  const weekStart = startOfWeek(new Date())
  const weekStartIso = weekStart.toISOString()
  const weekStartKey = weekStartIso.slice(0, 10)

  let processed = 0

  await forEachMerchantBatch(async (merchants) => {
    const supabase = await createClient()
    const merchantIds = merchants.map((m: any) => String(m.id))

    // Bulk fetch: already-reported merchants this week
    const { data: existingLogs } = await (supabase.from("weekly_business_report_logs") as any)
      .select("merchant_id")
      .in("merchant_id", merchantIds)
      .eq("week_start", weekStartKey)

    const alreadyReported = new Set((existingLogs || []).map((r: any) => String(r.merchant_id)))

    // Bulk fetch: this week's revenue in 1 query
    const revenueMap = await getAllMerchantsRevenue(merchantIds, weekStartIso, new Date().toISOString())

    // Bulk fetch: this week's order items for all merchants in 1 query
    const { data: allItems } = await (supabase.from("order_items") as any)
      .select("product_name, quantity, merchant_id")
      .in("merchant_id", merchantIds)
      .gte("created_at", weekStartIso)

    // Build per-merchant best-seller map from the single bulk result
    const itemsByMerchant = new Map<string, Map<string, number>>()
    for (const item of allItems || []) {
      const mid = String(item.merchant_id || "")
      if (!mid) continue
      if (!itemsByMerchant.has(mid)) itemsByMerchant.set(mid, new Map())
      const counts = itemsByMerchant.get(mid)!
      const name = String(item.product_name || "Unknown product")
      counts.set(name, (counts.get(name) || 0) + Number(item.quantity || 0))
    }

    const tasks = merchants
      .filter((m: any) => !alreadyReported.has(String(m.id)))
      .map((merchant: any) => async () => {
        const merchantId = String(merchant.id)
        const summary = revenueMap.get(merchantId) || { orders: 0, revenue: 0 }

        const counts = itemsByMerchant.get(merchantId) || new Map()
        let bestSellingProduct = "No sales yet"
        let bestQty = 0
        for (const [name, qty] of counts.entries()) {
          if (qty > bestQty) { bestQty = qty; bestSellingProduct = name }
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
      })

    await batchRun(tasks, 10)
  })

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
