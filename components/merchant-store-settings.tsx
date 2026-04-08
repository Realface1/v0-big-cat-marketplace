'use client'

import { useState, useEffect } from 'react'
import { Store, Phone, Mail, MapPin, Image, Globe, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRole } from '@/lib/role-context'
import { formatNaira } from '@/lib/currency-utils'

interface MerchantStoreSettingsProps {
  onComplete?: () => void
}

export function MerchantStoreSettings({ onComplete }: MerchantStoreSettingsProps) {
  const { user } = useRole()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [storeSettings, setStoreSettings] = useState({
    storeName: user?.merchantProfile?.business_name || '',
    storeDescription: user?.merchantProfile?.business_description || '',
    storeEmail: user?.email || '',
    storePhone: user?.phone || '',
    storeLocation: user?.merchantProfile?.location || '',
    storeWebsite: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankCode: '',
    minimumOrder: 1000,
    commissionRate: 5,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setStoreSettings(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      // In a real app, you would save these settings to the database
      // For now, we'll just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1500))
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onComplete?.()
      }, 2000)
    } catch (err) {
      setError('Failed to save store settings. Please try again.')
    } finally {
      setSaving(false)
    }
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
                  value={storeSettings.storeWebsite}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-muted rounded-lg text-foreground border border-border focus:outline-none focus:border-primary"
                  placeholder="https://example.com"
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
