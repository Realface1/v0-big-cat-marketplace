'use client'

import { useState, useEffect } from 'react'
import { useRole } from '@/lib/role-context'
import { ArrowLeft, Camera, Loader2, Check, AlertCircle, Store, MapPin, FileText, User, Phone, Mail, Globe, Copy, ExternalLink, Palette } from 'lucide-react'
import Image from 'next/image'
import { getMerchantMiniWebsitePath, getMerchantMiniWebsiteStorageKey, WEBSITE_LAYOUTS, WEBSITE_THEMES, type WebsiteLayout, type WebsiteTheme } from '@/lib/merchant-website'

interface MerchantProfile {
  id: string
  email: string
  full_name: string
  phone: string
  address?: string
  avatar_url?: string
  business_name?: string
  business_description?: string
  business_category?: string
  location?: string
  smedan_id?: string
}

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Food & Beverages',
  'Home & Garden',
  'Sports & Outdoors',
  'Books & Media',
  'Beauty & Personal Care',
  'Toys & Games',
  'Automotive',
  'Health & Wellness',
  'General Merchandise',
  'Other'
]

export function MerchantProfilePage({ onBack }: { onBack: () => void }) {
  const { user, setUser } = useRole()
  const [profile, setProfile] = useState<MerchantProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'store'>('personal')
  
  const [formData, setFormData] = useState({
    // Personal info
    full_name: '',
    phone: '',
    address: '',
    // Store info
    business_name: '',
    business_description: '',
    business_category: 'General Merchandise',
    location: '',
    website_theme: 'emerald' as WebsiteTheme,
    website_layout: 'classic' as WebsiteLayout,
  })

  useEffect(() => {
    if (user?.userId) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/user/profile?userId=${user?.userId || ''}`)
      const result = await response.json()

      if (result.success && result.data) {
        setProfile(result.data)

        let savedWebsiteSettings: { theme?: WebsiteTheme; layout?: WebsiteLayout } = {}
        if (typeof window !== 'undefined' && user?.userId) {
          try {
            savedWebsiteSettings = JSON.parse(localStorage.getItem(getMerchantMiniWebsiteStorageKey(user.userId)) || '{}')
          } catch {
            savedWebsiteSettings = {}
          }
        }

        setFormData({
          full_name: result.data.full_name || result.data.name || user?.name || '',
          phone: result.data.phone || user?.phone || '',
          address: result.data.address || '',
          business_name: result.data.business_name || user?.merchantProfile?.business_name || user?.name || '',
          business_description: result.data.business_description || user?.merchantProfile?.business_description || '',
          business_category: result.data.business_category || user?.merchantProfile?.business_category || 'General Merchandise',
          location: result.data.location || user?.merchantProfile?.location || '',
          website_theme: savedWebsiteSettings.theme || 'emerald',
          website_layout: savedWebsiteSettings.layout || 'classic',
        })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to load profile' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (activeTab === 'personal' && !formData.full_name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' })
      return
    }

    if (activeTab === 'store' && !formData.business_name.trim()) {
      setMessage({ type: 'error', text: 'Store name is required' })
      return
    }

    setSaving(true)
    try {
      const updateData = activeTab === 'personal' 
        ? {
            full_name: formData.full_name,
            phone: formData.phone,
            address: formData.address,
          }
        : {
            business_name: formData.business_name,
            business_description: formData.business_description,
            business_category: formData.business_category,
            location: formData.location,
          }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.userId || '', updates: updateData }),
      })
      const result = await response.json()

      if (result.success) {
        setProfile(result.data)
        setMessage({ type: 'success', text: activeTab === 'personal' ? 'Profile updated successfully' : 'Store and mini website updated successfully' })

        if (user && activeTab === 'store' && typeof window !== 'undefined') {
          localStorage.setItem(
            getMerchantMiniWebsiteStorageKey(user.userId),
            JSON.stringify({
              theme: formData.website_theme,
              layout: formData.website_layout,
            })
          )
        }

        if (user) {
          setUser({
            ...user,
            phone: result.data.phone || user.phone,
            name: result.data.full_name || result.data.name || result.data.business_name || user.name,
            merchantProfile: {
              ...user.merchantProfile,
              business_name: result.data.business_name || user.merchantProfile?.business_name,
              business_description: result.data.business_description || user.merchantProfile?.business_description,
              business_category: result.data.business_category || user.merchantProfile?.business_category,
              location: result.data.location || user.merchantProfile?.location,
              smedan_id: result.data.smedan_id || user.merchantProfile?.smedan_id,
              logo_url: result.data.logo_url || result.data.avatar_url || user.merchantProfile?.logo_url,
            },
          })
        }
        
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update' })
      }
    } catch (error) {
      // console.error('[v0] Error saving:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const generatedWebsitePath = user?.userId
    ? getMerchantMiniWebsitePath({
        merchantId: user.userId,
        businessName: formData.business_name || user?.name || 'store',
        theme: formData.website_theme,
        layout: formData.website_layout,
      })
    : ''

  const generatedWebsiteUrl = typeof window !== 'undefined' && generatedWebsitePath
    ? `${window.location.origin}${generatedWebsitePath}`
    : generatedWebsitePath

  const handleCopyWebsiteLink = async () => {
    if (!generatedWebsiteUrl) return
    await navigator.clipboard.writeText(generatedWebsiteUrl)
    setMessage({ type: 'success', text: 'Mini website link copied successfully' })
    setTimeout(() => setMessage(null), 2000)
  }

  const handlePreviewWebsite = () => {
    if (!generatedWebsitePath || typeof window === 'undefined') return
    window.open(generatedWebsitePath, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-foreground">Merchant Profile</h1>
            <div className="w-9" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">Merchant Profile</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card sticky top-[57px] z-40">
        {[
          { id: 'personal', label: 'Personal', icon: User },
          { id: 'store', label: 'Store', icon: Store },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id as 'personal' | 'store')
              setMessage(null)
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === id
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Message */}
        {message && (
          <div
            className={`mx-4 mt-4 p-4 rounded-xl flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30'
                : 'bg-destructive/10 border border-destructive/30'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-destructive'}`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Personal Tab */}
        {activeTab === 'personal' && (
          <div className="p-4 space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
                  {(profile?.avatar_url || user?.merchantProfile?.logo_url) ? (
                    <Image
                      src={profile?.avatar_url || user?.merchantProfile?.logo_url}
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-primary" />
                  )}
                </div>
                <button
                  onClick={() => setMessage({ type: 'success', text: 'Profile photo upload will be available soon.' })}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 border border-border rounded-xl">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">{profile?.email}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Home Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your home address"
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>

            {/* Mini Website */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Mini Website</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your store website is generated automatically. Customize it and share the link with customers.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Website link</p>
                <p className="text-sm text-foreground break-all">{generatedWebsiteUrl || 'Website link will appear here'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Theme
                  </label>
                  <select
                    value={formData.website_theme}
                    onChange={(e) => setFormData({ ...formData, website_theme: e.target.value as WebsiteTheme })}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {WEBSITE_THEMES.map((theme) => (
                      <option key={theme.id} value={theme.id}>{theme.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Layout</label>
                  <select
                    value={formData.website_layout}
                    onChange={(e) => setFormData({ ...formData, website_layout: e.target.value as WebsiteLayout })}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {WEBSITE_LAYOUTS.map((layout) => (
                      <option key={layout.id} value={layout.id}>{layout.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleCopyWebsiteLink}
                  className="flex-1 py-3 bg-secondary text-foreground rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={handlePreviewWebsite}
                  className="flex-1 py-3 bg-card border border-border text-foreground rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview Site
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}

        {/* Store Tab */}
        {activeTab === 'store' && (
          <div className="p-4 space-y-6">
            {/* Store Banner Preview */}
            <div className="relative h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-border overflow-hidden flex items-center justify-center">
              <Store className="w-16 h-16 text-primary/30" />
              <div className="absolute bottom-3 left-3">
                <h3 className="font-bold text-foreground">{formData.business_name || 'Your Store Name'}</h3>
                <p className="text-xs text-muted-foreground">{formData.business_category}</p>
              </div>
            </div>

            {/* Store Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Store Name *
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Enter your store name"
                  className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Store Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Store Category
              </label>
              <select
                value={formData.business_category}
                onChange={(e) => setFormData({ ...formData, business_category: e.target.value })}
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Store Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Store Description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <textarea
                  value={formData.business_description}
                  onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                  placeholder="Describe your store and what you sell..."
                  rows={4}
                  className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.business_description.length}/500 characters
              </p>
            </div>

            {/* Store Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Store Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Lagos, Nigeria"
                  className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Website Link */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Store Website Link
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={generatedWebsiteUrl}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">This is the buyer-facing website link for your store.</p>
            </div>

            {/* SMEDAN ID (read-only) */}
            {profile?.smedan_id && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  SMEDAN ID
                </label>
                <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 border border-border rounded-xl">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">{profile.smedan_id}</span>
                  <Check className="w-4 h-4 text-green-500 ml-auto" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Verified business registration</p>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save Store Details
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
