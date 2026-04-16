'use server'

import { createClient } from '@/lib/supabase/server'
import { buildLocationQuery, geocodeLocation, haversineDistanceKm } from '@/lib/location-utils'

interface ProductInput {
  name: string
  description?: string
  price: number
  cost_price?: number
  category?: string
  image_url?: string
  images?: string[]
  stock?: number
  weight?: number
  is_active?: boolean
  status?: string
}

const MAX_DECIMAL_VALUE = 99999999.99
const MAX_STOCK_VALUE = 99999999
const COST_PRICE_FALLBACK_PREFIX = '__bigcat_cost_price__:'

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

function getMerchantLocationText(merchant: any) {
  return buildLocationQuery(merchant?.city, merchant?.state, merchant?.location)
}

async function attachProductDistances(products: any[], buyerLat?: number | null, buyerLng?: number | null) {
  const latitude = toFiniteNumber(buyerLat)
  const longitude = toFiniteNumber(buyerLng)

  if (latitude === null || longitude === null) {
    return products
  }

  const locationCache = new Map<string, Awaited<ReturnType<typeof geocodeLocation>>>()

  return Promise.all(
    products.map(async (product) => {
      const merchant = product?.merchant_profiles
      const locationQuery = getMerchantLocationText(merchant)

      if (!merchant || !locationQuery) {
        return product
      }

      if (!locationCache.has(locationQuery)) {
        locationCache.set(locationQuery, await geocodeLocation(locationQuery))
      }

      const resolvedLocation = locationCache.get(locationQuery)
      const distanceKm = resolvedLocation
        ? haversineDistanceKm(latitude, longitude, resolvedLocation.latitude, resolvedLocation.longitude)
        : null

      return {
        ...product,
        distance_km: distanceKm,
        merchant_profiles: {
          ...merchant,
          distance_km: distanceKm,
        },
      }
    }),
  )
}

function sortProductsByLocation(products: any[]) {
  return [...products].sort((a, b) => {
    const leftDistance = toFiniteNumber(a?.merchant_profiles?.distance_km ?? a?.distance_km) ?? Number.POSITIVE_INFINITY
    const rightDistance = toFiniteNumber(b?.merchant_profiles?.distance_km ?? b?.distance_km) ?? Number.POSITIVE_INFINITY

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance
    }

    const leftText = `${a?.merchant_profiles?.business_name || ''} ${a?.merchant_profiles?.name || ''} ${a?.name || ''}`
    const rightText = `${b?.merchant_profiles?.business_name || ''} ${b?.merchant_profiles?.name || ''} ${b?.name || ''}`

    const leftIsBigZee = isBigZeeWears(leftText)
    const rightIsBigZee = isBigZeeWears(rightText)

    if (leftIsBigZee === rightIsBigZee) return 0
    return leftIsBigZee ? -1 : 1
  })
}

function extractCostPriceFromImageMetadata(images: unknown): number {
  if (!Array.isArray(images)) return 0

  const token = images.find(
    (item) => typeof item === 'string' && item.startsWith(COST_PRICE_FALLBACK_PREFIX),
  )

  if (typeof token !== 'string') return 0

  const parsed = Number(token.replace(COST_PRICE_FALLBACK_PREFIX, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function stripCostPriceMetadata(images: unknown): string[] {
  if (!Array.isArray(images)) return []
  return images.filter(
    (item): item is string => typeof item === 'string' && !item.startsWith(COST_PRICE_FALLBACK_PREFIX),
  )
}

function attachCostPriceMetadata(images: unknown, costPrice?: number) {
  const cleanImages = stripCostPriceMetadata(images)

  if (costPrice === undefined || costPrice === null || !Number.isFinite(Number(costPrice))) {
    return cleanImages
  }

  return [...cleanImages, `${COST_PRICE_FALLBACK_PREFIX}${Number(costPrice).toFixed(2)}`]
}

function sanitizeDecimal(
  value: number | undefined,
  fieldName: string,
  options: { required?: boolean; min?: number } = {},
) {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new Error(`${fieldName} is required`)
    }
    return undefined
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number`)
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${fieldName} must be at least ${options.min}`)
  }

  if (parsed > MAX_DECIMAL_VALUE) {
    throw new Error(`${fieldName} is too large. Maximum allowed is ${MAX_DECIMAL_VALUE.toLocaleString()}`)
  }

  return Number(parsed.toFixed(2))
}

function sanitizeWholeNumber(
  value: number | undefined,
  fieldName: string,
  options: { required?: boolean; min?: number } = {},
) {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new Error(`${fieldName} is required`)
    }
    return undefined
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be a whole number`)
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${fieldName} must be at least ${options.min}`)
  }

  if (parsed > MAX_STOCK_VALUE) {
    throw new Error(`${fieldName} is too large. Maximum allowed is ${MAX_STOCK_VALUE.toLocaleString()}`)
  }

  return parsed
}

function sanitizeProductForPublic(product: any) {
  if (!product) return product
  const { cost_price, ...rest } = product
  return rest
}

function normalizeProduct(product: any) {
  const rawImages = Array.isArray(product?.images)
    ? product.images.filter(Boolean)
    : product?.image_url
      ? [product.image_url]
      : []

  const images = stripCostPriceMetadata(rawImages)

  const merchant = product?.merchant_profiles || product?.auth_users

  return {
    ...product,
    images,
    image_url: product?.image_url ?? images[0] ?? null,
    stock: Number.isFinite(Number(product?.stock)) ? Number(product.stock) : 0,
    cost_price: Number.isFinite(Number(product?.cost_price)) ? Number(product.cost_price) : extractCostPriceFromImageMetadata(rawImages),
    status: product?.status ?? (product?.is_active === false ? 'inactive' : 'active'),
    merchant_profiles: merchant
      ? {
          ...merchant,
          id: merchant.id || product?.merchant_id || '',
          business_name: merchant.business_name || merchant.name || 'Unknown',
          logo_url: merchant.logo_url || merchant.avatar_url || null,
          distance_km: Number.isFinite(Number(merchant.distance_km)) ? Number(merchant.distance_km) : null,
        }
      : undefined,
  }
}

function buildBaseProductPayload(product: Partial<ProductInput>, options: { includeDefaults?: boolean } = {}) {
  return {
    ...(product.name !== undefined ? { name: product.name } : {}),
    ...(product.description !== undefined ? { description: product.description } : {}),
    ...(product.price !== undefined ? { price: product.price } : {}),
    ...(product.cost_price !== undefined ? { cost_price: product.cost_price } : {}),
    ...(product.category !== undefined ? { category: product.category } : {}),
    ...(product.image_url !== undefined || product.images !== undefined
      ? { image_url: product.image_url || product.images?.[0] || null }
      : {}),
    ...(product.stock !== undefined ? { stock: product.stock } : options.includeDefaults ? { stock: 0 } : {}),
  }
}

function buildLegacyProductPayload(product: Partial<ProductInput>, options: { includeDefaults?: boolean } = {}) {
  const imagesWithMetadata = attachCostPriceMetadata(product.images, product.cost_price)

  return {
    ...buildBaseProductPayload(
      {
        ...product,
        images: imagesWithMetadata,
        image_url: product.image_url || imagesWithMetadata[0] || null,
      },
      options,
    ),
    ...(imagesWithMetadata.length > 0 ? { images: imagesWithMetadata } : {}),
  }
}

export async function getMerchantProducts(merchantId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, merchant_profiles:auth_users!merchant_id(id, business_name, business_category, business_description, name, city, state, location, avatar_url)')
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
    if (error) throw error
    return { success: true, data: (data || []).map(normalizeProduct).filter((product) => product.status !== 'deleted') }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getAllProducts(options: { buyerLat?: number | null; buyerLng?: number | null } = {}) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, merchant_profiles:auth_users!merchant_id(id, business_name, business_category, business_description, name, city, state, location, avatar_url)')
      .eq('is_active', true)
    if (error) throw error

    const normalizedProducts = (data || []).map(normalizeProduct)
    const productsWithDistance = await attachProductDistances(normalizedProducts, options.buyerLat, options.buyerLng)
    const sortedProducts = sortProductsByLocation(productsWithDistance)

    return { success: true, data: sortedProducts.map(sanitizeProductForPublic) }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getProductById(productId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*, merchant_profiles:auth_users!merchant_id(id, business_name, business_category, business_description, name, city, state, location, avatar_url)')
      .eq('id', productId)
      .single()
    if (error) throw error

    const normalized = normalizeProduct(data)
    if (normalized.status === 'deleted' || normalized.is_active === false) {
      return { success: false, error: 'Product not found' }
    }

    return { success: true, data: sanitizeProductForPublic(normalized) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createProduct(merchantId: string, product: ProductInput, actorId?: string) {
  try {
    const supabase = await createClient()

    if (actorId && actorId !== merchantId) {
      return { success: false, error: 'You are not allowed to create products for this merchant.' }
    }

    const normalizedProduct = {
      ...product,
      price: sanitizeDecimal(product.price, 'Product price', { required: true, min: 0.01 }),
      cost_price: sanitizeDecimal(product.cost_price, 'Cost price', { required: true, min: 0 }),
      stock: sanitizeWholeNumber(product.stock, 'Stock quantity', { min: 0 }),
      weight: sanitizeDecimal(product.weight, 'Product weight', { min: 0 }),
    }

    const richPayload = {
      ...buildBaseProductPayload(normalizedProduct, { includeDefaults: true }),
      weight: normalizedProduct.weight,
      images: normalizedProduct.images,
      status: normalizedProduct.status ?? 'active',
      merchant_id: merchantId,
    }

    let result = await (supabase.from('products') as any).insert(richPayload).select().single()

    if (result.error && String(result.error.message || '').includes('column')) {
      result = await (supabase.from('products') as any)
        .insert({ ...buildLegacyProductPayload(normalizedProduct), merchant_id: merchantId })
        .select()
        .single()
    }

    if (result.error) throw result.error
    return { success: true, data: normalizeProduct(result.data) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateProduct(productId: string, updates: Partial<ProductInput>, actorId?: string) {
  try {
    const supabase = await createClient()

    const normalizedUpdates = {
      ...updates,
      ...(updates.price !== undefined
        ? { price: sanitizeDecimal(updates.price, 'Product price', { min: 0.01 }) }
        : {}),
      ...(updates.cost_price !== undefined
        ? { cost_price: sanitizeDecimal(updates.cost_price, 'Cost price', { min: 0 }) }
        : {}),
      ...(updates.stock !== undefined
        ? { stock: sanitizeWholeNumber(updates.stock, 'Stock quantity', { min: 0 }) }
        : {}),
      ...(updates.weight !== undefined
        ? { weight: sanitizeDecimal(updates.weight, 'Product weight', { min: 0 }) }
        : {}),
    }

    const richUpdates = {
      ...buildBaseProductPayload(normalizedUpdates),
      ...(normalizedUpdates.is_active !== undefined ? { is_active: normalizedUpdates.is_active } : {}),
      ...(normalizedUpdates.cost_price !== undefined ? { cost_price: normalizedUpdates.cost_price } : {}),
      ...(normalizedUpdates.weight !== undefined ? { weight: normalizedUpdates.weight } : {}),
      ...(normalizedUpdates.images !== undefined ? { images: normalizedUpdates.images } : {}),
      ...(normalizedUpdates.status !== undefined ? { status: normalizedUpdates.status } : {}),
    }

    let updateQuery = (supabase.from('products') as any).update(richUpdates).eq('id', productId)
    if (actorId) updateQuery = updateQuery.eq('merchant_id', actorId)

    let result = await updateQuery.select().single()

    if (result.error && String(result.error.message || '').includes('column')) {
      const fallbackUpdates = {
        ...buildLegacyProductPayload(normalizedUpdates),
        ...(normalizedUpdates.is_active !== undefined ? { is_active: normalizedUpdates.is_active } : {}),
      }

      let fallbackQuery = (supabase.from('products') as any).update(fallbackUpdates).eq('id', productId)
      if (actorId) fallbackQuery = fallbackQuery.eq('merchant_id', actorId)

      result = await fallbackQuery.select().single()
    }

    if (result.error) throw result.error
    return { success: true, data: normalizeProduct(result.data) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteProduct(productId: string, actorId?: string) {
  try {
    const supabase = await createClient()
    let query = supabase.from('products').delete().eq('id', productId)
    if (actorId) query = query.eq('merchant_id', actorId)

    const { error } = await query

    if (!error) {
      return { success: true, deleted: true, message: 'Product deleted successfully' }
    }

    const errorMessage = String(error.message || '')
    const hasReferenceConstraint = /foreign key|violates.*constraint|order_items_product_id_fkey/i.test(errorMessage)

    if (!hasReferenceConstraint) {
      throw error
    }

    const softDeleteAttempts = [
      { is_active: false, status: 'deleted', stock: 0, updated_at: new Date().toISOString() },
      { is_active: false, stock: 0, updated_at: new Date().toISOString() },
      { is_active: false, stock: 0 },
      { status: 'deleted' },
    ]

    let archived = false
    let lastSoftDeleteError: any = null

    for (const payload of softDeleteAttempts) {
      let updateQuery = (supabase.from('products') as any).update(payload).eq('id', productId)
      if (actorId) updateQuery = updateQuery.eq('merchant_id', actorId)

      const result = await updateQuery.select('id').maybeSingle()
      if (!result.error) {
        archived = true
        break
      }
      lastSoftDeleteError = result.error
    }

    if (!archived && lastSoftDeleteError) {
      throw lastSoftDeleteError
    }

    return {
      success: true,
      archived: true,
      message: 'Product removed from active listings. Existing orders were preserved.',
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function requestWeightVerification(productId: string) {
  return { success: true, message: 'Verification requested' }
}
