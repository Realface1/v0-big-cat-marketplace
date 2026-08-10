import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { getBestPromotionDiscountForItems, incrementPromotionUsage } from "@/lib/promotion-actions"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials")
}

const supabase = createClient(supabaseUrl, supabaseKey)

type CachedInitiationResult = {
  expiresAt: number
  result: any
}

const CHECKOUT_INITIATION_TTL_MS = 2 * 60 * 1000
const initiationResultCache = new Map<string, CachedInitiationResult>()
const initiationInFlight = new Map<string, Promise<any>>()

function buildInitiationSignature(body: Record<string, any>) {
  const appliedCoupon = body?.appliedCoupon
    ? {
        code: String(body.appliedCoupon.code || '').trim(),
        discount: Number(body.appliedCoupon.discount || 0),
      }
    : null

  return JSON.stringify({
    productId: String(body?.productId || '').trim(),
    vendorId: String(body?.vendorId || '').trim(),
    quantity: Number(body?.quantity || 0),
    unitPrice: Number(body?.unitPrice || 0),
    totalAmount: Number(body?.totalAmount || 0),
    deliveryMethod: String(body?.deliveryMethod || '').trim(),
    deliveryFee: Number(body?.deliveryFee || 0),
    appliedCoupon,
  })
}

function getInitiationKey(body: Record<string, any>) {
  return String(body?.idempotencyKey || body?.requestId || buildInitiationSignature(body))
}

function isMissingColumnError(error: any) {
  const message = String(error?.message || "").toLowerCase()
  return message.includes("column") && (
    message.includes("does not exist")
    || message.includes("schema cache")
    || message.includes("could not find")
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const idempotencyKey = getInitiationKey(body)
    const now = Date.now()

    const cachedResult = initiationResultCache.get(idempotencyKey)
    if (cachedResult && cachedResult.expiresAt > now) {
      return NextResponse.json(cachedResult.result, { status: 200 })
    }

    const inFlight = initiationInFlight.get(idempotencyKey)
    if (inFlight) {
      return NextResponse.json(await inFlight, { status: 200 })
    }

    const initiationPromise = (async () => {
      const {
        productId,
        productName,
        vendorId,
        vendorName,
        quantity,
        unitPrice,
        totalAmount,
        deliveryMethod,
        deliveryFee,
        appliedCoupon,
      } = body

      const itemSubtotal = Math.max(0, Number(unitPrice || 0) * Number(quantity || 0))
      const appliedPromotion = await getBestPromotionDiscountForItems(String(vendorId), [
        {
          productId: String(productId),
          quantity: Number(quantity || 0),
          unitPrice: Number(unitPrice || 0),
        },
      ])
      const promotionDiscount = Math.min(Number(appliedPromotion?.discountAmount || 0), itemSubtotal)
      const beforeCouponTotal = Math.max(0, itemSubtotal - promotionDiscount + Number(deliveryFee || 0))
      const couponDiscount = Math.min(Number(appliedCoupon?.discount || 0), beforeCouponTotal)
      const finalTotal = Math.max(0, beforeCouponTotal - couponDiscount)

      // Validate required fields
      if (!productId || !vendorId || !totalAmount || !deliveryMethod) {
        return {
          error: 'Missing required fields',
          status: 400,
        }
      }

      const orderAttempts = [
        {
          product_id: productId,
          product_name: productName,
          vendor_id: vendorId,
          vendor_name: vendorName,
          buyer_id: null,
          quantity,
          unit_price: unitPrice,
          delivery_fee: deliveryFee || 0,
          total_amount: finalTotal,
          delivery_method: deliveryMethod,
          status: 'pending',
          payment_status: 'pending',
          applied_coupon_code: appliedCoupon?.code || null,
          coupon_discount: couponDiscount,
          final_total: finalTotal,
        },
        {
          product_id: productId,
          product_name: productName,
          vendor_id: vendorId,
          vendor_name: vendorName,
          buyer_id: null,
          quantity,
          unit_price: unitPrice,
          delivery_fee: deliveryFee || 0,
          total_amount: finalTotal,
          delivery_method: deliveryMethod,
          status: 'pending',
          payment_status: 'pending',
          applied_coupon_code: appliedCoupon?.code || null,
          coupon_discount: couponDiscount,
          final_total: finalTotal,
        },
        {
          product_id: productId,
          product_name: productName,
          vendor_id: vendorId,
          vendor_name: vendorName,
          buyer_id: null,
          quantity,
          unit_price: unitPrice,
          delivery_fee: deliveryFee || 0,
          total_amount: finalTotal,
          delivery_method: deliveryMethod,
          status: 'pending',
          applied_coupon_code: appliedCoupon?.code || null,
          coupon_discount: couponDiscount,
          final_total: finalTotal,
        },
      ]

      let order: any[] | null = null
      let lastError: any = null

      for (const attempt of orderAttempts) {
        const { data, error } = await supabase.from('orders').insert([attempt]).select()
        if (!error) {
          order = data || []
          break
        }

        if (!isMissingColumnError(error)) {
          throw error
        }

        lastError = error
      }

      if (!order) {
        throw lastError || new Error('Failed to create order')
      }

      try {
        const requestedQty = Math.max(1, Number(quantity || 0))
        let stockUpdated = false

        for (let attempt = 0; attempt < 4; attempt++) {
          const stockResult = await supabase
            .from('products')
            .select('id, stock')
            .eq('id', productId)
            .single()

          if (stockResult.error || !stockResult.data) {
            break
          }

          const currentStock = Math.max(0, Number(stockResult.data.stock || 0))
          if (currentStock < requestedQty) {
            break
          }

          const nextStock = currentStock - requestedQty
          const updateResult = await supabase
            .from('products')
            .update({ stock: nextStock })
            .eq('id', productId)
            .eq('stock', currentStock)
            .select('id')

          if (!updateResult.error && Array.isArray(updateResult.data) && updateResult.data.length > 0) {
            stockUpdated = true
            break
          }
        }

        if (!stockUpdated) {
          console.warn('[v0] Stock CAS update did not complete for order', order?.[0]?.id)
        }
      } catch (stockError) {
        console.error('[v0] Stock update failed:', stockError)
      }

      if (appliedPromotion?.promotionId && promotionDiscount > 0) {
        await incrementPromotionUsage(appliedPromotion.promotionId)
      }

      const paymentReference = `PM-${Date.now()}`
      await new Promise((resolve) => setTimeout(resolve, 1000))

      return {
        success: true,
        orderId: order?.[0]?.id,
        promotionDiscount,
        promotionName: appliedPromotion?.promotionName || null,
        paymentReference,
        message: 'Order initiated successfully. Redirecting to payment...',
      }
    })()

    initiationInFlight.set(idempotencyKey, initiationPromise)

    try {
      const result = await initiationPromise
      initiationResultCache.set(idempotencyKey, {
        expiresAt: Date.now() + CHECKOUT_INITIATION_TTL_MS,
        result,
      })
      return NextResponse.json(result, { status: 200 })
    } finally {
      initiationInFlight.delete(idempotencyKey)
      const cached = initiationResultCache.get(idempotencyKey)
      if (cached && cached.expiresAt <= Date.now()) {
        initiationResultCache.delete(idempotencyKey)
      }
    }
  } catch (error) {
    console.error("[v0] Checkout initiation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
