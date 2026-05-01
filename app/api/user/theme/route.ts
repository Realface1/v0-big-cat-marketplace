import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/request-auth'

type WebsiteTheme = 'emerald' | 'midnight' | 'sunset'
type WebsiteLayout = 'classic' | 'minimal' | 'bold'

function isWebsiteTheme(v: unknown): v is WebsiteTheme {
  return v === 'emerald' || v === 'midnight' || v === 'sunset'
}
function isWebsiteLayout(v: unknown): v is WebsiteLayout {
  return v === 'classic' || v === 'minimal' || v === 'bold'
}

async function readThemeFromMetadata(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return { error: 'Server configuration error', status: 500 as const }
  }

  const getRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })

  if (!getRes.ok) {
    return { error: 'Failed to read user metadata', status: 500 as const }
  }

  const existingUser = await getRes.json()
  const currentMetadata = existingUser.user_metadata || {}

  return {
    status: 200 as const,
    data: {
      website_theme: isWebsiteTheme(currentMetadata.website_theme) ? currentMetadata.website_theme : undefined,
      website_layout: isWebsiteLayout(currentMetadata.website_layout) ? currentMetadata.website_layout : undefined,
      user_metadata: currentMetadata,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }

    const auth = await requireAuthenticatedUser(userId, request)
    if (auth.response) return auth.response

    const result = await readThemeFromMetadata(userId)
    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Theme read error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, website_theme, website_layout } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }

    const auth = await requireAuthenticatedUser(userId, request)
    if (auth.response) return auth.response

    const theme = isWebsiteTheme(website_theme) ? website_theme : undefined
    const layout = isWebsiteLayout(website_layout) ? website_layout : undefined

    if (theme === undefined && layout === undefined) {
      return NextResponse.json({ success: false, error: 'website_theme or website_layout is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    // Verify userId is a real user in our system
    const userCheckRes = await fetch(
      `${supabaseUrl}/rest/v1/auth_users?id=eq.${userId}&select=id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    const users = await userCheckRes.json()
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const readResult = await readThemeFromMetadata(userId)
    if ('error' in readResult) {
      return NextResponse.json({ success: false, error: readResult.error }, { status: readResult.status })
    }
    const currentMetadata = readResult.data.user_metadata || {}

    // Save theme to auth metadata
    const putRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_metadata: {
          ...currentMetadata,
          ...(theme !== undefined ? { website_theme: theme } : {}),
          ...(layout !== undefined ? { website_layout: layout } : {}),
        },
      }),
    })

    if (!putRes.ok) {
      return NextResponse.json({ success: false, error: 'Failed to save theme' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { website_theme: theme, website_layout: layout },
    })
  } catch (error) {
    console.error('Theme save error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
