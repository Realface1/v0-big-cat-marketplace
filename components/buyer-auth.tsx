"use client"

import { useState } from "react"
import { useRole } from "@/lib/role-context"
import { buyerSignupWithName, emailPasswordLogin, requestPasswordReset, resetPassword } from "@/lib/auth-actions"
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Phone, User, Chrome, Apple, Loader2, CheckCircle2 } from "lucide-react"

export function BuyerAuth({ onBack }: { onBack: () => void }) {
  const { setRole, setUser } = useRole()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetStep, setResetStep] = useState<"email" | "code" | "newPassword">("email")
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      let result
      
      if (isSignUp) {
        result = await buyerSignupWithName(
          formData.email,
          formData.password,
          formData.name,
          formData.phone
        )
      } else {
        result = await emailPasswordLogin(formData.email, formData.password)
      }

      if (result.success && result.data) {
        // Check if role is buyer (for login, user is in result.data.user)
        const user = isSignUp ? result.data : result.data.user
        if (!isSignUp && user.role !== "buyer") {
          setError("This account is not a buyer account. Please use the merchant login.")
          return
        }
        
        if (isSignUp) {
          setSuccessMessage("Account created successfully! Redirecting...")
          setTimeout(() => {
            setUser({
              userId: result.data.userId,
              email: result.data.email,
              phone: result.data.phone,
              name: result.data.name,
              role: "buyer",
            })
            setRole("buyer")
          }, 1500)
        } else {
          setUser({
            userId: result.data.user.id,
            email: result.data.user.email,
            phone: result.data.user.phone,
            name: result.data.user.name,
            role: "buyer",
          })
          setRole("buyer")
        }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await requestPasswordReset(formData.email)
    
    if (result.success) {
      setSuccessMessage("Check your email for the reset code")
      setResetStep("code")
      // For demo purposes, show the token
      if (result.data?.resetToken) {
        setSuccessMessage(`Reset code: ${result.data.resetToken} (In production, this would be sent via email)`)
      }
    } else {
      setError(result.error || "Failed to send reset code")
    }
    setLoading(false)
  }

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await resetPassword(formData.email, newPassword)
    
    if (result.success) {
      setSuccessMessage("Password reset successfully! You can now sign in.")
      setShowForgotPassword(false)
      setResetStep("email")
      setResetToken("")
      setNewPassword("")
    } else {
      setError(result.error || "Failed to reset password")
    }
    setLoading(false)
  }

  // Forgot Password Modal
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex flex-col font-sans">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
          <button
            onClick={() => {
              setShowForgotPassword(false)
              setResetStep("email")
              setError("")
              setSuccessMessage("")
            }}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <div className="bg-card rounded-3xl shadow-2xl border border-border/50 p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-5 shadow-lg shadow-primary/25">
                  <Lock className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {resetStep === "email" && "Reset Password"}
                  {resetStep === "code" && "Enter Reset Code"}
                  {resetStep === "newPassword" && "New Password"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {resetStep === "email" && "Enter your email to receive a reset code"}
                  {resetStep === "code" && "Enter the 6-digit code sent to your email"}
                  {resetStep === "newPassword" && "Create your new password"}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-xl">
                  <p className="text-sm text-success font-medium">{successMessage}</p>
                </div>
              )}

              {resetStep === "email" && (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-foreground">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Reset Code
                  </button>
                </form>
              )}

              {resetStep === "code" && (
                <form onSubmit={(e) => { e.preventDefault(); setResetStep("newPassword"); }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-foreground">Reset Code</label>
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      required
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground text-center text-2xl tracking-widest placeholder:text-muted-foreground placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetToken.length !== 6}
                    className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60"
                  >
                    Verify Code
                  </button>
                </form>
              )}

              {resetStep === "newPassword" && (
                <form onSubmit={handleVerifyAndReset} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-foreground">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        className="w-full pl-12 pr-12 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Must be 8+ characters with uppercase and number
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || newPassword.length < 8}
                    className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Reset Password
                  </button>
                </form>
              )}

              <button
                onClick={() => setShowForgotPassword(false)}
                className="w-full mt-4 py-2 text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex flex-col font-sans">
      {/* Back Button Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 md:py-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all rounded-lg"
          aria-label="Go back"
          title="Back to role selection"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-sm">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
              <p className="text-sm text-success font-medium">{successMessage}</p>
            </div>
          )}

          {/* Card Container */}
          <div className="bg-card rounded-3xl shadow-2xl shadow-primary/10 border border-border/50 p-8 md:p-10">
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-5 shadow-lg shadow-primary/25">
                <span className="text-primary-foreground font-bold text-2xl">B</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground text-balance mb-2">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isSignUp 
                  ? "Join BigCat and start shopping today" 
                  : "Sign in to continue shopping"}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              {/* Name Field - Only for Sign Up */}
              {isSignUp && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required={isSignUp}
                      className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      aria-label="Full name"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    aria-label="Email address"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+234 800 000 0000"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    aria-label="Phone number"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full pl-12 pr-12 py-3 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true)
                      setError("")
                      setSuccessMessage("")
                    }}
                    className="text-sm text-primary hover:underline mt-1"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSignUp ? "Create Account" : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground font-medium">Or continue with</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                type="button"
                className="py-3 bg-secondary border border-border/50 rounded-xl hover:border-border hover:bg-secondary/80 transition-all flex items-center justify-center gap-2 group"
                aria-label="Continue with Google"
              >
                <Chrome className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-foreground hidden sm:inline">Google</span>
              </button>
              <button 
                type="button"
                className="py-3 bg-secondary border border-border/50 rounded-xl hover:border-border hover:bg-secondary/80 transition-all flex items-center justify-center gap-2 group"
                aria-label="Continue with Apple"
              >
                <Apple className="w-5 h-5 text-foreground group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-foreground hidden sm:inline">Apple</span>
              </button>
            </div>

            {/* Toggle Auth Mode */}
            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError("")
                  setFormData({ name: "", email: "", phone: "", password: "" })
                }}
                className="text-primary font-semibold hover:underline transition-colors"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            By continuing, you agree to our{" "}
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          </p>
        </div>
      </main>
    </div>
  )
}
