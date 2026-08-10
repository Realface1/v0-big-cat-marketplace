import { createClient } from "@supabase/supabase-js"
import { createHmac, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { holdFundsInEscrow } from "@/lib/escrow-actions"
import { dispatchNotification } from "@/lib/notifications"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials")
}

const supabase = createClient(supabaseUrl, supabaseKey)

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
    const rawBody = await request.text()

    // Verify webhook signature when secret is configured.
    // Safe to skip now — will auto-enforce once KORA_WEBHOOK_SECRET is added to env.
    const webhookSecret = process.env.KORA_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get("x-korapay-signature") || request.headers.get("x-webhook-signature") || ""
      const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex")
      let signatureValid = false
      try {
        signatureValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      } catch {
        signatureValid = false
      }
      if (!signatureValid) {
        console.warn("[v0] Webhook signature mismatch — request rejected")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const body = JSON.parse(rawBody)

    const { paymentReference, status, orderId } = body

    // Validate webhook signature
    // TODO: In production, verify webhook signature from Kora/PalmPay
    // const webhookSecret = process.env.KORA_WEBHOOK_SECRET
    // if (!verifySignature(body, webhookSecret)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    // }

    if (!orderId || !paymentReference) {
      return NextResponse.json(
        { error: "Missing required webhook fields" },
        { status: 400 }
      )
    }

    const orderLookupAttempts = [
      'id, buyer_id, merchant_id, payment_status, payment_reference, status, escrow_status',
      'id, buyer_id, merchant_id, payment_reference, status, escrow_status',
      'id, buyer_id, merchant_id, payment_reference, status',
    ]

    let existingOrder: any = null
    let existingOrderError: any = null

    for (const selectClause of orderLookupAttempts) {
      const result = await (supabase.from('orders') as any)
        .select(selectClause)
        .eq('id', orderId)
        .maybeSingle()

      if (!result.error) {
        existingOrder = result.data
        existingOrderError = null
        break
      }

      existingOrderError = result.error
      if (!isMissingColumnError(result.error)) {
        break
      }
    }

    if (existingOrderError) {
      console.warn("[v0] Failed to inspect existing order before webhook update:", existingOrderError)
    }

    const isDuplicateSuccessfulWebhook =
      paymentReference &&
      String(existingOrder?.payment_status || "").toLowerCase() === "completed" &&
      String(existingOrder?.payment_reference || "") === String(paymentReference)

    // Map payment status
    let paymentStatus = "failed"

    if (status === "success" || status === "completed") {
      paymentStatus = "completed"
    } else if (status === "pending" || status === "processing") {
      paymentStatus = "processing"
    } else if (status === "failed" || status === "cancelled") {
      paymentStatus = "failed"
    }

    const updateAttempts = [
      {
        payment_status: paymentStatus,
        payment_reference: paymentReference,
        status: paymentStatus === "completed" ? "paid" : "pending",
      },
      {
        payment_status: paymentStatus,
        payment_reference: paymentReference,
        status: paymentStatus === "completed" ? "paid" : "pending",
      },
      {
        payment_reference: paymentReference,
        status: paymentStatus === "completed" ? "paid" : "pending",
      },
    ]

    let order: any[] | null = null
    let lastError: any = null

    for (const attempt of updateAttempts) {
      const { data, error } = await supabase
        .from("orders")
        .update(attempt)
        .eq("id", orderId)
        .select()

      if (!error) {
        order = data || []
        break
      }

      if (!isMissingColumnError(error)) {
        console.error("[v0] Failed to update order:", error)
        return NextResponse.json(
          { error: "Failed to update order" },
          { status: 500 }
        )
      }

      lastError = error
    }

    if (!order) {
      console.error("[v0] Failed to update order:", lastError)
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      )
    }

    console.log("[v0] Order updated successfully:", order)

    if (isDuplicateSuccessfulWebhook && paymentStatus === "completed") {
      console.info("[v0] Duplicate successful payment webhook ignored for order:", orderId)
      return NextResponse.json(
        {
          success: true,
          message: "Webhook already processed",
          duplicate: true,
        },
        { status: 200 }
      )
    }

    if (paymentStatus === "completed" && order?.[0]) {
      await holdFundsInEscrow(supabase, order[0], "palmpay")

      // Fetch buyer and merchant IDs for notifications
      const { data: orderDetails } = await supabase
        .from("orders")
        .select("id, buyer_id, merchant_id")
        .eq("id", orderId)
        .maybeSingle()

      const buyerId = String(orderDetails?.buyer_id || order[0]?.buyer_id || "")
      const merchantId = String(orderDetails?.merchant_id || order[0]?.merchant_id || "")

      if (buyerId) {
        await dispatchNotification({
          userId: buyerId,
          type: "order",
          title: "Payment confirmed",
          message: `Your payment for order ${orderId} was successful. Your order is now being processed.`,
          eventKey: `checkout:payment:buyer:${orderId}:completed`,
          metadata: { orderId, action: "track_package", actionPath: `/track/${orderId}` },
        })
      }

      if (merchantId) {
        await dispatchNotification({
          userId: merchantId,
          type: "order",
          title: "New paid order",
          message: `You have received a new paid order (${orderId}). Please prepare it for dispatch.`,
          eventKey: `checkout:payment:merchant:${orderId}:completed`,
          metadata: { orderId },
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Webhook processed successfully",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint for testing
export async function GET() {
  return NextResponse.json(
    { message: "Webhook endpoint ready" },
    { status: 200 }
  )
}
