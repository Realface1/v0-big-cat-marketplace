import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

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
    } = body

    console.log("[v0] Order initiation request:", {
      productId,
      productName,
      vendorId,
      vendorName,
      quantity,
      unitPrice,
      totalAmount,
      deliveryMethod,
    })

    // Validate required fields
    if (!productId || !vendorId || !totalAmount || !deliveryMethod) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
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
        total_amount: totalAmount,
        delivery_method: deliveryMethod,
        status: "pending",
        payment_status: "pending",
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
        total_amount: totalAmount,
        delivery_method: deliveryMethod,
        status: "pending",
        payment_status: "pending",
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
        total_amount: totalAmount,
        delivery_method: deliveryMethod,
        status: "pending",
      },
    ]

    let order: any[] | null = null
    let lastError: any = null

    for (const attempt of orderAttempts) {
      const { data, error } = await supabase.from("orders").insert([attempt]).select()
      if (!error) {
        order = data || []
        break
      }

      if (!isMissingColumnError(error)) {
        console.error("[v0] Database error:", error)
        return NextResponse.json(
          { error: "Failed to create order" },
          { status: 500 }
        )
      }

      lastError = error
    }

    if (!order) {
      console.error("[v0] Database error:", lastError)
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      )
    }

    console.log("[v0] Order created successfully:", order)

    // TODO: In production, call Kora Pay with Bank API here
    // For MVP, simulate successful payment initiation
    const paymentReference = `PM-${Date.now()}`

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return NextResponse.json(
      {
        success: true,
        orderId: order?.[0]?.id,
        paymentReference,
        message: "Order initiated successfully. Redirecting to payment...",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Checkout initiation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
