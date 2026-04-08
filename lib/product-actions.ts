'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMerchantProducts(merchantId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('products').select('*').eq('merchant_id', merchantId)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getAllProducts() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('products').select('*, auth_users!merchant_id(business_name, name)').eq('is_active', true)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getProductById(productId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('products').select('*, auth_users!merchant_id(business_name, name)').eq('id', productId).single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function createProduct(merchantId: string, product: { name: string; description?: string; price: number; category?: string; image_url?: string; stock?: number }) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('products').insert({ ...product, merchant_id: merchantId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateProduct(productId: string, updates: Partial<{ name: string; description: string; price: number; category: string; image_url: string; stock: number; is_active: boolean }>) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('products').update(updates).eq('id', productId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteProduct(productId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('products').delete().eq('id', productId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function requestWeightVerification(productId: string) {
  return { success: true, message: 'Verification requested' }
}
