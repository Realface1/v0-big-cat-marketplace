import { createClient } from '@/lib/supabase/server'

function formatPromotionError(error: any) {
  const message = String(error?.message || error || '').toLowerCase()
  const code = String(error?.code || '')

  const missingSchema =
    message.includes('schema cache')
    || message.includes('could not find the table')
    || message.includes('does not exist')
    || code === 'PGRST205'

  if (missingSchema) {
    return 'Promotions database tables are not set up yet. Run scripts/022-create-promotions-tables.sql in Supabase SQL Editor, then retry.'
  }

  return String(error?.message || 'Promotion operation failed')
}

export type PromotionRuleType = 'standard' | 'spend_x_save_y' | 'buy_x_get_y' | 'nth_item_discount'

export interface PromotionInput {
  name: string
  type: 'discount' | 'bundle' | 'flash_sale'
  description?: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase_amount?: number
  max_uses?: number
  usage_per_buyer?: number
  start_date: string
  end_date: string
  product_ids?: string[]
  rule_type?: PromotionRuleType
  spend_threshold?: number
  buy_quantity?: number
  get_quantity?: number
  nth_item?: number
}

export interface CouponInput {
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase_amount?: number
  max_uses?: number
  max_uses_per_buyer?: number
  start_date: string
  end_date: string
}

type PromotionPricingItem = {
  productId: string
  quantity: number
  unitPrice: number
}

export type AppliedPromotionResult = {
  promotionId: string
  promotionName: string
  discountAmount: number
}

const MIN_MARGIN_GUARD_PERCENT = 5

function getTodayStartIso(reference = new Date()) {
  const start = new Date(reference)
  start.setUTCHours(0, 0, 0, 0)
  return start.toISOString()
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim())
}

function normalizeStartDateInput(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return raw
  return isDateOnly(raw) ? `${raw}T00:00:00.000Z` : raw
}

function normalizeEndDateInput(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return raw
  return isDateOnly(raw) ? `${raw}T23:59:59.999Z` : raw
}

function normalizeEndDateForRuntime(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return raw
  if (isDateOnly(raw)) return `${raw}T23:59:59.999Z`

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw

  // Date pickers often save midnight timestamps; treat them as full-day end boundaries.
  if (
    parsed.getUTCHours() === 0
    && parsed.getUTCMinutes() === 0
    && parsed.getUTCSeconds() === 0
    && parsed.getUTCMilliseconds() === 0
  ) {
    parsed.setUTCHours(23, 59, 59, 999)
    return parsed.toISOString()
  }

  return parsed.toISOString()
}

function normalizeRuleType(value: unknown): PromotionRuleType {
  return value === 'spend_x_save_y' || value === 'buy_x_get_y' || value === 'nth_item_discount'
    ? value
    : 'standard'
}

function sanitizePositiveNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

function calculatePromotionDiscountAmount(
  promotion: any,
  eligibleSubtotal: number,
  eligibleQuantity: number,
): number {
  const ruleType = normalizeRuleType(promotion?.rule_type)

  if (ruleType === 'spend_x_save_y') {
    const threshold = sanitizePositiveNumber(promotion?.spend_threshold)
    const saveAmount = sanitizePositiveNumber(promotion?.discount_value)
    if (threshold <= 0 || saveAmount <= 0 || eligibleSubtotal < threshold) return 0
    return Math.min(saveAmount, eligibleSubtotal)
  }

  if (ruleType === 'buy_x_get_y') {
    const buyQty = Math.max(1, Math.floor(sanitizePositiveNumber(promotion?.buy_quantity, 1)))
    const getQty = Math.max(1, Math.floor(sanitizePositiveNumber(promotion?.get_quantity, 1)))
    const groupSize = buyQty + getQty
    if (groupSize <= 0 || eligibleQuantity < groupSize || eligibleSubtotal <= 0) return 0

    const freeUnits = Math.floor(eligibleQuantity / groupSize) * getQty
    if (freeUnits <= 0) return 0

    const averageUnitPrice = eligibleSubtotal / Math.max(eligibleQuantity, 1)
    return Math.min(averageUnitPrice * freeUnits, eligibleSubtotal)
  }

  if (ruleType === 'nth_item_discount') {
    const nthItem = Math.max(2, Math.floor(sanitizePositiveNumber(promotion?.nth_item, 2)))
    const percentage = Math.max(0, Math.min(100, Number(promotion?.discount_value || 0)))
    if (eligibleQuantity < nthItem || percentage <= 0 || eligibleSubtotal <= 0) return 0

    const discountedItems = Math.floor(eligibleQuantity / nthItem)
    const averageUnitPrice = eligibleSubtotal / Math.max(eligibleQuantity, 1)
    return Math.min(discountedItems * averageUnitPrice * (percentage / 100), eligibleSubtotal)
  }

  if (promotion?.discount_type === 'percentage') {
    return Math.min((eligibleSubtotal * Number(promotion?.discount_value || 0)) / 100, eligibleSubtotal)
  }

  return Math.min(Number(promotion?.discount_value || 0), eligibleSubtotal)
}

function calculatePromotionPreviewPercent(promotion: any, unitPrice: number): number {
  const safeUnitPrice = Math.max(0, Number(unitPrice || 0))
  if (safeUnitPrice <= 0) return 0

  const ruleType = normalizeRuleType(promotion?.rule_type)

  if (ruleType === 'spend_x_save_y') {
    const threshold = sanitizePositiveNumber(promotion?.spend_threshold)
    const saveAmount = sanitizePositiveNumber(promotion?.discount_value)
    if (threshold > 0 && saveAmount > 0) {
      return Math.max(0, Math.min(100, Math.round((saveAmount / threshold) * 100)))
    }
  }

  if (ruleType === 'buy_x_get_y') {
    const buyQty = Math.max(1, Math.floor(sanitizePositiveNumber(promotion?.buy_quantity, 1)))
    const getQty = Math.max(1, Math.floor(sanitizePositiveNumber(promotion?.get_quantity, 1)))
    const groupSize = buyQty + getQty
    if (groupSize > 0) {
      return Math.max(0, Math.min(100, Math.round((getQty / groupSize) * 100)))
    }
  }

  if (promotion?.discount_type === 'percentage') {
    return Math.max(0, Math.min(100, Math.round(Number(promotion?.discount_value || 0))))
  }

  return Math.max(0, Math.min(100, Math.round((Number(promotion?.discount_value || 0) / safeUnitPrice) * 100)))
}

async function syncPromotionAndCouponStatuses(supabase: any, merchantId?: string) {
  const nowIso = new Date().toISOString()
  const todayStartIso = getTodayStartIso()

  // Deactivate expired promotions
  {
    let q = (supabase.from('promotions') as any)
      .update({ is_active: false, updated_at: nowIso })
      .lt('end_date', todayStartIso)
      .eq('is_active', true)
    if (merchantId) q = q.eq('merchant_id', merchantId)
    await q
  }
  // Activate current promotions
  {
    let q = (supabase.from('promotions') as any)
      .update({ is_active: true, updated_at: nowIso })
      .lte('start_date', nowIso)
      .gte('end_date', todayStartIso)
      .eq('is_active', false)
    if (merchantId) q = q.eq('merchant_id', merchantId)
    await q
  }
  // Deactivate expired coupons
  {
    let q = (supabase.from('coupons') as any)
      .update({ is_active: false, updated_at: nowIso })
      .lt('end_date', todayStartIso)
      .eq('is_active', true)
    if (merchantId) q = q.eq('merchant_id', merchantId)
    await q
  }
  // Activate current coupons
  {
    let q = (supabase.from('coupons') as any)
      .update({ is_active: true, updated_at: nowIso })
      .lte('start_date', nowIso)
      .gte('end_date', todayStartIso)
      .eq('is_active', false)
    if (merchantId) q = q.eq('merchant_id', merchantId)
    await q
  }
}

async function enforcePromotionMarginGuard(
  supabase: any,
  merchantId: string,
  input: PromotionInput,
) {
  const scopedIds = Array.isArray(input.product_ids) ? input.product_ids : []

  const productsQuery = (supabase.from('products') as any)
    .select('id,name,price,cost_price,merchant_id')
    .eq('merchant_id', merchantId)

  const { data: products, error } = scopedIds.length > 0
    ? await productsQuery.in('id', scopedIds)
    : await productsQuery

  if (error || !Array.isArray(products) || products.length === 0) return { success: true as const }

  const violatingProducts: string[] = []
  const normalizedRule = normalizeRuleType(input.rule_type)

  for (const product of products) {
    const price = Number(product?.price || 0)
    const costPrice = Number(product?.cost_price || 0)
    if (price <= 0 || costPrice <= 0) continue

    const minimumAllowedSellingPrice = costPrice * (1 + MIN_MARGIN_GUARD_PERCENT / 100)

    const simulatedPromo = {
      ...input,
      rule_type: normalizedRule,
      buy_quantity: input.buy_quantity,
      get_quantity: input.get_quantity,
      spend_threshold: input.spend_threshold,
      nth_item: input.nth_item,
    }

    const simulatedDiscount = calculatePromotionDiscountAmount(simulatedPromo, price, 1)
    const projectedSellingPrice = Math.max(0, price - simulatedDiscount)

    if (projectedSellingPrice < minimumAllowedSellingPrice) {
      violatingProducts.push(String(product?.name || 'Product'))
    }
  }

  if (violatingProducts.length > 0) {
    const preview = violatingProducts.slice(0, 3).join(', ')
    const suffix = violatingProducts.length > 3 ? ` +${violatingProducts.length - 3} more` : ''
    return {
      success: false as const,
      error: `Discount is too aggressive for margin safety on: ${preview}${suffix}. Keep at least ${MIN_MARGIN_GUARD_PERCENT}% margin above cost.`
    }
  }

  return { success: true as const }
}

async function enforceCouponMarginGuard(
  supabase: any,
  merchantId: string,
  input: CouponInput,
) {
  const asPromotionInput: PromotionInput = {
    name: 'Coupon simulation',
    type: 'discount',
    discount_type: input.discount_type,
    discount_value: Number(input.discount_value || 0),
    min_purchase_amount: Number(input.min_purchase_amount || 0),
    start_date: input.start_date,
    end_date: input.end_date,
    product_ids: [],
    rule_type: 'standard',
  }

  return enforcePromotionMarginGuard(supabase, merchantId, asPromotionInput)
}

export async function createPromotion(merchantId: string, input: PromotionInput) {
  try {
    const supabase = await createClient()
    await syncPromotionAndCouponStatuses(supabase, merchantId)

    const guard = await enforcePromotionMarginGuard(supabase, merchantId, input)
    if (!guard.success) return { success: false, error: guard.error }

    const payload = {
      merchant_id: merchantId,
      name: input.name,
      type: input.type,
      description: input.description,
      discount_type: input.discount_type,
      discount_value: Number(input.discount_value),
      min_purchase_amount: Number(input.min_purchase_amount || 0),
      max_uses: input.max_uses || null,
      usage_per_buyer: input.usage_per_buyer || 1,
      start_date: normalizeStartDateInput(input.start_date),
      end_date: normalizeEndDateInput(input.end_date),
      product_ids: Array.isArray(input.product_ids) ? input.product_ids : [],
      rule_type: normalizeRuleType(input.rule_type),
      spend_threshold: sanitizePositiveNumber(input.spend_threshold),
      buy_quantity: Math.floor(sanitizePositiveNumber(input.buy_quantity)),
      get_quantity: Math.floor(sanitizePositiveNumber(input.get_quantity)),
      nth_item: Math.floor(sanitizePositiveNumber(input.nth_item)),
    }

    let { data, error } = await supabase
      .from('promotions')
      .insert(payload)
      .select()
      .single()

    if (error) {
      const message = String(error?.message || '').toLowerCase()
      const missingRuleColumns = message.includes('rule_type')
        || message.includes('spend_threshold')
        || message.includes('buy_quantity')
        || message.includes('get_quantity')
        || message.includes('nth_item')

      if (missingRuleColumns) {
        const fallbackPayload = {
          merchant_id: payload.merchant_id,
          name: payload.name,
          type: payload.type,
          description: payload.description,
          discount_type: payload.discount_type,
          discount_value: payload.discount_value,
          min_purchase_amount: payload.min_purchase_amount,
          max_uses: payload.max_uses,
          usage_per_buyer: payload.usage_per_buyer,
          start_date: payload.start_date,
          end_date: payload.end_date,
          product_ids: payload.product_ids,
        }

        const fallbackResult = await supabase
          .from('promotions')
          .insert(fallbackPayload)
          .select()
          .single()

        data = fallbackResult.data
        error = fallbackResult.error
      }
    }

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error) }
  }
}

export async function updatePromotion(
  merchantId: string,
  promotionId: string,
  updates: Partial<PromotionInput>,
) {
  try {
    const supabase = await createClient()
    await syncPromotionAndCouponStatuses(supabase, merchantId)

    // Verify ownership and fetch current values
    const { data: promo, error: fetchError } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .single()

    if (fetchError || promo?.merchant_id !== merchantId) {
      return { success: false, error: 'Promotion not found or unauthorized' }
    }

    const mergedInput: PromotionInput = {
      name: updates.name ?? promo.name,
      type: updates.type ?? promo.type,
      description: updates.description ?? promo.description,
      discount_type: updates.discount_type ?? promo.discount_type,
      discount_value: Number(updates.discount_value ?? promo.discount_value ?? 0),
      min_purchase_amount: Number(updates.min_purchase_amount ?? promo.min_purchase_amount ?? 0),
      max_uses: updates.max_uses ?? promo.max_uses ?? undefined,
      usage_per_buyer: Number(updates.usage_per_buyer ?? promo.usage_per_buyer ?? 1),
      start_date: updates.start_date ?? promo.start_date,
      end_date: updates.end_date ?? promo.end_date,
      product_ids: Array.isArray(updates.product_ids) ? updates.product_ids : (Array.isArray(promo.product_ids) ? promo.product_ids : []),
      rule_type: normalizeRuleType(updates.rule_type ?? promo.rule_type),
      spend_threshold: Number(updates.spend_threshold ?? promo.spend_threshold ?? 0),
      buy_quantity: Number(updates.buy_quantity ?? promo.buy_quantity ?? 0),
      get_quantity: Number(updates.get_quantity ?? promo.get_quantity ?? 0),
      nth_item: Number(updates.nth_item ?? promo.nth_item ?? 0),
    }

    const guard = await enforcePromotionMarginGuard(supabase, merchantId, mergedInput)
    if (!guard.success) return { success: false, error: guard.error }

    const updatePayload: any = {}
    if (updates.name !== undefined) updatePayload.name = updates.name
    if (updates.description !== undefined) updatePayload.description = updates.description
    if (updates.type !== undefined) updatePayload.type = updates.type
    if (updates.discount_value !== undefined) updatePayload.discount_value = Number(updates.discount_value)
    if (updates.discount_type !== undefined) updatePayload.discount_type = updates.discount_type
    if (updates.min_purchase_amount !== undefined) updatePayload.min_purchase_amount = Number(updates.min_purchase_amount)
    if (updates.start_date !== undefined) updatePayload.start_date = normalizeStartDateInput(updates.start_date)
    if (updates.end_date !== undefined) updatePayload.end_date = normalizeEndDateInput(updates.end_date)
    if (updates.max_uses !== undefined) updatePayload.max_uses = updates.max_uses
    if (updates.usage_per_buyer !== undefined) updatePayload.usage_per_buyer = updates.usage_per_buyer
    if (Array.isArray(updates.product_ids)) updatePayload.product_ids = updates.product_ids
    if (updates.rule_type !== undefined) updatePayload.rule_type = normalizeRuleType(updates.rule_type)
    if (updates.spend_threshold !== undefined) updatePayload.spend_threshold = sanitizePositiveNumber(updates.spend_threshold)
    if (updates.buy_quantity !== undefined) updatePayload.buy_quantity = Math.floor(sanitizePositiveNumber(updates.buy_quantity))
    if (updates.get_quantity !== undefined) updatePayload.get_quantity = Math.floor(sanitizePositiveNumber(updates.get_quantity))
    if (updates.nth_item !== undefined) updatePayload.nth_item = Math.floor(sanitizePositiveNumber(updates.nth_item))
    updatePayload.updated_at = new Date().toISOString()

    let { data, error } = await supabase
      .from('promotions')
      .update(updatePayload)
      .eq('id', promotionId)
      .select()
      .single()

    if (error) {
      const message = String(error?.message || '').toLowerCase()
      const missingRuleColumns = message.includes('rule_type')
        || message.includes('spend_threshold')
        || message.includes('buy_quantity')
        || message.includes('get_quantity')
        || message.includes('nth_item')

      if (missingRuleColumns) {
        delete updatePayload.rule_type
        delete updatePayload.spend_threshold
        delete updatePayload.buy_quantity
        delete updatePayload.get_quantity
        delete updatePayload.nth_item

        const fallbackResult = await supabase
          .from('promotions')
          .update(updatePayload)
          .eq('id', promotionId)
          .select()
          .single()

        data = fallbackResult.data
        error = fallbackResult.error
      }
    }

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error) }
  }
}

export async function deletePromotion(merchantId: string, promotionId: string) {
  try {
    const supabase = await createClient()

    const { data: promo, error: fetchError } = await supabase
      .from('promotions')
      .select('merchant_id')
      .eq('id', promotionId)
      .single()

    if (fetchError || promo?.merchant_id !== merchantId) {
      return { success: false, error: 'Promotion not found or unauthorized' }
    }

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', promotionId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error) }
  }
}

export async function getMerchantPromotions(merchantId: string) {
  try {
    const supabase = await createClient()
    await syncPromotionAndCouponStatuses(supabase, merchantId)

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error), data: [] }
  }
}

export async function createCoupon(merchantId: string, input: CouponInput) {
  try {
    const supabase = await createClient()
    await syncPromotionAndCouponStatuses(supabase, merchantId)

    const guard = await enforceCouponMarginGuard(supabase, merchantId, input)
    if (!guard.success) return { success: false, error: guard.error }

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        merchant_id: merchantId,
        code: String(input.code).toUpperCase(),
        discount_type: input.discount_type,
        discount_value: Number(input.discount_value),
        min_purchase_amount: Number(input.min_purchase_amount || 0),
        max_uses: input.max_uses || null,
        max_uses_per_buyer: input.max_uses_per_buyer || 1,
        start_date: normalizeStartDateInput(input.start_date),
        end_date: normalizeEndDateInput(input.end_date),
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error) }
  }
}

export async function getMerchantCoupons(merchantId: string) {
  try {
    const supabase = await createClient()
    await syncPromotionAndCouponStatuses(supabase, merchantId)

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error), data: [] }
  }
}

export async function validateCoupon(couponCode: string, buyerId: string, cartTotal: number) {
  try {
    const supabase = await createClient()
    await syncPromotionAndCouponStatuses(supabase)

    // Find coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', String(couponCode).toUpperCase())
      .single()

    if (couponError || !coupon) {
      return { success: false, error: 'Coupon not found', discount: 0 }
    }

    const now = new Date()
    const normalizedCouponEnd = new Date(normalizeEndDateForRuntime(String(coupon.end_date || '')))

    // Check if coupon is valid
    if (!coupon.is_active) {
      return { success: false, error: 'Coupon is inactive', discount: 0 }
    }

    if (new Date(coupon.start_date) > now) {
      return { success: false, error: 'Coupon not yet valid', discount: 0 }
    }

    if (normalizedCouponEnd < now) {
      return { success: false, error: 'Coupon has expired', discount: 0 }
    }

    if (cartTotal < coupon.min_purchase_amount) {
      return {
        success: false,
        error: `Minimum purchase of ₦${coupon.min_purchase_amount} required`,
        discount: 0,
      }
    }

    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return { success: false, error: 'Coupon usage limit reached', discount: 0 }
    }

    // Check buyer usage limit
    const { data: usage } = await supabase
      .from('coupon_usage')
      .select('used_count')
      .eq('coupon_id', coupon.id)
      .eq('buyer_id', buyerId)
      .single()

    if (usage && usage.used_count >= coupon.max_uses_per_buyer) {
      return { success: false, error: 'You have reached the usage limit for this coupon', discount: 0 }
    }

    // Calculate discount
    let discount = 0
    if (coupon.discount_type === 'percentage') {
      discount = Math.min((cartTotal * coupon.discount_value) / 100, cartTotal)
    } else {
      discount = Math.min(coupon.discount_value, cartTotal)
    }

    return {
      success: true,
      coupon,
      discount: Math.round(discount * 100) / 100,
    }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error), discount: 0 }
  }
}

export async function applyCoupon(couponCode: string, buyerId: string) {
  try {
    const supabase = await createClient()
    await syncPromotionAndCouponStatuses(supabase)

    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', String(couponCode).toUpperCase())
      .single()

    if (!coupon) {
      return { success: false, error: 'Coupon not found' }
    }

    // Increment coupon usage
    await supabase
      .from('coupons')
      .update({ current_uses: coupon.current_uses + 1 })
      .eq('id', coupon.id)

    // Upsert buyer usage
    const { data: usage } = await supabase
      .from('coupon_usage')
      .select('used_count')
      .eq('coupon_id', coupon.id)
      .eq('buyer_id', buyerId)
      .single()

    if (usage) {
      await supabase
        .from('coupon_usage')
        .update({ used_count: usage.used_count + 1, last_used_at: new Date().toISOString() })
        .eq('coupon_id', coupon.id)
        .eq('buyer_id', buyerId)
    } else {
      await supabase.from('coupon_usage').insert({
        coupon_id: coupon.id,
        buyer_id: buyerId,
        used_count: 1,
      })
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error) }
  }
}

export async function getPromotionAnalytics(merchantId: string, promotionId: string) {
  try {
    const supabase = await createClient()
    await syncPromotionAndCouponStatuses(supabase, merchantId)

    // Verify ownership
    const { data: promo, error: fetchError } = await supabase
      .from('promotions')
      .select('merchant_id')
      .eq('id', promotionId)
      .single()

    if (fetchError || promo?.merchant_id !== merchantId) {
      return { success: false, error: 'Promotion not found or unauthorized', data: [] }
    }

    const { data, error } = await supabase
      .from('promotion_analytics')
      .select('*')
      .eq('promotion_id', promotionId)
      .order('date', { ascending: false })
      .limit(30)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error), data: [] }
  }
}

export async function getBestPromotionDiscountForItems(
  merchantId: string,
  items: PromotionPricingItem[],
): Promise<AppliedPromotionResult | null> {
  try {
    if (!merchantId || !Array.isArray(items) || items.length === 0) return null

    const supabase = await createClient()
    await syncPromotionAndCouponStatuses(supabase, merchantId)

    const nowIso = new Date().toISOString()
    const todayStartIso = getTodayStartIso()

    const { data: promotions, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
      .lte('start_date', nowIso)
      .gte('end_date', todayStartIso)

    if (error || !Array.isArray(promotions) || promotions.length === 0) return null

    let best: AppliedPromotionResult | null = null

    for (const promo of promotions) {
      if (promo.max_uses && promo.current_uses >= promo.max_uses) continue

      const scopedToProducts = Array.isArray(promo.product_ids) ? promo.product_ids.map((id: any) => String(id)) : []
      const eligibleItems = scopedToProducts.length > 0
        ? items.filter((item) => scopedToProducts.includes(String(item.productId)))
        : items

      if (!eligibleItems.length) continue

      const eligibleSubtotal = eligibleItems.reduce(
        (sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0)),
        0,
      )
      const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

      if (eligibleSubtotal <= 0 || eligibleQuantity <= 0) continue
      if (Number(eligibleSubtotal) < Number(promo.min_purchase_amount || 0)) continue

      const discount = calculatePromotionDiscountAmount(promo, eligibleSubtotal, eligibleQuantity)
      const roundedDiscount = Math.max(0, Math.round(discount * 100) / 100)
      if (roundedDiscount <= 0) continue

      if (!best || roundedDiscount > best.discountAmount) {
        best = {
          promotionId: String(promo.id),
          promotionName: String(promo.name || 'Promotion'),
          discountAmount: roundedDiscount,
        }
      }
    }

    return best
  } catch {
    return null
  }
}

export async function getPromotionPercentOffForProduct(merchantId: string, productId: string, unitPrice: number) {
  try {
    if (!merchantId || !productId || unitPrice <= 0) return 0

    const supabase = await createClient()
    // Public product reads may not have permission to run status sync updates.
    // Ignore sync failures so discount lookup still works for storefront clients.
    try {
      await syncPromotionAndCouponStatuses(supabase, merchantId)
    } catch {
      // no-op
    }

    const nowIso = new Date().toISOString()
    const todayStartIso = getTodayStartIso()
    const { data: promotions, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
      .lte('start_date', nowIso)
      .gte('end_date', todayStartIso)

    if (error || !Array.isArray(promotions)) return 0

    let bestPercent = 0
    for (const promo of promotions) {
      const scopedProductIds = Array.isArray(promo.product_ids)
        ? promo.product_ids.map((id: any) => String(id || ''))
        : []

      if (scopedProductIds.length > 0 && !scopedProductIds.includes(String(productId))) continue

      const discountAmount = calculatePromotionDiscountAmount(promo, Number(unitPrice || 0), 1)
      const exactPercent = Math.max(0, Math.min(100, Math.round((discountAmount / Number(unitPrice || 1)) * 100)))
      const previewPercent = calculatePromotionPreviewPercent(promo, Number(unitPrice || 0))
      const percent = Math.max(exactPercent, previewPercent)
      if (percent > bestPercent) bestPercent = percent
    }

    return bestPercent
  } catch {
    return 0
  }
}

export async function getMerchantPromotionAnalyticsOverview(merchantId: string) {
  try {
    const supabase = await createClient()
    await syncPromotionAndCouponStatuses(supabase, merchantId)

    const [promotionsResult, couponsResult, promoAnalyticsResult] = await Promise.all([
      (supabase.from('promotions') as any).select('id,name,is_active,current_uses,max_uses,created_at').eq('merchant_id', merchantId),
      (supabase.from('coupons') as any).select('id,code,is_active,current_uses,max_uses,created_at').eq('merchant_id', merchantId),
      (supabase.from('promotion_analytics') as any).select('promotion_id,uses,revenue_impact,date'),
    ])

    const promotions = Array.isArray(promotionsResult.data) ? promotionsResult.data : []
    const coupons = Array.isArray(couponsResult.data) ? couponsResult.data : []
    const promoAnalytics = Array.isArray(promoAnalyticsResult.data) ? promoAnalyticsResult.data : []

    const promotionIds = promotions.map((item: any) => String(item.id))
    const filteredAnalytics = promoAnalytics.filter((item: any) => promotionIds.includes(String(item.promotion_id || '')))

    const totalPromotionUses = promotions.reduce((sum: number, promo: any) => sum + Number(promo.current_uses || 0), 0)
    const totalCouponUses = coupons.reduce((sum: number, coupon: any) => sum + Number(coupon.current_uses || 0), 0)
    const totalRevenueImpact = filteredAnalytics.reduce((sum: number, row: any) => sum + Number(row.revenue_impact || 0), 0)

    const topPromotions = promotions
      .map((promo: any) => ({
        id: String(promo.id),
        name: String(promo.name || 'Promotion'),
        uses: Number(promo.current_uses || 0),
        maxUses: promo.max_uses ? Number(promo.max_uses) : null,
        active: Boolean(promo.is_active),
      }))
      .sort((a: any, b: any) => b.uses - a.uses)
      .slice(0, 5)

    return {
      success: true,
      data: {
        promotionsTotal: promotions.length,
        promotionsActive: promotions.filter((promo: any) => promo.is_active).length,
        couponsTotal: coupons.length,
        couponsActive: coupons.filter((coupon: any) => coupon.is_active).length,
        totalPromotionUses,
        totalCouponUses,
        totalUses: totalPromotionUses + totalCouponUses,
        totalRevenueImpact: Math.round(totalRevenueImpact * 100) / 100,
        topPromotions,
      },
    }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error), data: null }
  }
}

export async function incrementPromotionUsage(promotionId: string) {
  try {
    if (!promotionId) return { success: false }
    const supabase = await createClient()

    const { data: promo } = await supabase
      .from('promotions')
      .select('id,current_uses')
      .eq('id', promotionId)
      .single()

    if (!promo) return { success: false }

    const { error } = await supabase
      .from('promotions')
      .update({
        current_uses: Number(promo.current_uses || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', promotionId)

    if (error) return { success: false, error: formatPromotionError(error) }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: formatPromotionError(error) }
  }
}
