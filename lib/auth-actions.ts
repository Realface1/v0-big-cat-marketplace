'use server'

import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function buyerSignup(email: string, password: string, name: string, phone: string) {
  try {
    const supabase = await createClient()
    const passwordHash = hashPassword(password)
    
    console.log("[v0] Attempting buyer signup for:", email)
    
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .eq('email', email)
      .single()
    
    if (existingUser) {
      console.log("[v0] Email already exists:", email)
      return { success: false, error: 'An account with this email already exists. Please try logging in instead.' }
    }
    
    const { data, error } = await supabase
      .from('auth_users')
      .insert({ email, password_hash: passwordHash, name, phone, role: 'buyer' })
      .select()
      .single()

    if (error) {
      console.log("[v0] Supabase error:", error)
      throw error
    }
    
    console.log("[v0] Signup successful:", data?.id)
    return { success: true, data }
  } catch (error: any) {
    console.log("[v0] Signup catch error:", error?.message || error)
    return { success: false, error: error?.message || 'Signup failed' }
  }
}

export async function merchantSignup(email: string, password: string, businessName: string, phone: string) {
  try {
    const supabase = await createClient()
    const passwordHash = hashPassword(password)
    
    console.log("[v0] Attempting merchant signup for:", email)
    
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .eq('email', email)
      .single()
    
    if (existingUser) {
      console.log("[v0] Email already exists:", email)
      return { success: false, error: 'An account with this email already exists. Please try logging in instead.' }
    }
    
    const { data, error } = await supabase
      .from('auth_users')
      .insert({ email, password_hash: passwordHash, business_name: businessName, phone, role: 'merchant' })
      .select()
      .single()

    if (error) {
      console.log("[v0] Supabase error:", error)
      throw error
    }
    
    console.log("[v0] Merchant signup successful:", data?.id)
    return { success: true, data }
  } catch (error: any) {
    console.log("[v0] Merchant signup catch error:", error?.message || error)
    return { success: false, error: error?.message || 'Signup failed' }
  }
}

export async function emailPasswordLogin(email: string, password: string) {
  try {
    const supabase = await createClient()
    const passwordHash = hashPassword(password)
    
    const { data: user, error } = await supabase
      .from('auth_users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) return { success: false, error: 'User not found' }
    if (user.password_hash !== passwordHash) return { success: false, error: 'Invalid password' }

    return { success: true, data: { user } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function logout() {
  return { success: true }
}

export async function buyerSignupWithName(email: string, password: string, name: string, phone: string) {
  return buyerSignup(email, password, name, phone)
}

export async function requestPasswordReset(email: string) {
  return { success: true }
}

export async function resetPassword(email: string, newPassword: string) {
  try {
    const supabase = await createClient()
    const passwordHash = hashPassword(newPassword)
    
    const { error } = await supabase
      .from('auth_users')
      .update({ password_hash: passwordHash })
      .eq('email', email)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getUserById(userId: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('auth_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
