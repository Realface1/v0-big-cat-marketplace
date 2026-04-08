'use server'

import { createClient } from '@/lib/supabase/server'

export async function getOrCreateConversation(buyerId: string, merchantId: string, productId?: string) {
  try {
    const supabase = await createClient()
    
    let query = supabase.from('conversations').select('*').eq('buyer_id', buyerId).eq('merchant_id', merchantId)
    if (productId) query = query.eq('product_id', productId)
    
    const { data: existing } = await query.single()
    if (existing) return { success: true, data: existing }

    const { data, error } = await supabase.from('conversations').insert({ buyer_id: buyerId, merchant_id: merchantId, product_id: productId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getConversationMessages(conversationId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('messages').select('*, auth_users!sender_id(name)').eq('conversation_id', conversationId).order('created_at', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, content }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getUserConversations(userId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('conversations').select('*').or(`buyer_id.eq.${userId},merchant_id.eq.${userId}`).order('updated_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}
