import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLogisticsRider } from '@/lib/logistics-actions'

function isAuthorized(request: NextRequest) {
  const supplied = request.headers.get('x-logistics-access-code') || ''
  const expected = process.env.LOGISTICS_ACCESS_CODE || 'LOGISTICS_001'
  return supplied.trim().toUpperCase() === expected.trim().toUpperCase()
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized logistics access' }, { status: 401 })
    }

    const supabase = await createClient()
    const result = await (supabase.from('logistics_riders') as any)
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (result.error) {
      const message = String(result.error.message || '')
      if (message.toLowerCase().includes('logistics_riders')) {
        return NextResponse.json({
          success: false,
          error: 'Logistics rider table is missing. Run scripts/014-create-logistics-tables.sql and retry.',
        })
      }
      throw result.error
    }

    return NextResponse.json({ success: true, data: result.data || [] })
  } catch (error) {
    console.error('Logistics riders GET API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized logistics access' }, { status: 401 })
    }

    const body = await request.json()
    const name = String(body?.name || '').trim()

    if (!name) {
      return NextResponse.json({ success: false, error: 'Rider name is required.' }, { status: 400 })
    }

    const result = await createLogisticsRider({
      name,
      email: body?.email,
      phone: body?.phone,
      region: body?.region,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Logistics riders POST API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
