import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function getRequestAuthUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return { user: null, error: 'Missing Supabase public environment variables' }
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Route handlers may not allow cookie mutation in all contexts.
        }
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  return { user, error: error?.message || null }
}

export async function requireAuthenticatedUser(expectedUserId?: string) {
  const { user, error } = await getRequestAuthUser()

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }

  if (expectedUserId && user.id !== expectedUserId) {
    return {
      user,
      response: NextResponse.json(
        { success: false, error: 'You are not allowed to access this resource' },
        { status: 403 }
      ),
    }
  }

  return { user, response: null }
}

export function toPublicProfile(profile: Record<string, any> | null | undefined) {
  if (!profile) return null

  return {
    id: profile.id,
    name: profile.name,
    full_name: profile.full_name,
    role: profile.role,
    business_name: profile.business_name,
    business_description: profile.business_description,
    business_category: profile.business_category,
    city: profile.city,
    state: profile.state,
    location: profile.location,
    avatar_url: profile.avatar_url,
    setup_completed: profile.setup_completed,
    created_at: profile.created_at,
  }
}
