import { NextRequest, NextResponse } from 'next/server'
import { geocodeLocation, reverseGeocode } from '@/lib/location-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const latitudeParam = searchParams.get('latitude')
    const longitudeParam = searchParams.get('longitude')
    const latitude = latitudeParam !== null ? Number(latitudeParam) : Number.NaN
    const longitude = longitudeParam !== null ? Number(longitudeParam) : Number.NaN
    const query = searchParams.get('query')?.trim()

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const result = await reverseGeocode(latitude, longitude)

      if (!result) {
        return NextResponse.json({ success: false, error: 'Unable to resolve coordinates' }, { status: 404 })
      }

      return NextResponse.json({ success: true, data: result })
    }

    if (query) {
      const result = await geocodeLocation(query)

      if (!result) {
        return NextResponse.json({ success: false, error: 'Unable to resolve location' }, { status: 404 })
      }

      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({ success: false, error: 'latitude/longitude or query is required' }, { status: 400 })
  } catch (error) {
    console.error('Location API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
