'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

function generateId(prefix: string) {
  return `${prefix}_${randomUUID()}`
}

export async function getOrCreateConversation(buyerId: string, merchantId: string, productId?: string) {
  try {
    const supabase = await createClient()

    let query = supabase.from('conversations').select('*').eq('buyer_id', buyerId).eq('merchant_id', merchantId)
    if (productId) query = query.eq('product_id', productId)

    const { data: existing, error: existingError } = await query.maybeSingle()
    if (existingError && existingError.code !== 'PGRST116') throw existingError
    if (existing) return { success: true, data: existing }

    const baseConversation = {
      buyer_id: buyerId,
      merchant_id: merchantId,
      last_message_at: new Date().toISOString(),
    }

    const tryInsert = async (payload: Record<string, any>) => {
      return supabase.from('conversations').insert(payload as any).select().single()
    }

    let result = await tryInsert(productId ? { ...baseConversation, product_id: productId } : baseConversation)

    if (result.error && String(result.error.message || '').includes('product_id')) {
      result = await tryInsert(baseConversation)
    }

    if (
      result.error &&
      /null value in column "id"|not-null constraint|violates not-null/i.test(String(result.error.message || ''))
    ) {
      const fallbackBase = { id: generateId('conv'), ...baseConversation }
      result = await tryInsert(productId ? { ...fallbackBase, product_id: productId } : fallbackBase)

      if (result.error && String(result.error.message || '').includes('product_id')) {
        result = await tryInsert(fallbackBase)
      }
    }

    if (result.error) throw result.error
    return { success: true, data: result.data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getConversationMessages(conversationId: string, viewerId?: string) {
  try {
    const supabase = await createClient()

    if (viewerId) {
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('buyer_id, merchant_id')
        .eq('id', conversationId)
        .single()

      if (conversationError) throw conversationError

      if (conversation?.buyer_id !== viewerId && conversation?.merchant_id !== viewerId) {
        return { success: false, error: 'You are not allowed to view this conversation.', data: [] }
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:auth_users!sender_id(name, business_name, role)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function markConversationAsRead(conversationId: string, userId: string) {
  try {
    const supabase = await createClient()
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('buyer_id, merchant_id')
      .eq('id', conversationId)
      .single()

    if (conversationError) throw conversationError
    if (conversation?.buyer_id !== userId && conversation?.merchant_id !== userId) {
      return { success: false, error: 'You are not allowed to update this conversation.' }
    }

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() } as any)
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  try {
    const supabase = await createClient()
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('buyer_id, merchant_id')
      .eq('id', conversationId)
      .single()

    if (conversationError) throw conversationError
    if (conversation?.buyer_id !== senderId && conversation?.merchant_id !== senderId) {
      return { success: false, error: 'You are not allowed to send a message in this conversation.' }
    }

    const basePayload = {
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    }

    const tryInsert = async (payload: Record<string, any>) => {
      return supabase.from('messages').insert(payload as any).select().single()
    }

    let result = await tryInsert(basePayload)

    if (
      result.error &&
      /null value in column "id"|not-null constraint|violates not-null/i.test(String(result.error.message || ''))
    ) {
      result = await tryInsert({ id: generateId('msg'), ...basePayload })
    }

    if (result.error) throw result.error

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() } as any)
      .eq('id', conversationId)

    return { success: true, data: result.data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getUserConversations(userId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('conversations')
      .select('*, buyer:auth_users!buyer_id(id, name, full_name, business_name, location, avatar_url), merchant:auth_users!merchant_id(id, name, full_name, business_name, location, avatar_url)')
      .or(`buyer_id.eq.${userId},merchant_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    if (error) throw error

    const conversations = await Promise.all(
      (data || []).map(async (conversation) => {
        const { data: latestMessage } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .neq('sender_id', userId)
          .is('read_at', null)

        return {
          ...conversation,
          last_message: latestMessage?.content || 'Start a conversation',
          last_message_at: latestMessage?.created_at || conversation.last_message_at || conversation.created_at,
          unread_count: unreadCount || 0,
        }
      })
    )

    return { success: true, data: conversations }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}
