import { NextRequest, NextResponse } from "next/server"
import { deductMerchantTokens, TOKEN_COST_ORDER } from "@/lib/merchant-tokens"
import { requireAuthenticatedUser } from "@/lib/supabase/request-auth"

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser()
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const merchantIdsRaw = Array.isArray(body.merchantIds) ? body.merchantIds : []
  const merchantIds = Array.from(new Set(merchantIdsRaw.map((id: unknown) => String(id || "").trim()).filter(Boolean)))

  if (merchantIds.length === 0) {
    return NextResponse.json({ success: false, error: "merchantIds are required" }, { status: 400 })
  }

  const failed: Array<{ merchantId: string; error: string; balance: number }> = []
  const charged: Array<{ merchantId: string; charged: number; balance: number }> = []

  for (const merchantId of merchantIds) {
    const result = await deductMerchantTokens({
      merchantId,
      amount: TOKEN_COST_ORDER,
      reason: "buyer_order",
    })

    if (!result.success) {
      failed.push({
        merchantId,
        error: result.insufficient
          ? "Insufficient merchant tokens"
          : result.error || "Failed to charge merchant token",
        balance: result.balance,
      })
      continue
    }

    charged.push({ merchantId, charged: TOKEN_COST_ORDER, balance: result.balance })
  }

  return NextResponse.json({
    success: failed.length === 0,
    charged,
    failed,
    tokenCostPerMerchant: TOKEN_COST_ORDER,
  })
}
