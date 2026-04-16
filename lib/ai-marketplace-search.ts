import { createClient } from '@/lib/supabase/server'

export type SearchType = 'products' | 'vendors' | 'both'

function escapeLike(value: string) {
  return value.replace(/[%_]/g, '')
}

function detectSearchType(query: string): SearchType {
  const q = query.toLowerCase()
  const vendorKeywords = ['vendor', 'seller', 'store', 'shop', 'merchant', 'near me', 'location']
  const productKeywords = ['product', 'buy', 'price', 'cheap', 'order', 'item']

  const hasVendor = vendorKeywords.some((keyword) => q.includes(keyword))
  const hasProduct = productKeywords.some((keyword) => q.includes(keyword))

  if (hasVendor && !hasProduct) return 'vendors'
  if (hasProduct && !hasVendor) return 'products'
  return 'both'
}

export async function searchMarketplace(params: {
  query: string
  type?: SearchType
  limit?: number
}) {
  const supabase = createClient()
  const query = params.query.trim()
  const type = params.type || detectSearchType(query)
  const limit = Math.max(1, Math.min(params.limit || 8, 20))

  if (!query) {
    return {
      success: false,
      error: 'Query is required',
      products: [],
      vendors: [],
      type,
    }
  }

  const safeQuery = escapeLike(query)
  const pattern = `%${safeQuery}%`

  const runProductSearch = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, category, price, stock, image_url, merchant_id, merchant_profiles:auth_users!merchant_id(business_name, name, location, avatar_url)')
      .eq('is_active', true)
      .or(`name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`)
      .limit(limit)

    if (error) throw error

    return (data || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description || '',
      category: product.category || 'General',
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      image_url: product.image_url || null,
      merchant_id: product.merchant_id,
      vendor_name:
        product?.merchant_profiles?.business_name ||
        product?.merchant_profiles?.name ||
        'Unknown vendor',
      vendor_location: product?.merchant_profiles?.location || 'Nigeria',
    }))
  }

  const runVendorSearch = async () => {
    const { data, error } = await supabase
      .from('auth_users')
      .select('id, business_name, name, business_category, location, business_description, avatar_url, setup_completed')
      .eq('role', 'merchant')
      .eq('setup_completed', true)
      .or(`business_name.ilike.${pattern},name.ilike.${pattern},business_category.ilike.${pattern},location.ilike.${pattern},business_description.ilike.${pattern}`)
      .limit(limit)

    if (error) throw error

    return (data || []).map((vendor: any) => ({
      id: vendor.id,
      name: vendor.business_name || vendor.name || 'Unknown vendor',
      category: vendor.business_category || 'General',
      location: vendor.location || 'Nigeria',
      description: vendor.business_description || '',
      avatar_url: vendor.avatar_url || null,
    }))
  }

  try {
    const [products, vendors] = await Promise.all([
      type === 'vendors' ? Promise.resolve([]) : runProductSearch(),
      type === 'products' ? Promise.resolve([]) : runVendorSearch(),
    ])

    return {
      success: true,
      type,
      products,
      vendors,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Search failed',
      products: [],
      vendors: [],
      type,
    }
  }
}

export function buildAiSearchReply(params: {
  query: string
  products: Array<{ name: string; price: number; vendor_name: string }>
  vendors: Array<{ name: string; category: string; location: string }>
}) {
  const { query, products, vendors } = params

  if (products.length === 0 && vendors.length === 0) {
    return `I couldn't find a direct match for "${query}" yet. Try a broader term like a product category or location.`
  }

  const parts: string[] = []
  if (products.length > 0) {
    const topProducts = products.slice(0, 3)
      .map((p) => `${p.name} (${p.vendor_name}) - NGN ${p.price.toLocaleString()}`)
      .join('; ')
    parts.push(`Top products: ${topProducts}.`)
  }

  if (vendors.length > 0) {
    const topVendors = vendors.slice(0, 3)
      .map((v) => `${v.name} (${v.category}, ${v.location})`)
      .join('; ')
    parts.push(`Top vendors: ${topVendors}.`)
  }

  return parts.join(' ')
}
