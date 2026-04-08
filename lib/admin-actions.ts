'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMerchants() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('auth_users')
      .select('*')
      .eq('role', 'merchant')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getPlatformStats() {
  try {
    const supabase = await createClient()
    const { count: userCount } = await supabase.from('auth_users').select('*', { count: 'exact', head: true })
    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
    return { success: true, data: { users: userCount || 0, orders: orderCount || 0, products: productCount || 0 } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function approveMerchant(merchantId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('auth_users').update({ setup_completed: true }).eq('id', merchantId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function rejectMerchant(merchantId: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('auth_users').delete().eq('id', merchantId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getRecentUsers() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('auth_users').select('*').order('created_at', { ascending: false }).limit(10)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getRecentOrders() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getLogisticsStats() {
  try {
    const supabase = await createClient()
    // Placeholder - implement logistics/delivery stats
    const { count: totalDeliveries } = await supabase.from('orders').select('*', { count: 'exact', head: true }).not('status', 'eq', 'pending')
    const { count: pendingDeliveries } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: completedDeliveries } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered')
    return { success: true, data: { total: totalDeliveries || 0, pending: pendingDeliveries || 0, completed: completedDeliveries || 0 } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getMerchantStats() {
  try {
    const supabase = await createClient()
    const { count: totalMerchants } = await supabase.from('auth_users').select('*', { count: 'exact', head: true }).eq('role', 'merchant')
    const { count: approvedMerchants } = await supabase.from('auth_users').select('*', { count: 'exact', head: true }).eq('role', 'merchant').eq('setup_completed', true)
    const { count: pendingMerchants } = await supabase.from('auth_users').select('*', { count: 'exact', head: true }).eq('role', 'merchant').eq('setup_completed', false)
    return { success: true, data: { total: totalMerchants || 0, approved: approvedMerchants || 0, pending: pendingMerchants || 0 } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getTransactions() {
  try {
    const supabase = await createClient()
    // Assuming there's a transactions table or using orders as transactions
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(20)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function getTransactionStats() {
  try {
    const supabase = await createClient()
    // Placeholder - implement transaction/payment stats
    const { data: orders, error } = await supabase.from('orders').select('total_amount, status')
    if (error) throw error
    
    const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
    const successfulTransactions = orders?.filter(order => order.status === 'completed' || order.status === 'delivered').length || 0
    const pendingTransactions = orders?.filter(order => order.status === 'pending').length || 0
    
    return { success: true, data: { totalRevenue, successful: successfulTransactions, pending: pendingTransactions } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
