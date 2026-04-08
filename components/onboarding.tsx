"use client"

import { useState } from "react"
import { ShoppingBag, Store, Shield, ArrowRight, Lock } from "lucide-react"
import { BuyerAuth } from "./buyer-auth"
import { MerchantAuth } from "./merchant-auth"
import { AdminAccessModal } from "./admin-access-modal"

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

export function Onboarding() {
  const [selectedAuth, setSelectedAuth] = useState<AuthType>(null)
  const [showAdminModal, setShowAdminModal] = useState(false)

  // Show buyer auth if selected
  if (selectedAuth === "buyer") {
    return <BuyerAuth onBack={() => setSelectedAuth(null)} />
  }

  // Show merchant auth if selected
  if (selectedAuth === "merchant") {
    return <MerchantAuth onBack={() => setSelectedAuth(null)} />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-md shadow-primary/30">
            <span className="text-primary-foreground font-bold text-xl">B</span>
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
              onClick={() => setSelectedAuth(role.id)}
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
          className="w-full mt-6 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Lock className="w-4 h-4" />
          Admin Access
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      {/* Admin Access Modal */}
      {showAdminModal && (
        <AdminAccessModal onClose={() => setShowAdminModal(false)} />
      )}
    </div>
  )
}
