import { createClient } from '@/lib/supabase/server'
import { dispatchNotification } from '@/lib/notifications'

function isMissingInfraError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('does not exist')
    || message.includes('relation')
    || message.includes('schema cache')
    || message.includes('could not find')
    || message.includes('column')
}

async function getMerchantDisplayName(merchantId: string) {
  const supabase = createClient()
  const { data } = await (supabase.from('auth_users') as any)
    .select('business_name, name, full_name')
    .eq('id', merchantId)
    .maybeSingle()

  const business = String(data?.business_name || '').trim()
  if (business) return business

  const name = String(data?.name || data?.full_name || '').trim()
  return name || 'Merchant'
}

export async function getMerchantFollowerIds(merchantId: string) {
  try {
    const supabase = createClient()
    const { data, error } = await (supabase.from('merchant_followers') as any)
      .select('buyer_id')
      .eq('merchant_id', merchantId)

    if (error) {
      if (isMissingInfraError(error)) return [] as string[]
      throw error
    }

    return Array.isArray(data)
      ? data.map((row: any) => String(row?.buyer_id || '').trim()).filter(Boolean)
      : []
  } catch (error) {
    console.warn('[merchant-follow] Could not load followers:', error)
    return [] as string[]
  }
}

export async function getMerchantFollowerSummary(merchantId: string, buyerId?: string) {
  try {
    const supabase = createClient()

    const [{ count, error: countError }, followCheck] = await Promise.all([
      (supabase.from('merchant_followers') as any)
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId),
      buyerId
        ? (supabase.from('merchant_followers') as any)
            .select('id')
            .eq('merchant_id', merchantId)
            .eq('buyer_id', buyerId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
    ])

    if (countError) {
      if (isMissingInfraError(countError)) return { followerCount: 0, isFollowing: false }
      throw countError
    }

    if (followCheck?.error && !isMissingInfraError(followCheck.error)) {
      throw followCheck.error
    }

    return {
      followerCount: Number(count || 0),
      isFollowing: Boolean(followCheck?.data),
    }
  } catch (error) {
    console.warn('[merchant-follow] Could not load follow summary:', error)
    return { followerCount: 0, isFollowing: false }
  }
}

export async function followMerchant(buyerId: string, merchantId: string) {
  if (!buyerId || !merchantId || buyerId === merchantId) {
    return { success: false, error: 'Invalid follow request' }
  }

  try {
    const supabase = createClient()
    const { error } = await (supabase.from('merchant_followers') as any)
      .upsert([{ buyer_id: buyerId, merchant_id: merchantId }], { onConflict: 'merchant_id,buyer_id' })

    if (error) {
      if (isMissingInfraError(error)) {
        return { success: false, error: 'Follower feature not ready in database yet' }
      }
      return { success: false, error: error.message || 'Could not follow merchant' }
    }

    const buyerNameResult = await (supabase.from('auth_users') as any)
      .select('name, full_name, email')
      .eq('id', buyerId)
      .maybeSingle()

    const buyerDisplay = String(
      buyerNameResult?.data?.name
      || buyerNameResult?.data?.full_name
      || buyerNameResult?.data?.email
      || 'A buyer',
    ).trim()

    await dispatchNotification({
      userId: merchantId,
      type: 'system',
      title: 'You have a new follower',
      message: `${buyerDisplay} just followed your store.`,
      eventKey: `merchant-new-follower:${merchantId}:${buyerId}`,
      metadata: { buyerId, merchantId, action: 'open_followers' },
    }).catch(() => null)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not follow merchant' }
  }
}

export async function unfollowMerchant(buyerId: string, merchantId: string) {
  if (!buyerId || !merchantId) {
    return { success: false, error: 'Invalid unfollow request' }
  }

  try {
    const supabase = createClient()
    const { error } = await (supabase.from('merchant_followers') as any)
      .delete()
      .eq('buyer_id', buyerId)
      .eq('merchant_id', merchantId)

    if (error) {
      if (isMissingInfraError(error)) {
        return { success: false, error: 'Follower feature not ready in database yet' }
      }
      return { success: false, error: error.message || 'Could not unfollow merchant' }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not unfollow merchant' }
  }
}

export async function notifyFollowersAboutMerchantUpdate(input: {
  merchantId: string
  updateType: 'product' | 'promotion'
  itemName: string
  itemId?: string
}) {
  const merchantId = String(input.merchantId || '').trim()
  if (!merchantId) return { success: false, notified: 0 }

  const followerIds = await getMerchantFollowerIds(merchantId)
  if (followerIds.length === 0) {
    return { success: true, notified: 0 }
  }

  const merchantName = await getMerchantDisplayName(merchantId)
  const isProduct = input.updateType === 'product'
  const title = isProduct ? 'New product from a merchant you follow' : 'New promotion from a merchant you follow'
  const message = isProduct
    ? `${merchantName} just listed "${input.itemName}".`
    : `${merchantName} is running a new promotion: "${input.itemName}".`

  const results = await Promise.all(
    followerIds.map((followerId) =>
      dispatchNotification({
        userId: followerId,
        type: 'system',
        title,
        message,
        eventKey: `merchant-follow-update:${merchantId}:${input.updateType}:${String(input.itemId || input.itemName)}:${followerId}`,
        metadata: {
          merchantId,
          merchantName,
          updateType: input.updateType,
          itemId: input.itemId || null,
          itemName: input.itemName,
          action: 'open_merchant_store',
        },
      }).catch(() => ({ success: false }))
    ),
  )

  const notified = results.filter((result: any) => result?.success !== false).length
  return { success: true, notified }
}
