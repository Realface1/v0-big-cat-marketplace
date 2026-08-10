import { NextRequest, NextResponse } from "next/server"
import { addMerchantTokens } from "@/lib/merchant-tokens"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const merchantId = String(body.merchantId || body.merchant_id || "").trim()
  const amount = Number(body.amount || 0)

  if (!merchantId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ success: false, error: "merchantId and amount are required" }, { status: 400 })
  }

  const result = await addMerchantTokens({ merchantId, amount })
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error, balance: result.balance }, { status: 400 })
  }

  return NextResponse.json({ success: true, balance: result.balance, added: result.added })
}
