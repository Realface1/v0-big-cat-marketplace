import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const userId = String(request.nextUrl.searchParams.get('userId') || '').trim()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, grand_total, product_total, delivery_fee, payment_method, created_at')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to load orders', data: [] }, { status: 500 })
  }
}
