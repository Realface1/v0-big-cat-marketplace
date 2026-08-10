import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Rider login: match by phone number against logistics_riders table
// Uses a simple PIN stored as rider_pin on the riders table (added via migration)
// Falls back to last 4 digits of phone as default PIN if no pin set

function normalizePhone(input: string) {
  const digits = String(input || '').replace(/\D/g, '')
  if (!digits) return ''

  // Canonical local format: 0XXXXXXXXXX
  if (digits.startsWith('0') && digits.length === 11) return digits
  if (digits.startsWith('234') && digits.length >= 13) return `0${digits.slice(3, 13)}`
  if (digits.length === 10) return `0${digits}`
  return digits
}

function isMissingColumnError(error: any) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('column') && (
    message.includes('does not exist')
    || message.includes('schema cache')
    || message.includes('could not find')
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const phone = String(body?.phone || '').trim()
    const pin = String(body?.pin || '').trim()

    if (!phone || !pin) {
      return NextResponse.json({ success: false, error: 'Phone number and PIN are required.' }, { status: 400 })
    }

    const supabase = createClient()
    const normalizedInputPhone = normalizePhone(phone)

    // Schema compatibility: rider_pin may not exist in all environments yet.
    let ridersResult = await (supabase.from('logistics_riders') as any)
      .select('id, name, phone, email, region, is_active, rider_pin')
      .eq('is_active', true)
      .limit(500)

    if (ridersResult.error && isMissingColumnError(ridersResult.error)) {
      ridersResult = await (supabase.from('logistics_riders') as any)
        .select('id, name, phone, email, region, is_active')
        .eq('is_active', true)
        .limit(500)
    }

    if (ridersResult.error) {
      console.error('Rider login DB error:', ridersResult.error)
      return NextResponse.json({ success: false, error: 'Login failed. Please try again.' }, { status: 500 })
    }

    const riders = Array.isArray(ridersResult.data) ? ridersResult.data : []
    const rider = riders.find((row: any) => normalizePhone(String(row?.phone || '')) === normalizedInputPhone) || null

    if (!rider) {
      return NextResponse.json({ success: false, error: 'No rider account found with this phone number.' }, { status: 401 })
    }

    if (rider.is_active === false) {
      return NextResponse.json({ success: false, error: 'Your rider account has been deactivated. Contact the logistics admin.' }, { status: 403 })
    }

    // Validate PIN: use stored pin, or default to last 4 digits of phone
    const storedPin = String((rider as any).rider_pin || '').trim()
    const defaultPin = normalizePhone(String(rider.phone || phone)).slice(-4)
    const validPin = storedPin || defaultPin

    if (pin !== validPin) {
      return NextResponse.json({ success: false, error: 'Incorrect PIN. Your default PIN is the last 4 digits of your phone number.' }, { status: 401 })
    }

    // Return rider info (used as session token in localStorage)
    return NextResponse.json({
      success: true,
      rider: {
        id: rider.id,
        name: rider.name,
        phone: rider.phone,
        email: rider.email,
        region: rider.region,
      },
    })
  } catch (error) {
    console.error('Rider login error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 })
  }
}
