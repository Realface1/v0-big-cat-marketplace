"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ShoppingBag, Store, Shield, ArrowRight, Lock, UserCheck, Loader2, AlertCircle } from "lucide-react"
import { BuyerAuth } from "./buyer-auth"
import { MerchantAuth } from "./merchant-auth"
import { MerchantOnboardingIntake } from "./merchant-onboarding-intake"
import { AdminAccessModal } from "./admin-access-modal"
import { useRole } from "@/lib/role-context"

type AuthType = "buyer" | "merchant" | null

const roles = [
  {
    id: "buyer" as AuthType,
    title: "Buyer",
    description: "Browse products, make purchases, and track orders",
    icon: ShoppingBag,
  },
  {
    id: "merchant" as AuthType,
    title: "Merchant",
    description: "Sell products, manage inventory, and view analytics",
    icon: Store,
  },
]

export function Onboarding({ onGuestBrowse }: { onGuestBrowse?: () => void } = {}) {
  const router = useRouter()
  const { setRole, setUser } = useRole()
  const [selectedAuth, setSelectedAuth] = useState<AuthType>(null)
  const [showMerchantOnboarding, setShowMerchantOnboarding] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showAgentLogin, setShowAgentLogin] = useState(false)
  const [agentCode, setAgentCode] = useState("")
  const [agentError, setAgentError] = useState("")
  const [agentLoading, setAgentLoading] = useState(false)

  const handleAgentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAgentError("")
    setAgentLoading(true)
    try {
      const res = await fetch('/api/agent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: agentCode.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setUser({
          userId: data.agent.id,
          email: data.agent.email,
          name: data.agent.name,
          role: 'agent',
          ...(data.agent.region ? { region: data.agent.region } : {}),
        } as any)
        setRole('agent')
        router.push('/agent-dashboard')
      } else {
        setAgentError(data.error || 'Invalid access code')
      }
    } catch {
      setAgentError('Something went wrong. Try again.')
    } finally {
      setAgentLoading(false)
    }
  }

  // Show buyer auth if selected (only when no guest browse available)
  if (selectedAuth === "buyer") {
    return <BuyerAuth onBack={() => setSelectedAuth(null)} />
  }

  if (showMerchantOnboarding) {
    return (
      <MerchantOnboardingIntake
        onBack={() => {
          setShowMerchantOnboarding(false)
          setSelectedAuth("merchant")
        }}
      />
    )
  }

  // Show merchant auth if selected
  if (selectedAuth === "merchant") {
    return (
      <MerchantAuth
        onBack={() => setSelectedAuth(null)}
        onNeedAgentOnboarding={() => {
          setSelectedAuth(null)
          setShowMerchantOnboarding(true)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Logos */}
        <div className="text-center mb-10">
          {/* Primary: SMEDAN — dark background so white logo text is visible */}
          <div className="inline-flex items-center justify-center bg-gray-900 rounded-2xl px-6 py-3 mb-4 shadow-md">
            <Image
              src="/SMEDAN_ido8Y4OzuL_0.png"
              alt="SMEDAN logo"
              width={160}
              height={70}
              className="object-contain"
              priority
            />
          </div>

          {/* Secondary partners */}
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Powered By</p>
          <div className="flex items-center justify-center gap-6 mb-6">
            <Image
              src="/palmpay-seeklogo.png"
              alt="PalmPay logo"
              width={90}
              height={70}
              className="object-contain mix-blend-multiply dark:mix-blend-screen"
              priority
            />
            <Image
              src="/image.png"
              alt="BigCat logo"
              width={80}
              height={70}
              className="object-contain mix-blend-multiply dark:mix-blend-screen"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Welcome to BigCat Marketplace
          </h1>
          <p className="text-muted-foreground mt-2 text-pretty">
            Select your role to get started
          </p>
        </div>

        {/* Role Selection */}
        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => role.id === "buyer" && onGuestBrowse ? onGuestBrowse() : setSelectedAuth(role.id)}
              className="group flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/40 hover:shadow-sm transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <role.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-foreground">{role.title}</h3>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>

        {/* Admin Access Button */}
        <button
          onClick={() => setShowAdminModal(true)}
          className="w-full mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Lock className="w-4 h-4" />
          Admin Access
        </button>

        {/* Agent Login Button */}
        <button
          onClick={() => { setShowAgentLogin(v => !v); setAgentError("") }}
          className="w-full mt-3 p-3 bg-secondary border border-border rounded-xl text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <UserCheck className="w-4 h-4 text-primary" />
          Agent Login
        </button>

        {/* Agent Login Form */}
        {showAgentLogin && (
          <form
            onSubmit={handleAgentLogin}
            className="mt-3 p-4 bg-card border border-border rounded-xl flex flex-col gap-3"
          >
            <p className="text-sm font-medium text-foreground">Enter your access code</p>
            <input
              type="text"
              value={agentCode}
              onChange={e => { setAgentCode(e.target.value.toUpperCase()); setAgentError("") }}
              placeholder="e.g. AGENT-A3F8-K2P1"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm uppercase"
              autoComplete="off"
              spellCheck={false}
            />
            {agentError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {agentError}
              </div>
            )}
            <button
              type="submit"
              disabled={agentLoading || !agentCode.trim()}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
            >
              {agentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              {agentLoading ? "Verifying..." : "Login as Agent"}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>{' '}and{' '}
          <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
        </p>
      </div>

      {/* Admin Access Modal */}
      {showAdminModal && (
        <AdminAccessModal onClose={() => setShowAdminModal(false)} />
      )}
    </div>
  )
}
