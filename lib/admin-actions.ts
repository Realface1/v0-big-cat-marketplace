import { createClient } from '@/lib/supabase/server'
import { buildLocationQuery, geocodeLocation, haversineDistanceKm } from '@/lib/location-utils'
import { getBusinessScale, getBusinessScaleProgress } from '@/lib/business-metrics'

function toAmount(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function isBigZeeWears(value: unknown) {
  const normalized = String(value || '').toLowerCase()
  return normalized.includes('big zee wears') || normalized.includes('big zee')
}

function sortBigZeeFirst<T>(items: T[], getText: (item: T) => string) {
  return [...items].sort((a, b) => {
    const aIsBigZee = isBigZeeWears(getText(a))
    const bIsBigZee = isBigZeeWears(getText(b))

    if (aIsBigZee === bIsBigZee) return 0
    return aIsBigZee ? -1 : 1
  })
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isRecognizedSale(order: any) {
  const status = String(order?.status || '').toLowerCase()
  const paymentStatus = String(order?.payment_status || '').toLowerCase()
  const escrowStatus = String(order?.escrow_status || '').toLowerCase()

  return status === 'delivered' || status === 'completed' || paymentStatus === 'completed' || escrowStatus === 'released'
}

function getMerchantSalesAmount(order: any) {
  const deliveryFee = toAmount(order?.delivery_fee)
  const productTotal = toAmount(order?.product_total)
  const grandTotal = toAmount(order?.grand_total ?? order?.total_amount)
  return Math.max(0, productTotal || (grandTotal - deliveryFee))
}

function extractFallbackCostPrice(images: unknown) {
  if (!Array.isArray(images)) return 0

  const token = images.find(
    (item) => typeof item === 'string' && item.startsWith('__bigcat_cost_price__:'),
  )

  if (typeof token !== 'string') return 0

  return toAmount(token.replace('__bigcat_cost_price__:', ''))
}

function getOrderItemCost(item: any, costMap: Map<string, number>) {
  const quantity = Math.max(1, toAmount(item?.quantity) || 1)
  const productId = String(item?.product_id || item?.products?.id || '')
  const unitCost = toAmount(item?.products?.cost_price ?? costMap.get(productId) ?? 0)
  return Math.max(0, unitCost * quantity)
}

export async function getMerchants(options: { buyerLat?: number | null; buyerLng?: number | null } = {}) {
  try {
    const supabase = await createClient()
    const [{ data, error }, { data: orderRows }] = await Promise.all([
      supabase.from('auth_users').select('*').eq('role', 'merchant'),
      supabase
        .from('orders')
        .select('merchant_id, total_amount, grand_total, product_total, delivery_fee, status, payment_status, escrow_status, order_items(quantity, product_id, unit_price, price, total_price)'),
    ])

    if (error) throw error

    let productsResult = await supabase.from('products').select('id, merchant_id, cost_price, stock, images')
    if (productsResult.error && String(productsResult.error.message || '').toLowerCase().includes('cost_price')) {
      productsResult = await supabase.from('products').select('id, merchant_id, stock, images')
    }
    if (productsResult.error) throw productsResult.error

    const productRows = productsResult.data || []

    const latitude = toFiniteNumber(options.buyerLat)
    const longitude = toFiniteNumber(options.buyerLng)
    const locationCache = new Map<string, Awaited<ReturnType<typeof geocodeLocation>>>()
    const productCostMap = new Map<string, number>()
    const merchantInventoryCostMap = new Map<string, number>()

    for (const product of productRows || []) {
      const productId = String((product as any)?.id || '')
      const merchantId = String((product as any)?.merchant_id || '')
      const costPrice = toAmount((product as any)?.cost_price ?? extractFallbackCostPrice((product as any)?.images))
      const stock = toAmount((product as any)?.stock)

      if (productId) {
        productCostMap.set(productId, costPrice)
      }

      if (merchantId) {
        merchantInventoryCostMap.set(
          merchantId,
          (merchantInventoryCostMap.get(merchantId) || 0) + (costPrice * stock),
        )
      }
    }

    const merchantOrderMetrics = new Map<string, { totalSales: number; profitLoss: number; orders: number }>()

    for (const order of orderRows || []) {
      if (!isRecognizedSale(order)) continue

      const merchantId = String((order as any)?.merchant_id || '')
      if (!merchantId) continue

      const current = merchantOrderMetrics.get(merchantId) || { totalSales: 0, profitLoss: 0, orders: 0 }
      const saleAmount = getMerchantSalesAmount(order)
      const costOfGoods = Array.isArray((order as any)?.order_items)
        ? (order as any).order_items.reduce((sum: number, item: any) => sum + getOrderItemCost(item, productCostMap), 0)
        : 0

      current.totalSales += saleAmount
      current.profitLoss += saleAmount - costOfGoods
      current.orders += 1
      merchantOrderMetrics.set(merchantId, current)
    }

    let merchants = await Promise.all(
      (data || []).map(async (merchant: any) => {
        const merchantId = String(merchant?.id || '')
        const metrics = merchantOrderMetrics.get(merchantId) || { totalSales: 0, profitLoss: 0, orders: 0 }
        const inventoryCost = merchantInventoryCostMap.get(merchantId) || 0
        const growth = getBusinessScaleProgress(metrics.totalSales)
        const locationQuery = buildLocationQuery(merchant?.city, merchant?.state, merchant?.location)

        let distanceKm: number | null = null
        if (latitude !== null && longitude !== null && locationQuery) {
          if (!locationCache.has(locationQuery)) {
            locationCache.set(locationQuery, await geocodeLocation(locationQuery))
          }
          const resolvedLocation = locationCache.get(locationQuery)
          distanceKm = resolvedLocation
            ? haversineDistanceKm(latitude, longitude, resolvedLocation.latitude, resolvedLocation.longitude)
            : null
        }

        return {
          ...merchant,
          total_sales: Number(metrics.totalSales.toFixed(2)),
          inventory_cost: Number(inventoryCost.toFixed(2)),
          profit_loss: Number(metrics.profitLoss.toFixed(2)),
          order_count: metrics.orders,
          business_scale: getBusinessScale(metrics.totalSales),
          growth_progress: growth.progressPercent,
          amount_to_next_scale: growth.amountToNext,
          next_scale: growth.next,
          distance_km: distanceKm,
        }
      }),
    )

    merchants = [...merchants].sort((a: any, b: any) => {
      const leftDistance = toFiniteNumber(a?.distance_km) ?? Number.POSITIVE_INFINITY
      const rightDistance = toFiniteNumber(b?.distance_km) ?? Number.POSITIVE_INFINITY

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance
      }

      if (toAmount(b?.total_sales) !== toAmount(a?.total_sales)) {
        return toAmount(b?.total_sales) - toAmount(a?.total_sales)
      }

      const leftText = `${a?.business_name || ''} ${a?.name || ''}`
      const rightText = `${b?.business_name || ''} ${b?.name || ''}`
      const leftIsBigZee = isBigZeeWears(leftText)
      const rightIsBigZee = isBigZeeWears(rightText)

      if (leftIsBigZee === rightIsBigZee) return 0
      return leftIsBigZee ? -1 : 1
    })

    return { success: true, data: merchants }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getPlatformStats() {
  try {
    const supabase = await createClient()
    const { count: userCount } = await supabase.from('auth_users').select('*', { count: 'exact', head: true })
    const { count: merchantCount } = await supabase.from('auth_users').select('*', { count: 'exact', head: true }).eq('role', 'merchant')
    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })

    const { data: orders } = await supabase.from('orders').select('total_amount, grand_total')
    const totalRevenue = (orders || []).reduce(
      (sum, order: any) => sum + toAmount(order?.grand_total ?? order?.total_amount),
      0,
    )

    return {
      success: true,
      stats: {
        totalUsers: userCount || 0,
        totalMerchants: merchantCount || 0,
        totalOrders: orderCount || 0,
        totalRevenue,
        activeNow: 0,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function approveMerchant(merchantId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('auth_users').update({ setup_completed: true }).eq('id', merchantId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function rejectMerchant(merchantId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('auth_users').delete().eq('id', merchantId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getRecentUsers() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('auth_users').select('*').order('created_at', { ascending: false }).limit(10)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getRecentOrders() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getLogisticsStats() {
  try {
    const supabase = await createClient()
    // Placeholder - implement logistics/delivery stats
    const { count: totalDeliveries } = await supabase.from('orders').select('*', { count: 'exact', head: true }).not('status', 'eq', 'pending')
    const { count: pendingDeliveries } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: completedDeliveries } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered')
    return { success: true, data: { total: totalDeliveries || 0, pending: pendingDeliveries || 0, completed: completedDeliveries || 0 } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getMerchantStats() {
  try {
    const merchantsResult = await getMerchants()
    if (!merchantsResult.success) {
      return { success: false, error: merchantsResult.error }
    }

    const merchants = merchantsResult.data || []
    const categories = merchants.reduce(
      (acc: Record<string, number>, merchant: any) => {
        const scale = String(merchant?.business_scale || 'Nano')
        acc[scale] = (acc[scale] || 0) + 1
        return acc
      },
      { Nano: 0, Mini: 0, Medium: 0, 'Large Scale': 0 },
    )

    const approvedMerchants = merchants.filter((merchant: any) => merchant.setup_completed).length
    const pendingMerchants = merchants.filter((merchant: any) => !merchant.setup_completed).length
    const totalSales = merchants.reduce((sum: number, merchant: any) => sum + toAmount(merchant?.total_sales), 0)
    const totalProfit = merchants.reduce((sum: number, merchant: any) => sum + toAmount(merchant?.profit_loss), 0)

    return {
      success: true,
      data: {
        total: merchants.length,
        approved: approvedMerchants,
        pending: pendingMerchants,
        totalSales,
        totalProfit,
        categories,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTransactions() {
  try {
    const supabase = await createClient()
    // Assuming there's a transactions table or using orders as transactions
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(20)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getTransactionStats() {
  try {
    const supabase = await createClient()
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_amount, grand_total, product_total, delivery_fee, status, payment_status, escrow_status')

    if (error) throw error

    const orderRows = orders || []
    const totalRevenue = orderRows.reduce(
      (sum, order: any) => sum + toAmount(order?.grand_total ?? order?.total_amount),
      0,
    )

    const completedPayments = orderRows.filter(
      (order: any) => String(order?.payment_status || '').toLowerCase() === 'completed',
    ).length

    const pendingPayments = orderRows.filter(
      (order: any) => String(order?.payment_status || '').toLowerCase() !== 'completed',
    ).length

    const completedOrders = orderRows.filter((order: any) => {
      const status = String(order?.status || '').toLowerCase()
      return status === 'completed' || status === 'delivered'
    }).length

    const pendingOrders = Math.max(0, orderRows.length - completedOrders)

    let productEscrow = 0
    let deliveryEscrow = 0
    let disbursedAmount = 0

    try {
      const { data: escrowRows, error: escrowError } = await supabase
        .from('escrow')
        .select('type, amount, status')

      if (escrowError) throw escrowError

      for (const row of escrowRows || []) {
        const amount = toAmount((row as any)?.amount)
        const type = String((row as any)?.type || '').toLowerCase()
        const status = String((row as any)?.status || '').toLowerCase()

        if (status === 'held') {
          if (type === 'product') productEscrow += amount
          if (type === 'delivery') deliveryEscrow += amount
        }

        if (status === 'released') {
          disbursedAmount += amount
        }
      }
    } catch (escrowError: any) {
      const message = String(escrowError?.message || '')
      if (!message.includes("Could not find the table 'public.escrow'")) {
        throw escrowError
      }
    }

    return {
      success: true,
      data: {
        totalRevenue,
        successful: completedPayments,
        pending: pendingPayments,
        pendingOrders,
        completedOrders,
        productEscrow,
        deliveryEscrow,
        totalEscrow: productEscrow + deliveryEscrow,
        disbursedAmount,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
