import { isSupabaseConfigured } from '@/lib/supabase/client'

// Client-side auth utilities that don't require server modules
export async function logout() {
  if (!isSupabaseConfigured()) {
    return { success: true }
  }

  // Sign out from Supabase Auth (clears the session cookie/localStorage)
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  await supabase.auth.signOut()
  return { success: true }
}