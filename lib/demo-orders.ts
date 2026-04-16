import type { CartItem } from "@/lib/cart-context"

const DEMO_ORDERS_KEY = "demo_orders"

export interface DemoOrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  weight: number
}

export interface DemoOrder {
  id: string
  buyer_id: string
  merchant_id: string
  delivery_address: string
  delivery_type: string
  delivery_fee: number
  grand_total: number
  total_amount: number
  status: string
  created_at: string
  items: DemoOrderItem[]
  is_demo: boolean
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

export function getDemoOrders(): DemoOrder[] {
  if (!canUseStorage()) return []

  try {
    const raw = localStorage.getItem(DEMO_ORDERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveDemoOrders(orders: DemoOrder[]) {
  if (!canUseStorage()) return
  localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(orders))
}

export function createDemoOrdersFromCheckout(params: {
  buyerId: string
  items: CartItem[]
  deliveryAddress: string
  deliveryType: "normal" | "express" | "pickup"
  deliveryFee: number
}): DemoOrder[] {
  const groupedByMerchant = params.items.reduce<Record<string, CartItem[]>>((acc, item) => {
    const key = item.merchantId
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const merchantIds = Object.keys(groupedByMerchant)
  if (merchantIds.length === 0) return []

  const now = new Date().toISOString()
  const existing = getDemoOrders()

  const createdOrders = merchantIds.map((merchantId, index) => {
    const merchantItems = groupedByMerchant[merchantId]
    const itemRows: DemoOrderItem[] = merchantItems.map((item, itemIndex) => ({
      id: `demo_item_${Date.now()}_${index}_${itemIndex}`,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      weight: 0.5,
    }))

    const productTotal = itemRows.reduce((sum, row) => sum + row.total_price, 0)
    const allocatedDeliveryFee = index === 0 ? params.deliveryFee : 0

    return {
      id: `demo_${Date.now()}_${index}`,
      buyer_id: params.buyerId,
      merchant_id: merchantId,
      delivery_address: params.deliveryAddress,
      delivery_type: params.deliveryType,
      delivery_fee: allocatedDeliveryFee,
      grand_total: productTotal + allocatedDeliveryFee,
      total_amount: productTotal + allocatedDeliveryFee,
      status: "paid",
      created_at: now,
      items: itemRows,
      is_demo: true,
    }
  })

  const next = [...createdOrders, ...existing]
  saveDemoOrders(next)
  return createdOrders
}

export function getDemoMerchantOrders(merchantId: string): DemoOrder[] {
  return getDemoOrders()
    .filter((order) => String(order.merchant_id) === String(merchantId))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function getDemoBuyerOrders(buyerId: string): DemoOrder[] {
  return getDemoOrders()
    .filter((order) => String(order.buyer_id) === String(buyerId))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function updateDemoOrderStatus(orderId: string, status: string): DemoOrder | null {
  const current = getDemoOrders()
  let updated: DemoOrder | null = null

  const next = current.map((order) => {
    if (String(order.id) !== String(orderId)) return order
    updated = { ...order, status }
    return updated
  })

  saveDemoOrders(next)
  return updated
}
