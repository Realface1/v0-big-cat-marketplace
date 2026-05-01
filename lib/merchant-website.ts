export type WebsiteTheme = 'emerald' | 'midnight' | 'sunset'
export type WebsiteLayout = 'classic' | 'minimal' | 'bold'

export const WEBSITE_THEMES: Array<{ id: WebsiteTheme; label: string }> = [
  { id: 'emerald', label: 'Emerald' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'sunset', label: 'Sunset' },
]

export const WEBSITE_LAYOUTS: Array<{ id: WebsiteLayout; label: string }> = [
  { id: 'classic', label: 'Classic' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold' },
]

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
