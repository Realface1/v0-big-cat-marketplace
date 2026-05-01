'use client'

import { useState, useEffect } from 'react'
import { useRole } from '@/lib/role-context'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { ArrowLeft, Lock, Mail, Bell, Loader2, Check, AlertCircle, Eye, EyeOff, Trash2 } from 'lucide-react'

interface SettingsMessage {
  type: 'success' | 'error'
  text: string
}

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const { user, setRole, setUser } = useRole()
  const [activeTab, setActiveTab] = useState<'password' | 'email' | 'notifications' | 'delete'>('password')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<SettingsMessage | null>(null)
  const [showPasswords, setShowPasswords] = useState<{ current: boolean; new: boolean; confirm: boolean; delete: boolean }>({
    current: false,
    new: false,
    confirm: false,
    delete: false,
  })
  const [deletePassword, setDeletePassword] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Email form state
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: '',
  })

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
  })

  useEffect(() => {
    if (!user?.userId) return

    const loadPreferences = async () => {
      try {
        const response = await fetch(`/api/user/profile?userId=${encodeURIComponent(user.userId)}`, {
          cache: 'no-store',
        })
        const result = await response.json()

        if (!result?.success || !result?.data) return

        setNotifications({
          email_notifications: result.data.email_notifications !== false,
          push_notifications: result.data.push_notifications !== false,
          sms_notifications: Boolean(result.data.sms_notifications),
        })
      } catch {
        // Ignore profile fetch failures and keep defaults.
      }
    }

    loadPreferences()
  }, [user?.userId])

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'All fields are required' })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    setLoading(true)
    try {
      const supabase = createSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'change-password',
          userId: user?.userId || '',
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Password changed successfully' })
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to change password' })
      }
    } catch (error) {
      // console.error('[v0] Error changing password:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  // Handle email update
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!emailForm.newEmail || !emailForm.password) {
      setMessage({ type: 'error', text: 'Email and password are required' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-email',
          userId: user?.userId || '',
          newEmail: emailForm.newEmail,
        }),
      })
      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Email updated successfully' })
        setEmailForm({ newEmail: '', password: '' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update email' })
      }
    } catch (error) {
      // console.error('[v0] Error updating email:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  // Handle notification preferences
  const handleNotificationUpdate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-notifications',
          userId: user?.userId || '',
          preferences: notifications,
        }),
      })
      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Notification preferences updated' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update preferences' })
      }
    } catch (error) {
      // console.error('[v0] Error updating notifications:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setMessage({ type: 'error', text: 'Please confirm you want to delete your account' })
      return
    }

    if (!deletePassword) {
      setMessage({ type: 'error', text: 'Please enter your password to confirm' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete-account',
          userId: user?.userId || '',
        }),
      })
      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: 'Account deleted successfully. Redirecting...' })
        setTimeout(() => {
          setUser(null)
          setRole(null)
        }, 2000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete account' })
      }
    } catch (error) {
      // console.error('[v0] Error deleting account:', error)
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setLoading(false)
    }
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
          <h1 className="font-semibold text-foreground">Settings</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card sticky top-[57px] z-40 overflow-x-auto">
        {[
          { id: 'password', label: 'Password', icon: Lock },
          { id: 'email', label: 'Email', icon: Mail },
          { id: 'notifications', label: 'Alerts', icon: Bell },
          { id: 'delete', label: 'Delete', icon: Trash2 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

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

        {/* Change Password Tab */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:border-primary transition-colors pr-10"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:border-primary transition-colors pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                At least 8 characters, 1 uppercase, 1 number
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:border-primary transition-colors pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Update Password
                </>
              )}
            </button>
          </form>
        )}

        {/* Change Email Tab */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailUpdate} className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                New Email Address
              </label>
              <input
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter new email"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={emailForm.password}
                onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                className="w-full px-4 py-3 bg-secondary rounded-lg border border-border focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter your password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required for security verification
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Update Email
                </>
              )}
            </button>
          </form>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <button
                  onClick={() =>
                    setNotifications({
                      ...notifications,
                      email_notifications: !notifications.email_notifications,
                    })
                  }
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    notifications.email_notifications ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications.email_notifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="font-semibold text-foreground">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Browser notifications</p>
                </div>
                <button
                  onClick={() =>
                    setNotifications({
                      ...notifications,
                      push_notifications: !notifications.push_notifications,
                    })
                  }
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    notifications.push_notifications ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications.push_notifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="font-semibold text-foreground">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">Text messages (premium)</p>
                </div>
                <button
                  onClick={() =>
                    setNotifications({
                      ...notifications,
                      sms_notifications: !notifications.sms_notifications,
                    })
                  }
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    notifications.sms_notifications ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications.sms_notifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleNotificationUpdate}
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        )}

        {/* Delete Account Tab */}
        {activeTab === 'delete' && (
          <div className="p-4 space-y-6">
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive">Delete Account</h3>
                  <p className="text-sm text-destructive/80 mt-1">
                    This action cannot be undone. All your data will be permanently removed from our servers.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Enter your password to confirm
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPasswords.delete ? 'text' : 'password'}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/50"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, delete: !showPasswords.delete })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords.delete ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-border text-destructive focus:ring-destructive"
                />
                <span className="text-sm text-muted-foreground">
                  I understand that deleting my account is permanent and all my data, including order history, saved items, and payment methods will be removed.
                </span>
              </label>
            </div>

            <button
              onClick={handleDeleteAccount}
              disabled={loading || !confirmDelete || !deletePassword}
              className="w-full py-4 bg-destructive text-destructive-foreground font-semibold rounded-xl hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Delete My Account
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
