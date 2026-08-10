import { NextRequest, NextResponse } from 'next/server'
import {
  buildAiSearchReply,
  buildSmartBizPilotReply,
  buildConversationalReply,
  buildStructuredMarketplaceResponse,
  buildSupportReply,
  detectContactBypassAttempt,
  detectConversationalIntent,
  detectMarketplaceSearchIntent,
  detectMarketplaceIntentType,
  detectReplyLanguage,
  detectSupportIntent,
  searchMarketplace,
  shouldAskClarifyingQuestions,
  generateClarifyingQuestions,
  detectComparisonIntent,
  buildComparisonReply,
  extractReviewHighlight,
  buildSmartFallbackSuggestion,
  refineSearchByContext,
  buildSmartErrorMessage,
  buildConfidenceBadges,
  estimateDeliveryEta,
  getBuyerPreferences,
} from '@/lib/ai-marketplace-search'

function toConciseReply(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return 'I am here to help.'

  const normalized = raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (normalized.length <= 900) return normalized

  const lines = normalized.split('\n').map((line) => line.trimEnd())
  const hasStructuredSections = lines.some((line) => /^\d+\.\s/.test(line))

  if (hasStructuredSections) {
    const out: string[] = []
    let sectionCount = 0
    let bulletCount = 0
    let sectionNumber = 0

    for (const line of lines) {
      if (/^\d+\.\s/.test(line)) {
        sectionNumber = Number(line.split('.')[0])
        sectionCount += 1
        if (sectionCount > 3) break
        out.push(line)
        bulletCount = 0
        continue
      }

      if (sectionCount === 0) continue

      if (line.startsWith('- ')) {
        const maxBullets = sectionNumber === 2 ? 3 : 2
        if (bulletCount < maxBullets) {
          out.push(line)
          bulletCount += 1
        }
        continue
      }

      if (line && /^\d+\.\s/.test(out[out.length - 1] || '')) {
        out.push(line)
      }
    }

    const structured = out.join('\n').trim()
    if (structured.length >= 120) {
      return structured.length > 1000
        ? `${structured.slice(0, 997).trimEnd()}...`
        : structured
    }
  }

  const plain = normalized.replace(/\s+/g, ' ').trim()
  if (plain.length <= 700) return plain

  const sentenceChunks = plain
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const conciseSentences: string[] = []
  for (const sentence of sentenceChunks) {
    if (conciseSentences.length >= 6) break
    conciseSentences.push(sentence)
    if (conciseSentences.join(' ').length >= 620) break
  }

  const compact = conciseSentences.join(' ').trim()
  if (!compact) return `${plain.slice(0, 620).trimEnd()}...`
  return compact.length > 700 ? `${compact.slice(0, 697).trimEnd()}...` : compact
}

function normalizeBizPilotFormat(value: string) {
  const base = String(value || '').trim()
  if (!base) return ''

  const looksStructured = /(^|\n)\d+\.\s/.test(base) || /top 3 actions/i.test(base)
  if (!looksStructured) return base

  return base
    .replace(/\s+(2\.)\s+/g, '\n\n$1 ')
    .replace(/\s+(3\.)\s+/g, '\n\n$1 ')
    .replace(/:\s+-\s+/g, ':\n- ')
    .replace(/\s+-\s+/g, '\n- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isPromoCopyRequest(message: string) {
  const q = String(message || '').toLowerCase()
  return [
    'promo',
    'promotion',
    'advert',
    'ad copy',
    'caption',
    'marketing message',
    'write a message',
  ].some((keyword) => q.includes(keyword))
}

function buildProfessionalPromoReply(message: string, language = 'en') {
  const q = String(message || '').toLowerCase()
  const wantsPidgin = q.includes('pidgin') || q.includes('pcm') || language === 'pcm'
  const lang = String(language || 'en').toLowerCase()
  const wantsStructured = [
    "what's likely happening",
    'top 3 actions',
    'what i need from you',
    'structured',
    'framework',
  ].some((keyword) => q.includes(keyword))

  if (!wantsStructured) {
    if (lang === 'yo') {
      return 'Lo eyi: "A ni ọja to dara, owo to bojumu, ati ifijiṣẹ yarayara. Paṣẹ loni fun iriri rira to rorun ati to daju." Ti o ba fẹ, mo le tun kọ ẹya kukuru fun WhatsApp.'
    }

    if (lang === 'ig') {
      return 'Jiri nke a: "Anyi nwere ngwaahịa ọma, ego kwesiri ekwesi, na nnyefe ngwa ngwa. Nye order taa ka i nweta ọrụ ziri ezi na ngwa ngwa." Ọ bụrụ na ịchọrọ, enwere m ike ide ụdị mkpirikpi maka WhatsApp.'
    }

    if (lang === 'ha') {
      return 'Yi wannan: "Muna da kaya masu inganci, farashi mai kyau, da isarwa cikin sauri. Yi oda yau don samun sabis mai sauki kuma abin dogaro." Idan kana so, zan iya rubuta gajeren sigar WhatsApp.'
    }

    if (wantsPidgin) {
      return 'Use this: "Quality products, fair prices, and fast delivery dey available. Place your order today for smooth service and quick response." If you want, I can also write a shorter WhatsApp version and a stronger urgency version.'
    }

    return 'Use this: "Quality products, fair prices, and fast delivery are available now. Place your order today for reliable service and quick response." If you want, I can also write a shorter WhatsApp version and a stronger urgency version.'
  }

  if (wantsPidgin) {
    return [
      '1. What\'s likely happening',
      'You need a short, conversion-focused promo message that sounds local but still professional.',
      '',
      '2. Top 3 actions',
      '- Lead with one clear value: better price, quality assurance, or fast delivery.',
      '- Keep copy short and specific; avoid over-hyped or playful wording.',
      '- End with one direct call-to-action tied to urgency.',
      '',
      '3. Professional Pidgin promo options',
      '- Option A: "Quality products, correct price, and quick delivery dey here. Order now and enjoy smooth service from our store."',
      '- Option B: "Need better value for your money? Our store get trusted products and fair prices. Send your order today."',
    ].join('\n')
  }

  return [
    '1. What\'s likely happening',
    'You need short promotional copy that increases attention and drives immediate purchase action.',
    '',
    '2. Top 3 actions',
    '- Open with one clear customer benefit.',
    '- Keep wording simple and concrete; avoid exaggerated claims.',
    '- Close with a direct and time-bound call-to-action.',
    '',
    '3. Professional promo options',
    '- Option A: "Shop quality products at fair prices today. Fast service, trusted delivery, and real value in every order."',
    '- Option B: "Looking for reliable products at competitive prices? Order now and enjoy a smooth buying experience."',
  ].join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message = String(body?.message || '').trim()
    const language = String(body?.language || 'auto')
    const assistantMode = body?.assistantMode === 'merchant' ? 'merchant' : 'buyer'
    const userLocation = String(body?.location || '').trim()
    const recentMessages = Array.isArray(body?.recentMessages)
      ? body.recentMessages.filter((item: unknown) => typeof item === 'string').slice(-8)
      : []
    const replyLanguage = detectReplyLanguage({ message, preferredLanguage: language })
    const intentType = detectMarketplaceIntentType(message)

    const emptyStructured = {
      type: intentType,
      query: message,
      location: userLocation || 'Unknown location',
      results: [],
    }

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 })
    }

    if (detectContactBypassAttempt(message)) {
      return NextResponse.json({
        success: true,
        reply:
          'For your safety, all transactions should remain within the platform. I can still help you find trusted products, services, or verified vendors here.',
        data: {
          products: [],
          vendors: [],
          services: [],
        },
        structured: emptyStructured,
        replyLanguage,
      })
    }

    const supportIntent = detectSupportIntent(message)
    if (supportIntent) {
      const reply = toConciseReply(buildSupportReply({
        intent: supportIntent,
        language: replyLanguage,
        assistantMode,
      }))

      return NextResponse.json({
        success: true,
        reply,
        data: {
          products: [],
          vendors: [],
          services: [],
        },
        structured: emptyStructured,
        replyLanguage,
      })
    }

    const conversationalIntent = detectConversationalIntent(message)
    if (conversationalIntent) {
      const reply = toConciseReply(buildConversationalReply({
        intent: conversationalIntent,
        language: replyLanguage,
        assistantMode,
      }))

      return NextResponse.json({
        success: true,
        reply,
        data: {
          products: [],
          vendors: [],
          services: [],
        },
        structured: emptyStructured,
        replyLanguage,
      })
    }

    if (assistantMode === 'merchant' && !detectMarketplaceSearchIntent(message)) {
      if (isPromoCopyRequest(message)) {
        const reply = toConciseReply(buildProfessionalPromoReply(message, replyLanguage))
        return NextResponse.json({
          success: true,
          reply,
          data: {
            products: [],
            vendors: [],
            services: [],
          },
          structured: emptyStructured,
          replyLanguage,
        })
      }

      const reply = toConciseReply(normalizeBizPilotFormat(await buildSmartBizPilotReply({
        query: message,
        recentMessages,
        language: replyLanguage,
      })))

      return NextResponse.json({
        success: true,
        reply,
        data: {
          products: [],
          vendors: [],
          services: [],
        },
        structured: emptyStructured,
        replyLanguage,
      })
    }

    // Feature #1-2: Clarifying Questions Before Search
    if (assistantMode === 'buyer' && shouldAskClarifyingQuestions(message, recentMessages)) {
      const clarifyingMsg = generateClarifyingQuestions(message, replyLanguage)
      return NextResponse.json({
        success: true,
        reply: clarifyingMsg,
        data: {
          products: [],
          vendors: [],
          services: [],
        },
        structured: emptyStructured,
        replyLanguage,
      })
    }

    // Feature #3: Detect Comparison Intent
    const isComparison = detectComparisonIntent(message)

    // Feature #2, #10: Refine search by conversation context
    const refinedQuery = refineSearchByContext(message, recentMessages)

    const searchTypeByIntent = {
      product: 'products',
      service: 'services',
      vendor: 'vendors',
    } as const

    const result = await searchMarketplace({
      query: refinedQuery !== message ? refinedQuery : message,
      type: searchTypeByIntent[intentType],
      limit: isComparison ? 6 : 8,
      location: userLocation,
    })

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    // Feature #6: Smart Fallback if no results
    let reply = ''
    if (result.products.length === 0 && result.vendors.length === 0 && (result.services ?? []).length === 0) {
      reply = buildSmartFallbackSuggestion(message, searchTypeByIntent[intentType])
    } else {
      // Feature #3: Comparison Mode Reply
      if (isComparison && result.products.length > 0) {
        reply = buildComparisonReply(result.products, message, replyLanguage)
      } else {
        reply = buildAiSearchReply({
          query: message,
          products: result.products,
          vendors: result.vendors,
          services: result.services ?? [],
          userLocation,
          intentType,
          language: replyLanguage,
          assistantMode,
        })
      }
    }

    const finalReply = toConciseReply(reply)

    // Feature #4, #9, #11: Enrich results with review highlights, confidence badges, delivery ETA
    const enrichedProducts = result.products.map((p) => ({
      ...p,
      review_highlight: extractReviewHighlight(p),
      confidence_badges: buildConfidenceBadges(p),
      delivery_eta: estimateDeliveryEta(p.vendor_location, userLocation),
    }))

    const structured = buildStructuredMarketplaceResponse({
      intentType,
      query: message,
      location: userLocation,
      products: result.products,
      services: result.services ?? [],
      vendors: result.vendors,
    })

    return NextResponse.json({
      success: true,
      reply: finalReply,
      data: {
        products: enrichedProducts,
        vendors: result.vendors,
        services: result.services ?? [],
      },
      structured,
      replyLanguage,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'AI chat failed' },
      { status: 500 }
    )
  }
}
