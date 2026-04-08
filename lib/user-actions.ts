'use server'

import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function getUserProfile(userId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('auth_users').select('*').eq('id', userId).single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateUserProfile(userId: string, updates: { name?: string; phone?: string; business_name?: string; email?: string }) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('auth_users').update(updates).eq('id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  try {
    const supabase = await createClient()
    const { data: user } = await supabase.from('auth_users').select('password_hash').eq('id', userId).single()
    if (!user || user.password_hash !== hashPassword(currentPassword)) return { success: false, error: 'Invalid current password' }
    
    const { error } = await supabase.from('auth_users').update({ password_hash: hashPassword(newPassword) }).eq('id', userId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateEmail(userId: string, newEmail: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('auth_users').update({ email: newEmail }).eq('id', userId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateNotificationPreferences(userId: string, preferences: any) {
  return { success: true }
}

export async function deleteAccount(userId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('auth_users').delete().eq('id', userId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getPaymentMethods(userId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('payment_methods').select('*').eq('user_id', userId)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function addPaymentMethod(userId: string, method: { type: string; details: any }) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('payment_methods').insert({ user_id: userId, ...method }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function removePaymentMethod(methodId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('payment_methods').delete().eq('id', methodId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function setDefaultPaymentMethod(userId: string, methodId: string) {
  try {
    const supabase = await createClient()
    await supabase.from('payment_methods').update({ is_default: false }).eq('user_id', userId)
    const { error } = await supabase.from('payment_methods').update({ is_default: true }).eq('id', methodId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
