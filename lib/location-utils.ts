export interface ResolvedLocation {
  latitude: number
  longitude: number
  city?: string | null
  state?: string | null
  displayName?: string | null
}

const locationCache = new Map<string, ResolvedLocation | null>()

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getCacheKey(prefix: string, value: string) {
  return `${prefix}:${value.trim().toLowerCase()}`
}

function resolveAddressCity(address: any) {
  return (
    address?.city ||
    address?.town ||
    address?.village ||
    address?.suburb ||
    address?.city_district ||
    address?.county ||
    null
  )
}

export function buildLocationQuery(city?: string | null, state?: string | null, fallbackLocation?: string | null) {
  return [city, state].filter(Boolean).join(', ') || fallbackLocation || ''
}

export async function geocodeLocation(query: string): Promise<ResolvedLocation | null> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return null

  const cacheKey = getCacheKey('search', normalizedQuery)
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey) || null
  }

  try {
    const finalQuery = normalizedQuery.toLowerCase().includes('nigeria') ? normalizedQuery : `${normalizedQuery}, Nigeria`
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=ng&q=${encodeURIComponent(finalQuery)}`,
      {
        headers: {
          'User-Agent': 'BigCat Marketplace/1.0 (support@bigcat.ng)',
          'Accept-Language': 'en',
        },
        next: { revalidate: 60 * 60 * 24 },
      },
    )

    if (!response.ok) {
      locationCache.set(cacheKey, null)
      return null
    }

    const data = await response.json()
    const match = Array.isArray(data) ? data[0] : null

    if (!match) {
      locationCache.set(cacheKey, null)
      return null
    }

    const result: ResolvedLocation = {
      latitude: Number(match.lat),
      longitude: Number(match.lon),
      city: resolveAddressCity(match.address),
      state: match.address?.state || null,
      displayName: match.display_name || finalQuery,
    }

    locationCache.set(cacheKey, result)
    return result
  } catch {
    locationCache.set(cacheKey, null)
    return null
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<ResolvedLocation | null> {
  const lat = toNumber(latitude)
  const lng = toNumber(longitude)

  if (lat === null || lng === null) return null

  const cacheKey = getCacheKey('reverse', `${lat.toFixed(4)},${lng.toFixed(4)}`)
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey) || null
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'BigCat Marketplace/1.0 (support@bigcat.ng)',
          'Accept-Language': 'en',
        },
        next: { revalidate: 60 * 10 },
      },
    )

    if (!response.ok) {
      locationCache.set(cacheKey, null)
      return null
    }

    const data = await response.json()

    const result: ResolvedLocation = {
      latitude: lat,
      longitude: lng,
      city: resolveAddressCity(data?.address),
      state: data?.address?.state || null,
      displayName: data?.display_name || [data?.address?.city, data?.address?.state].filter(Boolean).join(', '),
    }

    locationCache.set(cacheKey, result)
    return result
  } catch {
    locationCache.set(cacheKey, null)
    return null
  }
}

export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((earthRadiusKm * c).toFixed(1))
}
