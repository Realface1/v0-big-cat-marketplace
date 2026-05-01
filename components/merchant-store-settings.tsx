'use client'

import { useState, useEffect, useRef } from 'react'
import { Store, Phone, Mail, MapPin, Globe, Save, Loader2, CheckCircle2, AlertCircle, Copy, ExternalLink, Palette } from 'lucide-react'
import { useRole } from '@/lib/role-context'
import { getMerchantMiniWebsitePath, getMerchantMiniWebsiteStorageKey, WEBSITE_LAYOUTS, WEBSITE_THEMES, type WebsiteLayout, type WebsiteTheme } from '@/lib/merchant-website'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'

interface MerchantStoreSettingsProps {
  onComplete?: () => void
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
    if (typeof window !== 'undefined' && user?.userId) {
      try {
        const raw = localStorage.getItem(getMerchantMiniWebsiteStorageKey(user.userId))
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.theme) cachedTheme = parsed.theme as WebsiteTheme
          if (parsed.layout) cachedLayout = parsed.layout as WebsiteLayout
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
      bankAccountName: '',
      bankAccountNumber: '',
      bankCode: '',
      minimumOrder: 1000,
      commissionRate: 5,
    }
  })

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

      if (savedTheme !== storeSettings.websiteTheme || savedLayout !== storeSettings.websiteLayout) {
        throw new Error('Saved mini website preferences could not be confirmed')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          getMerchantMiniWebsiteStorageKey(user.userId),
          JSON.stringify({ theme: savedTheme, layout: savedLayout })
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Theme
              </label>
              <select
                name="websiteTheme"
                value={storeSettings.websiteTheme}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
              >
                {WEBSITE_THEMES.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Layout Style</label>
              <select
                name="websiteLayout"
                value={storeSettings.websiteLayout}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
              >
                {WEBSITE_LAYOUTS.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {layout.label}
                  </option>
                ))}
              </select>
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

        {/* Store Policies */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Store Policies</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Minimum Order Value</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="minimumOrder"
                  value={storeSettings.minimumOrder}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                  placeholder="1000"
                />
                <span className="text-sm text-muted-foreground font-medium">₦</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Customers must order at least this amount</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Commission Rate</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="commissionRate"
                  value={storeSettings.commissionRate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                  placeholder="5"
                  min="1"
                  max="20"
                />
                <span className="text-sm text-muted-foreground font-medium">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">BigCat marketplace commission on your sales</p>
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
