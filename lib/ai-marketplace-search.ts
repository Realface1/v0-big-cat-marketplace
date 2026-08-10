import { createClient } from '@/lib/supabase/server'

export type SearchType = 'products' | 'vendors' | 'services' | 'both'
export type AssistantMode = 'buyer' | 'merchant'
export type AssistantLanguage = 'auto' | 'en' | 'pcm' | 'yo' | 'ig' | 'ha'
export type ConversationalIntent = 'greeting' | 'wellbeing' | 'thanks' | 'identity' | 'help' | 'goodbye'
export type SupportIntent =
  | 'app_overview'
  | 'account_access'
  | 'checkout_payment'
  | 'order_tracking'
  | 'messages_chat'
  | 'merchant_setup'
  | 'payment_guide'
  | 'logistics_guide'
  | 'platform_safety'
  | 'report_issue'

export type MarketplaceIntentType = 'product' | 'service' | 'vendor'
export type BizPilotIntent =
  | 'sales'
  | 'pricing'
  | 'product_optimization'
  | 'inventory'
  | 'customer_behavior'
  | 'marketing'
  | 'general'

type ProductSearchResult = {
  id: string
  name: string
  description: string
  category: string
  price: number
  stock: number
  image_url: string | null
  merchant_id: string
  vendor_name: string
  vendor_location: string
}

type VendorSearchResult = {
  id: string
  name: string
  category: string
  location: string
  description: string
  avatar_url: string | null
}

type ServiceSearchResult = {
  id: string
  name: string
  description: string
  category: string
  price: number
  vendor: string
  location: string
}

export type StructuredAiResponse = {
  type: MarketplaceIntentType
  query: string
  location: string
  results: Array<{
    name: string
    price: string
    vendor: string
    location: string
  }>
}

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'the', 'a', 'an', 'of', 'for', 'to', 'in', 'at', 'on', 'with', 'and', 'or', 'is', 'are',
  'show', 'find', 'need', 'want', 'please', 'help', 'buy', 'near', 'me', 'abeg', 'na', 'dey', 'wey',
])

const QUERY_ALIASES: Array<[RegExp, string]> = [
  [/\bphone\b|\bsmartphone\b|\biphone\b|\bandroid\b|\bwaya\b/gi, 'electronics phone'],
  [/\blaptop\b|\bpc\b|\bcomputer\b/gi, 'electronics laptop'],
  [/\bshoe\b|\bshoes\b|\bsneakers\b|\bbata\b/gi, 'fashion shoes'],
  [/\bcloth\b|\bclothes\b|\bfashion\b|\bwear\b|\baso\b|\btufafi\b/gi, 'fashion clothing'],
  [/\bfood\b|\bmeal\b|\bgroceries\b|\bprovisions\b|\babinci\b|\bnri\b|\bounje\b/gi, 'food groceries'],
  [/\bplumber\b|\bplumbing\b|\bpipe\b|\bmai gyara\b/gi, 'services plumbing'],
  [/\belectrician\b|\belectrical\b|\bwiring\b/gi, 'services electrician'],
  [/\btailor\b|\bseamstress\b|\bfashion designer\b/gi, 'services tailoring'],
]

const LANGUAGE_HINTS: Record<Exclude<AssistantLanguage, 'auto' | 'en'>, string[]> = {
  pcm: [
    'abeg', 'dey', 'wey', 'una', 'wetin', 'make i', 'no wahala', 'how far', 'oga', 'sharp sharp', 'na',
    'fit do', 'don drop', 'no dey', 'wetin i fit',
  ],
  yo: [
    'ẹ', 'ṣ', 'ó', 'à', 'ì', 'mo fẹ', 'ẹ jọ', 'bawo', 'ọja', 'owo', 'onisowo', 'e kaabo',
    'kini', 'mo le', 'tita', 'dinku', 'bawo ni', 'e kaabo', 'owo tita',
  ],
  ig: [
    'anyị', 'anyị chọrọ', 'biko', 'ahịa', 'ahịa m', 'nnoo', 'kedu', 'ngwa', 'ịzụ', 'ndi', 'ahịa',
    'ahia', 'kedu ka', 'biko', 'ire ahia', 'ego',
  ],
  ha: [
    'sannu', 'don Allah', 'ina son', 'farashi', 'kaya', 'dillali', 'taimako', 'yaya', 'me yasa', 'nagode',
    'ya jiki', 'yaya zanyi', 'kudin', 'kasuwa',
  ],
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, '')
}

function detectSearchType(query: string): SearchType {
  const q = query.toLowerCase()
  const vendorKeywords = [
    'vendor', 'seller', 'store', 'shop', 'merchant', 'near me', 'location', 'market', 'where', 'find vendor',
    'onisowo', 'dillali',
  ]
  const productKeywords = [
    'product', 'buy', 'price', 'cheap', 'order', 'item', 'need', 'find', 'kaya', 'ngwa', 'oja',
  ]
  const serviceKeywords = [
    'service', 'repair', 'plumber', 'electrician', 'tailor', 'cleaner', 'mechanic', 'salon', 'barber', 'technician',
  ]

  const hasVendor = vendorKeywords.some((keyword) => q.includes(keyword))
  const hasProduct = productKeywords.some((keyword) => q.includes(keyword))
  const hasService = serviceKeywords.some((keyword) => q.includes(keyword))

  if (hasService && !hasProduct && !hasVendor) return 'services'
  if (hasVendor && !hasProduct) return 'vendors'
  if (hasProduct && !hasVendor) return 'products'
  return 'both'
}

export function detectMarketplaceIntentType(query: string): MarketplaceIntentType {
  const q = String(query || '').toLowerCase()
  const serviceKeywords = [
    'service', 'repair', 'plumber', 'electrician', 'tailor', 'cleaner', 'mechanic', 'salon', 'barber', 'technician',
  ]
  const vendorKeywords = ['vendor', 'seller', 'merchant', 'shop', 'store', 'vendor near', 'find vendor']

  if (serviceKeywords.some((keyword) => q.includes(keyword))) return 'service'
  if (vendorKeywords.some((keyword) => q.includes(keyword))) return 'vendor'
  return 'product'
}

export function detectContactBypassAttempt(query: string) {
  const q = String(query || '').toLowerCase()
  const patterns = [
    'phone number', 'whatsapp', 'telegram', 'dm me', 'call me', 'contact me', '@gmail', '@yahoo',
  ]

  const hasPattern = patterns.some((pattern) => q.includes(pattern))
  const hasLongDigits = /\d{7,}/.test(q)
  return hasPattern || hasLongDigits
}

export function detectMarketplaceSearchIntent(query: string) {
  const q = String(query || '').toLowerCase()
  const searchSignals = [
    'show me',
    'search for',
    'looking for',
    'where can i buy',
    'who sells',
    'near me',
    'available in',
    'price of',
    'find vendor',
    'find product',
    'find service',
    'buy this',
    'i want to buy',
    'need to buy',
  ]

  if (searchSignals.some((signal) => q.includes(signal))) return true
  return /^(find|search|locate|show)\b/.test(q)
}

export function detectBizPilotIntent(query: string): BizPilotIntent {
  const q = String(query || '').toLowerCase()

  if (['sales', 'revenue', 'orders dropped', 'low sales', 'high sales', 'conversion'].some((k) => q.includes(k))) {
    return 'sales'
  }
  if (['price', 'pricing', 'discount', 'cheap', 'expensive', 'margin'].some((k) => q.includes(k))) {
    return 'pricing'
  }
  if (['description', 'image', 'listing', 'product page', 'thumbnail', 'title'].some((k) => q.includes(k))) {
    return 'product_optimization'
  }
  if (['stock', 'inventory', 'restock', 'out of stock', 'overstock'].some((k) => q.includes(k))) {
    return 'inventory'
  }
  if (['customer', 'buyers', 'trend', 'behavior', 'preference', 'reviews'].some((k) => q.includes(k))) {
    return 'customer_behavior'
  }
  if (['promote', 'promotion', 'marketing', 'campaign', 'featured', 'ads'].some((k) => q.includes(k))) {
    return 'marketing'
  }

  return 'general'
}

export function buildBizPilotReply(params: {
  query: string
  recentMessages?: string[]
  language?: string
}) {
  const query = String(params.query || '').trim()
  const lowerQuery = query.toLowerCase()
  const language = String(params.language || 'en').toLowerCase()
  const intent = detectBizPilotIntent(query)
  const context = [...(params.recentMessages || []), query].join(' ').toLowerCase()
  const wantsStructured = [
    "what's likely happening",
    'top 3 actions',
    'what i need from you',
    'structured',
    'framework',
    'breakdown',
    'step by step',
  ].some((keyword) => lowerQuery.includes(keyword))

  const likelyMap: Record<BizPilotIntent, string> = {
    sales: 'Your sales issue is likely from a mix of traffic quality, conversion friction, or weak listing trust signals.',
    pricing: 'Your pricing may be misaligned with market alternatives, reducing conversion or margin quality.',
    product_optimization: 'Your listing likely needs stronger content quality so buyers trust faster and convert sooner.',
    inventory: 'Your stock pattern suggests restock timing or SKU mix is not matching current demand velocity.',
    customer_behavior: 'Buyer demand appears to be shifting by price sensitivity, trust signals, or convenience.',
    marketing: 'Your visibility is likely not concentrated on high-converting SKUs and campaigns.',
    general: 'Performance is usually driven by price competitiveness, listing quality, traffic relevance, and stock readiness.',
  }

  const actionMap: Record<BizPilotIntent, string[]> = {
    sales: [
      'Compare your top 5 SKUs against direct competitors on price, delivery promise, and review count today.',
      'Improve one weak listing first: clearer first image, stronger benefit-focused title, and concise bullet description.',
      'Run a 7-day push on one hero SKU with a small promo (5-10%) and track conversion daily.',
    ],
    pricing: [
      'Reprice priority SKUs into competitive bands: match market median or test 5-10% reduction for 3 days.',
      'Use tiered discounts (single item vs multi-buy) to protect margin while raising basket size.',
      'Keep price changes focused on high-traffic SKUs first, then measure conversion before wider rollout.',
    ],
    product_optimization: [
      'Rewrite titles to include buyer intent keywords, brand/model, and core benefit in the first 60 characters.',
      'Replace low-quality photos with clear front, detail, and scale images on a clean background.',
      'Add short, trust-building descriptions: delivery timeline, quality guarantee, and usage fit.',
    ],
    inventory: [
      'Set restock alert thresholds for fast-moving SKUs based on the last 14 days of sales.',
      'Reduce overstock risk by bundling slow items with best-sellers in limited-time offers.',
      'Prioritize inventory spend on top-margin, high-conversion products before expanding catalog.',
    ],
    customer_behavior: [
      'Segment recent orders by price band to identify the strongest buyer willingness-to-pay range.',
      'Use top review keywords to improve listings around what buyers value most.',
      'Align delivery options and messaging to convenience-sensitive buyers in your highest-demand locations.',
    ],
    marketing: [
      'Concentrate promotions on your top 3 converting SKUs, not the full catalog.',
      'Test one urgency campaign this week (limited stock or time-bound offer) with clear CTA.',
      'Refresh underperforming listings before spending more promo budget on them.',
    ],
    general: [
      'Pick one priority SKU and optimize price, title, images, and delivery message in one pass today.',
      'Track conversion, add-to-cart rate, and order count for 7 days after changes.',
      'Scale only the tactics that improve both conversion and margin.',
    ],
  }

  const hasMetrics = /(ctr|conversion|impressions|views|orders|revenue|margin|aov|add to cart|atc|cvr|\d)/i.test(context)
  const needQuestions = !hasMetrics

  const questionMap: Record<BizPilotIntent, string[]> = {
    sales: [
      'What are your last 14-day values for views, add-to-cart, and orders for your top 3 products?',
      'Which 3 products get the most traffic but lowest conversion?',
      'Are buyers dropping more before checkout or at checkout?',
    ],
    pricing: [
      'What is your current price and estimated gross margin for your top 3 SKUs?',
      'How do your prices compare to 3 similar marketplace listings?',
      'Do you want to optimize for faster sales or higher margin this week?',
    ],
    product_optimization: [
      'Which 3 listings have high views but low orders?',
      'Do those listings have at least 3 clear images and a benefit-led description?',
      'What buyer objections appear most in chat or reviews?',
    ],
    inventory: [
      'Which SKUs are below 7 days of stock cover?',
      'Which SKUs have not sold in the last 30 days?',
      'What is your current restock lead time per category?',
    ],
    customer_behavior: [
      'What categories have the highest repeat purchase rate?',
      'What price band drives most completed orders?',
      'Which locations generate the best conversion right now?',
    ],
    marketing: [
      'Which campaign or promo ran in the last 14 days and what was the conversion impact?',
      'Which 3 SKUs should we prioritize for visibility this week?',
      'What budget range can you allocate for promo tests this week?',
    ],
    general: [
      'Share your top 3 SKUs by traffic and conversion in the last 14 days.',
      'What is your main goal this week: revenue growth, margin, or faster stock turnover?',
      'Any current constraint: pricing, stock, listing quality, or delivery speed?',
    ],
  }

  const likely = likelyMap[intent]
  const actions = actionMap[intent].slice(0, 3)
  const questions = needQuestions ? questionMap[intent].slice(0, 3) : []

  const t = {
    en: {
      lead: (text: string) => text,
      actionsPrefix: 'Do these next:',
      questionsPrefix: 'To sharpen this, share:',
    },
    pcm: {
      lead: (text: string) => text,
      actionsPrefix: 'Do this next:',
      questionsPrefix: 'Make I give better answer, share this:',
    },
    yo: {
      lead: (text: string) => text,
      actionsPrefix: 'Se eyi tele:',
      questionsPrefix: 'Ki n le fun e ni idahun to pe, fun mi ni eyi:',
    },
    ig: {
      lead: (text: string) => text,
      actionsPrefix: 'Mee ihe ndi a ugbu a:',
      questionsPrefix: 'Ka m wee nyere gi nke oma, kesaa ihe ndi a:',
    },
    ha: {
      lead: (text: string) => text,
      actionsPrefix: 'Ka yi wadannan yanzu:',
      questionsPrefix: 'Don in ba ka mafi dacewa, ka raba wannan:',
    },
  }[language as 'en' | 'pcm' | 'yo' | 'ig' | 'ha'] || {
    lead: (text: string) => text,
    actionsPrefix: 'Do these next:',
    questionsPrefix: 'To sharpen this, share:',
  }

  if (!wantsStructured) {
    const lead = likely
    const actionText = `${t.actionsPrefix} 1) ${actions[0]} 2) ${actions[1]} 3) ${actions[2]}`
    const questionText = questions.length > 0
      ? `${t.questionsPrefix} ${questions.slice(0, 2).join(' ')}`
      : ''

    return [t.lead(lead), actionText, questionText]
      .filter(Boolean)
      .join(' ')
      .trim()
  }

  return [
    `1. What's likely happening\n${likely}`,
    `2. Top 3 actions\n- ${actions.join('\n- ')}`,
    needQuestions ? `3. What I need from you\n- ${questions.join('\n- ')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

type BizPilotProvider = 'openai' | 'anthropic' | 'generic' | 'none'

function normalizeBizPilotProvider(raw: string): BizPilotProvider {
  const value = String(raw || '').toLowerCase().trim()
  if (!value) return 'none'
  if (['openai', 'chatgpt', 'gpt'].includes(value)) return 'openai'
  if (['anthropic', 'claude'].includes(value)) return 'anthropic'
  if (['generic', 'custom'].includes(value)) return 'generic'
  return 'none'
}

function readBizPilotLlmConfig() {
  const preferred = normalizeBizPilotProvider(String(process.env.BIZPILOT_AI_PROVIDER || ''))

  const openaiApiKey = String(process.env.BIZPILOT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '').trim()
  const openaiEndpoint = String(process.env.BIZPILOT_OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions').trim()
  const openaiModel = String(process.env.BIZPILOT_OPENAI_MODEL || 'gpt-4.1-mini').trim()

  const anthropicApiKey = String(process.env.BIZPILOT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '').trim()
  const anthropicEndpoint = String(process.env.BIZPILOT_ANTHROPIC_ENDPOINT || 'https://api.anthropic.com/v1/messages').trim()
  const anthropicModel = String(process.env.BIZPILOT_ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest').trim()

  const genericApiKey = String(process.env.BIZPILOT_LLM_API_KEY || '').trim()
  const genericEndpoint = String(process.env.BIZPILOT_LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions').trim()
  const genericModel = String(process.env.BIZPILOT_LLM_MODEL || 'gpt-4.1-mini').trim()

  const availableOpenAi = openaiApiKey.length > 0
  const availableAnthropic = anthropicApiKey.length > 0
  const availableGeneric = genericApiKey.length > 0

  let provider: BizPilotProvider = 'none'

  if (preferred === 'openai' && availableOpenAi) provider = 'openai'
  else if (preferred === 'anthropic' && availableAnthropic) provider = 'anthropic'
  else if (preferred === 'generic' && availableGeneric) provider = 'generic'
  else if (availableOpenAi) provider = 'openai'
  else if (availableAnthropic) provider = 'anthropic'
  else if (availableGeneric) provider = 'generic'

  return {
    provider,
    openaiApiKey,
    openaiEndpoint,
    openaiModel,
    anthropicApiKey,
    anthropicEndpoint,
    anthropicModel,
    genericApiKey,
    genericEndpoint,
    genericModel,
  }
}

function extractChatCompletionsText(payload: any) {
  const first = payload?.choices?.[0]?.message?.content
  if (typeof first === 'string') return first.trim()
  if (Array.isArray(first)) {
    const text = first
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join(' ')
      .trim()
    return text
  }
  return ''
}

function extractAnthropicText(payload: any) {
  const content = Array.isArray(payload?.content) ? payload.content : []
  const text = content
    .map((item: any) => (item?.type === 'text' ? String(item?.text || '') : ''))
    .filter(Boolean)
    .join(' ')
    .trim()
  return text
}

async function requestOpenAiBizPilot(params: {
  endpoint: string
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
}) {
  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.35,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
    }),
  })

  if (!response.ok) return ''
  const payload = await response.json()
  return extractChatCompletionsText(payload)
}

async function requestAnthropicBizPilot(params: {
  endpoint: string
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
}) {
  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 700,
      temperature: 0.35,
      system: params.systemPrompt,
      messages: [
        { role: 'user', content: params.userPrompt },
      ],
    }),
  })

  if (!response.ok) return ''
  const payload = await response.json()
  return extractAnthropicText(payload)
}

export async function buildSmartBizPilotReply(params: {
  query: string
  recentMessages?: string[]
  language?: string
}) {
  const query = String(params.query || '').trim()
  const recentMessages = (params.recentMessages || []).slice(-6)
  const language = String(params.language || 'en').toLowerCase()
  const cfg = readBizPilotLlmConfig()

  if (cfg.provider === 'none' || !query) {
    return buildBizPilotReply({ query, recentMessages, language })
  }

  const languageName = {
    en: 'English',
    pcm: 'Nigerian Pidgin',
    yo: 'Yoruba',
    ig: 'Igbo',
    ha: 'Hausa',
  }[language as 'en' | 'pcm' | 'yo' | 'ig' | 'ha'] || 'English'

  const systemPrompt = [
    'You are BIGCAT AI BizPilot, a smart business assistant for merchants on a marketplace.',
    'Your goals: grow sales, improve product performance, support pricing and inventory decisions, and give practical merchant advice.',
    'Style: concise, diagnostic-first, actionable, honest about uncertainty, no fabricated data, professional business tone.',
    `Language rule: Reply in ${languageName}. Match the user language and do not switch to English unless user wrote in English.`,
    'Default response format: natural human business reply in 3-6 concise lines.',
    'Use the numbered framework (What\'s likely happening / Top 3 actions / What I need from you) only if the user explicitly asks for that structure.',
    'Formatting rules: keep it readable and concise; avoid forcing numbered sections unless requested.',
    'Professionalism rules: Avoid hype, filler, or childish phrases (for example: fine fine, no waste time, no miss dis).',
    'Diagnosis rules: Do not say "You want..." as diagnosis. Focus on business drivers and probable causes.',
    'For promo-copy requests, provide polished, brand-safe copy and keep wording professional even in Pidgin.',
    'Do not request unnecessary sensitive information.',
    'If merchant asks a business question, do not return product search results. Give strategy and practical next steps.',
  ].join(' ')

  const userPrompt = [
    `Merchant question: ${query}`,
    recentMessages.length > 0 ? `Recent context: ${recentMessages.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    let reply = ''

    if (cfg.provider === 'openai') {
      reply = await requestOpenAiBizPilot({
        endpoint: cfg.openaiEndpoint,
        apiKey: cfg.openaiApiKey,
        model: cfg.openaiModel,
        systemPrompt,
        userPrompt,
      })
    } else if (cfg.provider === 'anthropic') {
      reply = await requestAnthropicBizPilot({
        endpoint: cfg.anthropicEndpoint,
        apiKey: cfg.anthropicApiKey,
        model: cfg.anthropicModel,
        systemPrompt,
        userPrompt,
      })
    } else if (cfg.provider === 'generic') {
      reply = await requestOpenAiBizPilot({
        endpoint: cfg.genericEndpoint,
        apiKey: cfg.genericApiKey,
        model: cfg.genericModel,
        systemPrompt,
        userPrompt,
      })
    }

    if (!reply) {
      return buildBizPilotReply({ query, recentMessages, language })
    }

    return reply.slice(0, 2400)
  } catch {
    return buildBizPilotReply({ query, recentMessages, language })
  }
}

function buildBuyerGuidanceReply(params: {
  query: string
  language?: string
}) {
  const q = String(params.query || '').trim()
  const language = String(params.language || 'en').toLowerCase()

  const responses = {
    en: `I can help you choose the best option quickly. Share your product type, budget range, and location, and I will recommend the top options with price and trusted vendors.`,
    pcm: `I fit help you choose the best option sharp sharp. Tell me product type, your budget range, and your location, make I recommend better options with price and trusted vendors.`,
    yo: `Mo le ran o lowo lati yan eyi to dara ni kiakia. So iru ọja, isuna owo re, ati ipo re, mo ma daba awon aṣayan to dara pelu owo ati onisowo to gbekele.`,
    ig: `Enwere m ike inyere gi ịhọrọ nhọrọ kacha mma ngwa ngwa. Gwa m ụdị ngwaahịa, oke ego gi, na ebe ị nọ, m ga-atụ aro nhọrọ kacha mma na ọnụahịa na ndi na-ere ahia a pụrụ ịtụkwasị obi.`,
    ha: `Zan iya taimaka maka zabar mafi kyawun zaɓi cikin sauri. Ka fada min nau'in kaya, kasafin kudinka, da wurinka, zan ba ka mafi kyawun zabuka tare da farashi da dillalai masu aminci.`,
  }

  const lead = responses[language as 'en' | 'pcm' | 'yo' | 'ig' | 'ha'] || responses.en
  if (!q) return lead
  return `${lead}`
}

export async function buildSmartBuyerReply(params: {
  query: string
  recentMessages?: string[]
  language?: string
}) {
  const query = String(params.query || '').trim()
  const recentMessages = (params.recentMessages || []).slice(-6)
  const language = String(params.language || 'en').toLowerCase()
  const cfg = readBizPilotLlmConfig()

  if (cfg.provider === 'none' || !query) {
    return buildBuyerGuidanceReply({ query, language })
  }

  const languageName = {
    en: 'English',
    pcm: 'Nigerian Pidgin',
    yo: 'Yoruba',
    ig: 'Igbo',
    ha: 'Hausa',
  }[language as 'en' | 'pcm' | 'yo' | 'ig' | 'ha'] || 'English'

  const systemPrompt = [
    'You are BIGCAT AI, buyer shopping assistant for a Nigerian marketplace.',
    'Your role is different from merchant BizPilot: you help buyers choose products/services/vendors and make safe buying decisions.',
    'Be concise, practical, and friendly. Keep responses human and natural, not rigidly templated.',
    `Language rule: Reply in ${languageName}. Match the user language and do not switch to English unless user wrote in English.`,
    'Prefer asking 1-2 targeted questions only when needed (budget, location, preferred brand/use-case).',
    'Do not fabricate product data. If exact data is missing, ask for what is needed.',
  ].join(' ')

  const userPrompt = [
    `Buyer question: ${query}`,
    recentMessages.length > 0 ? `Recent context: ${recentMessages.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    let reply = ''

    if (cfg.provider === 'openai') {
      reply = await requestOpenAiBizPilot({
        endpoint: cfg.openaiEndpoint,
        apiKey: cfg.openaiApiKey,
        model: cfg.openaiModel,
        systemPrompt,
        userPrompt,
      })
    } else if (cfg.provider === 'anthropic') {
      reply = await requestAnthropicBizPilot({
        endpoint: cfg.anthropicEndpoint,
        apiKey: cfg.anthropicApiKey,
        model: cfg.anthropicModel,
        systemPrompt,
        userPrompt,
      })
    } else if (cfg.provider === 'generic') {
      reply = await requestOpenAiBizPilot({
        endpoint: cfg.genericEndpoint,
        apiKey: cfg.genericApiKey,
        model: cfg.genericModel,
        systemPrompt,
        userPrompt,
      })
    }

    if (!reply) return buildBuyerGuidanceReply({ query, language })
    return reply.slice(0, 1600)
  } catch {
    return buildBuyerGuidanceReply({ query, language })
  }
}

function tokenizeQuery(query: string) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
    .slice(0, 8)
}

function normalizeTokenForSearch(token: string) {
  const t = String(token || '').toLowerCase().trim()
  if (!t) return t
  if (t.endsWith('ies') && t.length > 4) return `${t.slice(0, -3)}y`
  if (t.endsWith('es') && t.length > 4) return t.slice(0, -2)
  if (t.endsWith('s') && t.length > 3) return t.slice(0, -1)
  return t
}

function stripLocationHint(query: string) {
  return query
    .replace(/\b(in|at|around|near)\s+([a-z\s]+)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripPriceQualifiers(query: string) {
  return query
    .replace(/\b(affordable|cheap|budget|best|good|low\s*cost|lowcost|fair\s*price)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildQueryVariants(query: string) {
  const variants = new Set<string>()
  const clean = query.trim()
  const tokens = tokenizeQuery(clean)
  const isSpecificQuery = tokens.length >= 2

  if (clean) variants.add(clean)

  const noLocation = stripLocationHint(clean)
  if (noLocation && noLocation !== clean) variants.add(noLocation)

  const noPriceHint = stripPriceQualifiers(noLocation || clean)
  if (noPriceHint && noPriceHint !== clean) variants.add(noPriceHint)

  if (!isSpecificQuery) {
    let aliased = clean
    QUERY_ALIASES.forEach(([pattern, replacement]) => {
      aliased = aliased.replace(pattern, replacement)
    })
    if (aliased && aliased !== clean) variants.add(aliased)
  }

  if (tokens.length > 0) {
    variants.add(tokens.join(' '))

    const normalizedTokens = tokens.map((token) => normalizeTokenForSearch(token)).filter(Boolean)
    const normalizedJoined = normalizedTokens.join(' ')
    if (normalizedJoined && normalizedJoined !== tokens.join(' ')) {
      variants.add(normalizedJoined)
    }

    const normalizedNoPrice = stripPriceQualifiers(normalizedJoined)
    if (normalizedNoPrice && normalizedNoPrice !== normalizedJoined) {
      variants.add(normalizedNoPrice)
    }

    if (!isSpecificQuery) {
      tokens.forEach((token) => variants.add(token))
      normalizedTokens.forEach((token) => variants.add(token))
    }
  }

  return Array.from(variants).slice(0, 10)
}

function mergeUniqueById<T extends { id: string }>(base: T[], incoming: T[], limit: number) {
  const map = new Map(base.map((item) => [String(item.id), item]))
  incoming.forEach((item) => {
    if (map.size < limit || map.has(String(item.id))) {
      map.set(String(item.id), item)
    }
  })
  return Array.from(map.values()).slice(0, limit)
}

function buildTokenOrPattern(tokens: string[], fields: string[]) {
  return tokens
    .flatMap((token) => {
      const safeToken = escapeLike(token)
      return fields.map((field) => `${field}.ilike.%${safeToken}%`)
    })
    .join(',')
}

export function detectReplyLanguage(params: {
  message: string
  preferredLanguage?: string
}): Exclude<AssistantLanguage, 'auto'> {
  const preferred = String(params.preferredLanguage || 'auto').toLowerCase() as AssistantLanguage
  if (preferred !== 'auto' && ['en', 'pcm', 'yo', 'ig', 'ha'].includes(preferred)) {
    return preferred as Exclude<AssistantLanguage, 'auto'>
  }

  const q = String(params.message || '').toLowerCase()
  if (!q) return 'en'

  const scores: Record<Exclude<AssistantLanguage, 'auto' | 'en'>, number> = {
    pcm: 0,
    yo: 0,
    ig: 0,
    ha: 0,
  }

  const hasHint = (text: string, hint: string) => {
    const clean = String(hint || '').toLowerCase().trim()
    if (!clean) return false
    if (clean.includes(' ')) return text.includes(clean)
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
  }

  ;(Object.keys(LANGUAGE_HINTS) as Array<keyof typeof LANGUAGE_HINTS>).forEach((lang) => {
    LANGUAGE_HINTS[lang].forEach((hint) => {
      if (hasHint(q, hint)) {
        scores[lang] += hint.length > 3 ? 2 : 1
      }
    })
  })

  // Boost strong Pidgin markers so Pidgin input does not drift into Yoruba.
  const strongPidginMarkers = ['abeg', 'wetin', 'dey', 'una', 'how far', 'no wahala', 'make i', 'fit do', 'don']
  strongPidginMarkers.forEach((marker) => {
    if (hasHint(q, marker)) scores.pcm += 2
  })

  // If Pidgin and Yoruba are close, prefer Pidgin when explicit Pidgin markers exist.
  if (scores.pcm > 0 && scores.pcm >= scores.yo) {
    return 'pcm'
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  if (best && best[1] > 0) {
    return best[0] as Exclude<AssistantLanguage, 'auto'>
  }

  return 'en'
}

export function detectConversationalIntent(query: string): ConversationalIntent | null {
  const q = String(query || '').toLowerCase().trim()
  if (!q) return null

  const hasPattern = (text: string, pattern: string) => {
    const clean = String(pattern || '').toLowerCase().trim()
    if (!clean) return false
    if (clean.includes(' ')) return text.includes(clean)
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
  }

  const matchesAny = (patterns: string[]) => patterns.some((pattern) => hasPattern(q, pattern))

  const greetingPatterns = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'how far', 'sup',
    'e kaabo', 'kedu', 'sannu',
  ]
  const wellbeingPatterns = [
    'how are you', 'how are you doing', 'how you dey', 'how body', 'se dada ni', 'kedu ka i mere', 'ya jiki',
    "i'm good too", 'im good too', 'i am good too', 'doing good too',
  ]
  const thanksPatterns = ['thank you', 'thanks', 'thank u', 'nagode', 'daalu', 'ese', 'oshe']
  const identityPatterns = ['who are you', 'what are you', 'your name', 'wetin be your name', 'who be you']
  const helpPatterns = ['help me', 'can you help', 'what can you do', 'how do you work', 'guide me']
  const goodbyePatterns = ['bye', 'goodbye', 'see you', 'later', 'ka chi fo', 'odabo', 'bye bye']

  if (matchesAny(wellbeingPatterns)) return 'wellbeing'
  if (matchesAny(greetingPatterns)) return 'greeting'
  if (matchesAny(thanksPatterns)) return 'thanks'
  if (matchesAny(identityPatterns)) return 'identity'
  if (matchesAny(helpPatterns)) return 'help'
  if (matchesAny(goodbyePatterns)) return 'goodbye'

  return null
}

export function buildConversationalReply(params: {
  intent: ConversationalIntent
  language?: string
  assistantMode?: AssistantMode
}) {
  const language = String(params.language || 'en').toLowerCase()
  const mode: AssistantMode = params.assistantMode === 'merchant' ? 'merchant' : 'buyer'
  const intent = params.intent

  const responses = {
    en: {
      greeting: mode === 'merchant'
        ? 'Hello. I am doing great and ready to help you grow your business today.'
        : 'Hello. I am doing great and ready to help you find what you need today.',
      wellbeing: 'I am doing well, thank you for asking. How are you doing today?',
      thanks: 'You are welcome. I am here anytime you need me.',
      identity: mode === 'merchant'
        ? 'I am BigCat Native AI, your marketplace and business assistant.'
        : 'I am BigCat Native AI, your marketplace shopping assistant.',
      help: mode === 'merchant'
        ? 'I can help with product discovery, pricing ideas, promo suggestions, and business tips. Tell me what you need.'
        : 'I can help you find products, compare prices, discover vendors, and answer shopping questions. Tell me what you want.',
      goodbye: 'Alright. Talk soon and have a great day.',
    },
    pcm: {
      greeting: mode === 'merchant'
        ? 'How far. I dey okay well well, and I ready help your business grow today.'
        : 'How far. I dey okay well well, and I ready help you find wetin you need today.',
      wellbeing: 'I dey alright. How you dey today?',
      thanks: 'No wahala. Anytime you need me, I dey here.',
      identity: mode === 'merchant'
        ? 'I be BigCat Native AI, your marketplace and business assistant.'
        : 'I be BigCat Native AI, your marketplace shopping assistant.',
      help: mode === 'merchant'
        ? 'I fit help you with product ideas, pricing, promo message, and business tips. Tell me wetin you want.'
        : 'I fit help you find products, compare prices, and see better vendors. Tell me wetin you need.',
      goodbye: 'Alright, no wahala. We go yarn again soon.',
    },
    yo: {
      greeting: mode === 'merchant'
        ? 'Bawo ni. Mo wa daadaa, mo si setan lati ran o lowo lati dagba owo oja re loni.'
        : 'Bawo ni. Mo wa daadaa, mo si setan lati ran o lowo lati wa ohun ti o nilo loni.',
      wellbeing: 'Mo wa daadaa. Se iwo naa wa daadaa?',
      thanks: 'O seun. Mo wa nibi nigbakugba ti o ba nilo iranlowo.',
      identity: mode === 'merchant'
        ? 'Emi ni BigCat Native AI, oluranlowo oja ati iṣowo re.'
        : 'Emi ni BigCat Native AI, oluranlowo rira ọja re.',
      help: mode === 'merchant'
        ? 'Mo le ran o lowo pelu ero ọja, owo tita, ifiranse ipolowo, ati imoran iṣowo. So ohun ti o nilo.'
        : 'Mo le ran o lowo lati wa ọja, fiwera owo, ati ri onisowo to dara. So ohun ti o nilo.',
      goodbye: 'O dara. A o tun ba ara wa soro laipe.',
    },
    ig: {
      greeting: mode === 'merchant'
        ? 'Ndewo. A di m mma, ma adi njikere inyere gi ka azia gi too taa.'
        : 'Ndewo. A di m mma, ma adi njikere inyere gi ichota ihe i choro taa.',
      wellbeing: 'A di m mma. Kedu ka i mere taa?',
      thanks: 'Nnoo, i nabatara. Anom ebe a oge obula i choro enyemaka.',
      identity: mode === 'merchant'
        ? 'Abum BigCat Native AI, onye inyeaka gi n ahia na uto azụmahịa.'
        : 'Abum BigCat Native AI, onye inyeaka gi n ịzụ ahịa.',
      help: mode === 'merchant'
        ? 'Enwere m ike inyere gi na echiche ngwaahịa, ego, mgbasa ozi, na nduzi azụmahịa.'
        : 'Enwere m ike inyere gi ichota ngwaahịa, tụlee ego, ma hụ ndi na-ere ahia kacha mma.',
      goodbye: 'O di mma. Ka anyi kparita ozo n oge na-adighi anya.',
    },
    ha: {
      greeting: mode === 'merchant'
        ? 'Sannu. Ina lafiya, kuma a shirye nake in taimaka kasuwancinka ya bunkasa yau.'
        : 'Sannu. Ina lafiya, kuma a shirye nake in taimaka ka samu abin da kake bukata yau.',
      wellbeing: 'Ina lafiya. Kai fa, ya jikinka?',
      thanks: 'Babu komai. Ina nan duk lokacin da kake bukata.',
      identity: mode === 'merchant'
        ? 'Ni ne BigCat Native AI, mataimakinka na kasuwa da bunkasa kasuwanci.'
        : 'Ni ne BigCat Native AI, mataimakinka na sayayya.',
      help: mode === 'merchant'
        ? 'Zan taimaka da dabarun kaya, farashi, talla, da shawarwarin kasuwanci.'
        : 'Zan taimaka ka nemo kayayyaki, kwatanta farashi, da gano dillalai masu kyau.',
      goodbye: 'Madalla. Sai mun sake magana nan gaba kadan.',
    },
  }

  const text = responses[language as keyof typeof responses] || responses.en
  return text[intent]
}

export function detectSupportIntent(query: string): SupportIntent | null {
  const q = String(query || '').toLowerCase().trim()
  if (!q) return null

  const isAppOverview = [
    'about this app', 'about bigcat', 'how this app works', 'what is this app', 'app details', 'platform details',
  ].some((pattern) => q.includes(pattern))
  if (isAppOverview) return 'app_overview'

  const isAccount = [
    'cannot login', 'can\'t login', 'cant login', 'login problem', 'sign in issue', 'otp', 'verification code',
    'password reset', 'account locked', 'access account',
  ].some((pattern) => q.includes(pattern))
  if (isAccount) return 'account_access'

  const isCheckout = [
    'payment failed', 'checkout failed', 'cannot pay', 'card declined', 'wallet issue', 'escrow', 'pay for order',
  ].some((pattern) => q.includes(pattern))
  if (isCheckout) return 'checkout_payment'

  const isPaymentGuide = [
    'how payment works', 'how to pay', 'wallet payment', 'is payment safe', 'how escrow works',
  ].some((pattern) => q.includes(pattern))
  if (isPaymentGuide) return 'payment_guide'

  const isOrder = [
    'where is my order', 'track order', 'delivery delay', 'order status', 'order not delivered',
  ].some((pattern) => q.includes(pattern))
  if (isOrder) return 'order_tracking'

  const isMessages = [
    'chat not working', 'message not sending', 'cannot message', 'inbox issue', 'conversation issue',
  ].some((pattern) => q.includes(pattern))
  if (isMessages) return 'messages_chat'

  const isLogistics = [
    'delivery', 'shipping', 'logistics', 'delivery fee', 'track delivery', 'dispatch',
  ].some((pattern) => q.includes(pattern))
  if (isLogistics) return 'logistics_guide'

  const isSafety = [
    'contact details', 'outside platform', 'pay outside', 'is it safe', 'avoid scam',
  ].some((pattern) => q.includes(pattern))
  if (isSafety) return 'platform_safety'

  const isMerchantSetup = [
    'merchant setup', 'set up my store', 'create listing', 'product upload', 'service listing', 'merchant profile',
  ].some((pattern) => q.includes(pattern))
  if (isMerchantSetup) return 'merchant_setup'

  const isIssue = [
    'app issue', 'app not working', 'bug', 'error', 'problem', 'something is wrong', 'support', 'help with app',
  ].some((pattern) => q.includes(pattern))
  if (isIssue) return 'report_issue'

  return null
}

export function buildSupportReply(params: {
  intent: SupportIntent
  language?: string
  assistantMode?: AssistantMode
}) {
  const language = String(params.language || 'en').toLowerCase()
  const mode: AssistantMode = params.assistantMode === 'merchant' ? 'merchant' : 'buyer'

  const responses = {
    en: {
      app_overview:
        'BigCat is a marketplace app for buyers and merchants. Buyers discover products/services, chat with merchants, and checkout with escrow protection. Merchants list products or services, manage orders, and track performance.',
      account_access:
        'For account access issues: confirm your email/phone, retry OTP, and check network stability. If login still fails, use password reset and then sign in again.',
      checkout_payment:
        'For checkout/payment issues: verify payment method balance, retry once, and confirm delivery details. Escrow keeps funds secure until delivery/service completion.',
      order_tracking:
        'For order tracking: open Orders to see current status. If delayed, contact the merchant in Messages and request an update with expected delivery time.',
      messages_chat:
        'For messaging issues: confirm internet access, reopen the conversation, and resend. If blocked by policy, remove restricted contact-sharing content and retry later.',
      merchant_setup:
        mode === 'merchant'
          ? 'To set up your merchant profile: complete business details, choose products or services, add clear listings with pricing, then publish and monitor incoming orders/messages.'
          : 'To become a merchant: sign up as merchant, complete business profile, choose products or services, add listings, and start receiving buyer orders.',
      payment_guide:
        'Payment guidance: wallet payment is available, your funds are held in escrow, and payment is released only after successful delivery/service completion.',
      logistics_guide:
        'Delivery guidance: logistics handles shipment, fees depend on location and package weight, and you can track order status until delivery.',
      platform_safety:
        'For your safety, all transactions should remain within the platform.',
      report_issue:
        'I can help troubleshoot now. Tell me exactly what happened, what page you were on, and any error message. I will guide you step-by-step.',
    },
    pcm: {
      app_overview:
        'BigCat na marketplace app for buyers and merchants. Buyers fit find product/service, chat merchant, and checkout with escrow protection. Merchants fit post listings, manage orders, and track performance.',
      account_access:
        'If account dey worry you: check email/phone well, retry OTP, and confirm network. If e still fail, use password reset then login again.',
      checkout_payment:
        'If payment/checkout fail: check your balance, try again once, and confirm delivery details. Escrow go hold money safe till delivery complete.',
      order_tracking:
        'For order tracking, open Orders make you see status. If e delay, message the merchant for update and delivery time.',
      messages_chat:
        'If chat no dey send, check internet, reopen conversation, then resend. If policy block am, remove contact-sharing words and retry later.',
      merchant_setup:
        mode === 'merchant'
          ? 'To setup your merchant page: complete business details, choose products/services, add clear listings with price, then publish am.'
          : 'If you wan become merchant, register as merchant, complete profile, add listings, and start receive orders.',
      payment_guide:
        'Payment guide: wallet dey available, escrow go hold money safe, payment go release only after delivery or service complete.',
      logistics_guide:
        'Delivery guide: logistics system dey handle am, fee depend on location and package weight, and you fit track am till delivery.',
      platform_safety:
        'For your safety, all transactions should remain within the platform.',
      report_issue:
        'I fit help you solve am now. Tell me wetin happen, which page you dey, and any error message wey you see.',
    },
    yo: {
      app_overview:
        'BigCat je ohun elo oja fun awon olura ati onisowo. Olura le wa ọja/ise, ba onisowo soro, ki o sanwo pelu aabo escrow.',
      account_access:
        'Fun isoro wiwọle account: jẹrisi imeeli/tabi foonu, tun OTP gbiyanju, ki o si ṣayẹwo intanẹẹti.',
      checkout_payment:
        'Fun isoro isanwo: ṣayẹwo dinku owo, tun gbiyanju lẹẹkan, ki o jẹrisi alaye ifijiṣẹ. Escrow n daabo bo owo re.',
      order_tracking:
        'Lati tọpa paṣẹ, ṣii apakan Orders. Ti idaduro ba wa, kan si onisowo ninu Messages fun imudojuiwọn.',
      messages_chat:
        'Ti ifiranse ko ba n lọ, ṣayẹwo intanẹẹti, tun ṣii ibaraẹnisọrọ, ki o tun fi ranṣẹ.',
      merchant_setup:
        'Lati setup onisowo: pari alaye iṣowo, yan ọja tabi ise, fi listing pẹlu owo to ye han, ki o tẹjade.',
      payment_guide:
        'Itosona isanwo: owo wallet wa, escrow n daabo bo owo, a o si tu isanwo sile leyin ifijiṣẹ tabi ise to pari.',
      logistics_guide:
        'Itosona ifijiṣẹ: eto logistics lo n ṣakoso ifijiṣẹ, owo da lori ipo ati iwuwo package, o si le tọpa titi de opin.',
      platform_safety:
        'For your safety, all transactions should remain within the platform.',
      report_issue:
        'Mo le ran o lowo bayi. So pato ohun to sele, oju-iwe ti o wa, ati ifiranse aṣiṣe to ri.',
    },
    ig: {
      app_overview:
        'BigCat bu ngwa ahia maka ndi na-azu na ndi na-ere ahia. I nwere ike ichota ngwaahịa/ọrụ, kparita uka, ma kwụọ n escrow.',
      account_access:
        'Maka nsogbu ịbanye: lelee email/ekwentị, nwalee OTP ọzọ, ma lelee njikọ intaneti.',
      checkout_payment:
        'Maka nsogbu ịkwụ ụgwọ: lelee ego dị, nwalee ọzọ, ma jide n\'aka na adreesị ziri ezi. Escrow na-echekwa ego.',
      order_tracking:
        'Maka tracking order, gaa na Orders ka ị hụ status. Ọ bụrụ na e nwere oge, kpọtụrụ merchant na Messages.',
      messages_chat:
        'Ọ bụrụ na message anaghị eje, lelee intaneti, mepee chat ọzọ, wee zipu ọzọ.',
      merchant_setup:
        'Maka setup merchant: mezue profile azụmahịa, họrọ ngwaahịa ma ọ bụ ọrụ, tinye listing na ọnụahịa ziri ezi.',
      payment_guide:
        'Nduzi ịkwụ ụgwọ: wallet dị, escrow na-echekwa ego, a na-ewepụta ego naanị mgbe e nyefere ihe ma ọ bụ ọrụ gwụchara.',
      logistics_guide:
        'Nduzi nnyefe: usoro logistics na-ahụ nnyefe, ego dabere na ebe na ibu package, ma ị nwere ike iso tracking ruo ngwụcha.',
      platform_safety:
        'For your safety, all transactions should remain within the platform.',
      report_issue:
        'Enwere m ike inyere gị ugbu a. Gwa m ihe kpọmkwem mere, peeji ị nọ, na ozi njehie ọ bụla ị hụrụ.',
    },
    ha: {
      app_overview:
        'BigCat app ne na kasuwa ga masu siya da yan kasuwa. Masu siya na nemo kaya/aiki, su yi chat, su biya da kariyar escrow.',
      account_access:
        'Don matsalar shiga account: duba email/waya, sake gwada OTP, kuma ka tabbatar da internet.',
      checkout_payment:
        'Don matsalar biyan kudi: duba balance, sake gwadawa sau daya, ka tabbatar da bayanan isarwa.',
      order_tracking:
        'Don bin order, shiga Orders ka ga status. Idan an jinkirta, ka tuntuɓi merchant ta Messages.',
      messages_chat:
        'Idan chat baya aiki, duba intanet, sake bude conversation, sannan ka sake turawa.',
      merchant_setup:
        'Don setup merchant: cika bayanan kasuwanci, zabi kaya ko service, saka listing mai farashi a sarari.',
      payment_guide:
        'Jagorar biya: wallet payment akwai, escrow na kare kudinka, kuma ana sakin biya ne bayan isarwa ko kammala aiki.',
      logistics_guide:
        'Jagorar isarwa: tsarin logistics ne ke kula da delivery, kudin ya danganta da wuri da nauyi, kuma ana iya tracking har zuwa karshe.',
      platform_safety:
        'For your safety, all transactions should remain within the platform.',
      report_issue:
        'Zan taimaka yanzu. Ka fada min abin da ya faru, shafin da kake ciki, da duk wani kuskure da ka gani.',
    },
  }

  const languageReplies = responses[language as keyof typeof responses] || responses.en
  return languageReplies[params.intent]
}

export async function searchMarketplace(params: {
  query: string
  type?: SearchType
  limit?: number
  location?: string
}) {
  const supabase = createClient()
  const query = params.query.trim()
  const type = params.type || detectSearchType(query)
  const limit = Math.max(1, Math.min(params.limit || 8, 20))
  const queryVariants = buildQueryVariants(query)
  const queryTokens = tokenizeQuery(query)
  const allowBroadFallback = queryTokens.length <= 1
  const preferredLocation = String(params.location || '').trim().toLowerCase()

  if (!query) {
    return {
      success: false,
      error: 'Query is required',
      products: [],
      vendors: [],
      type,
    }
  }

  const runProductSearch = async (searchTerm: string): Promise<ProductSearchResult[]> => {
    const safeQuery = escapeLike(searchTerm)
    const pattern = `%${safeQuery}%`
    const tokens = tokenizeQuery(searchTerm)

    let request = supabase
      .from('products')
      .select('id, name, description, category, price, stock, image_url, merchant_id, merchant_profiles:auth_users!merchant_id(business_name, name, location, avatar_url)')
      .eq('is_active', true)
      .limit(limit)

    if (tokens.length >= 2) {
      const tokenOr = buildTokenOrPattern(tokens, ['name', 'description', 'category'])
      request = request.or(tokenOr)
    } else {
      request = request.or(`name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`)
    }

    const { data, error } = await request

    if (error) throw error

    return (data || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description || '',
      category: product.category || 'General',
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      image_url: product.image_url || null,
      merchant_id: product.merchant_id,
      vendor_name:
        product?.merchant_profiles?.business_name ||
        product?.merchant_profiles?.name ||
        'Unknown vendor',
      vendor_location: product?.merchant_profiles?.location || 'Nigeria',
    }))
  }

  const runVendorSearch = async (searchTerm: string): Promise<VendorSearchResult[]> => {
    const safeQuery = escapeLike(searchTerm)
    const pattern = `%${safeQuery}%`
    const tokens = tokenizeQuery(searchTerm)

    let request = supabase
      .from('auth_users')
      .select('id, business_name, name, business_category, location, business_description, avatar_url, setup_completed')
      .eq('role', 'merchant')
      .eq('setup_completed', true)
      .limit(limit)

    if (tokens.length >= 2) {
      const tokenOr = buildTokenOrPattern(tokens, [
        'business_name',
        'name',
        'business_category',
        'location',
        'business_description',
      ])
      request = request.or(tokenOr)
    } else {
      request = request.or(`business_name.ilike.${pattern},name.ilike.${pattern},business_category.ilike.${pattern},location.ilike.${pattern},business_description.ilike.${pattern}`)
    }

    const { data, error } = await request

    if (error) throw error

    return (data || []).map((vendor: any) => ({
      id: vendor.id,
      name: vendor.business_name || vendor.name || 'Unknown vendor',
      category: vendor.business_category || 'General',
      location: vendor.location || 'Nigeria',
      description: vendor.business_description || '',
      avatar_url: vendor.avatar_url || null,
    }))
  }

  const fetchMerchantProfiles = async (merchantIds: string[]) => {
    const ids = Array.from(new Set(merchantIds.filter(Boolean)))
    if (ids.length === 0) return new Map<string, { business_name?: string; name?: string; location?: string }>()

    const { data, error } = await supabase
      .from('auth_users')
      .select('id, business_name, name, location')
      .in('id', ids)

    if (error) throw error

    return new Map(
      (data || []).map((merchant: any) => [
        String(merchant.id),
        {
          business_name: merchant.business_name,
          name: merchant.name,
          location: merchant.location,
        },
      ])
    )
  }

  const mapServicesWithMerchants = async (services: any[]): Promise<ServiceSearchResult[]> => {
    const profileMap = await fetchMerchantProfiles(services.map((service) => String(service.merchant_id || '')))

    return services.map((service: any) => {
      const merchant = profileMap.get(String(service.merchant_id || ''))
      return {
        id: service.id,
        name: service.title || 'Service',
        description: service.description || '',
        category: service.category || 'General Service',
        price: Number(service.base_price || 0),
        vendor: merchant?.business_name || merchant?.name || 'Unknown vendor',
        location:
          [service.service_city, service.service_state].filter(Boolean).join(', ') ||
          merchant?.location ||
          'Nigeria',
      }
    })
  }

  const runServiceSearch = async (searchTerm: string): Promise<ServiceSearchResult[]> => {
    const safeQuery = escapeLike(searchTerm)
    const pattern = `%${safeQuery}%`
    const tokens = tokenizeQuery(searchTerm)

    let request = supabase
      .from('service_listings')
      .select('id, title, description, category, base_price, service_city, service_state, merchant_id')
      .eq('is_active', true)
      .limit(limit)

    if (tokens.length >= 2) {
      const tokenOr = buildTokenOrPattern(tokens, ['title', 'description', 'category', 'service_city', 'service_state'])
      request = request.or(tokenOr)
    } else {
      request = request.or(`title.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern},service_city.ilike.${pattern},service_state.ilike.${pattern}`)
    }

    const { data, error } = await request
    if (error) throw error

    return mapServicesWithMerchants(data || [])
  }

  const runProductFallback = async (): Promise<ProductSearchResult[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, category, price, stock, image_url, merchant_id, merchant_profiles:auth_users!merchant_id(business_name, name, location, avatar_url)')
      .eq('is_active', true)
      .limit(limit)

    if (error) throw error

    return (data || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description || '',
      category: product.category || 'General',
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      image_url: product.image_url || null,
      merchant_id: product.merchant_id,
      vendor_name:
        product?.merchant_profiles?.business_name ||
        product?.merchant_profiles?.name ||
        'Unknown vendor',
      vendor_location: product?.merchant_profiles?.location || 'Nigeria',
    }))
  }

  const runVendorFallback = async (): Promise<VendorSearchResult[]> => {
    const { data, error } = await supabase
      .from('auth_users')
      .select('id, business_name, name, business_category, location, business_description, avatar_url, setup_completed')
      .eq('role', 'merchant')
      .eq('setup_completed', true)
      .limit(limit)

    if (error) throw error

    return (data || []).map((vendor: any) => ({
      id: vendor.id,
      name: vendor.business_name || vendor.name || 'Unknown vendor',
      category: vendor.business_category || 'General',
      location: vendor.location || 'Nigeria',
      description: vendor.business_description || '',
      avatar_url: vendor.avatar_url || null,
    }))
  }

  const runServiceFallback = async (): Promise<ServiceSearchResult[]> => {
    const { data, error } = await supabase
      .from('service_listings')
      .select('id, title, description, category, base_price, service_city, service_state, merchant_id')
      .eq('is_active', true)
      .limit(limit)

    if (error) throw error

    return mapServicesWithMerchants(data || [])
  }

  const prioritizeByLocation = <T extends { location?: string; vendor_location?: string }>(rows: T[]) => {
    if (!preferredLocation) return rows
    const preferred: T[] = []
    const other: T[] = []

    rows.forEach((row) => {
      const candidate = String(row.location || row.vendor_location || '').toLowerCase()
      if (candidate && candidate.includes(preferredLocation)) {
        preferred.push(row)
      } else {
        other.push(row)
      }
    })

    return [...preferred, ...other]
  }

  try {
      let products: ProductSearchResult[] = []
      let vendors: VendorSearchResult[] = []
      let services: ServiceSearchResult[] = []

      if (type !== 'vendors') {
        for (const variant of queryVariants) {
          const found = await runProductSearch(variant)
          products = mergeUniqueById(products, found, limit)
          if (products.length >= limit) break
        }
      }

      if (type !== 'products' && type !== 'vendors') {
        for (const variant of queryVariants) {
          const found = await runServiceSearch(variant)
          services = mergeUniqueById(services, found, limit)
          if (services.length >= limit) break
        }
      }

      if (type !== 'products') {
        for (const variant of queryVariants) {
          const found = await runVendorSearch(variant)
          vendors = mergeUniqueById(vendors, found, limit)
          if (vendors.length >= limit) break
        }
      }

      if (type !== 'vendors' && products.length === 0 && allowBroadFallback) {
        products = await runProductFallback()
      }

      if (type !== 'products' && vendors.length === 0 && allowBroadFallback) {
        vendors = await runVendorFallback()
      }

      if (type !== 'products' && type !== 'vendors' && services.length === 0 && allowBroadFallback) {
        services = await runServiceFallback()
      }

      products = prioritizeByLocation(products)
      vendors = prioritizeByLocation(vendors)
      services = prioritizeByLocation(services)

    return {
      success: true,
      type,
      products,
      vendors,
      services,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Search failed',
      products: [],
      vendors: [],
      services: [],
      type,
    }
  }
}

export function buildAiSearchReply(params: {
  query: string
  products: Array<{ name: string; price: number; vendor_name: string }>
  vendors: Array<{ name: string; category: string; location: string }>
  services?: Array<{ name: string; price: number; vendor: string; location: string }>
  userLocation?: string
  intentType?: MarketplaceIntentType
  language?: string
  assistantMode?: AssistantMode
}) {
  const { query, products, vendors } = params
  const services = params.services || []
  const userLocation = String(params.userLocation || '').trim()
  const intentType: MarketplaceIntentType = params.intentType || detectMarketplaceIntentType(query)
  const language = String(params.language || 'auto').toLowerCase()
  const assistantMode: AssistantMode = params.assistantMode === 'merchant' ? 'merchant' : 'buyer'

  const localized = {
    en: {
      noResult: `I could not find a direct match for "${query}" yet. Try a broader term like a category or location in Nigeria.`,
      noResultAlt: 'No exact match found, but here are similar options you might like.',
      topProducts: 'Top products',
      topServices: 'Top services',
      topVendors: 'Top vendors',
      nearbyPrefix: 'near you',
      merchantTip:
        'Merchant tip: refresh your product/service title, add clear pricing, and post a short promo to improve conversion.',
      buyerTip: 'Buyer tip: compare at least two vendors, then check location and reviews before placing your order.',
    },
    pcm: {
      noResult: `I no see exact result for "${query}" yet. Try broader word like category or location for Naija.`,
      noResultAlt: 'No exact match found, but here are similar options you might like.',
      topProducts: 'Top products wey show',
      topServices: 'Top services wey show',
      topVendors: 'Top vendors wey show',
      nearbyPrefix: 'close to your side',
      merchantTip:
        'Merchant tip: update your product/service title, put clear price, and post short promo make conversion improve.',
      buyerTip: 'Buyer tip: compare at least two vendors, check location and review before you place order.',
    },
    yo: {
      noResult: `Mi o ri esi to pe fun "${query}" sibẹ. E gbiyanju oro to gbooro bii eya ọja tabi ipo ni Naijiria.`,
      noResultAlt: 'No exact match found, but here are similar options you might like.',
      topProducts: 'Awon ọja to ga ju',
      topServices: 'Awon ise to ga ju',
      topVendors: 'Awon onisowo to ga ju',
      nearbyPrefix: 'to sunmo ipo re',
      merchantTip:
        'Imoran onisowo: se atunse oruko ọja/tabi ise, fi owo to ye han, ki o si fi ipolowo kukuru kun.',
      buyerTip: 'Imoran olura: fiwera o kere ju onisowo meji, ki o wo ipo ati ayewo ki o to paṣẹ.',
    },
    ig: {
      noResult: `Enwetaghi m nsonaazu ziri ezi maka "${query}" ugbu a. Nwalee okwu sara mbara dika udi ngwaahịa ma obu ebe.`,
      noResultAlt: 'No exact match found, but here are similar options you might like.',
      topProducts: 'Ngwaahịa kacha elu',
      topServices: 'Ọrụ kacha elu',
      topVendors: 'Ndi na-ere ahia kacha elu',
      nearbyPrefix: 'nso gi',
      merchantTip:
        'Ndumodu maka onye ahia: melite aha ngwaahịa/oru gi, tinye ego doro anya, ma tinye obere mgbasa ozi.',
      buyerTip: 'Ndumodu maka onye na-azu: tulee ndi na-ere ahia abuo ma obu karie, nyochaa ebe na reviews tupu izu.',
    },
    ha: {
      noResult: `Ban samu sakamako kai tsaye ga "${query}" ba yanzu. Gwada kalma mai fadi kamar rukuni ko wuri a Najeriya.`,
      noResultAlt: 'No exact match found, but here are similar options you might like.',
      topProducts: 'Manyan kayayyaki',
      topServices: 'Manyan ayyuka',
      topVendors: 'Manyan dillalai',
      nearbyPrefix: 'kusa da kai',
      merchantTip:
        'Shawara ga dan kasuwa: sabunta taken kaya/aiki, saka farashi a fili, sannan ka saka karamin talla.',
      buyerTip: 'Shawara ga mai siya: kwatanta dillalai akalla biyu, duba wuri da sharhi kafin oda.',
    },
  }

  const labels = localized[language as keyof typeof localized] || localized.en

  if (products.length === 0 && vendors.length === 0 && services.length === 0) {
    return labels.noResult
  }

  if (intentType === 'service' && services.length === 0 && (products.length > 0 || vendors.length > 0)) {
    return labels.noResultAlt
  }

  const parts: string[] = []
  if (products.length > 0) {
    const topProducts = products.slice(0, 3)
      .map((p) => `${p.name} (${p.vendor_name}) - NGN ${p.price.toLocaleString()}`)
      .join('; ')
    parts.push(`${labels.topProducts}: ${topProducts}.`)
  }

  if (services.length > 0) {
    const topServices = services.slice(0, 3)
      .map((s) => `${s.name} (${s.vendor}, ${s.location}) - NGN ${s.price.toLocaleString()}`)
      .join('; ')
    parts.push(`${labels.topServices}: ${topServices}.`)
  }

  if (vendors.length > 0) {
    const topVendors = vendors.slice(0, 3)
      .map((v) => `${v.name} (${v.category}, ${v.location})`)
      .join('; ')
    parts.push(`${labels.topVendors}: ${topVendors}.`)
  }

  if (userLocation) {
    parts.push(`Here are options ${labels.nearbyPrefix}: ${userLocation}.`)
  }

  parts.push(assistantMode === 'merchant' ? labels.merchantTip : labels.buyerTip)

  return parts.join(' ')
}

export function buildStructuredMarketplaceResponse(params: {
  intentType: MarketplaceIntentType
  query: string
  location?: string
  products: ProductSearchResult[]
  services: ServiceSearchResult[]
  vendors: VendorSearchResult[]
}): StructuredAiResponse {
  const location = String(params.location || 'Unknown location')

  if (params.intentType === 'service') {
    return {
      type: 'service',
      query: params.query,
      location,
      results: params.services.slice(0, 6).map((service) => ({
        name: service.name,
        price: service.price ? `NGN ${service.price.toLocaleString()}` : 'Not specified',
        vendor: service.vendor,
        location: service.location,
      })),
    }
  }

  if (params.intentType === 'vendor') {
    return {
      type: 'vendor',
      query: params.query,
      location,
      results: params.vendors.slice(0, 6).map((vendor) => ({
        name: vendor.name,
        price: 'N/A',
        vendor: vendor.name,
        location: vendor.location,
      })),
    }
  }

  return {
    type: 'product',
    query: params.query,
    location,
    results: params.products.slice(0, 6).map((product) => ({
      name: product.name,
      price: `NGN ${product.price.toLocaleString()}`,
      vendor: product.vendor_name,
      location: product.vendor_location,
    })),
  }
}

// ============== ENHANCED FEATURES (All 14) ==============

// #1-2: Buyer Preference Learning & Storage
export function getBuyerPreferences(buyerId: string) {
  if (typeof window === 'undefined') return null
  const key = `bigcat_buyer_prefs_${buyerId}`
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

export function saveBuyerPreferences(buyerId: string, prefs: {
  favoriteCategories?: string[]
  priceRanges?: { min: number; max: number }[]
  preferredVendors?: string[]
  searchHistory?: string[]
  recentSearchQuery?: string
}) {
  if (typeof window === 'undefined') return
  const key = `bigcat_buyer_prefs_${buyerId}`
  try {
    localStorage.setItem(key, JSON.stringify(prefs))
  } catch {
    // Ignore storage errors
  }
}

// #1: Clarifying Questions Before Search
export function shouldAskClarifyingQuestions(query: string, recentMessages: string[]): boolean {
  const q = query.toLowerCase()
  // If query is very short or generic, ask clarifying questions
  const tokens = query.split(/\s+/).filter(Boolean)
  if (tokens.length < 2) return true
  
  // Don't ask if already detailed
  const hasDetails = /budget|price|brand|use|new|used|size|color|weight|range/i.test(q)
  if (hasDetails) return false
  
  return tokens.length <= 3
}

export function generateClarifyingQuestions(query: string, language: string = 'en'): string {
  const lang = String(language || 'en').toLowerCase()
  const examples = {
    en: `To help you find the best match:\n- What's your budget range?\n- Do you prefer a specific brand?\n- New or used?\n- Primary use case?`,
    pcm: `Make I help you find better options:\n- How much you go spend?\n- Any brand you like?\n- New or second-hand?\n- What you go use am for?`,
    yo: `Ki n le eniyan lowo lati ri ohun to dara:\n- Owe kan lo fẹ lilo?\n- Orile-ede kan lo fẹ?\n- Titun tabi lo gbe?\n- Kini lo ba fe lo se pelu re?`,
    ig: `Ka m chara gi mma:\n- Ego olee chi gi?\n- Onye nke a ihe o so?\n- Ọhụrụ ma obu a gụrụ?\n- Gini ka i ga-eji ya mee?`,
    ha: `In ba mu ni ne'm gine abin mafi kyau:\n- Kudin da kake bukatar?\n- Wani kasua kake ga so?\n- Sabon ko da tsoho?\n- Me za kai yi wannan?`,
  }
  return examples[lang as keyof typeof examples] || examples.en
}

// #3: Product Comparison Mode
export function detectComparisonIntent(query: string): boolean {
  const q = query.toLowerCase()
  return /compare|vs|versus|difference|which.*better|brand.*vs|choose between|between/i.test(q)
}

export function buildComparisonReply(products: ProductSearchResult[], query: string, language: string = 'en'): string {
  if (products.length < 2) {
    const lang = language === 'pcm' ? 'I need at least two products to compare. Try "show me Nike and Adidas shoes."' : 'I need at least two products to compare.'
    return lang
  }

  const topTwo = products.slice(0, 2)
  const lines = [`📊 Comparison: ${topTwo.map(p => p.name).join(' vs ')}\n`]
  
  topTwo.forEach(p => {
    lines.push(`\n${p.name}`)
    lines.push(`  Price: NGN ${p.price.toLocaleString()}`)
    lines.push(`  Vendor: ${p.vendor_name}`)
    lines.push(`  Stock: ${p.stock} available`)
  })

  return lines.join('\n')
}

export function extractReviewHighlight(product: ProductSearchResult): string | null {
  return null
}

// #6: Smart Fallback Suggestions
export function buildSmartFallbackSuggestion(query: string, failedSearch: SearchType): string {
  const q = query.toLowerCase()
  const lang = q.includes('abeg') || q.includes('wetin') ? 'pcm' : 'en'
  const coreTokens = tokenizeQuery(query)
    .map((token) => normalizeTokenForSearch(token))
    .filter((token) => !['affordable', 'cheap', 'budget', 'best', 'good'].includes(token))

  const primaryTerm = coreTokens[0] || 'product'
  const broadHint = primaryTerm.length > 2 ? primaryTerm : 'item'
  const locationMatch = query.match(/\b(?:in|at|around|near)\s+([a-z\s]+)$/i)
  const location = locationMatch?.[1]?.trim()

  const suggestions = {
    products: {
      en: `I couldn't find an exact match for "${query}" yet. Try searching "${broadHint}"${location ? ` in ${location}` : ''}, or share your budget and preferred brand so I can narrow better options.`,
      pcm: `I no see exact match for "${query}" yet. Try search "${broadHint}"${location ? ` for ${location}` : ''}, or tell me your budget and brand wey you like make I narrow better options.`,
    },
    services: {
      en: `No exact service match. Try broader terms like "repair" or "maintenance" to see related services.`,
      pcm: `Service no get exact match. Try "repair" or "maintenance" to see wetin dey available.`,
    },
    vendors: {
      en: `No vendor exactly matches that query. Try searching for products instead - I'll show you vendors who sell them.`,
      pcm: `Vendor no show for that one. Try search product instead - make I show you vendors wey sell am.`,
    },
  }

  const suggestionKey: 'products' | 'services' | 'vendors' =
    failedSearch === 'services' || failedSearch === 'vendors' ? failedSearch : 'products'
  const languageKey: 'en' | 'pcm' = lang === 'pcm' ? 'pcm' : 'en'

  return suggestions[suggestionKey][languageKey] || suggestions.products.en
}

// #7: Inventory Alerts & Wishlist Helpers
export function createInventoryAlert(productId: string, buyerId: string, notifyEmail?: string): { id: string; createdAt: string } {
  const id = `alert_${productId}_${buyerId}_${Date.now()}`
  if (typeof window !== 'undefined') {
    try {
      const alerts = JSON.parse(localStorage.getItem(`bigcat_alerts_${buyerId}`) || '[]')
      alerts.push({ id, productId, buyerId, notifyEmail, createdAt: new Date().toISOString(), active: true })
      localStorage.setItem(`bigcat_alerts_${buyerId}`, JSON.stringify(alerts.slice(-10)))
    } catch {
      // Ignore
    }
  }
  return { id, createdAt: new Date().toISOString() }
}

// #8: BizPilot Product-Level Analysis
export function analyzeMerchantProduct(product: any): {
  titleScore: number
  imageScore: number
  descriptionScore: number
  priceCompScore: number
  suggestions: string[]
} {
  const titleScore = (product.name?.length || 0) >= 30 ? 80 : (product.name?.length || 0) >= 15 ? 60 : 30
  const imageScore = product.image_url ? 80 : 30
  const descriptionScore = (product.description?.length || 0) >= 100 ? 80 : (product.description?.length || 0) >= 30 ? 60 : 20
  const priceCompScore = 70 // Would compare against market average

  const suggestions: string[] = []
  if (titleScore < 70) suggestions.push('Improve product title: be specific about brand, model, color, and key benefit')
  if (imageScore < 70) suggestions.push('Add clear product images: front view, detail, and scale reference')
  if (descriptionScore < 70) suggestions.push('Strengthen description: add use cases, care instructions, and warranty info')
  if (priceCompScore < 70) suggestions.push('Review pricing: compare with 3 similar listings to stay competitive')

  return {
    titleScore,
    imageScore,
    descriptionScore,
    priceCompScore,
    suggestions,
  }
}

// #10: Merchant Suggestions (What to Stock)
export function suggestProductsForMerchant(merchantCategory: string): string[] {
  const suggestions: Record<string, string[]> = {
    electronics: ['Phone cases', 'Screen protectors', 'Chargers', 'USB cables', 'Power banks'],
    fashion: ['Accessories', 'Belts', 'Hats', 'Scarves', 'Shoe care kits'],
    food: ['Beverages', 'Snacks', 'Spices', 'Condiments', 'Storage containers'],
    services: ['Complementary services', 'Warranty packages', 'Maintenance plans', 'Training sessions'],
  }

  return suggestions[merchantCategory.toLowerCase()] || suggestions.electronics
}

// #11: Location-Based Delivery ETA
export function estimateDeliveryEta(vendorLocation: string, buyerLocation: string): string {
  // Simple proximity check - in production: use actual distance API
  if (vendorLocation === buyerLocation) return 'Same-day or next-day delivery available'
  if (vendorLocation.split(',')[0] === buyerLocation.split(',')[0]) {
    return '1-2 days delivery'
  }
  return '2-4 days delivery depending on logistics'
}

// #12: Smart Error Messaging
export function buildSmartErrorMessage(error: string, searchQuery: string, language: string = 'en'): string {
  const q = searchQuery.toLowerCase()
  const lang = String(language || 'en').toLowerCase()

  const suggestions = {
    en: `I couldn't find "${searchQuery}". Try:\n- Use broader category (e.g., "shoe" instead of specific model)\n- Check spelling\n- Search by vendor name instead\n- Try "what's popular in ${q.split(' ')[0]}"`,
    pcm: `I no see "${searchQuery}" oh. Try:\n- Use bigger search like "shoe" instead of exact model\n- Check spelling\n- Search vendor name\n- Ask "wetin dey popular for ${q.split(' ')[0]}"`,
  }

  return suggestions[lang as keyof typeof suggestions] || suggestions.en
}

// #5 + #9: Confidence Badges & Data Enrichment  
export function buildConfidenceBadges(product: ProductSearchResult & { rating?: number; reviews?: number; delivery_days?: number }): string {
  const badges: string[] = []
  
  if (product.stock > 20) badges.push('✓ In Stock')
  if (product.stock > 50) badges.push('⚡ Hot Item')
  if (product.rating && product.rating >= 4.5) badges.push(`⭐ ${product.rating.toFixed(1)}`)
  if (product.delivery_days === 0) badges.push('🚀 Today')
  if (product.delivery_days === 1) badges.push('📦 Tomorrow')
  
  return badges.join(' • ')
}

// #10 Context-Aware Search Refinement
export function refineSearchByContext(currentQuery: string, recentMessages: string[]): string {
  if (recentMessages.length === 0) return currentQuery
  
  // If user said "cheaper" or "better", incorporate previous category
  const q = currentQuery.toLowerCase()
  if (/cheaper|cheaper|more expensive|better|worse|upgrade|downgrade/.test(q) && recentMessages.length > 0) {
    const lastSearch = recentMessages[recentMessages.length - 1].toLowerCase()
    const categoryMatch = lastSearch.match(/\b(phone|shoe|clothes|food|service|laptop)\b/)
    if (categoryMatch) {
      return `${categoryMatch[1]} ${currentQuery}`
    }
  }
  
  return currentQuery
}
