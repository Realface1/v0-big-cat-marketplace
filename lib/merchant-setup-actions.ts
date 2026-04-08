'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveMerchantSetup(userId: string, setup: { business_name?: string; smedan_id?: string; description?: string; location?: string; categories?: string[] }) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('auth_users').update({ ...setup, setup_completed: true }).eq('id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getMerchantSetup(userId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('auth_users').select('*').eq('id', userId).single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
