'use client'

import { useState, useEffect } from 'react'
import { useRole } from '@/lib/role-context'
import { ArrowLeft, Camera, Loader2, Check, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface Profile {
  id: string
  email: string
  name: string
  phone: string
  avatar_url?: string
}

export function ProfilePage({ onBack }: { onBack: () => void }) {
  const { user } = useRole()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
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
        setFormData({
          name: result.data.name || result.data.full_name || user?.name || '',
          phone: result.data.phone || user?.phone || '',
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
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.userId || '',
          updates: {
            name: formData.name,
            phone: formData.phone,
          },
        }),
      })
      const result = await response.json()

      if (result.success) {
        setProfile(result.data)
        setMessage({ type: 'success', text: 'Profile updated successfully' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update profile' })
      }
    } catch (error) {
      // console.error('[v0] Error saving profile:', error)
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
            <h1 className="font-semibold text-foreground">Edit Profile</h1>
            <div className="w-9" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
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
          <h1 className="font-semibold text-foreground">Edit Profile</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Message Alert */}
        {message && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Avatar Section */}
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 relative group cursor-pointer">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.name}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-primary">
                {(profile?.name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
            <button
              onClick={() => setMessage({ type: 'success', text: 'Profile photo upload will be available soon.' })}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">Click to change photo</p>
        </div>

        {/* Form Fields */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-secondary rounded-lg border border-border text-muted-foreground opacity-60"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Change email in Settings
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter phone number"
            />
          </div>

          
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
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

          <button
            onClick={onBack}
            className="w-full py-4 bg-secondary text-foreground font-semibold rounded-xl hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
