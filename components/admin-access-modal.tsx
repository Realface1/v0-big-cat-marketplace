"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Lock } from "lucide-react"

interface AdminAccessModalProps {
  onClose: () => void
}

export function AdminAccessModal({ onClose }: AdminAccessModalProps) {
  const router = useRouter()
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const accessCodes = {
    "SMEDAN_123": "/admin/smedan",
    "PALMPAY_012": "/admin/palmpay",
    "BIGCAT_00": "/admin/bigcat",
    "LOGISTICS_001": "/logistics",
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const trimmedCode = accessCode.trim().toUpperCase()
    const redirectUrl = accessCodes[trimmedCode as keyof typeof accessCodes]

    if (redirectUrl) {
      // Store admin access in sessionStorage
      sessionStorage.setItem("adminAccess", trimmedCode)
      router.push(redirectUrl)
    } else {
      setError("Invalid access code")
    }

    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/10 text-destructive">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Admin Access</h2>
              <p className="text-xs text-muted-foreground">Enter your access code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Access Code
            </label>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value)
                setError("")
              }}
              placeholder="Enter access code"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !accessCode.trim()}
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isLoading ? "Verifying..." : "Continue"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Contact your administrator for access
        </p>
      </div>
    </div>
  )
}
