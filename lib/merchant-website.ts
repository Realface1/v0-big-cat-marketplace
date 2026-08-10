export type WebsiteTheme = 'emerald' | 'midnight' | 'sunset' | 'sapphire' | 'rose' | 'gold' | 'slate' | 'violet' | 'teal'
export type WebsiteLayout = 'classic' | 'minimal' | 'bold' | 'modern' | 'elegant' | 'playful' | 'professional' | 'showcase'
export type WebsiteBannerTemplate = 'discount' | 'promo' | 'product'

export interface WebsiteBannerVariantConfig {
  badge: string
  headline: string
  subheadline: string
  ctaText: string
}

export interface WebsiteBannerConfig extends WebsiteBannerVariantConfig {
  enabled: boolean
  template: WebsiteBannerTemplate
  abTestEnabled?: boolean
  variantB?: WebsiteBannerVariantConfig
  productImageUrl?: string
  productImageLayout?: 'left' | 'right' | 'full-bleed'
  promotedProductId?: string
}

export const WEBSITE_THEMES: Array<{ id: WebsiteTheme; label: string; description: string }> = [
  { id: 'emerald', label: 'Emerald', description: 'Fresh, eco-conscious green gradient' },
  { id: 'midnight', label: 'Midnight', description: 'Dark, sophisticated navy & indigo' },
  { id: 'sunset', label: 'Sunset', description: 'Warm orange, rose & fuchsia vibes' },
  { id: 'sapphire', label: 'Sapphire', description: 'Premium blue & teal elegance' },
  { id: 'rose', label: 'Rose', description: 'Romantic pink & mauve aesthetic' },
  { id: 'gold', label: 'Gold', description: 'Luxe amber & bronze premium look' },
  { id: 'slate', label: 'Slate', description: 'Minimalist gray & charcoal neutral' },
  { id: 'violet', label: 'Violet', description: 'Modern purple & lavender creative' },
  { id: 'teal', label: 'Teal', description: 'Contemporary teal & cyan tech-forward' },
]

export const WEBSITE_LAYOUTS: Array<{ id: WebsiteLayout; label: string; description: string }> = [
  { id: 'classic', label: 'Classic', description: 'Traditional layout with sidebar' },
  { id: 'minimal', label: 'Minimal', description: 'Clean, distraction-free focus' },
  { id: 'bold', label: 'Bold', description: 'Large hero images & typography' },
  { id: 'modern', label: 'Modern', description: 'Card-based grid with white space' },
  { id: 'elegant', label: 'Elegant', description: 'Luxury serif fonts & spacing' },
  { id: 'playful', label: 'Playful', description: 'Rounded corners & fun animations' },
  { id: 'professional', label: 'Professional', description: 'B2B corporate confidence' },
  { id: 'showcase', label: 'Showcase', description: 'Portfolio/gallery centered view' },
]

export const WEBSITE_BANNER_TEMPLATES: Array<{
  id: WebsiteBannerTemplate
  label: string
  description: string
  defaults: WebsiteBannerVariantConfig
}> = [
  {
    id: 'discount',
    label: 'Discount Sale',
    description: 'Perfect for percentage or fixed-price deals.',
    defaults: {
      badge: 'Limited Offer',
      headline: 'Save big on selected items this week',
      subheadline: 'Highlight your best markdowns and give visitors a clear reason to shop now.',
      ctaText: 'Shop the deal',
    },
  },
  {
    id: 'promo',
    label: 'Store Promotion',
    description: 'Use this for seasonal campaigns or general announcements.',
    defaults: {
      badge: 'Now Live',
      headline: 'Fresh arrivals and special offers are here',
      subheadline: 'Turn your homepage into a campaign landing area with one focused message.',
      ctaText: 'See what is new',
    },
  },
  {
    id: 'product',
    label: 'Product Spotlight',
    description: 'Feature one hero product or bestseller on the mini website.',
    defaults: {
      badge: 'Featured Product',
      headline: 'This bestseller deserves the front row',
      subheadline: 'Lead with your strongest product story, price hook, or launch message.',
      ctaText: 'View featured item',
    },
  },
]

// Image quality validation utilities for banner images
export function validateBannerImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  const value = url.trim()
  if (!value) return false

  // Support legacy/private proxy paths like /api/file?pathname=...
  if (value.startsWith('/')) return true

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

    // Many CDN/blob URLs are extensionless; allow trusted web URLs.
    return true
  } catch {
    return false
  }
}

export interface ImageOptimizationParams {
  url: string
  width: number
  quality: number
  format: 'webp' | 'auto'
}

export function getOptimizedImageUrl(params: ImageOptimizationParams): string {
  if (!params.url || !validateBannerImageUrl(params.url)) return ''
  
  // For Next.js Image Optimization - return Vercel's optimized CDN URL
  try {
    const url = new URL(params.url)
    const searchParams = new URLSearchParams()
    searchParams.set('w', String(params.width))
    searchParams.set('q', String(params.quality))
    searchParams.set('fm', params.format)
    return `${url.origin}${url.pathname}?${searchParams.toString()}`
  } catch {
    return params.url
  }
}

export function getBannerImageSafeZone(layout: WebsiteLayout): {
  textTop: string
  textBottom: string
  maxWidth: string
  padding: string
} {
  const zones: Record<WebsiteLayout, any> = {
    classic: { textTop: 'top-16', textBottom: 'bottom-12', maxWidth: 'max-w-2xl', padding: 'px-8' },
    minimal: { textTop: 'top-12', textBottom: 'bottom-10', maxWidth: 'max-w-xl', padding: 'px-6' },
    bold: { textTop: 'top-20', textBottom: 'bottom-16', maxWidth: 'max-w-3xl', padding: 'px-12' },
    modern: { textTop: 'top-14', textBottom: 'bottom-12', maxWidth: 'max-w-2xl', padding: 'px-8' },
    elegant: { textTop: 'top-16', textBottom: 'bottom-14', maxWidth: 'max-w-2xl', padding: 'px-10' },
    playful: { textTop: 'top-12', textBottom: 'bottom-10', maxWidth: 'max-w-xl', padding: 'px-6' },
    professional: { textTop: 'top-16', textBottom: 'bottom-12', maxWidth: 'max-w-2xl', padding: 'px-8' },
    showcase: { textTop: 'top-14', textBottom: 'bottom-12', maxWidth: 'max-w-3xl', padding: 'px-8' },
  }
  return zones[layout] || zones.classic
}

export function getWebsiteBannerTemplate(template?: WebsiteBannerTemplate | null) {
  return WEBSITE_BANNER_TEMPLATES.find((item) => item.id === template) || WEBSITE_BANNER_TEMPLATES[0]
}

export function getDefaultWebsiteBannerConfig(template: WebsiteBannerTemplate = 'discount'): WebsiteBannerConfig {
  const preset = getWebsiteBannerTemplate(template)
  return {
    enabled: false,
    template: preset.id,
    badge: preset.defaults.badge,
    headline: preset.defaults.headline,
    subheadline: preset.defaults.subheadline,
    ctaText: preset.defaults.ctaText,
    abTestEnabled: false,
    productImageUrl: undefined,
    productImageLayout: 'right',
    promotedProductId: undefined,
    variantB: {
      badge: `${preset.defaults.badge} B`,
      headline: preset.defaults.headline,
      subheadline: preset.defaults.subheadline,
      ctaText: preset.defaults.ctaText,
    },
  }
}

export function isWebsiteBannerTemplate(value: unknown): value is WebsiteBannerTemplate {
  return value === 'discount' || value === 'promo' || value === 'product'
}

export function normalizeWebsiteBannerConfig(value: unknown): WebsiteBannerConfig {
  if (!value || typeof value !== 'object') {
    return getDefaultWebsiteBannerConfig()
  }

  const candidate = value as Partial<WebsiteBannerConfig>
  const preset = getWebsiteBannerTemplate(isWebsiteBannerTemplate(candidate.template) ? candidate.template : 'discount')

  const badge = typeof candidate.badge === 'string' && candidate.badge.trim()
    ? candidate.badge.trim().slice(0, 40)
    : preset.defaults.badge

  const headline = typeof candidate.headline === 'string' && candidate.headline.trim()
    ? candidate.headline.trim().slice(0, 90)
    : preset.defaults.headline

  const subheadline = typeof candidate.subheadline === 'string' && candidate.subheadline.trim()
    ? candidate.subheadline.trim().slice(0, 180)
    : preset.defaults.subheadline

  const ctaText = typeof candidate.ctaText === 'string' && candidate.ctaText.trim()
    ? candidate.ctaText.trim().slice(0, 28)
    : preset.defaults.ctaText

  const variantBCandidate: any = candidate.variantB || {}
  const variantB: WebsiteBannerVariantConfig = {
    badge: typeof variantBCandidate.badge === 'string' && variantBCandidate.badge.trim()
      ? variantBCandidate.badge.trim().slice(0, 40)
      : `${preset.defaults.badge} B`,
    headline: typeof variantBCandidate.headline === 'string' && variantBCandidate.headline.trim()
      ? variantBCandidate.headline.trim().slice(0, 90)
      : preset.defaults.headline,
    subheadline: typeof variantBCandidate.subheadline === 'string' && variantBCandidate.subheadline.trim()
      ? variantBCandidate.subheadline.trim().slice(0, 180)
      : preset.defaults.subheadline,
    ctaText: typeof variantBCandidate.ctaText === 'string' && variantBCandidate.ctaText.trim()
      ? variantBCandidate.ctaText.trim().slice(0, 28)
      : preset.defaults.ctaText,
  }

  const productImageUrl = validateBannerImageUrl(candidate.productImageUrl) ? candidate.productImageUrl : undefined
  const productImageLayout = (candidate.productImageLayout === 'left' || candidate.productImageLayout === 'full-bleed') 
    ? candidate.productImageLayout 
    : 'right'

  return {
    enabled: Boolean(candidate.enabled),
    template: preset.id,
    badge,
    headline,
    subheadline,
    ctaText,
    abTestEnabled: Boolean(candidate.abTestEnabled),
    productImageUrl,
    productImageLayout,
    promotedProductId: typeof candidate.promotedProductId === 'string' ? candidate.promotedProductId : undefined,
    variantB,
  }
}

export function slugifyStoreName(value: string) {
  return (value || 'store')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'store'
}

export function extractMerchantIdFromSlug(slug: string) {
  const match = String(slug || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  return match?.[0] || ''
}

export function getMerchantMiniWebsitePath({
  merchantId,
  businessName,
}: {
  merchantId: string
  businessName?: string
  theme?: WebsiteTheme
  layout?: WebsiteLayout
}) {
  const slug = `${slugifyStoreName(businessName || 'store')}-${merchantId}`
  return `/store/${slug}`
}

export function getMerchantMiniWebsiteStorageKey(merchantId: string) {
  return `merchant-mini-website:${merchantId}`
}
