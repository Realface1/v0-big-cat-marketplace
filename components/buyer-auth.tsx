"use client"

import { useState } from "react"
import { useRole } from "@/lib/role-context"
import { createClient } from "@/lib/supabase/client"
import { BrandWordmark } from "./brand-wordmark"
import { OTPVerification } from "./otp-verification"
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Phone, Loader2, CheckCircle2, ShoppingBag, X, MapPin, Building2 } from "lucide-react"

declare global {
  interface Window {
    google?: any
    __googleScriptLoaded?: boolean
  }
}

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
]

export function BuyerAuth({
  onBack,
  onSuccess,
  mode = "page",
}: {
  onBack: () => void
  onSuccess?: () => void
  mode?: "page" | "modal"
}) {
  const { setRole, setUser } = useRole()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showOtpVerification, setShowOtpVerification] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string>("")

  const [verifiedBuyer, setVerifiedBuyer] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    city: "",
    state: "",
    password: "",
    name: "",
  })

  const normalizeBuyerUser = (user: any) => ({
    userId: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name || user.full_name,
    city: user.city || "",
    state: user.state || "",
    location: user.location || [user.city, user.state].filter(Boolean).join(", "),
    role: "buyer" as const,
  })

  const requestBuyerOtp = async () => {
    const response = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email, role: 'buyer' }),
    })

    return response.json()
  }

  const verifyBuyerOtp = async (otp: string) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        otp,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
        role: 'buyer',
      }),
    })

    const result = await response.json()
    if (!result.success || !result.data) return result

    const supabase = createClient()
    const { error: sessionError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    })

    if (sessionError) {
      return { success: false, error: sessionError.message || 'Failed to establish your session. Please try again.' }
    }

    setVerifiedBuyer(result.data)
    return { success: true }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      if (isSignUp) {
        const result = await requestBuyerOtp()

        if (result.success) {
          setShowOtpVerification(true)
          setSuccessMessage('Verification code sent. Enter the OTP to finish creating your account.')
        } else {
          setError(result.error || 'Failed to send verification code')
        }

        return
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        const user = result.data.user

        if (user.role !== "buyer") {
          setError("This account is not a buyer account. Please use the merchant login.")
          return
        }

        const supabase = createClient()

        const { error: sessionError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (sessionError) {
          setError(sessionError.message || "Failed to establish your session. Please try again.")
          return
        }

        setUser(normalizeBuyerUser(user))
        setRole("buyer")
        onSuccess?.()
      } else {
        setError(result.error || "An error occurred")
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error("[v0] Auth error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (showOtpVerification) {
    return (
      <OTPVerification
        email={formData.email}
        onBack={() => {
          setShowOtpVerification(false)
          setError('')
          setSuccessMessage('')
        }}
        onResend={requestBuyerOtp}
        onVerify={verifyBuyerOtp}
        onVerifySuccess={() => {
          if (!verifiedBuyer) return
          setUser(normalizeBuyerUser(verifiedBuyer))
          setRole('buyer')
          onSuccess?.()
        }}
      />
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const ensureGoogleScript = async () => {
    if (typeof window === 'undefined') return false
    if (window.google?.accounts?.id) return true

    if (!window.__googleScriptLoaded) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => {
          window.__googleScriptLoaded = true
          resolve()
        }
        script.onerror = () => reject(new Error('Failed to load Google script'))
        document.head.appendChild(script)
      })
    }

    return Boolean(window.google?.accounts?.id)
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setSuccessMessage('')
    setGoogleLoading(true)

    try {
      if (isSignUp) {
        setError('Use the signup form so your state and city can be saved for delivery and logistics.')
        return
      }
      const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      if (!googleClientId) {
        setError('Google sign-in is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID.')
        return
      }

      const loaded = await ensureGoogleScript()
      if (!loaded || !window.google?.accounts?.id) {
        setError('Failed to initialize Google sign-in.')
        return
      }

      const credential = await new Promise<string>((resolve, reject) => {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (response?.credential) resolve(response.credential)
            else reject(new Error('No Google credential received'))
          },
        })

        window.google.accounts.id.prompt((notification: any) => {
          const skipped = notification?.isSkippedMoment?.()
          const notDisplayed = notification?.isNotDisplayed?.()
          if (skipped || notDisplayed) {
            reject(new Error('Google prompt was closed before completing sign in.'))
          }
        })
      })

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential, role: 'buyer' }),
      })

      const result = await response.json()
      if (!result.success || !result.data?.user) {
        setError(result.error || 'Google sign-in failed')
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential,
      })

      if (signInError) {
        setError(signInError.message || 'Failed to establish your Google session.')
        return
      }

      const user = result.data.user
      setUser({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name || user.full_name,
        role: 'buyer',
      })
      setRole('buyer')
      onSuccess?.()
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  const isModal = mode === "modal"

  return (
    <div className={isModal ? "w-full max-w-sm max-h-[calc(100vh-3rem)] overflow-y-auto" : "min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex flex-col font-sans"}>
      {!isModal && (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <BrandWordmark compact />
          </div>
        </header>
      )}

      <main className={isModal ? "pb-1" : "flex-1 flex flex-col items-center justify-center p-4"}>
        <div className="w-full max-w-sm">
          <div className={`bg-card rounded-3xl shadow-2xl border border-border/50 ${isModal ? "p-6" : "p-8 my-1"}`}>
            {isModal && (
              <div className="flex items-center justify-between mb-4">
                <BrandWordmark compact />
                <button
                  onClick={onBack}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all rounded-lg"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className={`text-center ${isModal ? "mb-6" : "mb-8"}`}>
              <div className={`inline-flex items-center justify-center ${isModal ? "w-14 h-14 mb-4" : "w-16 h-16 mb-5"} rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25`}>
                <ShoppingBag className={`${isModal ? "w-7 h-7" : "w-8 h-8"} text-primary-foreground`} />
              </div>
              <h1 className={`${isModal ? "text-xl" : "text-2xl"} font-bold text-foreground mb-2`}>
                {isSignUp ? "Create Buyer Account" : isModal ? "Login to continue" : "Welcome Back"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isSignUp ? "Start shopping on our marketplace" : isModal ? "Continue your checkout without leaving this page" : "Sign in to your account"}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="text-green-700 dark:text-green-400 text-sm font-medium">{successMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full pl-4 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                        required
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Your Location</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This helps delivery and logistics know your city and state automatically.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">State</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                          <select
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                            required
                          >
                            <option value="">Select your state</option>
                            {NIGERIAN_STATES.map((stateName) => (
                              <option key={stateName} value={stateName}>
                                {stateName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">City</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <input
                            type="text"
                            name="city"
                            placeholder="Enter your city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-11 pr-12 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isSignUp ? "Sending OTP..." : "Signing In..."}
                  </>
                ) : (
                  <>{isSignUp ? "Send Verification Code" : "Sign In"}</>
                )}
              </button>
            </form>

            <div className="mt-4">
              {isSignUp ? (
                <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                  Buyer sign-up sends a verification code before the account is created so your email is confirmed first.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full py-3 px-4 bg-white border border-border text-foreground font-semibold rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  {googleLoading ? 'Connecting to Google...' : 'Login with Google'}
                </button>
              )}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setShowOtpVerification(false)
                  setVerifiedBuyer(null)
                  setError("")
                  setSuccessMessage("")
                  setFormData({ email: "", phone: "", city: "", state: "", password: "", name: "" })
                }}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                By continuing, you agree to our{' '}
                <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>{' '}and{' '}
                <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
