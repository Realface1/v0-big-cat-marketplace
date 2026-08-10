import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { merchantId, variant, eventType } = body

    if (!merchantId || !['A', 'B'].includes(variant) || !['view', 'click'].includes(eventType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    try {
      await (supabase.from('banner_ab_events') as any).insert({
        merchant_id: merchantId,
        variant,
        event_type: eventType,
        created_at: new Date().toISOString(),
      })
    } catch (err: any) {
      const message = String(err?.message || '').toLowerCase()
      if (!message.includes('table') && !message.includes('does not exist')) {
        throw err
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Banner A/B tracking error:', error)
    return NextResponse.json(
      { success: false, error: 'Tracking failed' },
      { status: 500 }
    )
  }
}
