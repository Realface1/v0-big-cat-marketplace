import { createClient } from '@/lib/supabase/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import bcrypt from 'bcrypt'

const INITIAL_MERCHANT_TOKENS = 100

function buildMerchantLocation(city?: string | null, state?: string | null, fallbackLocation?: string | null) {
  const normalizedCity = city?.trim()
  const normalizedState = state?.trim()

  if (normalizedCity && normalizedState) {
    return `${normalizedCity}, ${normalizedState}`
  }

  return fallbackLocation || normalizedCity || normalizedState || null
}

async function insertAuthUserWithFallback(admin: ReturnType<typeof createClient>, payload: Record<string, any>) {
  let insertPayload = { ...payload }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await admin.from('auth_users').insert(insertPayload).select().single()

    if (!result.error) {
      return result
    }

    const message = String(result.error.message || '').toLowerCase()
    const removableColumn = ['city', 'state', 'cac_id', 'google_id'].find((column) => message.includes(column))

    if (!removableColumn || !(removableColumn in insertPayload)) {
      return result
    }

    delete insertPayload[removableColumn]
  }

  return admin.from('auth_users').insert(insertPayload).select().single()
}

/** Anon-key client — only used for signInWithPassword (no service-role needed) */
function getAnonClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function signup(email: string, password: string, name: string, phone: string, role: 'buyer' | 'merchant') {
  try {
    const admin = createClient()

    // Create user in Supabase Auth (handles hashing, no bcrypt needed)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, name },
    })

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered') || authError.message?.toLowerCase().includes('already exists')) {
        return { success: false, error: 'An account with this email already exists. Please try logging in instead.' }
      }
      return { success: false, error: 'Failed to create account. Please try again.' }
    }

    const supabaseUserId = authData.user.id
    const profileData = role === 'merchant'
      ? { id: supabaseUserId, email, password_hash: '', business_name: name, name, phone, role, token_balance: INITIAL_MERCHANT_TOKENS }
      : { id: supabaseUserId, email, password_hash: '', name, phone, role, token_balance: 0 }

    const { data, error } = await admin.from('auth_users').insert(profileData).select().single()

    if (error) {
      // Clean up orphaned auth user if profile insert fails
      await admin.auth.admin.deleteUser(supabaseUserId)
      return { success: false, error: 'Failed to create account. Please try again.' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Signup error:', error)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function signupEnhanced(params: {
  email: string
  password: string
  name: string
  phone: string
  city?: string
  state?: string
  role: 'buyer' | 'merchant'
  smedanId?: string
  cacId?: string
}) {
  try {
    const admin = createClient()
    const { email, password, name, phone, city, state, role, smedanId, cacId } = params
    const normalizedCity = city?.trim() || null
    const normalizedState = state?.trim() || null

    // Create in Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, name },
    })

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered') || authError.message?.toLowerCase().includes('already exists')) {
        return { success: false, error: 'An account with this email already exists. Please try logging in instead.' }
      }
      return { success: false, error: 'Failed to create account. Please try again.' }
    }

    const supabaseUserId = authData.user.id
    const baseData = role === 'merchant'
      ? {
          id: supabaseUserId,
          email,
          password_hash: '',
          business_name: name,
          name,
          phone,
          role,
          city: normalizedCity,
          state: normalizedState,
          location: buildMerchantLocation(normalizedCity, normalizedState),
          smedan_id: smedanId || null,
          cac_id: cacId || null,
          token_balance: INITIAL_MERCHANT_TOKENS,
        }
      : {
          id: supabaseUserId,
          email,
          password_hash: '',
          name,
          phone,
          role,
          city: normalizedCity,
          state: normalizedState,
          location: buildMerchantLocation(normalizedCity, normalizedState),
          token_balance: 0,
        }

    const { data, error } = await insertAuthUserWithFallback(admin, baseData as any)

    if (error) {
      await admin.auth.admin.deleteUser(supabaseUserId)
      return { success: false, error: 'Failed to create account. Please try again.' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Signup error:', error)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function loginWithGoogle(params: {
  email: string
  name: string
  role: 'buyer' | 'merchant'
  googleId: string
}) {
  try {
    const admin = createClient()
    const { email, name, role, googleId } = params

    // Check if a profile already exists for this email
    const { data: existing, error: existingError } = await admin
      .from('auth_users')
      .select('*')
      .eq('email', email)
      .single()

    if (!existingError && existing) {
      if (existing.role !== role) {
        return {
          success: false,
          error: `This Google account is already linked as ${existing.role}. Please use the ${existing.role} portal.`,
        }
      }
      // Update google_id on profile
      const { data: updated } = await admin
        .from('auth_users')
        .update({ google_id: googleId, updated_at: new Date().toISOString() } as any)
        .eq('id', existing.id)
        .select('*')
        .single()

      return { success: true, data: { user: updated || existing } }
    }

    if (role === 'merchant') {
      return {
        success: false,
        error: 'Please sign up with the merchant form so you can provide your business state and city.',
      }
    }

    // New user via Google — create Supabase Auth user with a random password
    const randomPassword = crypto.randomUUID() + crypto.randomUUID()
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { role, name, google_id: googleId },
    })

    if (authError) {
      return { success: false, error: 'Failed to sign in with Google.' }
    }

    const supabaseUserId = authData.user.id
    const insertPayload = role === 'merchant'
      ? {
          id: supabaseUserId,
          email,
          name,
          business_name: name,
          phone: null,
          role,
          password_hash: '',
          google_id: googleId,
          location: null,
          token_balance: INITIAL_MERCHANT_TOKENS,
        }
      : {
          id: supabaseUserId,
          email,
          name,
          phone: null,
          role,
          password_hash: '',
          google_id: googleId,
          location: null,
          token_balance: 0,
        }

    const { data, error } = await insertAuthUserWithFallback(admin, insertPayload as any)

    if (error) {
      await admin.auth.admin.deleteUser(supabaseUserId)
      return { success: false, error: 'Failed to sign in with Google.' }
    }

    return { success: true, data: { user: data } }
  } catch (error) {
    console.error('Google auth error:', error)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function login(email: string, password: string) {
  try {
    const anonClient = getAnonClient()

    // --- Fast path: user already has a Supabase Auth account ---
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({ email, password })

    if (!authError && authData.user) {
      const admin = createClient()
      const { data: profile, error: profileError } = await admin
        .from('auth_users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        return { success: false, error: 'User profile not found.' }
      }

      const { password_hash, ...userData } = profile
      return { success: true, data: { user: userData, session: authData.session } }
    }

    // --- Legacy path: user was created before Supabase Auth migration ---
    // Look up by email and verify their old bcrypt hash
    const admin = createClient()
    const { data: legacyUser, error: legacyError } = await admin
      .from('auth_users')
      .select('*')
      .eq('email', email)
      .single()

    if (legacyError || !legacyUser) {
      return { success: false, error: 'Invalid email or password.' }
    }

    // No hash means they're a new Supabase Auth user but signInWithPassword failed → wrong password
    if (!legacyUser.password_hash) {
      return { success: false, error: 'Invalid email or password.' }
    }

    const passwordMatches = await bcrypt.compare(password, legacyUser.password_hash)
    if (!passwordMatches) {
      return { success: false, error: 'Invalid email or password.' }
    }

    // Migrate on the fly: create Supabase Auth account with the SAME UUID
    // so all existing FK references (orders, products, etc.) remain valid
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      id: legacyUser.id, // preserve the existing UUID
      email,
      password,
      email_confirm: true,
      user_metadata: { role: legacyUser.role, name: legacyUser.name },
    })

    if (createError && !createError.message?.toLowerCase().includes('already')) {
      console.error('Migration createUser error:', createError)
      return { success: false, error: 'An unexpected error occurred. Please try again.' }
    }

    // Clear the bcrypt hash now that Supabase Auth owns the password
    await admin.from('auth_users').update({ password_hash: '' }).eq('id', legacyUser.id)

    // Sign in to obtain a real session
    const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({ email, password })
    if (sessionError || !sessionData.user) {
      return { success: false, error: 'An unexpected error occurred. Please try again.' }
    }

    const { password_hash, ...userData } = legacyUser
    return { success: true, data: { user: userData, session: sessionData.session } }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function getUserById(userId: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('auth_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return { success: false, error: 'User not found.' }
    }

    const { password_hash, ...userData } = data
    return { success: true, data: userData }
  } catch (error) {
    console.error('Get user error:', error)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}

export async function logout() {
  return { success: true }
}