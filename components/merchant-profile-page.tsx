'use client'

import { useState, useEffect } from 'react'
import { useRole } from '@/lib/role-context'
import { getUserProfile, updateUserProfile } from '@/lib/user-actions'
import { ArrowLeft, Camera, Loader2, Check, AlertCircle, Store, MapPin, FileText, User, Phone, Mail } from 'lucide-react'
import Image from 'next/image'

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
  })

  useEffect(() => {
    if (user?.userId) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const result = await getUserProfile(user?.userId || '')
      if (result.success && result.data) {
        setProfile(result.data)
        setFormData({
          full_name: result.data.full_name || '',
          phone: result.data.phone || '',
          address: result.data.address || '',
          business_name: result.data.business_name || '',
          business_description: result.data.business_description || '',
          business_category: result.data.business_category || 'General Merchandise',
          location: result.data.location || '',
        })
      }
    } catch (error) {
      // console.error('[v0] Error loading profile:', error)
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

      const result = await updateUserProfile(user?.userId || '', updateData)

      if (result.success) {
        setProfile(result.data)
        setMessage({ type: 'success', text: activeTab === 'personal' ? 'Profile updated successfully' : 'Store updated successfully' })
        
        // Update user context if business name changed
        if (activeTab === 'store' && formData.business_name) {
          setUser({
            ...user!,
            merchantProfile: {
              ...user?.merchantProfile,
              business_name: formData.business_name,
            }
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
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-primary" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg">
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
