import { NextRequest, NextResponse } from 'next/server'
import { getAllProducts } from '@/lib/product-actions'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buyerLat = Number(searchParams.get('buyerLat'))
    const buyerLng = Number(searchParams.get('buyerLng'))
    const category = searchParams.get('category') || null
    const search = searchParams.get('search') || null
    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '100')

    const result = await getAllProducts({
      buyerLat: Number.isFinite(buyerLat) ? buyerLat : null,
      buyerLng: Number.isFinite(buyerLng) ? buyerLng : null,
      category,
      search,
      page: Math.max(1, page),
      limit: Math.min(Math.max(1, limit), 200),
    })

    if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
      return NextResponse.json(result)
    }

    const supabase = await createClient()
    const nowIso = new Date().toISOString()
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayStartIso = todayStart.toISOString()
    const { data: promotions } = await supabase
      .from('promotions')
      .select('merchant_id, discount_type, discount_value, min_purchase_amount, product_ids, is_active, start_date, end_date')
      .eq('is_active', true)
      .lte('start_date', nowIso)
      .gte('end_date', todayStartIso)

    const promoList = Array.isArray(promotions) ? promotions : []
    const enrichedProducts = result.data.map((product: any) => {
      const price = Math.max(0, Number(product?.price || 0))
      if (price <= 0) {
        return { ...product, promotion_percent_off: 0 }
      }

      const productMerchantId = String(product?.merchant_id || product?.merchant_profiles?.id || '').trim()
      const productId = String(product?.id || '').trim()

      const eligiblePromos = promoList.filter((promo: any) => {
        const promoMerchantId = String(promo?.merchant_id || '').trim()
        if (!promoMerchantId || !productMerchantId || promoMerchantId !== productMerchantId) return false

        const scopedProductIds = Array.isArray(promo.product_ids)
          ? promo.product_ids.map((id: unknown) => String(id || '').trim()).filter(Boolean)
          : []

        // If product scope is set, product must be explicitly included.
        if (scopedProductIds.length > 0 && !scopedProductIds.includes(productId)) return false

        return true
      })

      let bestPercent = 0
      for (const promo of eligiblePromos) {
        const rawPercent = promo.discount_type === 'percentage'
          ? Number(promo.discount_value || 0)
          : (Number(promo.discount_value || 0) / price) * 100
        const normalizedPercent = Math.max(0, Math.min(100, Math.round(rawPercent)))
        if (normalizedPercent > bestPercent) bestPercent = normalizedPercent
      }

      return {
        ...product,
        promotion_percent_off: bestPercent,
      }
    })

    return NextResponse.json({ ...result, data: enrichedProducts })
  } catch (error) {
    console.error('Get all products API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}