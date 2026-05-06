"use server"

import { sendEmail } from "@/lib/mailer"
import { createClient } from "@/lib/supabase/server"
import { sendWhatsAppNotification } from "@/lib/whatsapp"

export type NotificationType = "order" | "system" | "alert" | "report"

type JsonRecord = Record<string, any>

export interface DispatchNotificationInput {
  userId: string
  title: string
  message: string
  type: NotificationType
  eventKey?: string
  metadata?: JsonRecord
  sendEmail?: boolean
  sendWhatsApp?: boolean
  emailSubject?: string
  emailHtml?: string
  emailText?: string
}

type NotificationRecipientProfile = {
  email: string
  role: string
  name: string
  businessName: string
  phone: string
  emailNotificationsEnabled: boolean
  whatsappNotificationsEnabled: boolean
}

interface NotificationRow {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  created_at: string
  read_at: string | null
  metadata?: JsonRecord | null
}

function isMissingNotificationInfraError(error: any) {
  const message = String(error?.message || "").toLowerCase()
  return message.includes("does not exist")
    || message.includes("relation")
    || message.includes("schema cache")
    || message.includes("could not find")
    || message.includes("column")
}

function escapeHtml(input: string) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

type OrderEmailContext = {
  order?: {
    id?: string
    status?: string
    created_at?: string
    delivery_address?: string
    delivery_fee?: number
    coupon_discount?: number
    grand_total?: number
    total_amount?: number
    final_total?: number
  } | null
  items?: Array<{
    product_name?: string
    quantity?: number
    unit_price?: number
    total_price?: number
    image_url?: string
  }>
  buyer?: { name?: string; email?: string; phone?: string } | null
  merchant?: { name?: string; business_name?: string; email?: string } | null
}

function firstNonEmptyString(...values: any[]) {
  for (const value of values) {
    const text = String(value || "").trim()
    if (text) return text
  }
  return ""
}

function firstFiniteNumber(...values: any[]) {
  for (const value of values) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function extractImageUrl(value: any): string {
  if (!value) return ""

  if (typeof value === "string") {
    const text = value.trim()
    if (!text) return ""
    if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("data:image/")) return text
    if (text.startsWith("/")) return text
    return text
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = extractImageUrl(entry)
      if (candidate) return candidate
    }
    return ""
  }

  if (typeof value === "object") {
    return firstNonEmptyString(
      extractImageUrl(value.url),
      extractImageUrl(value.src),
      extractImageUrl(value.image_url),
      extractImageUrl(value.imageUrl),
      extractImageUrl(value.secure_url),
      extractImageUrl(value.path),
    )
  }

  return ""
}

function extractOrderIdFromText(input: string) {
  const text = String(input || "")
  const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  if (uuidMatch?.[0]) return uuidMatch[0]
  return ""
}

function resolveOrderIdForEmail(input: DispatchNotificationInput) {
  const fromMetadata = String(input.metadata?.orderId || "").trim()
  if (fromMetadata) return fromMetadata

  const fromMessage = extractOrderIdFromText(input.message)
  if (fromMessage) return fromMessage

  const fromTitle = extractOrderIdFromText(input.title)
  if (fromTitle) return fromTitle

  const fromEventKey = extractOrderIdFromText(input.eventKey || "")
  if (fromEventKey) return fromEventKey

  return ""
}

async function selectOrderItemsForEmail(supabase: any, orderId: string) {
  const attempts = [
    // Correct schema: unit_price + total_price (no 'price' column)
    "product_id, product_name, quantity, unit_price, total_price",
    "product_id, product_name, quantity, unit_price",
    "product_id, product_name, quantity",
    "product_id, quantity, unit_price, total_price",
    "product_id, quantity, unit_price",
    "product_name, quantity, unit_price, total_price",
    "product_name, quantity, unit_price",
    // Legacy fallbacks (in case 'price' exists on some db versions)
    "product_id, product_name, quantity, unit_price, total_price, price",
    "product_id, product_name, quantity, price",
    "product_id, quantity, price",
    "product_name, quantity, price",
  ]

  for (const selectClause of attempts) {
    const result = await (supabase.from("order_items") as any)
      .select(selectClause)
      .eq("order_id", orderId)

    if (!result.error) {
      return Array.isArray(result.data) ? result.data : []
    }

    const message = String(result.error?.message || "").toLowerCase()
    if (!message.includes("column") && !message.includes("schema cache")) {
      break
    }
  }

  return []
}

async function selectOrderForEmail(supabase: any, orderId: string) {
  const attempts = [
    "id, buyer_id, merchant_id, status, delivery_address, delivery_fee, grand_total, total_amount, created_at",
    "id, buyer_id, merchant_id, status, delivery_address, delivery_fee, total_amount, created_at",
    "id, buyer_id, merchant_id, status, delivery_address, grand_total, created_at",
    "id, buyer_id, merchant_id, status, delivery_address, created_at",
    "id, buyer_id, merchant_id, delivery_address, created_at",
    "id, buyer_id, merchant_id, created_at",
  ]

  for (const selectClause of attempts) {
    const result = await (supabase.from("orders") as any)
      .select(selectClause)
      .eq("id", orderId)
      .maybeSingle()

    if (!result.error) {
      return result.data || null
    }

    const message = String(result.error?.message || "").toLowerCase()
    if (!message.includes("column") && !message.includes("schema cache")) {
      break
    }
  }

  return null
}

async function selectAuthUserForEmail(supabase: any, userId: string, kind: "buyer" | "merchant") {
  const attempts = kind === "buyer"
    ? ["name, email, phone", "full_name, email, phone_number", "name, email", "full_name, email"]
    : ["name, business_name, email", "full_name, business_name, email", "name, email", "full_name, email"]

  for (const selectClause of attempts) {
    const result = await (supabase.from("auth_users") as any)
      .select(selectClause)
      .eq("id", userId)
      .maybeSingle()

    if (!result.error) {
      const row = result.data || {}
      if (kind === "buyer") {
        return {
          name: firstNonEmptyString(row.name, row.full_name),
          email: firstNonEmptyString(row.email),
          phone: firstNonEmptyString(row.phone, row.phone_number),
        }
      }
      return {
        name: firstNonEmptyString(row.name, row.full_name),
        business_name: firstNonEmptyString(row.business_name),
        email: firstNonEmptyString(row.email),
      }
    }

    const message = String(result.error?.message || "").toLowerCase()
    if (!message.includes("column") && !message.includes("schema cache")) {
      break
    }
  }

  return null
}

async function selectProductsForEmail(supabase: any, productIds: string[]) {
  const attempts = [
    "id, name, image_url, product_image, images",
    "id, name, image_url",
    "id, name, image_url, images",
    "id, name, images",
    "id, product_name, image_url, product_image, images",
    "id, product_name, image_url",
    "id, product_name, image_url, images",
    "id, product_name, images",
    "id, image_url",
    "id, images",
  ]

  for (const selectClause of attempts) {
    const result = await (supabase.from("products") as any)
      .select(selectClause)
      .in("id", productIds)

    if (!result.error) {
      return Array.isArray(result.data) ? result.data : []
    }

    const message = String(result.error?.message || "").toLowerCase()
    if (!message.includes("column") && !message.includes("schema cache")) {
      break
    }
  }

  return []
}

async function fetchOrderEmailContext(orderId: string): Promise<OrderEmailContext> {
  try {
    const supabase = await createClient()

    const order = await selectOrderForEmail(supabase, orderId)

    if (!order) return {}

    const [rawItems, buyer, merchant] = await Promise.all([
      selectOrderItemsForEmail(supabase, orderId),
      order.buyer_id ? selectAuthUserForEmail(supabase, String(order.buyer_id), "buyer") : Promise.resolve(null),
      order.merchant_id ? selectAuthUserForEmail(supabase, String(order.merchant_id), "merchant") : Promise.resolve(null),
    ])

    let items: any[] = Array.isArray(rawItems)
      ? rawItems.map((item: any) => ({
          product_id: item?.product_id,
          product_name: firstNonEmptyString(item?.product_name),
          quantity: Number(item?.quantity || 1),
          unit_price: firstFiniteNumber(item?.unit_price, item?.price),
          total_price: firstFiniteNumber(item?.total_price),
          image_url: firstNonEmptyString(item?.image_url, item?.product_image, extractImageUrl(item?.images)),
        }))
      : []

    // Try to enrich items with product images
    const productIds = items.map((i: any) => String(i.product_id || "").trim()).filter(Boolean)
    if (productIds.length > 0) {
      try {
        const products = await selectProductsForEmail(supabase, productIds)
        const productMap: Record<string, { name: string; image_url: string }> = {}
        for (const p of products || []) {
          const id = String(p?.id || "").trim()
          if (!id) continue

          const imageFromImages = extractImageUrl(p?.images)

          productMap[id] = {
            name: firstNonEmptyString(p?.name, p?.product_name),
            image_url: firstNonEmptyString(p?.image_url, p?.product_image, imageFromImages),
          }
        }

        items = items.map((item: any) => {
          const product = productMap[String(item.product_id || "").trim()]
          const quantity = Number(item.quantity || 1)
          const unitPrice = Number(item.unit_price || 0)
          const totalPrice = Number(item.total_price || 0)
          return {
            ...item,
            product_name: firstNonEmptyString(item.product_name, product?.name, "Product"),
            image_url: firstNonEmptyString(item.image_url, product?.image_url),
            total_price: totalPrice > 0 ? totalPrice : unitPrice * quantity,
          }
        })
      } catch {
        // images are optional
      }
    } else {
      items = items.map((item: any) => {
        const quantity = Number(item.quantity || 1)
        const unitPrice = Number(item.unit_price || 0)
        const totalPrice = Number(item.total_price || 0)
        return {
          ...item,
          product_name: firstNonEmptyString(item.product_name, "Product"),
          total_price: totalPrice > 0 ? totalPrice : unitPrice * quantity,
        }
      })
    }

    return {
      order,
      items,
      buyer,
      merchant,
    }
  } catch {
    return {}
  }
}

function buildDefaultEmailHtml(title: string, message: string, metadata?: Record<string, any>, ctx?: OrderEmailContext) {
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />")

  const orderId = String(metadata?.orderId || ctx?.order?.id || "").trim()
  const actionPath = String(metadata?.actionPath || "").trim()
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "https://v0-big-cat-marketplace.vercel.app"
  ).replace(/\/$/, "")
  const trackingUrl = actionPath
    ? `${appUrl}${actionPath}`
    : orderId
      ? `${appUrl}/track/${orderId}`
      : ""
  const trackingId = orderId ? `BC-${orderId.replace(/-/g, "").slice(0, 10).toUpperCase()}` : ""

  const isAlert = /alert|breach|delay|incident|failed|cancel/i.test(title)
  const isSuccess = /confirmed|completed|delivered|released|paid|assigned|approved|placed/i.test(title)
  const accentColor = isAlert ? "#ef4444" : isSuccess ? "#22c55e" : "#f97316"
  const badgeText = isAlert ? "IMPORTANT ALERT" : isSuccess ? "CONFIRMED" : "ORDER UPDATE"
  const year = new Date().getFullYear()

  const logoUrl = `${appUrl}/image.png`

  // ── ORDER REFERENCE BOX ──
  const orderDate = ctx?.order?.created_at
    ? new Date(ctx.order.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })
    : ""

  const orderBox = orderId
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;">
        <tr>
          <td style="padding:14px 16px;">
            <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#9a3412;letter-spacing:.12em;text-transform:uppercase;">Order Reference</p>
            <p style="margin:0 0 2px;font-size:18px;font-weight:800;color:#0f172a;font-family:'Courier New',monospace;letter-spacing:.04em;">${trackingId}</p>
            <p style="margin:0;font-size:10px;color:#78716c;">ID: ${escapeHtml(orderId)}${orderDate ? `&nbsp;&middot;&nbsp;${escapeHtml(orderDate)}` : ""}</p>
          </td>
          <td style="padding:14px 16px;text-align:right;white-space:nowrap;">
            <div style="display:inline-block;background:${accentColor};border-radius:6px;padding:5px 12px;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:.1em;">${badgeText}</p>
            </div>
          </td>
        </tr>
      </table>`
    : ""

  // ── ORDER ITEMS TABLE ──
  const metadataItems = Array.isArray(metadata?.orderItems)
    ? metadata.orderItems.map((item: any) => ({
        product_name: firstNonEmptyString(item?.product_name, item?.productName, item?.name, "Product"),
        quantity: Number(item?.quantity || 1),
        unit_price: firstFiniteNumber(item?.unit_price, item?.unitPrice, item?.price),
        total_price: firstFiniteNumber(item?.total_price, item?.totalPrice),
        image_url: firstNonEmptyString(item?.image_url, item?.imageUrl, item?.image, extractImageUrl(item?.images)),
      }))
    : []

  const items = (ctx?.items && ctx.items.length > 0) ? ctx.items : metadataItems
  const itemsTable = items.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <tr style="background:#f8fafc;">
          <td colspan="3" style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0;font-size:10px;font-weight:700;color:#64748b;letter-spacing:.1em;text-transform:uppercase;">Items Ordered</p>
          </td>
        </tr>
        ${items.map((item, idx) => {
          const imgUrl = String(item.image_url || "").trim()
          const normalizedImgUrl = imgUrl
            ? (imgUrl.startsWith("/") ? `${appUrl}${imgUrl}` : imgUrl)
            : ""
          const productName = escapeHtml(String(item.product_name || "Product"))
          const qty = Number(item.quantity || 1)
          const unitPrice = Number(item.unit_price || 0)
          const lineTotal = Number(item.total_price || unitPrice * qty)
          const isLast = idx === items.length - 1
          const imgCell = normalizedImgUrl
            ? `<img src="${escapeHtml(normalizedImgUrl)}" alt="${productName}" width="80" height="80" style="width:80px;height:80px;max-width:80px;object-fit:cover;border-radius:10px;display:block;border:1px solid #e2e8f0;" />`
            : `<div style="width:80px;height:80px;background:#f1f5f9;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:32px;text-align:center;line-height:80px;">&#x1F4E6;</div>`
          return `<tr style="${isLast ? "" : "border-bottom:1px solid #f1f5f9;"}">
            <td style="padding:12px 14px;width:96px;vertical-align:middle;">${imgCell}</td>
            <td style="padding:12px 6px;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#0f172a;">${productName}</p>
              <p style="margin:0;font-size:11px;color:#64748b;">Qty: ${qty}</p>
            </td>
            <td style="padding:12px 14px;vertical-align:top;text-align:right;white-space:nowrap;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;">&#x20A6;${lineTotal.toLocaleString("en-NG")}</p>
              ${qty > 1 ? `<p style="margin:2px 0 0;font-size:10px;color:#94a3b8;">&#x20A6;${unitPrice.toLocaleString("en-NG")} each</p>` : ""}
            </td>
          </tr>`
        }).join("")}
      </table>`
    : ""

  // ── PRICING BREAKDOWN ──
  const subtotalFromItems = items.reduce((s, i) => s + Number(i.total_price || (Number(i.unit_price || 0) * Number(i.quantity || 1))), 0)
  const subtotal = Number(metadata?.subtotal || subtotalFromItems || 0)
  const deliveryFee = Number(ctx?.order?.delivery_fee || metadata?.deliveryFee || 0)
  const couponDiscount = Number(metadata?.couponDiscount || ctx?.order?.coupon_discount || 0)
  const grandTotal = Number(ctx?.order?.grand_total || ctx?.order?.total_amount || metadata?.grandTotal || (subtotal + deliveryFee) || 0)
  const finalTotal = Number(metadata?.finalTotal || ctx?.order?.final_total || (grandTotal - couponDiscount))
  const insurance = grandTotal > 0 ? Math.round(grandTotal * 0.05 * 100) / 100 : 0

  const pricingTable = (items.length > 0 || grandTotal > 0)
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <tr>
          <td colspan="2" style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0;font-size:10px;font-weight:700;color:#64748b;letter-spacing:.1em;text-transform:uppercase;">Pricing Breakdown</p>
          </td>
        </tr>
        ${subtotal > 0 ? `<tr><td style="padding:8px 14px;font-size:12px;color:#475569;">Subtotal</td><td style="padding:8px 14px;font-size:12px;color:#0f172a;font-weight:600;text-align:right;">&#x20A6;${subtotal.toLocaleString("en-NG")}</td></tr>` : ""}
        ${deliveryFee > 0 ? `<tr><td style="padding:8px 14px;font-size:12px;color:#475569;">Delivery Fee</td><td style="padding:8px 14px;font-size:12px;color:#0f172a;font-weight:600;text-align:right;">&#x20A6;${deliveryFee.toLocaleString("en-NG")}</td></tr>` : ""}
        ${insurance > 0 ? `<tr><td style="padding:8px 14px;font-size:12px;color:#475569;">Insurance (5%)</td><td style="padding:8px 14px;font-size:12px;color:#0f172a;font-weight:600;text-align:right;">&#x20A6;${insurance.toLocaleString("en-NG")}</td></tr>` : ""}
        ${couponDiscount > 0 ? `<tr><td style="padding:8px 14px;font-size:12px;color:#059669;">Coupon Discount ${metadata?.couponCode ? `(${metadata.couponCode})` : ""}</td><td style="padding:8px 14px;font-size:12px;color:#059669;font-weight:600;text-align:right;">-&#x20A6;${couponDiscount.toLocaleString("en-NG")}</td></tr>` : ""}
        ${finalTotal > 0 ? `<tr style="background:#fff7ed;border-top:2px solid #fed7aa;"><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#92400e;">Final Total</td><td style="padding:10px 14px;font-size:15px;font-weight:800;color:#c2410c;text-align:right;">&#x20A6;${finalTotal.toLocaleString("en-NG")}</td></tr>` : ""}
      </table>`
    : ""

  // ── BUYER & MERCHANT CARDS ──
  const buyerCard = ctx?.buyer
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <tr style="background:#f0fdf4;">
          <td style="padding:10px 14px;border-bottom:1px solid #dcfce7;">
            <p style="margin:0;font-size:10px;font-weight:700;color:#166534;letter-spacing:.1em;text-transform:uppercase;">&#x1F6CD; Buyer Details</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 14px;">
            <table cellpadding="0" cellspacing="0">
              ${ctx.buyer.name ? `<tr><td style="padding:2px 0;font-size:11px;color:#64748b;width:70px;">Name</td><td style="padding:2px 0;font-size:12px;font-weight:600;color:#0f172a;">${escapeHtml(ctx.buyer.name)}</td></tr>` : ""}
              ${ctx.buyer.email ? `<tr><td style="padding:2px 0;font-size:11px;color:#64748b;">Email</td><td style="padding:2px 0;font-size:12px;font-weight:600;color:#0f172a;">${escapeHtml(ctx.buyer.email)}</td></tr>` : ""}
              ${ctx.buyer.phone ? `<tr><td style="padding:2px 0;font-size:11px;color:#64748b;">Phone</td><td style="padding:2px 0;font-size:12px;font-weight:600;color:#0f172a;">${escapeHtml(ctx.buyer.phone)}</td></tr>` : ""}
              ${ctx.order?.delivery_address ? `<tr><td style="padding:2px 0;font-size:11px;color:#64748b;vertical-align:top;">Address</td><td style="padding:2px 0;font-size:12px;font-weight:600;color:#0f172a;">${escapeHtml(ctx.order.delivery_address)}</td></tr>` : ""}
            </table>
          </td>
        </tr>
      </table>`
    : ""

  const merchantCard = ctx?.merchant
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <tr style="background:#eff6ff;">
          <td style="padding:10px 14px;border-bottom:1px solid #dbeafe;">
            <p style="margin:0;font-size:10px;font-weight:700;color:#1e40af;letter-spacing:.1em;text-transform:uppercase;">&#x1F3EA; Seller / Merchant Details</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 14px;">
            <table cellpadding="0" cellspacing="0">
              ${(ctx.merchant.business_name || ctx.merchant.name) ? `<tr><td style="padding:2px 0;font-size:11px;color:#64748b;width:70px;">Business</td><td style="padding:2px 0;font-size:12px;font-weight:600;color:#0f172a;">${escapeHtml(firstNonEmptyString(ctx.merchant.business_name, ctx.merchant.name))}</td></tr>` : ""}
            </table>
          </td>
        </tr>
      </table>`
    : ""

  // ── CTA BUTTON ──
  const ctaButton = trackingUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
        <tr>
          <td align="center">
            <a href="${escapeHtml(trackingUrl)}"
               style="display:inline-block;padding:13px 36px;background:#f97316;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              Track Your Order &rarr;
            </a>
          </td>
        </tr>
      </table>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:#0f172a;border-radius:16px 16px 0 0;padding:22px 32px;">
              <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${logoUrl}" alt="BigCat Marketplace" width="100" height="100"
                         style="width:100px;height:100px;object-fit:contain;display:block;filter:brightness(0) invert(1);" />
                  </td>
                  <td style="vertical-align:middle;padding-left:16px;">
                    <p style="margin:0 0 2px;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-.04em;line-height:1;">BigCat</p>
                    <p style="margin:0;font-size:10px;font-weight:600;color:#94a3b8;letter-spacing:.18em;text-transform:uppercase;">Marketplace</p>
                  </td>
                  <td style="vertical-align:middle;text-align:right;">
                    <p style="margin:0;font-size:11px;color:#64748b;line-height:1.6;">Nigeria&rsquo;s Premium<br/>B2B &amp; B2C Platform</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── ACCENT STRIPE ── -->
          <tr>
            <td style="background:${accentColor};padding:6px 32px;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#ffffff;letter-spacing:.2em;text-transform:uppercase;">${escapeHtml(badgeText)}</p>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background:#ffffff;padding:32px 32px 28px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${safeTitle}</h1>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;line-height:1.75;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">${safeMessage}</p>
              ${orderBox}
              ${itemsTable}
              ${pricingTable}
              ${buyerCard}
              ${merchantCard}
              ${ctaButton}
            </td>
          </tr>

          <!-- ── HELP STRIP ── -->
          <tr>
            <td style="background:#fff7ed;border-left:1px solid #fed7aa;border-right:1px solid #fed7aa;padding:14px 32px;">
              <p style="margin:0;font-size:11px;color:#92400e;font-weight:600;">&#x1F4E6; Need help with your order?</p>
              <p style="margin:3px 0 0;font-size:11px;color:#b45309;">Reply to this email or visit <a href="${appUrl}/help" style="color:#f97316;text-decoration:none;">BigCat Help Centre</a></p>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px 32px;">
              <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                <tr>
                  <td>
                    <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#0f172a;">BigCat Marketplace</p>
                    <p style="margin:0 0 10px;font-size:11px;color:#94a3b8;">Nigeria&rsquo;s trusted commerce platform for buyers, merchants &amp; businesses.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0;" />
                    <p style="margin:0;font-size:10px;color:#94a3b8;">
                      &copy; ${year} BigCat Marketplace. All rights reserved.
                      &nbsp;&middot;&nbsp;
                      <a href="${appUrl}" style="color:#f97316;text-decoration:none;">Visit Marketplace</a>
                      &nbsp;&middot;&nbsp;
                      <a href="${appUrl}/privacy" style="color:#f97316;text-decoration:none;">Privacy Policy</a>
                    </p>
                    <p style="margin:6px 0 0;font-size:10px;color:#cbd5e1;">You are receiving this email because you have an active BigCat account. If you did not request this, you can safely ignore it.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function hasProcessedEvent(eventKey: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase.from("automation_events") as any)
    .select("event_key")
    .eq("event_key", eventKey)
    .maybeSingle()

  if (error) {
    const message = String(error.message || "").toLowerCase()
    if (message.includes("does not exist") || message.includes("schema cache")) {
      return false
    }
    throw error
  }

  return Boolean(data)
}

async function recordProcessedEvent(eventKey: string, userId: string, type: NotificationType, metadata?: JsonRecord) {
  const supabase = await createClient()
  const payload = {
    event_key: eventKey,
    user_id: userId,
    event_type: type,
    metadata: metadata || null,
  }

  const { error } = await (supabase.from("automation_events") as any).insert(payload)
  if (error) {
    const message = String(error.message || "").toLowerCase()
    if (message.includes("duplicate key")) {
      return
    }
    if (message.includes("does not exist") || message.includes("schema cache")) {
      return
    }
    throw error
  }
}

async function insertNotification(payload: {
  user_id: string
  title: string
  message: string
  type: NotificationType
  metadata?: JsonRecord | null
  event_key?: string | null
}) {
  const supabase = await createClient()

  const attempts = [
    {
      ...payload,
      metadata: payload.metadata || null,
      event_key: payload.event_key || null,
    },
    {
      user_id: payload.user_id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      event_key: payload.event_key || null,
    },
    {
      user_id: payload.user_id,
      title: payload.title,
      message: payload.message,
      type: payload.type,
    },
  ]

  let lastError: any = null
  for (const attempt of attempts) {
    const { error } = await (supabase.from("user_notifications") as any).insert(attempt)
    if (!error) return { inserted: true }

    const message = String(error.message || "").toLowerCase()
    if (message.includes("column") || message.includes("schema cache") || message.includes("does not exist")) {
      lastError = error
      continue
    }

    throw error
  }

  if (lastError) {
    if (isMissingNotificationInfraError(lastError)) {
      return { inserted: false, skipped: true, reason: "Notification tables are not available yet" }
    }
    throw lastError
  }

  return { inserted: false, skipped: true, reason: "Notification insert was skipped" }
}

async function maybeSendEmail(userId: string, input: DispatchNotificationInput) {
  if (input.sendEmail === false) {
    return { sent: false, reason: "Email disabled for this event" }
  }

  const profile = await fetchNotificationRecipientProfile(userId)
  if (!profile) {
    return { sent: false, reason: "Could not read user profile" }
  }

  if (profile.role === 'buyer' && !isBuyerCriticalEmailEvent(input)) {
    return { sent: false, reason: "Buyer email policy: in-app/WhatsApp only for this event" }
  }

  const email = String(profile.email || "").trim()
  if (!email) {
    return { sent: false, reason: "Missing user email" }
  }

  if (!profile.emailNotificationsEnabled) {
    return { sent: false, reason: "User disabled email notifications" }
  }

  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "BigCat Marketplace <onboarding@resend.dev>"
  const subject = input.emailSubject || input.title

  let ctx: OrderEmailContext | undefined
  const orderId = resolveOrderIdForEmail(input)
  if (orderId && !input.emailHtml) {
    ctx = await fetchOrderEmailContext(orderId)
  }

  const enrichedMetadata: Record<string, any> = {
    ...(input.metadata || {}),
    ...(orderId ? { orderId } : {}),
  }

  const html = input.emailHtml || buildDefaultEmailHtml(input.title, input.message, enrichedMetadata, ctx)
  const text = input.emailText || `${input.title}\n\n${input.message}`

  const result = await sendEmail({ from, to: email, subject, html, text })
  return result.success ? { sent: true as const } : { sent: false, reason: result.error }
}

function isBuyerCriticalEmailEvent(input: DispatchNotificationInput) {
  const key = String(input.eventKey || "").toLowerCase()
  const title = String(input.title || "").toLowerCase()
  const message = String(input.message || "").toLowerCase()
  const text = `${key} ${title} ${message}`

  return (
    text.includes('payment') ||
    text.includes('in_transit') ||
    text.includes('in transit') ||
    text.includes('delivery update') ||
    text.includes('delivered') ||
    text.includes('completed')
  )
}

async function fetchNotificationRecipientProfile(userId: string): Promise<NotificationRecipientProfile | null> {
  const supabase = await createClient()
  const attempts = [
    "email, role, name, business_name, phone, phone_number, email_notifications, whatsapp_notifications",
    "email, role, name, business_name, phone, phone_number, email_notifications",
    "email, role, name, business_name, phone, email_notifications",
    "email, role, name, business_name, email_notifications",
    "email, role, name, business_name",
  ]

  for (const selectClause of attempts) {
    const { data: profile, error } = await (supabase.from("auth_users") as any)
      .select(selectClause)
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      const message = String(error.message || "").toLowerCase()
      if (message.includes("column") || message.includes("schema cache")) {
        continue
      }
      return null
    }

    return {
      email: String(profile?.email || "").trim(),
      role: String(profile?.role || "").trim().toLowerCase(),
      name: String(profile?.name || "").trim(),
      businessName: String(profile?.business_name || "").trim(),
      phone: String(profile?.phone || profile?.phone_number || "").trim(),
      emailNotificationsEnabled: profile?.email_notifications !== false,
      whatsappNotificationsEnabled: profile?.whatsapp_notifications !== false,
    }
  }

  return null
}

async function maybeSendWhatsApp(userId: string, input: DispatchNotificationInput) {
  if (input.sendWhatsApp === false) {
    return { sent: false, reason: "WhatsApp disabled for this event" }
  }

  const profile = await fetchNotificationRecipientProfile(userId)
  if (!profile) {
    return { sent: false, reason: "Could not read user profile" }
  }

  if (!profile.whatsappNotificationsEnabled) {
    return { sent: false, reason: "User disabled WhatsApp notifications" }
  }

  if (!profile.phone) {
    return { sent: false, reason: "Missing phone number" }
  }

  const result = await sendWhatsAppNotification({
    to: profile.phone,
    title: input.title,
    message: input.message,
    eventKey: input.eventKey,
    metadata: input.metadata,
  })

  return result.success ? { sent: true as const } : { sent: false, reason: result.error }
}

export async function dispatchNotification(input: DispatchNotificationInput) {
  const userId = String(input.userId || "").trim()
  if (!userId) {
    return { success: false, error: "userId is required" }
  }

  const eventKey = input.eventKey?.trim() || ""

  if (eventKey) {
    try {
      const alreadyProcessed = await hasProcessedEvent(eventKey)
      if (alreadyProcessed) {
        return { success: true, skipped: true, reason: "Duplicate event blocked" }
      }
    } catch (error: any) {
      if (!isMissingNotificationInfraError(error)) {
        throw error
      }
    }
  }

  const notificationInsert = await insertNotification({
    user_id: userId,
    title: input.title,
    message: input.message,
    type: input.type,
    metadata: input.metadata || null,
    event_key: eventKey || null,
  })

  const emailResult = await maybeSendEmail(userId, input)
  const whatsappResult = await maybeSendWhatsApp(userId, input)

  if (eventKey) {
    try {
      await recordProcessedEvent(eventKey, userId, input.type, {
        ...(input.metadata || {}),
        email_sent: Boolean(emailResult.sent),
        email_reason: emailResult.sent ? null : emailResult.reason,
        whatsapp_sent: Boolean(whatsappResult.sent),
        whatsapp_reason: whatsappResult.sent ? null : whatsappResult.reason,
      })
    } catch (error: any) {
      if (!isMissingNotificationInfraError(error)) {
        throw error
      }
    }
  }

  return {
    success: true,
    notification: notificationInsert,
    email: emailResult,
    whatsapp: whatsappResult,
  }
}

export async function fetchUserNotifications(userId: string, options?: { limit?: number; unreadOnly?: boolean; type?: NotificationType }) {
  const supabase = await createClient()
  let query = (supabase.from("user_notifications") as any)
    .select("id, user_id, title, message, type, created_at, read_at, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(options?.limit || 50, 200)))

  if (options?.unreadOnly) {
    query = query.is("read_at", null)
  }

  if (options?.type) {
    query = query.eq("type", options.type)
  }

  const { data, error } = await query
  if (error) {
    return { success: false, error: error.message, data: [] as NotificationRow[] }
  }

  return { success: true, data: (data || []) as NotificationRow[] }
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const supabase = await createClient()
  const { error } = await (supabase.from("user_notifications") as any)
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient()
  const { error } = await (supabase.from("user_notifications") as any)
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
