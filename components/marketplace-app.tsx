"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRole } from "@/lib/role-context"
import { Onboarding } from "./onboarding"
import { BuyerDashboard } from "./buyer-dashboard"
import { MerchantDashboard } from "./merchant-dashboard"
import { MerchantSetup } from "./merchant-setup"
import { MerchantStoreSettings } from "./merchant-store-settings"
import { AdminLogin } from "./admin-login"
import { AdminDashboard } from "./admin-dashboard"

export function MarketplaceApp() {
  const router = useRouter()
  const { role, user, setUser, isLoading } = useRole()
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [storeSettingsComplete, setStoreSettingsComplete] = useState(false)
  const [guestBrowsing, setGuestBrowsing] = useState(false)

  const merchantSetupCompleted = Boolean(
    user?.merchantProfile?.setup_completed ?? (user as any)?.setup_completed
  )
  const merchantSmedanId = user?.merchantProfile?.smedan_id || (user as any)?.smedan_id || ""

  // Check if merchant setup and store settings are already completed
  useEffect(() => {
    if (merchantSetupCompleted) {
      setSetupComplete(true)
      // Assume store settings are complete if basic setup is complete
      setStoreSettingsComplete(true)
    }
  }, [merchantSetupCompleted])

  useEffect(() => {
    if (role === "agent") {
      router.replace("/agent-dashboard")
    }
  }, [role, router])

  useEffect(() => {
    if (typeof window === "undefined") return
    const requestedView = new URLSearchParams(window.location.search).get("view")
    if (!role && (requestedView === "cart" || requestedView === "checkout")) {
      setGuestBrowsing(true)
    }
  }, [role])

  // Show loading state while restoring session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    )
  }

  // Show onboarding if no role selected
  if (!role) {
    if (guestBrowsing) {
      return <BuyerDashboard onNeedsOnboarding={() => setGuestBrowsing(false)} />
    }
    return <Onboarding onGuestBrowse={() => setGuestBrowsing(true)} />
  }

  // Handle merchant setup flow - only show if setup not completed
  const needsSetup = role === "merchant" && !merchantSetupCompleted && !setupComplete
  
  if (needsSetup) {
    return (
      <MerchantSetup
        userId={user?.userId || ""}
        smedanId={merchantSmedanId}
        onComplete={(profile) => {
          // Update user context with completed profile
          if (user) {
            setUser({
              ...user,
              merchantProfile: {
                ...user.merchantProfile,
                ...profile,
                setup_completed: true,
              }
            })
          }
          setSetupComplete(true)
        }}
      />
    )
  }

  // Handle merchant store settings flow - show after setup but before dashboard
  const needsStoreSettings = role === "merchant" && setupComplete && !storeSettingsComplete
  
  if (needsStoreSettings) {
    return (
      <MerchantStoreSettings
        onComplete={() => {
          setStoreSettingsComplete(true)
        }}
      />
    )
  }

  // Show appropriate dashboard based on role
  switch (role) {
    case "buyer":
      return <BuyerDashboard />
    case "merchant":
      return <MerchantDashboard />
    case "admin":
      if (!adminAuthenticated) {
        return <AdminLogin onSuccess={() => setAdminAuthenticated(true)} />
      }
      return <AdminDashboard />
    default:
      return <Onboarding />
  }
}
