'use server'

import { createClient } from '@/lib/supabase/server'

interface MerchantSetupData {
  businessName: string
  businessDescription: string
  category: string
  location: string
  smedanId?: string
  logoUrl?: string
}

export async function saveMerchantSetup(userId: string, setup: MerchantSetupData) {
  try {
    const supabase = await createClient()
    const updateData = {
      business_name: setup.businessName,
      business_description: setup.businessDescription,
      business_category: setup.category,
      location: setup.location,
      smedan_id: setup.smedanId,
      avatar_url: setup.logoUrl,
      setup_completed: true,
    }

    const { data, error } = await supabase
      .from('auth_users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return {
      success: true,
      data: {
        ...data,
        logo_url: (data as any)?.logo_url ?? (data as any)?.avatar_url ?? setup.logoUrl ?? null,
      },
    }
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
