"use client"

import { useState } from "react"
import { useRole } from "@/lib/role-context"
import { ArrowLeft, Shield, Lock, AlertCircle } from "lucide-react"

export function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const { setRole } = useRole()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate verification
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Demo access code: "admin123"
    if (code === "admin123") {
      onSuccess()
    } else {
      setError("Invalid access code. Please try again.")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setRole(null)}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">Admin Access</h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-foreground">
              Secure Admin Access
            </h2>
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              Enter your administrator access code to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter access code"
                className="w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!code || isLoading}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {isLoading ? "Verifying..." : "Access Dashboard"}
            </button>
          </form>

          {/* Help */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Forgot your access code?{" "}
            <button
              onClick={() => {
                window.location.href = "mailto:support@bigcat.ng?subject=Admin%20Access%20Code%20Support"
              }}
              className="text-primary hover:underline"
            >
              Contact support
            </button>
          </p>

          {/* Demo hint */}
          <div className="mt-8 p-3 bg-secondary/50 border border-border rounded-xl">
            <p className="text-xs text-muted-foreground text-center">
              Demo access code: <span className="font-mono text-foreground">admin123</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
