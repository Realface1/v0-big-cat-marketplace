import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { holdFundsInEscrow } from "@/lib/escrow-actions"

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
    const body = await request.json()

    console.log("[v0] Webhook received:", body)

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

    if (paymentStatus === "completed" && order?.[0]) {
      await holdFundsInEscrow(supabase, order[0], "palmpay")
    }

    // TODO: Send notifications to buyer and vendor
    // TODO: Log payment event for analytics

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
