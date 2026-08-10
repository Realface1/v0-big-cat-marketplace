"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Loader2, Phone, Lock, Eye, EyeOff } from "lucide-react"
import { BrandWordmark, PoweredByMarquee } from "@/components/brand-wordmark"

export default function RiderLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const cleanPhone = phone.trim().replace(/\s+/g, "")
    const cleanPin = pin.trim()

    if (!cleanPhone) {
      setError("Please enter your phone number.")
      return
    }
    if (!cleanPin || cleanPin.length < 4) {
      setError("Please enter your 4-digit PIN.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/rider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, pin: cleanPin }),
      })
      const result = await res.json()

      if (!result.success) {
        setError(result.error || "Login failed. Please check your credentials.")
        return
      }

      // Store rider session in localStorage
      localStorage.setItem("rider_session", JSON.stringify(result.rider))
      router.push("/rider/dashboard")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with branding */}
      <header className="border-b border-border bg-card px-4 py-3">
        <BrandWordmark />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-6">

          {/* Rider badge */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Image src="/image.png" alt="BigCat" width={40} height={40} className="object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Rider Portal</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to manage your deliveries</p>
            </div>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08012345678"
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-border bg-secondary pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">PIN</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4-digit PIN"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={4}
                  className="w-full rounded-xl border border-border bg-secondary pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Default PIN is the last 4 digits of your phone number.</p>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground px-4">
            This portal is only for registered BigCat delivery riders.<br />
            Contact your logistics coordinator if you need access.
          </p>
        </div>
      </main>

      {/* Marquee footer */}
      <footer className="pb-8 px-4">
        <PoweredByMarquee />
      </footer>
    </div>
  )
}
