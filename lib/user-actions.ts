'use server'

import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

type WebsiteTheme = 'emerald' | 'midnight' | 'sunset'
type WebsiteLayout = 'classic' | 'minimal' | 'bold'

function isWebsiteTheme(value: unknown): value is WebsiteTheme {
  return value === 'emerald' || value === 'midnight' || value === 'sunset'
}

function isWebsiteLayout(value: unknown): value is WebsiteLayout {
  return value === 'classic' || value === 'minimal' || value === 'bold'
}

async function getWebsitePreferencesFromAuthMetadata(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return { website_theme: undefined, website_layout: undefined }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (!res.ok) return { website_theme: undefined, website_layout: undefined }
    const user = await res.json()
    const metadata = user.user_metadata || {}
    return {
      website_theme: isWebsiteTheme(metadata.website_theme) ? metadata.website_theme : undefined,
      website_layout: isWebsiteLayout(metadata.website_layout) ? metadata.website_layout : undefined,
    }
  } catch {
    return { website_theme: undefined, website_layout: undefined }
  }
}

async function saveWebsitePreferencesToAuthMetadata(
  userId: string,
  websiteTheme?: WebsiteTheme,
  websiteLayout?: WebsiteLayout,
) {
  if (websiteTheme === undefined && websiteLayout === undefined) return

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return

  // Read current metadata first so we don't overwrite unrelated fields
  const getRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  if (!getRes.ok) return
  const existingUser = await getRes.json()
  const currentMetadata = existingUser.user_metadata || {}

  await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_metadata: {
        ...currentMetadata,
        ...(websiteTheme !== undefined ? { website_theme: websiteTheme } : {}),
        ...(websiteLayout !== undefined ? { website_layout: websiteLayout } : {}),
      },
    }),
  })
}

export async function getUserProfile(userId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('auth_users').select('*').eq('id', userId).single()
    if (error) throw error

    const metadataPrefs = await getWebsitePreferencesFromAuthMetadata(userId)

    return {
      success: true,
      data: {
        ...data,
        website_theme: data.website_theme || metadataPrefs.website_theme,
        website_layout: data.website_layout || metadataPrefs.website_layout,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string
    full_name?: string
    phone?: string
    address?: string
    business_name?: string
    business_description?: string
    business_category?: string
    city?: string
    state?: string
    location?: string
    email?: string
    website_theme?: WebsiteTheme
    website_layout?: WebsiteLayout
  }
) {
  try {
    const supabase = await createClient()

    // website_theme and website_layout columns do not exist in auth_users.
    // Always save them via Supabase Auth user_metadata and keep them out of the DB update.
    const websiteTheme = updates.website_theme
    const websiteLayout = updates.website_layout
    const { website_theme: _t, website_layout: _l, ...dbUpdates } = updates

    const { data, error } = await supabase
      .from('auth_users')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    await saveWebsitePreferencesToAuthMetadata(userId, websiteTheme, websiteLayout)

    return {
      success: true,
      data: {
        ...data,
        website_theme: websiteTheme,
        website_layout: websiteLayout,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  try {
    const supabase = await createClient()
    const { data: user } = await supabase
      .from('auth_users')
      .select('email, password_hash')
      .eq('id', userId)
      .single()

    if (!user?.email) {
      return { success: false, error: 'User not found' }
    }

    let currentPasswordValid = false

    if (user.password_hash) {
      currentPasswordValid = user.password_hash === hashPassword(currentPassword)
    } else {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !anonKey) {
        return { success: false, error: 'Missing Supabase public environment variables' }
      }

      const verifyRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email, password: currentPassword }),
      })

      currentPasswordValid = verifyRes.ok
    }

    if (!currentPasswordValid) {
      return { success: false, error: 'Invalid current password' }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return { success: false, error: 'Missing Supabase server environment variables' }
    }

    const passwordUpdateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    })

    if (!passwordUpdateRes.ok) {
      const message = await passwordUpdateRes.text()
      throw new Error(message || 'Failed to update password')
    }

    const { error } = await supabase.from('auth_users').update({ password_hash: '' }).eq('id', userId)
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
  try {
    const supabase = await createClient()
    const payload = {
      email_notifications: Boolean(preferences?.email_notifications),
      push_notifications: Boolean(preferences?.push_notifications),
      sms_notifications: Boolean(preferences?.sms_notifications),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('auth_users')
      .update(payload)
      .eq('id', userId)
      .select('id, email_notifications, push_notifications, sms_notifications')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
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

export async function removePaymentMethod(userId: string, methodId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('payment_methods').delete().eq('id', methodId).eq('user_id', userId)
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
    const { error } = await supabase.from('payment_methods').update({ is_default: true }).eq('id', methodId).eq('user_id', userId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
