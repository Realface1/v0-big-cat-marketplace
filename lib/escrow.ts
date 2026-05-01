export type EscrowStatus = "held" | "released"

export interface EscrowRecord {
  order_id: string
  total_amount: number
  product_amount: number
  delivery_fee: number
  merchant_status: EscrowStatus
  logistics_status: EscrowStatus
}

const ESCROW_STORAGE_KEY = "escrow_data"

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

export function getEscrowData(): EscrowRecord[] {
  if (!canUseStorage()) return []

  try {
    const raw = localStorage.getItem(ESCROW_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveEscrowData(records: EscrowRecord[]) {
  if (!canUseStorage()) return
  localStorage.setItem(ESCROW_STORAGE_KEY, JSON.stringify(records))
}

export function getEscrowByOrderId(orderId: string) {
  return getEscrowData().find((record) => record.order_id === orderId)
}

export function createEscrowRecord(orderId: string, totalAmount: number, deliveryFee: number, productAmountOverride?: number) {
  const all = getEscrowData()
  const existing = all.find((record) => record.order_id === orderId)
  const resolvedDeliveryFee = Math.max(0, Number(deliveryFee || 0))
  const productAmount = Math.max(
    0,
    Number(productAmountOverride || 0) || (Number(totalAmount || 0) - resolvedDeliveryFee),
  )
  const resolvedTotalAmount = Math.max(0, Number(totalAmount || 0), productAmount + resolvedDeliveryFee)

  const record: EscrowRecord = {
    order_id: orderId,
    total_amount: resolvedTotalAmount,
    product_amount: productAmount,
    delivery_fee: resolvedDeliveryFee,
    merchant_status: existing?.merchant_status || "held",
    logistics_status: existing?.logistics_status || "held",
  }

  const next = all.filter((item) => item.order_id !== orderId)
  next.push(record)
  saveEscrowData(next)

  return record
}

export function releaseLogisticsEscrow(orderId: string) {
  const all = getEscrowData()
  const next = all.map((record) =>
    record.order_id === orderId
      ? { ...record, logistics_status: "released" as EscrowStatus }
      : record
  )
  saveEscrowData(next)
  return next.find((record) => record.order_id === orderId) || null
}

export function releaseMerchantEscrow(orderId: string) {
  const all = getEscrowData()
  const next = all.map((record) =>
    record.order_id === orderId
      ? { ...record, merchant_status: "released" as EscrowStatus }
      : record
  )
  saveEscrowData(next)
  return next.find((record) => record.order_id === orderId) || null
}

export function markOrderDeliveredAndReleaseEscrow(orderId: string) {
  const all = getEscrowData()
  const next = all.map((record) =>
    record.order_id === orderId
      ? {
          ...record,
          logistics_status: "released" as EscrowStatus,
          merchant_status: "released" as EscrowStatus,
        }
      : record
  )

  saveEscrowData(next)
  return next.find((record) => record.order_id === orderId) || null
}
