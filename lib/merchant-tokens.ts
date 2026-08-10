import { createClient } from "@/lib/supabase/server"

export const INITIAL_MERCHANT_TOKENS = 100
export const TOKEN_COST_VENDOR_VIEW = 1
export const TOKEN_COST_ORDER = 2

export async function getMerchantTokenBalance(merchantId: string) {
  const id = String(merchantId || "").trim()
  if (!id) return { success: false, error: "Merchant id is required", balance: 0 }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("auth_users")
      .select("id, role, token_balance")
      .eq("id", id)
      .single()

    if (error) throw error
    if (!data || data.role !== "merchant") {
      return { success: false, error: "Merchant not found", balance: 0 }
    }

    const balance = Number(data.token_balance ?? 0)
    return { success: true, balance: Number.isFinite(balance) ? balance : 0 }
  } catch (error: any) {
    const message = String(error?.message || "Unknown error")
    if (message.toLowerCase().includes("token_balance")) {
      return {
        success: false,
        error: "Token columns are missing. Run scripts/010-add-merchant-tokens.sql in Supabase SQL Editor.",
        balance: 0,
      }
    }

    return { success: false, error: message, balance: 0 }
  }
}

export async function deductMerchantTokens(params: { merchantId: string; amount: number; reason: string }) {
  const merchantId = String(params.merchantId || "").trim()
  const amount = Math.max(0, Math.floor(Number(params.amount || 0)))

  if (!merchantId || amount <= 0) {
    return { success: false, insufficient: false, error: "Merchant id and token amount are required", balance: 0 }
  }

  const balanceResult = await getMerchantTokenBalance(merchantId)
  if (!balanceResult.success) {
    return { success: false, insufficient: false, error: balanceResult.error || "Failed to read merchant balance", balance: 0 }
  }

  const currentBalance = balanceResult.balance
  if (currentBalance < amount) {
    return { success: false, insufficient: true, error: "Insufficient merchant tokens", balance: currentBalance }
  }

  try {
    const supabase = await createClient()
    const nextBalance = Math.max(0, currentBalance - amount)

    const { error } = await supabase
      .from("auth_users")
      .update({ token_balance: nextBalance, updated_at: new Date().toISOString() } as any)
      .eq("id", merchantId)

    if (error) throw error

    return { success: true, insufficient: false, balance: nextBalance, charged: amount, reason: params.reason }
  } catch (error: any) {
    return { success: false, insufficient: false, error: error?.message || "Failed to deduct tokens", balance: currentBalance }
  }
}

export async function addMerchantTokens(params: { merchantId: string; amount: number }) {
  const merchantId = String(params.merchantId || "").trim()
  const amount = Math.max(0, Math.floor(Number(params.amount || 0)))

  if (!merchantId || amount <= 0) {
    return { success: false, error: "Merchant id and token amount are required", balance: 0 }
  }

  const balanceResult = await getMerchantTokenBalance(merchantId)
  if (!balanceResult.success) {
    return { success: false, error: balanceResult.error || "Failed to read merchant balance", balance: 0 }
  }

  try {
    const supabase = await createClient()
    const nextBalance = Math.max(0, balanceResult.balance + amount)

    const { error } = await supabase
      .from("auth_users")
      .update({ token_balance: nextBalance, updated_at: new Date().toISOString() } as any)
      .eq("id", merchantId)

    if (error) throw error

    return { success: true, balance: nextBalance, added: amount }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to add tokens", balance: balanceResult.balance }
  }
}
