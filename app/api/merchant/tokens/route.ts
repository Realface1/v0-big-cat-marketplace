import { NextRequest, NextResponse } from "next/server"
import { getMerchantTokenBalance } from "@/lib/merchant-tokens"
import { requireAuthenticatedUser } from "@/lib/supabase/request-auth"

export async function GET(request: NextRequest) {
  const merchantId = String(request.nextUrl.searchParams.get("merchantId") || "").trim()
  if (!merchantId) {
    return NextResponse.json({ success: false, error: "merchantId is required" }, { status: 400 })
  }

  const auth = await requireAuthenticatedUser(merchantId)
  if (auth.response) return auth.response

  const result = await getMerchantTokenBalance(merchantId)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error, balance: 0 }, { status: 400 })
  }

  return NextResponse.json({ success: true, balance: result.balance })
}
