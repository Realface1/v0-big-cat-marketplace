"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { UserCheck, Loader2, AlertCircle, ArrowLeft } from "lucide-react"
import { useRole } from "@/lib/role-context"
import { AgentDashboard } from "@/components/agent-dashboard"

export default function AgentPortalPage() {
  const router = useRouter()
  const { role, setRole, setUser, isLoading } = useRole()
  const [agentCode, setAgentCode] = useState("")
  const [agentError, setAgentError] = useState("")
  const [agentLoading, setAgentLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAgentError("")
    setAgentLoading(true)
    try {
      const res = await fetch("/api/agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: agentCode.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setUser({
          userId: data.agent.id,
          email: data.agent.email,
          name: data.agent.name,
          role: "agent",
          ...(data.agent.region ? { region: data.agent.region } : {}),
        } as any)
        setRole("agent")
      } else {
        setAgentError(data.error || "Invalid access code")
      }
    } catch {
      setAgentError("Something went wrong. Try again.")
    } finally {
      setAgentLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (role === "agent") {
    return <AgentDashboard />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
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
          <h1 className="text-2xl font-bold text-foreground">Agent Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter your access code to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="text"
            value={agentCode}
            onChange={(e) => {
              setAgentCode(e.target.value.toUpperCase())
              setAgentError("")
            }}
            placeholder="e.g. AGENT-A3F8-K2P1"
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm uppercase"
            autoComplete="off"
            spellCheck={false}
          />

          {agentError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {agentError}
            </div>
          )}

          <button
            type="submit"
            disabled={agentLoading || !agentCode.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {agentLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            {agentLoading ? "Verifying..." : "Login"}
          </button>
        </form>

        <button
          onClick={() => router.push("/")}
          className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>
      </div>
    </div>
  )
}
