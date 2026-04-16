// Client-side auth utilities that don't require server modules
export async function logout() {
  // Sign out from Supabase Auth (clears the session cookie/localStorage)
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  await supabase.auth.signOut()
  return { success: true }
}