import { NextRequest, NextResponse } from 'next/server'
import { searchMarketplace } from '@/lib/ai-marketplace-search'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const type = (searchParams.get('type') || 'both') as 'products' | 'vendors' | 'services' | 'both'
    const limit = Number(searchParams.get('limit') || 8)

    const result = await searchMarketplace({ query, type, limit })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Search failed' },
      { status: 500 }
    )
  }
}
