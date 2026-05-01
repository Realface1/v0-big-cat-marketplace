import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuthenticatedUser } from "@/lib/supabase/request-auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = String(body?.userId || "").trim()
    const action = String(body?.action || "active").toLowerCase()
    const itemCount = Math.max(0, Number(body?.itemCount || 0))
    const cartValue = Math.max(0, Number(body?.cartValue || 0))
    const metadata = body?.metadata || {}

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
    }

    const auth = await requireAuthenticatedUser(userId)
    if (auth.response) return auth.response

    const supabase = await createClient()
    const now = new Date().toISOString()

    const payload = action === "checked_out"
      ? {
          user_id: userId,
          item_count: itemCount,
          cart_value: cartValue,
          metadata,
          last_active_at: now,
          checked_out_at: now,
          updated_at: now,
        }
      : {
          user_id: userId,
          item_count: itemCount,
          cart_value: cartValue,
          metadata,
          last_active_at: now,
          checked_out_at: null,
          updated_at: now,
        }

    const { error } = await (supabase.from("cart_sessions") as any)
      .upsert(payload, { onConflict: "user_id" })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cart session API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
