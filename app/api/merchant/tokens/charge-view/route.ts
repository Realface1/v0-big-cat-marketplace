import { NextRequest, NextResponse } from "next/server"
import { deductMerchantTokens, TOKEN_COST_VENDOR_VIEW } from "@/lib/merchant-tokens"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const merchantId = String(body.merchantId || body.merchant_id || "").trim()

  if (!merchantId) {
    return NextResponse.json({ success: false, error: "merchantId is required" }, { status: 400 })
  }

  const result = await deductMerchantTokens({
    merchantId,
    amount: TOKEN_COST_VENDOR_VIEW,
    reason: "vendor_page_view",
  })

  if (!result.success && result.insufficient) {
    return NextResponse.json(
      {
        success: false,
        insufficient: true,
        error: "This merchant has exhausted tokens and needs to top up.",
        balance: result.balance,
      },
      { status: 402 }
    )
  }

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error, balance: result.balance }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    charged: TOKEN_COST_VENDOR_VIEW,
    balance: result.balance,
  })
}
