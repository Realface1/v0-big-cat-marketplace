import { NextRequest, NextResponse } from 'next/server'
import { buildAiSearchReply, searchMarketplace } from '@/lib/ai-marketplace-search'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message = String(body?.message || '').trim()

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 })
    }

    const result = await searchMarketplace({
      query: message,
      type: 'both',
      limit: 8,
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    const reply = buildAiSearchReply({
      query: message,
      products: result.products,
      vendors: result.vendors,
    })

    return NextResponse.json({
      success: true,
      reply,
      data: {
        products: result.products,
        vendors: result.vendors,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'AI chat failed' },
      { status: 500 }
    )
  }
}
