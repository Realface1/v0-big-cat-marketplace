const LOGISTICS_API_URL = "/api/logistics/orders"

export interface LogisticsOrderItem {
  product_name: string
  quantity: number
}

export interface LogisticsOrderPayload {
  order_id: string
  customer_name: string
  customer_phone: string
  customer_city?: string
  customer_state?: string
  delivery_address: string
  items: LogisticsOrderItem[]
  total_amount: number
  delivery_fee: number
  status: "pending"
}

/**
 * Send a placed order to the standalone in-platform logistics system.
 * Fire-and-forget; errors are logged but do not block checkout.
 */
export async function sendOrderToLogistics(payload: LogisticsOrderPayload): Promise<void> {
  try {
    const res = await fetch(LOGISTICS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error(`[Logistics] HTTP ${res.status}: ${text}`)
    }
  } catch (err) {
    console.error("[Logistics] Failed to send order to logistics system:", err)
  }
}
