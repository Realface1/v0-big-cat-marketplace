'use client'

import { useState, useEffect, useRef } from 'react'
import { Store, Phone, Mail, MapPin, Globe, Save, Loader2, CheckCircle2, AlertCircle, Copy, ExternalLink, Palette } from 'lucide-react'
import { useRole } from '@/lib/role-context'
import {
  getDefaultWebsiteBannerConfig,
  getMerchantMiniWebsitePath,
  getMerchantMiniWebsiteStorageKey,
  normalizeWebsiteBannerConfig,
  WEBSITE_BANNER_TEMPLATES,
  WEBSITE_LAYOUTS,
  WEBSITE_THEMES,
  type WebsiteBannerConfig,
  type WebsiteLayout,
  type WebsiteTheme,
} from '@/lib/merchant-website'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { MerchantThemeLayoutPicker } from './merchant-theme-layout-picker'
import { MerchantBannerEditor } from './merchant-banner-editor'

interface MerchantStoreSettingsProps {
  onComplete?: () => void
}

function storeSettingsBannerStyle(template: WebsiteBannerConfig['template']) {
  if (template === 'promo') {
    return {
      shell: 'border-fuchsia-200 bg-gradient-to-br from-fuchsia-600 via-rose-500 to-orange-400 text-white',
      badge: 'bg-white/15 text-white',
      card: 'bg-fuchsia-50 border-fuchsia-100',
    }
  }

  if (template === 'product') {
    return {
      shell: 'border-amber-200 bg-gradient-to-br from-zinc-950 via-amber-900 to-orange-500 text-white',
      badge: 'bg-white/15 text-white',
      card: 'bg-amber-50 border-amber-100',
    }
  }

  return {
    shell: 'border-emerald-200 bg-gradient-to-br from-emerald-600 via-lime-500 to-teal-500 text-white',
    badge: 'bg-white/15 text-white',
    card: 'bg-emerald-50 border-emerald-100',
  }
}

export function MerchantStoreSettings({ onComplete }: MerchantStoreSettingsProps) {
  const { user } = useRole()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const settingsInitializedRef = useRef(false)
  const [storeSettings, setStoreSettings] = useState(() => {
    // Try to restore saved theme from localStorage immediately (no flash)
    let cachedTheme: WebsiteTheme = 'emerald'
    let cachedLayout: WebsiteLayout = 'classic'
    let cachedBanner: WebsiteBannerConfig = getDefaultWebsiteBannerConfig()
    if (typeof window !== 'undefined' && user?.userId) {
      try {
        const raw = localStorage.getItem(getMerchantMiniWebsiteStorageKey(user.userId))
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.theme) cachedTheme = parsed.theme as WebsiteTheme
          if (parsed.layout) cachedLayout = parsed.layout as WebsiteLayout
          if (parsed.banner) cachedBanner = normalizeWebsiteBannerConfig(parsed.banner)
        }
      } catch {}
    }
    return {
      storeName: user?.merchantProfile?.business_name || '',
      storeDescription: user?.merchantProfile?.business_description || '',
      storeEmail: user?.email || '',
      storePhone: user?.phone || '',
      storeLocation: user?.merchantProfile?.location || '',
      storeWebsite: '',
      websiteTheme: cachedTheme,
      websiteLayout: cachedLayout,
      websiteBanner: cachedBanner,
      bankAccountName: '',
      bankAccountNumber: '',
      bankCode: '',
    }
  })
  const bannerPreviewStyle = storeSettingsBannerStyle(storeSettings.websiteBanner.template)

  useEffect(() => {
    if (!user?.userId || typeof window === 'undefined') return

    try {
      const raw = localStorage.getItem(getMerchantMiniWebsiteStorageKey(user.userId))
      if (!raw) return

      const parsed = JSON.parse(raw)
      setStoreSettings((prev) => ({
        ...prev,
        websiteTheme: parsed.theme || prev.websiteTheme,
        websiteLayout: parsed.layout || prev.websiteLayout,
        websiteBanner: parsed.banner ? normalizeWebsiteBannerConfig(parsed.banner) : prev.websiteBanner,
      }))
    } catch {
      // ignore invalid cached preferences
    }
  }, [user?.userId])

  useEffect(() => {
    if (!user?.userId || settingsInitializedRef.current) return
    settingsInitializedRef.current = true

    const initializeFromServer = async () => {
      setLoading(true)
      try {
        const [response, themeResponse] = await Promise.all([
          fetch(`/api/user/profile?userId=${encodeURIComponent(user.userId)}`, {
            cache: 'no-store',
          }),
          fetch(`/api/user/theme?userId=${encodeURIComponent(user.userId)}`, {
            cache: 'no-store',
          }),
        ])

        const result = await response.json()
        const themeResult = await themeResponse.json()
        const resolvedTheme = themeResult?.success ? themeResult?.data?.website_theme : undefined
        const resolvedLayout = themeResult?.success ? themeResult?.data?.website_layout : undefined
        const resolvedBanner = themeResult?.success ? themeResult?.data?.website_banner : undefined

        if (result?.success && result?.data) {
          const data = result.data
          setStoreSettings((prev) => ({
            ...prev,
            storeName: data.business_name || user?.merchantProfile?.business_name || user?.name || prev.storeName,
            storeDescription: data.business_description || user?.merchantProfile?.business_description || prev.storeDescription,
            storeEmail: data.email || user?.email || prev.storeEmail,
            storePhone: data.phone || user?.phone || prev.storePhone,
            storeLocation: data.location || user?.merchantProfile?.location || prev.storeLocation,
            websiteTheme: resolvedTheme || data.website_theme || user?.merchantProfile?.website_theme || prev.websiteTheme,
            websiteLayout: resolvedLayout || data.website_layout || user?.merchantProfile?.website_layout || prev.websiteLayout,
            websiteBanner: resolvedBanner || data.website_banner || prev.websiteBanner,
          }))
          return
        }
      } catch {
        // fall back to local user context if server read fails
      } finally {
        setLoading(false)
      }

      setStoreSettings((prev) => ({
        ...prev,
        storeName: user?.merchantProfile?.business_name || user?.name || prev.storeName,
        storeDescription: user?.merchantProfile?.business_description || prev.storeDescription,
        storeEmail: user?.email || prev.storeEmail,
        storePhone: user?.phone || prev.storePhone,
        storeLocation: user?.merchantProfile?.location || prev.storeLocation,
        websiteTheme: user?.merchantProfile?.website_theme || prev.websiteTheme,
        websiteLayout: user?.merchantProfile?.website_layout || prev.websiteLayout,
        websiteBanner: prev.websiteBanner,
      }))
    }

    initializeFromServer()
  }, [user?.userId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setStoreSettings(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleBannerToggle = (enabled: boolean) => {
    setStoreSettings((prev) => ({
      ...prev,
      websiteBanner: {
        ...prev.websiteBanner,
        enabled,
      },
    }))
  }

  const handleBannerTemplateChange = (template: WebsiteBannerConfig['template']) => {
    const nextBanner = getDefaultWebsiteBannerConfig(template)
    setStoreSettings((prev) => ({
      ...prev,
      websiteBanner: {
        ...nextBanner,
        enabled: prev.websiteBanner.enabled,
      },
    }))
  }

  const handleBannerFieldChange = (field: 'badge' | 'headline' | 'subheadline' | 'ctaText', value: string) => {
    setStoreSettings((prev) => ({
      ...prev,
      websiteBanner: {
        ...prev.websiteBanner,
        [field]: value,
      },
    }))
  }

  const handleSave = async () => {
    if (!user?.userId) {
      setError('You need to be signed in to save store settings.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      // Save theme via dedicated endpoint (no auth required — always works)
      const themeResponse = await fetch('/api/user/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          website_theme: storeSettings.websiteTheme,
          website_layout: storeSettings.websiteLayout,
          website_banner: storeSettings.websiteBanner,
        }),
      })
      const themeResult = await themeResponse.json()
      if (!themeResult.success) {
        throw new Error(themeResult.error || 'Failed to save mini website theme')
      }

      const confirmedThemeResponse = await fetch(`/api/user/theme?userId=${encodeURIComponent(user.userId)}`, {
        cache: 'no-store',
      })
      const confirmedThemeResult = await confirmedThemeResponse.json()
      const savedTheme = confirmedThemeResult?.success ? confirmedThemeResult?.data?.website_theme : undefined
      const savedLayout = confirmedThemeResult?.success ? confirmedThemeResult?.data?.website_layout : undefined
      const savedBanner = confirmedThemeResult?.success ? confirmedThemeResult?.data?.website_banner : undefined

      if (
        savedTheme !== storeSettings.websiteTheme ||
        savedLayout !== storeSettings.websiteLayout ||
        JSON.stringify(savedBanner) !== JSON.stringify(normalizeWebsiteBannerConfig(storeSettings.websiteBanner))
      ) {
        throw new Error('Saved mini website preferences could not be confirmed')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          getMerchantMiniWebsiteStorageKey(user.userId),
          JSON.stringify({ theme: savedTheme, layout: savedLayout, banner: savedBanner })
        )
      }

      // Save other store fields via main profile PUT (with auth)
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          onComplete?.()
        }, 1500)
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          userId: user.userId,
          updates: {
            business_name: storeSettings.storeName,
            business_description: storeSettings.storeDescription,
            phone: storeSettings.storePhone,
            location: storeSettings.storeLocation,
            email: storeSettings.storeEmail,
          },
        }),
      })
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to save store settings')
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onComplete?.()
      }, 1500)
    } catch (err) {
      setError('Failed to save store settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const generatedWebsitePath = user?.userId
    ? getMerchantMiniWebsitePath({
        merchantId: user.userId,
        businessName: storeSettings.storeName || user?.name || 'store',
        theme: storeSettings.websiteTheme,
        layout: storeSettings.websiteLayout,
      })
    : ''

  const generatedWebsiteUrl = typeof window !== 'undefined' && generatedWebsitePath
    ? `${window.location.origin}${generatedWebsitePath}`
    : generatedWebsitePath

  const handleCopyWebsiteLink = async () => {
    if (!generatedWebsiteUrl) return
    await navigator.clipboard.writeText(generatedWebsiteUrl)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 1500)
  }

  const handlePreviewWebsite = () => {
    if (!generatedWebsitePath || typeof window === 'undefined') return
    window.open(generatedWebsitePath, '_blank')
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Store Settings</h1>
          </div>
          <p className="text-muted-foreground">Configure your store details and payment information</p>
        </div>

        {/* Store Information */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Store className="w-5 h-5" />
            Store Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Store Name</label>
              <input
                type="text"
                name="storeName"
                value={storeSettings.storeName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                placeholder="Enter store name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Store Description</label>
              <textarea
                name="storeDescription"
                value={storeSettings.storeDescription}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary resize-none h-24"
                placeholder="Tell customers about your store"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  name="storeEmail"
                  value={storeSettings.storeEmail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </label>
                <input
                  type="tel"
                  name="storePhone"
                  value={storeSettings.storePhone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </label>
                <input
                  type="text"
                  name="storeLocation"
                  value={storeSettings.storeLocation}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                  placeholder="City or region"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website
                </label>
                <input
                  type="url"
                  name="storeWebsite"
                  value={generatedWebsiteUrl}
                  readOnly
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mini Website */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Mini Website
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your store gets a mini website automatically. Customize the look and share the link with customers.
          </p>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
            <p className="text-xs font-semibold text-primary mb-2">Generated website link</p>
            <p className="text-sm text-foreground break-all">{generatedWebsiteUrl || 'Your link will appear here'}</p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleCopyWebsiteLink}
                className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </button>
              <button
                type="button"
                onClick={handlePreviewWebsite}
                className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Preview Website
              </button>
            </div>
          </div>

          {/* Theme & Layout Picker */}
          <MerchantThemeLayoutPicker
            selectedTheme={storeSettings.websiteTheme}
            selectedLayout={storeSettings.websiteLayout}
            onThemeChange={(theme) => setStoreSettings((prev) => ({ ...prev, websiteTheme: theme }))}
            onLayoutChange={(layout) => setStoreSettings((prev) => ({ ...prev, websiteLayout: layout }))}
          />

          {/* Banner Editor with Product Images */}
          <MerchantBannerEditor
            banner={storeSettings.websiteBanner}
            onUpdate={(banner) => setStoreSettings((prev) => ({ ...prev, websiteBanner: banner }))}
            merchantId={user?.userId}
            isLoading={loading}
          />

          {/* Banner Content Editor */}
          <div className={`rounded-2xl border p-4 ${bannerPreviewStyle.card}`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Banner Content</h3>
                <p className="text-xs text-muted-foreground mt-1">Customize the text, template, and messaging for your promotional banner.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={storeSettings.websiteBanner.enabled}
                  onChange={(e) => handleBannerToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Show banner
              </label>
            </div>

            <div className={`rounded-2xl border p-5 shadow-sm ${bannerPreviewStyle.shell}`}>
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${bannerPreviewStyle.badge}`}>
                {storeSettings.websiteBanner.badge}
              </div>
              <h4 className="mt-3 text-xl font-bold leading-tight">{storeSettings.websiteBanner.headline}</h4>
              <p className="mt-2 max-w-xl text-sm text-white/85">{storeSettings.websiteBanner.subheadline}</p>
              <div className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                {storeSettings.websiteBanner.ctaText}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Banner Template</label>
                <select
                  value={storeSettings.websiteBanner.template}
                  onChange={(e) => handleBannerTemplateChange(e.target.value as WebsiteBannerConfig['template'])}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                >
                  {WEBSITE_BANNER_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {WEBSITE_BANNER_TEMPLATES.find((template) => template.id === storeSettings.websiteBanner.template)?.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Badge</label>
                  <input
                    type="text"
                    value={storeSettings.websiteBanner.badge}
                    onChange={(e) => handleBannerFieldChange('badge', e.target.value)}
                    maxLength={40}
                    className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                    placeholder="Limited Offer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Button Label</label>
                  <input
                    type="text"
                    value={storeSettings.websiteBanner.ctaText}
                    onChange={(e) => handleBannerFieldChange('ctaText', e.target.value)}
                    maxLength={28}
                    className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                    placeholder="Shop the deal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Headline</label>
                <input
                  type="text"
                  value={storeSettings.websiteBanner.headline}
                  onChange={(e) => handleBannerFieldChange('headline', e.target.value)}
                  maxLength={90}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                  placeholder="Save big on selected items this week"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Supporting Text</label>
                <textarea
                  value={storeSettings.websiteBanner.subheadline}
                  onChange={(e) => handleBannerFieldChange('subheadline', e.target.value)}
                  maxLength={180}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary resize-none h-24"
                  placeholder="Highlight your offer, promo code, or hero product in one short message."
                />
              </div>


            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Payment Information</h2>
          <p className="text-sm text-muted-foreground mb-4">We&apos;ll use this to disburse your earnings</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Account Name</label>
              <input
                type="text"
                name="bankAccountName"
                value={storeSettings.bankAccountName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                placeholder="Your bank account name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Account Number</label>
                <input
                  type="text"
                  name="bankAccountNumber"
                  value={storeSettings.bankAccountNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                  placeholder="Your account number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Bank Code</label>
                <select
                  name="bankCode"
                  value={storeSettings.bankCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                >
                  <option value="">Select a bank</option>
                  <option value="011">First Bank</option>
                  <option value="012">United Bank for Africa</option>
                  <option value="007">Zenith Bank</option>
                  <option value="056">Guaranty Trust Bank</option>
                  <option value="035">Wema Bank</option>
                </select>
              </div>
            </div>
          </div>
        </div>


        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-600">Store settings saved successfully!</p>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Store Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}
