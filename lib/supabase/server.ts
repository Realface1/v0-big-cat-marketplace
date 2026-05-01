import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseServerClient: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (!supabaseServerClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
      throw new Error('Missing Supabase server environment variables')
    }

    supabaseServerClient = createSupabaseClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  return supabaseServerClient
}